import { Router } from 'express';
import { NotificationController } from '../controllers/notification-controller';
import { asyncHandler } from '../middleware/error-middleware';

const router = Router();
const notificationController = new NotificationController();

// Send single notification
router.post('/send', asyncHandler(notificationController.sendNotification.bind(notificationController)));

// Send bulk notifications
router.post('/send-bulk', asyncHandler(notificationController.sendBulkNotifications.bind(notificationController)));

// Get notification history for a user
router.get('/history/:userId', asyncHandler(notificationController.getNotificationHistory.bind(notificationController)));

// Mark notification as read
router.patch('/:id/read', asyncHandler(notificationController.markAsRead.bind(notificationController)));

// Retry failed notification
router.post('/:id/retry', asyncHandler(notificationController.retryNotification.bind(notificationController)));

// User preferences
router.get('/preferences/:userId', asyncHandler(notificationController.getUserPreferences.bind(notificationController)));
router.put('/preferences/:userId', asyncHandler(notificationController.updateUserPreferences.bind(notificationController)));

// Templates
router.get('/templates/:name', asyncHandler(notificationController.getTemplate.bind(notificationController)));

export { router as notificationRoutes };