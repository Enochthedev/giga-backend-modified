import { Router } from 'express';
import { AdminVendorController } from '../controllers/admin-vendor.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

const router = Router();

// All admin vendor routes require authentication and admin role
router.use(authenticateToken);
router.use(roleMiddleware(['admin']));

// Vendor management
router.get('/vendors', AdminVendorController.searchVendors);
router.get('/vendors/:vendorId', AdminVendorController.getVendorById);
router.post('/vendors/:vendorId/approve', AdminVendorController.approveVendor);
router.post('/vendors/:vendorId/reject', AdminVendorController.rejectVendor);
router.post('/vendors/:vendorId/suspend', AdminVendorController.suspendVendor);
router.post('/vendors/:vendorId/reactivate', AdminVendorController.reactivateVendor);

// Product approval management
router.get('/product-approvals/pending', AdminVendorController.getPendingProductApprovals);
router.post('/product-approvals/:approvalId/approve', AdminVendorController.approveProduct);
router.post('/product-approvals/:approvalId/reject', AdminVendorController.rejectProduct);
router.post('/product-approvals/:approvalId/request-changes', AdminVendorController.requestProductChanges);

// Commission and payout management
router.put('/vendors/:vendorId/commission', AdminVendorController.updateVendorCommission);
router.post('/vendors/:vendorId/process-payout', AdminVendorController.processVendorPayout);

export { router as adminVendorRoutes };