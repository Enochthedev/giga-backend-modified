import { Router } from 'express';
import { VendorController } from '../controllers/vendor.controller';
import { authenticateToken } from '../middleware/auth.middleware';


const router = Router();

// All vendor routes require authentication
router.use(authenticateToken);

// Vendor registration and profile management
router.post('/register', VendorController.registerVendor);
router.get('/profile', VendorController.getVendorProfile);
router.put('/profile', VendorController.updateVendorProfile);

// Vendor dashboard
router.get('/dashboard/stats', VendorController.getDashboardStats);
router.get('/dashboard/sales-report', VendorController.getSalesReport);

// Product approval workflow
router.post('/products/submit-for-approval', VendorController.submitProductForApproval);

// Notifications
router.get('/notifications', VendorController.getNotifications);
router.patch('/notifications/:notificationId/read', VendorController.markNotificationAsRead);

export { router as vendorRoutes };