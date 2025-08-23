import { Router } from 'express';
import { ConfigurationController } from '../controllers/configuration.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { PERMISSIONS } from '../types/admin.types';

const router = Router();

// Protected routes (authentication required)
router.use(AuthMiddleware.authenticate);

// Configuration management routes
router.get('/categories',
    AuthMiddleware.requirePermission(PERMISSIONS.SYSTEM_READ),
    ConfigurationController.getCategories
);

router.get('/export',
    AuthMiddleware.requirePermission(PERMISSIONS.SYSTEM_READ),
    ConfigurationController.exportConfigurations
);

router.post('/import',
    AuthMiddleware.requirePermission(PERMISSIONS.SYSTEM_WRITE),
    ConfigurationController.importConfigurations
);

router.post('/bulk-update',
    AuthMiddleware.requirePermission(PERMISSIONS.SYSTEM_WRITE),
    ConfigurationController.bulkUpdateConfigurations
);

router.get('/:category',
    AuthMiddleware.requirePermission(PERMISSIONS.SYSTEM_READ),
    ConfigurationController.getConfigurationsByCategory
);

router.get('/:category/:key',
    AuthMiddleware.requirePermission(PERMISSIONS.SYSTEM_READ),
    ConfigurationController.getConfiguration
);

router.get('/:category/:key/value',
    AuthMiddleware.requirePermission(PERMISSIONS.SYSTEM_READ),
    ConfigurationController.getConfigurationValue
);

router.put('/:category/:key',
    AuthMiddleware.requirePermission(PERMISSIONS.SYSTEM_WRITE),
    ConfigurationController.setConfiguration
);

router.delete('/:category/:key',
    AuthMiddleware.requirePermission(PERMISSIONS.SYSTEM_WRITE),
    ConfigurationController.deleteConfiguration
);

export { router as configurationRoutes };