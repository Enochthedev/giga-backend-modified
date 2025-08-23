import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { PERMISSIONS } from '../types/admin.types';

const router = Router();

// Public routes (no authentication required)
router.post('/login', AdminController.login);

// Protected routes (authentication required)
router.use(AuthMiddleware.authenticate);

// Profile routes
router.get('/profile', AdminController.getProfile);
router.post('/logout', AdminController.logout);

// Admin user management routes (require admin permissions)
router.get('/users',
    AuthMiddleware.requirePermission(PERMISSIONS.ADMIN_READ),
    AdminController.getAdminUsers
);

router.get('/users/:adminId',
    AuthMiddleware.requirePermission(PERMISSIONS.ADMIN_READ),
    AdminController.getAdminById
);

router.post('/users',
    AuthMiddleware.requirePermission(PERMISSIONS.ADMIN_WRITE),
    AdminController.createAdminUser
);

router.put('/users/:adminId',
    AuthMiddleware.requirePermission(PERMISSIONS.ADMIN_WRITE),
    AdminController.updateAdminUser
);

// Role management routes
router.get('/roles',
    AuthMiddleware.requirePermission(PERMISSIONS.ADMIN_READ),
    AdminController.getRoles
);

router.post('/roles',
    AuthMiddleware.requirePermission(PERMISSIONS.ADMIN_WRITE),
    AdminController.createRole
);

// Audit log routes
router.get('/audit-logs',
    AuthMiddleware.requirePermission(PERMISSIONS.AUDIT_READ),
    AdminController.getAuditLogs
);

router.get('/audit-logs/stats',
    AuthMiddleware.requirePermission(PERMISSIONS.AUDIT_READ),
    AdminController.getAuditStats
);

router.get('/audit-logs/export',
    AuthMiddleware.requirePermission(PERMISSIONS.AUDIT_READ),
    AdminController.exportAuditLogs
);

export { router as adminRoutes };