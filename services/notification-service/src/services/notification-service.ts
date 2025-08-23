import { getPool } from '../database/connection';
import { EmailProvider } from '../providers/email-provider';
import { SMSProvider } from '../providers/sms-provider';
import { PushProvider } from '../providers/push-provider';
import {
    Notification,
    NotificationTemplate,
    NotificationPreferences,
    SendNotificationRequest,
    BulkNotificationRequest,
    NotificationType,
    NotificationStatus,

} from '../types/notification.types';

export class NotificationService {
    private emailProvider: EmailProvider;
    private smsProvider: SMSProvider;
    private pushProvider: PushProvider;

    constructor() {
        this.emailProvider = new EmailProvider();
        this.smsProvider = new SMSProvider();
        this.pushProvider = new PushProvider();
    }

    async sendNotification(request: SendNotificationRequest): Promise<Notification> {
        try {
            // Check user preferences
            const preferences = await this.getUserPreferences(request.userId);
            if (!this.isNotificationAllowed(request.type, preferences)) {
                throw new Error(`User has disabled ${request.type} notifications`);
            }

            // Process template if provided
            let content = request.content || '';
            let subject = request.subject || '';

            if (request.templateName) {
                const template = await this.getTemplate(request.templateName);
                if (!template) {
                    throw new Error(`Template '${request.templateName}' not found`);
                }

                content = this.processTemplate(template.contentTemplate, request.templateVariables || {});
                if (template.subjectTemplate) {
                    subject = this.processTemplate(template.subjectTemplate, request.templateVariables || {});
                }
            }

            // Create notification record
            const notification = await this.createNotification({
                ...request,
                content,
                subject
            });

            // Send notification immediately if not scheduled
            if (!request.scheduledAt || new Date(request.scheduledAt) <= new Date()) {
                await this.processNotification(notification);
            }

            return notification;
        } catch (error) {
            console.error('Error sending notification:', error);
            throw error;
        }
    }

    async sendBulkNotifications(request: BulkNotificationRequest): Promise<Notification[]> {
        const results: Notification[] = [];

        for (const notificationRequest of request.notifications) {
            try {
                const notification = await this.sendNotification(notificationRequest);
                results.push(notification);
            } catch (error) {
                console.error('Error in bulk notification:', error);
                // Continue with other notifications even if one fails
            }
        }

        return results;
    }

    private async createNotification(request: SendNotificationRequest & { content: string; subject: string }): Promise<Notification> {
        const pool = getPool();

        const query = `
      INSERT INTO notifications (
        user_id, type, channel, recipient, subject, content, 
        scheduled_at, metadata, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

        const values = [
            request.userId,
            request.type,
            request.type, // channel same as type for now
            request.recipient,
            request.subject,
            request.content,
            request.scheduledAt || null,
            JSON.stringify(request.metadata || {}),
            request.scheduledAt && new Date(request.scheduledAt) > new Date() ? 'pending' : 'pending'
        ];

        const result = await pool.query(query, values);
        return this.mapRowToNotification(result.rows[0]);
    }

    private async processNotification(notification: Notification): Promise<void> {
        try {
            let providerResponse;
            let provider = '';

            switch (notification.type) {
                case 'email':
                    provider = 'sendgrid';
                    providerResponse = await this.emailProvider.send({
                        to: notification.recipient,
                        subject: notification.subject || '',
                        content: notification.content
                    });
                    break;

                case 'sms':
                    provider = 'twilio';
                    providerResponse = await this.smsProvider.send({
                        to: notification.recipient,
                        message: notification.content
                    });
                    break;

                case 'push':
                    provider = 'firebase';
                    providerResponse = await this.pushProvider.send({
                        token: notification.recipient,
                        title: notification.subject || 'Notification',
                        body: notification.content,
                        data: notification.metadata
                    });
                    break;

                default:
                    throw new Error(`Unsupported notification type: ${notification.type}`);
            }

            // Update notification status
            const status: NotificationStatus = providerResponse.success ? 'sent' : 'failed';
            await this.updateNotificationStatus(
                notification.id,
                status,
                providerResponse.success ? null : providerResponse.error
            );

            // Log delivery attempt
            await this.logDelivery(notification.id, provider, providerResponse);

        } catch (error: any) {
            console.error('Error processing notification:', error);
            await this.updateNotificationStatus(notification.id, 'failed', error.message);
        }
    }

    private async updateNotificationStatus(
        notificationId: string,
        status: NotificationStatus,
        errorMessage?: string | null
    ): Promise<void> {
        const pool = getPool();

        const query = `
      UPDATE notifications 
      SET status = $1, error_message = $2, sent_at = $3, updated_at = NOW()
      WHERE id = $4
    `;

        const sentAt = status === 'sent' ? new Date() : null;
        await pool.query(query, [status, errorMessage, sentAt, notificationId]);
    }

    private async logDelivery(
        notificationId: string,
        provider: string,
        response: any
    ): Promise<void> {
        const pool = getPool();

        const query = `
      INSERT INTO delivery_logs (
        notification_id, provider, provider_message_id, status, 
        response_data, error_details, delivered_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

        const values = [
            notificationId,
            provider,
            response.messageId || null,
            response.success ? 'delivered' : 'failed',
            JSON.stringify(response.metadata || {}),
            response.error || null,
            response.success ? new Date() : null
        ];

        await pool.query(query, values);
    }

    async getTemplate(name: string): Promise<NotificationTemplate | null> {
        const pool = getPool();

        const query = 'SELECT * FROM notification_templates WHERE name = $1 AND is_active = true';
        const result = await pool.query(query, [name]);

        return result.rows.length > 0 ? this.mapRowToTemplate(result.rows[0]) : null;
    }

    async getUserPreferences(userId: string): Promise<NotificationPreferences> {
        const pool = getPool();

        const query = 'SELECT * FROM notification_preferences WHERE user_id = $1';
        const result = await pool.query(query, [userId]);

        if (result.rows.length === 0) {
            // Create default preferences
            return await this.createDefaultPreferences(userId);
        }

        return this.mapRowToPreferences(result.rows[0]);
    }

    private async createDefaultPreferences(userId: string): Promise<NotificationPreferences> {
        const pool = getPool();

        const query = `
      INSERT INTO notification_preferences (user_id)
      VALUES ($1)
      RETURNING *
    `;

        const result = await pool.query(query, [userId]);
        return this.mapRowToPreferences(result.rows[0]);
    }

    private isNotificationAllowed(type: NotificationType, preferences: NotificationPreferences): boolean {
        switch (type) {
            case 'email':
                return preferences.emailEnabled;
            case 'sms':
                return preferences.smsEnabled;
            case 'push':
                return preferences.pushEnabled;
            default:
                return false;
        }
    }

    private processTemplate(template: string, variables: Record<string, any>): string {
        let processed = template;

        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            processed = processed.replace(regex, String(value));
        }

        return processed;
    }

    async getNotificationHistory(userId: string, limit = 50, offset = 0): Promise<Notification[]> {
        const pool = getPool();

        const query = `
      SELECT * FROM notifications 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;

        const result = await pool.query(query, [userId, limit, offset]);
        return result.rows.map(row => this.mapRowToNotification(row));
    }

    async markAsRead(notificationId: string): Promise<void> {
        const pool = getPool();

        const query = `
      UPDATE notifications 
      SET status = 'read', read_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND status = 'delivered'
    `;

        await pool.query(query, [notificationId]);
    }

    async retryFailedNotification(notificationId: string): Promise<void> {
        const pool = getPool();

        // Get notification details
        const query = 'SELECT * FROM notifications WHERE id = $1';
        const result = await pool.query(query, [notificationId]);

        if (result.rows.length === 0) {
            throw new Error('Notification not found');
        }

        const notification = this.mapRowToNotification(result.rows[0]);

        if (notification.retryCount >= notification.maxRetries) {
            throw new Error('Maximum retry attempts exceeded');
        }

        // Increment retry count
        await pool.query(
            'UPDATE notifications SET retry_count = retry_count + 1, status = $1 WHERE id = $2',
            ['pending', notificationId]
        );

        // Process notification again
        await this.processNotification({ ...notification, retryCount: notification.retryCount + 1 });
    }

    private mapRowToNotification(row: any): Notification {
        return {
            id: row.id,
            userId: row.user_id,
            type: row.type,
            channel: row.channel,
            recipient: row.recipient,
            subject: row.subject,
            content: row.content,
            templateId: row.template_id,
            status: row.status,
            metadata: row.metadata || {},
            scheduledAt: row.scheduled_at,
            sentAt: row.sent_at,
            deliveredAt: row.delivered_at,
            readAt: row.read_at,
            errorMessage: row.error_message,
            retryCount: row.retry_count,
            maxRetries: row.max_retries,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }

    private mapRowToTemplate(row: any): NotificationTemplate {
        return {
            id: row.id,
            name: row.name,
            type: row.type,
            subjectTemplate: row.subject_template,
            contentTemplate: row.content_template,
            variables: row.variables || [],
            isActive: row.is_active,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }

    private mapRowToPreferences(row: any): NotificationPreferences {
        return {
            id: row.id,
            userId: row.user_id,
            emailEnabled: row.email_enabled,
            smsEnabled: row.sms_enabled,
            pushEnabled: row.push_enabled,
            marketingEmails: row.marketing_emails,
            orderUpdates: row.order_updates,
            securityAlerts: row.security_alerts,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}