import { Router } from 'express';
import { UserManagementController } from '../controllers/user-management.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { PERMISSIONS } from '../types/admin.types';

const router = Router();

// Protected routes (authentication required)
router.use(AuthMiddleware.authenticate);

// User management routes
router.get('/search',
    AuthMiddleware.requirePermission(PERMISSIONS.USERS_READ),
    UserManagementController.searchUsers
);

router.get('/dashboard-stats',
    AuthMiddleware.requireAnyPermission([PERMISSIONS.USERS_READ, PERMISSIONS.SYSTEM_READ]),
    UserManagementController.getDashboardStats
);

router.get('/export',
    AuthMiddleware.requirePermission(PERMISSIONS.USERS_READ),
    UserManagementController.exportUserData
);

router.get('/stats-by-service',
    AuthMiddleware.requirePermission(PERMISSIONS.USERS_READ),
    UserManagementController.getUserStatsByService
);

router.post('/sync',
    AuthMiddleware.requirePermission(PERMISSIONS.SYSTEM_WRITE),
    UserManagementController.syncUserData
);

router.get('/:userId/activity',
    AuthMiddleware.requirePermission(PERMISSIONS.USERS_READ),
    UserManagementController.getUserActivitySummary
);

router.patch('/:userId/status',
    AuthMiddleware.requirePermission(PERMISSIONS.USERS_WRITE),
    UserManagementController.updateUserStatus
);

router.get('/:serviceName/:userId',
    AuthMiddleware.requirePermission(PERMISSIONS.USERS_READ),
    UserManagementController.getUserFromService
);

export { router as userManagementRoutes };