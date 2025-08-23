import { Router } from 'express';
import { InventoryController } from '../controllers/inventory.controller';
import { authenticateToken, requireRoles } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
    InventoryAdjustmentSchema,
    UpdateLowStockThresholdSchema,
    BulkInventoryUpdateSchema,
    InventoryQuerySchema
} from '../validation/inventory.validation';
import { BulkStockValidationSchema } from '../validation/checkout.validation';

const router = Router();

// Public routes
router.post('/validate-stock',
    validate({ body: BulkStockValidationSchema }),
    InventoryController.validateCartStock
);

router.get('/stock-level',
    InventoryController.getStockLevel
);

router.post('/bulk-stock-levels',
    validate({ body: BulkStockValidationSchema }),
    InventoryController.getBulkStockLevels
);

// Protected routes
router.use(authenticateToken);

router.get('/',
    InventoryController.getInventory
);

router.get('/movements',
    validate({ query: InventoryQuerySchema }),
    InventoryController.getInventoryMovements
);

// Admin/Vendor routes
router.post('/adjust',
    requireRoles(['admin', 'vendor']),
    validate({ body: InventoryAdjustmentSchema }),
    InventoryController.adjustInventory
);

router.get('/low-stock',
    requireRoles(['admin', 'vendor']),
    InventoryController.getLowStockItems
);

router.get('/alerts',
    requireRoles(['admin', 'vendor']),
    InventoryController.getInventoryAlerts
);

router.put('/low-stock-threshold',
    requireRoles(['admin', 'vendor']),
    validate({ body: UpdateLowStockThresholdSchema }),
    InventoryController.updateLowStockThreshold
);

// Admin only routes
router.post('/bulk-update',
    requireRoles(['admin']),
    validate({ body: BulkInventoryUpdateSchema }),
    InventoryController.bulkInventoryUpdate
);

export default router;