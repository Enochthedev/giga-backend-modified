import { Router } from 'express';
import notificationPreferenceController from '../controllers/notification-preference-controller';
import { authenticateToken, requireRole } from '../middleware/auth-middleware';
import { validateNotificationPreferences, validateUUID } from '../middleware/validation-middleware';

const router = Router();

// Public routes (no authentication required)
router.get('/unsubscribe/:token', notificationPreferenceController.handleUnsubscribeToken);
router.get('/options', notificationPreferenceController.getPreferenceOptions);

// Authenticated routes
router.use(authenticateToken);

// User preference management
router.get('/', notificationPreferenceController.getUserPreferences);
router.put('/', validateNotificationPreferences, notificationPreferenceController.updateUserPreferences);
router.post('/opt-out/marketing', notificationPreferenceController.optOutFromMarketing);
router.post('/opt-out/all-non-essential', notificationPreferenceController.optOutFromAllNonEssential);
router.post('/reset-defaults', notificationPreferenceController.resetToDefaults);
router.get('/check/:notificationType', notificationPreferenceController.checkOptInStatus);
router.post('/generate-unsubscribe-token', notificationPreferenceController.generateUnsubscribeToken);

// GDPR compliance routes
router.get('/export', notificationPreferenceController.exportUserPreferences);
router.delete('/', notificationPreferenceController.deleteUserPreferences);
router.delete('/:userId',
    requireRole(['admin']),
    validateUUID,
    notificationPreferenceController.deleteUserPreferences
);

// Admin and support routes
router.get('/stats',
    requireRole(['admin']),
    notificationPreferenceController.getPreferencesStats
);
router.post('/bulk-update',
    requireRole(['admin']),
    notificationPreferenceController.bulkUpdatePreferences
);
router.get('/opted-in/:notificationType',
    requireRole(['admin', 'support']),
    notificationPreferenceController.getUsersOptedInFor
);

export default router;