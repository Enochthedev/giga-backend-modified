import { Router } from 'express';
import { SystemHealthController } from '../controllers/system-health.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { PERMISSIONS } from '../types/admin.types';

const router = Router();

// Public health check endpoint
router.get('/health', SystemHealthController.healthCheck);

// Protected routes (authentication required)
router.use(AuthMiddleware.authenticate);

// System health monitoring routes
router.get('/system',
    AuthMiddleware.requirePermission(PERMISSIONS.SYSTEM_READ),
    SystemHealthController.getSystemHealth
);

router.get('/services/:serviceName/metrics',
    AuthMiddleware.requirePermission(PERMISSIONS.SYSTEM_READ),
    SystemHealthController.getServiceMetrics
);

router.get('/performance',
    AuthMiddleware.requirePermission(PERMISSIONS.SYSTEM_READ),
    SystemHealthController.getPerformanceSummary
);

router.post('/metrics',
    AuthMiddleware.requirePermission(PERMISSIONS.SYSTEM_WRITE),
    SystemHealthController.recordMetric
);

router.delete('/metrics/cleanup',
    AuthMiddleware.requirePermission(PERMISSIONS.SYSTEM_WRITE),
    SystemHealthController.cleanupMetrics
);

export { router as systemHealthRoutes };