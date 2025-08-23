import { Router } from 'express';
import productRoutes from './products';
import cartRoutes from './cart';
import orderRoutes from './orders';
import categoryRoutes from './categories';
import reviewRoutes from './reviews';
import recommendationRoutes from './recommendations';
import checkoutRoutes from './checkout';
import inventoryRoutes from './inventory';
import { vendorRoutes } from './vendor.routes';
import { adminVendorRoutes } from './admin-vendor.routes';

const router = Router();

// Mount all routes
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/categories', categoryRoutes);
router.use('/reviews', reviewRoutes);
router.use('/recommendations', recommendationRoutes);
router.use('/checkout', checkoutRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/vendor', vendorRoutes);
router.use('/admin', adminVendorRoutes);

// Health check endpoint
router.get('/health', (_req, res) => {
    res.json({
        success: true,
        message: 'Ecommerce service is healthy',
        timestamp: new Date().toISOString(),
        service: 'ecommerce-backend'
    });
});

export default router;