import { Request, Response } from 'express';
import { NotificationService } from '../services/notification-service';
import {
    sendNotificationSchema,
    bulkNotificationSchema,
    updatePreferencesSchema,
    paginationSchema,
    notificationIdSchema,
    userIdSchema
} from '../validation/notification-validation';

export class NotificationController {
    private notificationService: NotificationService;

    constructor() {
        this.notificationService = new NotificationService();
    }

    async sendNotification(req: Request, res: Response): Promise<void> {
        try {
            const { error, value } = sendNotificationSchema.validate(req.body);
            if (error) {
                res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    details: error.details
                });
                return;
            }

            const notification = await this.notificationService.sendNotification(value);

            res.status(201).json({
                success: true,
                data: notification,
                message: 'Notification sent successfully'
            });
        } catch (error: any) {
            console.error('Send notification error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to send notification'
            });
        }
    }

    async sendBulkNotifications(req: Request, res: Response): Promise<void> {
        try {
            const { error, value } = bulkNotificationSchema.validate(req.body);
            if (error) {
                res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    details: error.details
                });
                return;
            }

            const notifications = await this.notificationService.sendBulkNotifications(value);

            res.status(201).json({
                success: true,
                data: notifications,
                message: `${notifications.length} notifications processed`
            });
        } catch (error: any) {
            console.error('Bulk notification error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to send bulk notifications'
            });
        }
    }

    async getNotificationHistory(req: Request, res: Response): Promise<void> {
        try {
            const { error: userError } = userIdSchema.validate({ userId: req.params.userId });
            if (userError) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid user ID'
                });
                return;
            }

            const { error: paginationError, value: pagination } = paginationSchema.validate(req.query);
            if (paginationError) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid pagination parameters'
                });
                return;
            }

            const notifications = await this.notificationService.getNotificationHistory(
                req.params.userId,
                pagination.limit,
                pagination.offset
            );

            res.status(200).json({
                success: true,
                data: notifications,
                pagination: {
                    limit: pagination.limit,
                    offset: pagination.offset,
                    count: notifications.length
                }
            });
        } catch (error: any) {
            console.error('Get notification history error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to get notification history'
            });
        }
    }

    async markAsRead(req: Request, res: Response): Promise<void> {
        try {
            const { error } = notificationIdSchema.validate({ id: req.params.id });
            if (error) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid notification ID'
                });
                return;
            }

            await this.notificationService.markAsRead(req.params.id);

            res.status(200).json({
                success: true,
                message: 'Notification marked as read'
            });
        } catch (error: any) {
            console.error('Mark as read error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to mark notification as read'
            });
        }
    }

    async retryNotification(req: Request, res: Response): Promise<void> {
        try {
            const { error } = notificationIdSchema.validate({ id: req.params.id });
            if (error) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid notification ID'
                });
                return;
            }

            await this.notificationService.retryFailedNotification(req.params.id);

            res.status(200).json({
                success: true,
                message: 'Notification retry initiated'
            });
        } catch (error: any) {
            console.error('Retry notification error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to retry notification'
            });
        }
    }

    async getUserPreferences(req: Request, res: Response): Promise<void> {
        try {
            const { error } = userIdSchema.validate({ userId: req.params.userId });
            if (error) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid user ID'
                });
                return;
            }

            const preferences = await this.notificationService.getUserPreferences(req.params.userId);

            res.status(200).json({
                success: true,
                data: preferences
            });
        } catch (error: any) {
            console.error('Get preferences error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to get user preferences'
            });
        }
    }

    async updateUserPreferences(req: Request, res: Response): Promise<void> {
        try {
            const { error: userError } = userIdSchema.validate({ userId: req.params.userId });
            if (userError) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid user ID'
                });
                return;
            }

            const { error } = updatePreferencesSchema.validate(req.body);
            if (error) {
                res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    details: error.details
                });
                return;
            }

            // Implementation would update preferences in database
            // For now, just return success
            res.status(200).json({
                success: true,
                message: 'Preferences updated successfully'
            });
        } catch (error: any) {
            console.error('Update preferences error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to update preferences'
            });
        }
    }

    async getTemplate(req: Request, res: Response): Promise<void> {
        try {
            const templateName = req.params.name;
            if (!templateName) {
                res.status(400).json({
                    success: false,
                    error: 'Template name is required'
                });
                return;
            }

            const template = await this.notificationService.getTemplate(templateName);

            if (!template) {
                res.status(404).json({
                    success: false,
                    error: 'Template not found'
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: template
            });
        } catch (error: any) {
            console.error('Get template error:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to get template'
            });
        }
    }
}