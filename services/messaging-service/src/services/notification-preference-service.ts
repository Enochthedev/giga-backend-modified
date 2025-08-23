import db from '../database/connection';
import logger from '../utils/logger';
import { NotificationPreference } from '../types';
import { createError } from '../middleware/error-middleware';

/**
 * Service for managing user notification preferences and opt-out management
 * Handles email, SMS, push notification preferences and marketing communications
 */
class NotificationPreferenceService {
    /**
     * Get user notification preferences
     */
    public async getUserPreferences(userId: string): Promise<NotificationPreference> {
        try {
            const result = await db.query(
                'SELECT * FROM notification_preferences WHERE user_id = $1',
                [userId]
            );

            if (result.rows.length === 0) {
                // Create default preferences if none exist
                return await this.createDefaultPreferences(userId);
            }

            return result.rows[0];
        } catch (error) {
            logger.error('Failed to get user notification preferences:', error);
            throw createError('Failed to get notification preferences', 500);
        }
    }

    /**
     * Create default notification preferences for a new user
     */
    public async createDefaultPreferences(userId: string): Promise<NotificationPreference> {
        try {
            const result = await db.query(
                `INSERT INTO notification_preferences (
          user_id, email_notifications, sms_notifications, push_notifications,
          message_notifications, ticket_notifications, marketing_emails,
          order_updates, promotional_offers, security_alerts
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
                [
                    userId,
                    true,  // email_notifications
                    false, // sms_notifications
                    true,  // push_notifications
                    true,  // message_notifications
                    true,  // ticket_notifications
                    false, // marketing_emails
                    true,  // order_updates
                    false, // promotional_offers
                    true   // security_alerts
                ]
            );

            logger.info('Default notification preferences created:', { userId });
            return result.rows[0];
        } catch (error) {
            logger.error('Failed to create default notification preferences:', error);
            throw createError('Failed to create notification preferences', 500);
        }
    }

    /**
     * Update user notification preferences
     */
    public async updateUserPreferences(
        userId: string,
        preferences: Partial<NotificationPreference>
    ): Promise<NotificationPreference> {
        try {
            // Build update query dynamically
            const updateFields: string[] = [];
            const params: any[] = [];
            let paramIndex = 1;

            const allowedFields = [
                'email_notifications',
                'sms_notifications',
                'push_notifications',
                'message_notifications',
                'ticket_notifications',
                'marketing_emails',
                'order_updates',
                'promotional_offers',
                'security_alerts'
            ];

            for (const field of allowedFields) {
                const camelCaseField = this.snakeToCamel(field);
                if (preferences[camelCaseField as keyof NotificationPreference] !== undefined) {
                    updateFields.push(`${field} = $${paramIndex}`);
                    params.push(preferences[camelCaseField as keyof NotificationPreference]);
                    paramIndex++;
                }
            }

            if (updateFields.length === 0) {
                throw createError('No valid fields to update', 400);
            }

            updateFields.push('updated_at = CURRENT_TIMESTAMP');
            params.push(userId);

            const query = `
        UPDATE notification_preferences 
        SET ${updateFields.join(', ')}
        WHERE user_id = $${paramIndex}
        RETURNING *
      `;

            const result = await db.query(query, params);

            if (result.rows.length === 0) {
                // If no preferences exist, create them with the provided updates
                const defaultPrefs = await this.createDefaultPreferences(userId);
                return await this.updateUserPreferences(userId, preferences);
            }

            logger.info('Notification preferences updated:', {
                userId,
                updatedFields: Object.keys(preferences)
            });

            return result.rows[0];
        } catch (error) {
            if (error.statusCode) throw error;
            logger.error('Failed to update notification preferences:', error);
            throw createError('Failed to update notification preferences', 500);
        }
    }

    /**
     * Check if user has opted in for a specific notification type
     */
    public async hasOptedIn(
        userId: string,
        notificationType: keyof NotificationPreference
    ): Promise<boolean> {
        try {
            const preferences = await this.getUserPreferences(userId);
            return preferences[notificationType] as boolean;
        } catch (error) {
            logger.error('Failed to check opt-in status:', error);
            // Default to false if we can't determine preference
            return false;
        }
    }

    /**
     * Opt out user from all marketing communications
     */
    public async optOutFromMarketing(userId: string): Promise<NotificationPreference> {
        try {
            const result = await db.query(
                `UPDATE notification_preferences 
         SET marketing_emails = false, 
             promotional_offers = false,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1
         RETURNING *`,
                [userId]
            );

            if (result.rows.length === 0) {
                // Create preferences with marketing disabled
                const preferences = await this.createDefaultPreferences(userId);
                return await this.optOutFromMarketing(userId);
            }

            logger.info('User opted out from marketing:', { userId });
            return result.rows[0];
        } catch (error) {
            logger.error('Failed to opt out from marketing:', error);
            throw createError('Failed to opt out from marketing', 500);
        }
    }

    /**
     * Opt out user from all non-essential notifications
     */
    public async optOutFromAllNonEssential(userId: string): Promise<NotificationPreference> {
        try {
            const result = await db.query(
                `UPDATE notification_preferences 
         SET email_notifications = false,
             sms_notifications = false,
             push_notifications = false,
             message_notifications = false,
             marketing_emails = false,
             promotional_offers = false,
             -- Keep essential notifications enabled
             ticket_notifications = true,
             order_updates = true,
             security_alerts = true,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1
         RETURNING *`,
                [userId]
            );

            if (result.rows.length === 0) {
                // Create preferences with non-essential disabled
                const preferences = await this.createDefaultPreferences(userId);
                return await this.optOutFromAllNonEssential(userId);
            }

            logger.info('User opted out from all non-essential notifications:', { userId });
            return result.rows[0];
        } catch (error) {
            logger.error('Failed to opt out from non-essential notifications:', error);
            throw createError('Failed to opt out from non-essential notifications', 500);
        }
    }

    /**
     * Get users who have opted in for a specific notification type
     */
    public async getUsersOptedInFor(
        notificationType: string,
        userIds?: string[]
    ): Promise<string[]> {
        try {
            let query = `
        SELECT user_id 
        FROM notification_preferences 
        WHERE ${notificationType} = true
      `;

            const params: any[] = [];

            if (userIds && userIds.length > 0) {
                query += ' AND user_id = ANY($1)';
                params.push(userIds);
            }

            const result = await db.query(query, params);
            return result.rows.map(row => row.user_id);
        } catch (error) {
            logger.error('Failed to get users opted in for notification type:', error);
            throw createError('Failed to get opted-in users', 500);
        }
    }

    /**
     * Bulk update notification preferences for multiple users
     */
    public async bulkUpdatePreferences(
        updates: Array<{ userId: string; preferences: Partial<NotificationPreference> }>
    ): Promise<void> {
        try {
            await db.transaction(async (client) => {
                for (const update of updates) {
                    // Use the existing update method for each user
                    await this.updateUserPreferences(update.userId, update.preferences);
                }
            });

            logger.info('Bulk notification preferences updated:', {
                userCount: updates.length
            });
        } catch (error) {
            logger.error('Failed to bulk update notification preferences:', error);
            throw createError('Failed to bulk update preferences', 500);
        }
    }

    /**
     * Get notification preferences statistics
     */
    public async getPreferencesStats(): Promise<any> {
        try {
            const result = await db.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN email_notifications = true THEN 1 END) as email_enabled,
          COUNT(CASE WHEN sms_notifications = true THEN 1 END) as sms_enabled,
          COUNT(CASE WHEN push_notifications = true THEN 1 END) as push_enabled,
          COUNT(CASE WHEN message_notifications = true THEN 1 END) as message_enabled,
          COUNT(CASE WHEN ticket_notifications = true THEN 1 END) as ticket_enabled,
          COUNT(CASE WHEN marketing_emails = true THEN 1 END) as marketing_enabled,
          COUNT(CASE WHEN order_updates = true THEN 1 END) as order_updates_enabled,
          COUNT(CASE WHEN promotional_offers = true THEN 1 END) as promotional_enabled,
          COUNT(CASE WHEN security_alerts = true THEN 1 END) as security_enabled,
          ROUND(AVG(CASE WHEN email_notifications = true THEN 1 ELSE 0 END) * 100, 2) as email_opt_in_rate,
          ROUND(AVG(CASE WHEN marketing_emails = true THEN 1 ELSE 0 END) * 100, 2) as marketing_opt_in_rate
        FROM notification_preferences
      `);

            return result.rows[0];
        } catch (error) {
            logger.error('Failed to get notification preferences statistics:', error);
            throw createError('Failed to get preferences statistics', 500);
        }
    }

    /**
     * Handle unsubscribe token (for email unsubscribe links)
     */
    public async handleUnsubscribeToken(
        token: string,
        notificationType?: string
    ): Promise<{ success: boolean; userId?: string }> {
        try {
            // In a real implementation, you would decode/verify the token
            // For now, we'll assume the token contains the userId
            // This is a simplified implementation

            // Extract userId from token (implement proper token verification)
            const userId = this.extractUserIdFromToken(token);

            if (!userId) {
                throw createError('Invalid unsubscribe token', 400);
            }

            if (notificationType) {
                // Opt out from specific notification type
                const updates: Partial<NotificationPreference> = {};
                updates[notificationType as keyof NotificationPreference] = false as any;
                await this.updateUserPreferences(userId, updates);
            } else {
                // Opt out from all marketing
                await this.optOutFromMarketing(userId);
            }

            logger.info('User unsubscribed via token:', {
                userId,
                notificationType: notificationType || 'marketing'
            });

            return { success: true, userId };
        } catch (error) {
            logger.error('Failed to handle unsubscribe token:', error);
            return { success: false };
        }
    }

    /**
     * Generate unsubscribe token for user
     */
    public generateUnsubscribeToken(
        userId: string,
        notificationType?: string
    ): string {
        // In a real implementation, you would create a secure token
        // This is a simplified implementation
        const payload = {
            userId,
            notificationType,
            timestamp: Date.now()
        };

        // Use proper JWT or similar secure token generation
        return Buffer.from(JSON.stringify(payload)).toString('base64');
    }

    /**
     * Helper method to convert snake_case to camelCase
     */
    private snakeToCamel(str: string): string {
        return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
    }

    /**
     * Helper method to extract userId from unsubscribe token
     */
    private extractUserIdFromToken(token: string): string | null {
        try {
            const payload = JSON.parse(Buffer.from(token, 'base64').toString());
            return payload.userId || null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Delete user notification preferences (for GDPR compliance)
     */
    public async deleteUserPreferences(userId: string): Promise<void> {
        try {
            await db.query(
                'DELETE FROM notification_preferences WHERE user_id = $1',
                [userId]
            );

            logger.info('User notification preferences deleted:', { userId });
        } catch (error) {
            logger.error('Failed to delete user notification preferences:', error);
            throw createError('Failed to delete notification preferences', 500);
        }
    }

    /**
     * Export user notification preferences (for GDPR compliance)
     */
    public async exportUserPreferences(userId: string): Promise<NotificationPreference | null> {
        try {
            const result = await db.query(
                'SELECT * FROM notification_preferences WHERE user_id = $1',
                [userId]
            );

            return result.rows.length > 0 ? result.rows[0] : null;
        } catch (error) {
            logger.error('Failed to export user notification preferences:', error);
            throw createError('Failed to export notification preferences', 500);
        }
    }
}

export default new NotificationPreferenceService();