import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth-middleware';
import notificationPreferenceService from '../services/notification-preference-service';
import logger from '../utils/logger';
import { asyncHandler } from '../middleware/error-middleware';

/**
 * Controller for notification preferences and opt-out management
 * Handles user notification settings and unsubscribe functionality
 */
class NotificationPreferenceController {
    /**
     * Get user notification preferences
     */
    public getUserPreferences = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const userId = req.user!.id;

        const preferences = await notificationPreferenceService.getUserPreferences(userId);

        res.json({
            success: true,
            data: preferences
        });
    });

    /**
     * Update user notification preferences
     */
    public updateUserPreferences = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const userId = req.user!.id;
        const preferences = req.body;

        const updatedPreferences = await notificationPreferenceService.updateUserPreferences(
            userId,
            preferences
        );

        res.json({
            success: true,
            data: updatedPreferences,
            message: 'Notification preferences updated successfully'
        });
    });

    /**
     * Opt out from marketing communications
     */
    public optOutFromMarketing = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const userId = req.user!.id;

        const preferences = await notificationPreferenceService.optOutFromMarketing(userId);

        res.json({
            success: true,
            data: preferences,
            message: 'Successfully opted out from marketing communications'
        });
    });

    /**
     * Opt out from all non-essential notifications
     */
    public optOutFromAllNonEssential = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const userId = req.user!.id;

        const preferences = await notificationPreferenceService.optOutFromAllNonEssential(userId);

        res.json({
            success: true,
            data: preferences,
            message: 'Successfully opted out from all non-essential notifications'
        });
    });

    /**
     * Check if user has opted in for specific notification type
     */
    public checkOptInStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const userId = req.user!.id;
        const { notificationType } = req.params;

        const hasOptedIn = await notificationPreferenceService.hasOptedIn(
            userId,
            notificationType as any
        );

        res.json({
            success: true,
            data: {
                notificationType,
                hasOptedIn
            }
        });
    });

    /**
     * Handle unsubscribe via token (for email unsubscribe links)
     */
    public handleUnsubscribeToken = asyncHandler(async (req: Request, res: Response) => {
        const { token } = req.params;
        const { notificationType } = req.query;

        const result = await notificationPreferenceService.handleUnsubscribeToken(
            token,
            notificationType as string
        );

        if (result.success) {
            // Return HTML page for better user experience
            res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Unsubscribed Successfully</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .container { max-width: 600px; margin: 0 auto; }
            .success { color: #28a745; }
            .btn { background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="success">✓ Unsubscribed Successfully</h1>
            <p>You have been successfully unsubscribed from ${notificationType || 'marketing'} notifications.</p>
            <p>You can update your notification preferences anytime by logging into your account.</p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" class="btn">Return to Website</a>
          </div>
        </body>
        </html>
      `);
        } else {
            res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Unsubscribe Failed</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .container { max-width: 600px; margin: 0 auto; }
            .error { color: #dc3545; }
            .btn { background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="error">✗ Unsubscribe Failed</h1>
            <p>The unsubscribe link is invalid or has expired.</p>
            <p>Please contact support if you continue to receive unwanted emails.</p>
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" class="btn">Return to Website</a>
          </div>
        </body>
        </html>
      `);
        }
    });

    /**
     * Generate unsubscribe token for user
     */
    public generateUnsubscribeToken = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const userId = req.user!.id;
        const { notificationType } = req.body;

        const token = notificationPreferenceService.generateUnsubscribeToken(
            userId,
            notificationType
        );

        res.json({
            success: true,
            data: {
                token,
                unsubscribeUrl: `${req.protocol}://${req.get('host')}/api/notifications/unsubscribe/${token}${notificationType ? `?notificationType=${notificationType}` : ''
                    }`
            }
        });
    });

    /**
     * Get notification preferences statistics (admin only)
     */
    public getPreferencesStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const userRole = req.user!.role;

        if (userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        const stats = await notificationPreferenceService.getPreferencesStats();

        res.json({
            success: true,
            data: stats
        });
    });

    /**
     * Bulk update notification preferences (admin only)
     */
    public bulkUpdatePreferences = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const userRole = req.user!.role;

        if (userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        const { updates } = req.body;

        await notificationPreferenceService.bulkUpdatePreferences(updates);

        res.json({
            success: true,
            message: 'Bulk notification preferences updated successfully'
        });
    });

    /**
     * Get users opted in for specific notification type (admin only)
     */
    public getUsersOptedInFor = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const userRole = req.user!.role;

        if (userRole !== 'admin' && userRole !== 'support') {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        const { notificationType } = req.params;
        const { userIds } = req.query;

        const optedInUserIds = await notificationPreferenceService.getUsersOptedInFor(
            notificationType,
            userIds ? (Array.isArray(userIds) ? userIds : [userIds]) as string[] : undefined
        );

        res.json({
            success: true,
            data: {
                notificationType,
                optedInUserIds,
                count: optedInUserIds.length
            }
        });
    });

    /**
     * Export user notification preferences (GDPR compliance)
     */
    public exportUserPreferences = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const userId = req.user!.id;

        const preferences = await notificationPreferenceService.exportUserPreferences(userId);

        res.json({
            success: true,
            data: preferences,
            message: 'Notification preferences exported successfully'
        });
    });

    /**
     * Delete user notification preferences (GDPR compliance)
     */
    public deleteUserPreferences = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const userId = req.user!.id;
        const userRole = req.user!.role;

        // Allow users to delete their own preferences or admin to delete any
        const targetUserId = req.params.userId || userId;

        if (targetUserId !== userId && userRole !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        await notificationPreferenceService.deleteUserPreferences(targetUserId);

        res.json({
            success: true,
            message: 'Notification preferences deleted successfully'
        });
    });

    /**
     * Reset notification preferences to default
     */
    public resetToDefaults = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const userId = req.user!.id;

        // Delete existing preferences
        await notificationPreferenceService.deleteUserPreferences(userId);

        // Create new default preferences
        const preferences = await notificationPreferenceService.createDefaultPreferences(userId);

        res.json({
            success: true,
            data: preferences,
            message: 'Notification preferences reset to defaults successfully'
        });
    });

    /**
     * Get notification preference options/metadata
     */
    public getPreferenceOptions = asyncHandler(async (req: Request, res: Response) => {
        const options = {
            notificationTypes: [
                {
                    key: 'emailNotifications',
                    label: 'Email Notifications',
                    description: 'Receive notifications via email'
                },
                {
                    key: 'smsNotifications',
                    label: 'SMS Notifications',
                    description: 'Receive notifications via SMS'
                },
                {
                    key: 'pushNotifications',
                    label: 'Push Notifications',
                    description: 'Receive browser/mobile push notifications'
                },
                {
                    key: 'messageNotifications',
                    label: 'Message Notifications',
                    description: 'Notifications for new messages and conversations'
                },
                {
                    key: 'ticketNotifications',
                    label: 'Support Ticket Notifications',
                    description: 'Updates on your support tickets'
                },
                {
                    key: 'orderUpdates',
                    label: 'Order Updates',
                    description: 'Notifications about order status changes'
                },
                {
                    key: 'securityAlerts',
                    label: 'Security Alerts',
                    description: 'Important security-related notifications (recommended)'
                }
            ],
            marketingTypes: [
                {
                    key: 'marketingEmails',
                    label: 'Marketing Emails',
                    description: 'Promotional emails and newsletters'
                },
                {
                    key: 'promotionalOffers',
                    label: 'Promotional Offers',
                    description: 'Special deals and discount notifications'
                }
            ]
        };

        res.json({
            success: true,
            data: options
        });
    });
}

export default new NotificationPreferenceController();