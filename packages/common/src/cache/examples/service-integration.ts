import express from 'express';
import session from 'express-session';
import {
    CacheInitializer,
    cacheMiddleware,
    RedisSessionStore,
    realtimeCache,
    invalidationManager,
    CacheSettings
} from '../index';

/**
 * Example: Setting up Redis caching in an Express service
 */
export class ServiceCacheSetup {
    private app: express.Application;

    constructor(app: express.Application) {
        this.app = app;
    }

    /**
     * Initialize cache for the service
     */
    async initializeCache(): Promise<void> {
        // Initialize Redis connection
        await CacheInitializer.initializeWithHealthCheck();

        // Set up session store
        this.setupSessionStore();

        // Set up API response caching
        this.setupApiCaching();

        // Set up real-time data caching
        this.setupRealtimeCaching();

        // Set up cache invalidation
        this.setupCacheInvalidation();
    }

    /**
     * Set up Redis session store
     */
    private setupSessionStore(): void {
        const sessionStore = new RedisSessionStore({
            prefix: 'sess:',
            ttl: 86400, // 24 hours
        });

        this.app.use(session({
            store: sessionStore,
            secret: process.env.SESSION_SECRET || 'your-secret-key',
            resave: false,
            saveUninitialized: false,
            cookie: {
                secure: process.env.NODE_ENV === 'production',
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000, // 24 hours
            },
        }));
    }

    /**
     * Set up API response caching middleware
     */
    private setupApiCaching(): void {
        // Cache product listings for 5 minutes
        this.app.get('/api/products',
            cacheMiddleware({
                ttl: CacheSettings.TTL.MEDIUM,
                tags: [CacheSettings.TAGS.PRODUCTS],
                varyBy: ['authorization'],
            }),
            this.getProducts.bind(this)
        );

        // Cache individual product details for 1 hour
        this.app.get('/api/products/:id',
            cacheMiddleware({
                ttl: CacheSettings.TTL.LONG,
                tags: [CacheSettings.TAGS.PRODUCTS],
                keyGenerator: (req) => `product:${req.params.id}`,
            }),
            this.getProduct.bind(this)
        );

        // Cache search results for 5 minutes
        this.app.get('/api/search',
            cacheMiddleware({
                ttl: CacheSettings.TTL.MEDIUM,
                tags: [CacheSettings.TAGS.SEARCH],
                condition: (req, res) => res.statusCode === 200,
            }),
            this.searchProducts.bind(this)
        );

        // Don't cache user-specific data
        this.app.get('/api/users/:id/orders',
            cacheMiddleware({
                skipCache: (req) => true, // Always skip for user data
            }),
            this.getUserOrders.bind(this)
        );
    }

    /**
     * Set up real-time data caching
     */
    private setupRealtimeCaching(): void {
        // Driver location updates
        this.app.post('/api/drivers/:id/location', async (req, res) => {
            const { id } = req.params;
            const locationData = req.body;

            await realtimeCache.updateDriverLocation(id, {
                ...locationData,
                timestamp: Date.now(),
            });

            res.json({ success: true });
        });

        // Get nearby drivers
        this.app.get('/api/drivers/nearby', async (req, res) => {
            const { lat, lng, radius = 5 } = req.query;

            const nearbyDrivers = await realtimeCache.findNearbyDrivers(
                parseFloat(lat as string),
                parseFloat(lng as string),
                parseFloat(radius as string)
            );

            res.json(nearbyDrivers);
        });

        // Inventory updates
        this.app.post('/api/products/:id/inventory', async (req, res) => {
            const { id } = req.params;
            const inventoryData = req.body;

            await realtimeCache.updateInventory(id, {
                ...inventoryData,
                lastUpdated: Date.now(),
            });

            // Trigger cache invalidation for product
            await invalidationManager.invalidate({
                type: 'inventory.updated',
                entityId: id,
                entityType: 'product',
                data: inventoryData,
                timestamp: Date.now(),
            });

            res.json({ success: true });
        });
    }

    /**
     * Set up cache invalidation handlers
     */
    private setupCacheInvalidation(): void {
        // Listen for product updates
        this.app.post('/api/products/:id', async (req, res) => {
            const { id } = req.params;

            // Update product logic here...

            // Invalidate related caches
            await invalidationManager.invalidate({
                type: 'product.updated',
                entityId: id,
                entityType: 'product',
                data: req.body,
                timestamp: Date.now(),
            });

            res.json({ success: true });
        });

        // Listen for user updates
        this.app.put('/api/users/:id', async (req, res) => {
            const { id } = req.params;

            // Update user logic here...

            // Invalidate user-related caches
            await invalidationManager.invalidate({
                type: 'user.updated',
                entityId: id,
                entityType: 'user',
                data: req.body,
                timestamp: Date.now(),
            });

            res.json({ success: true });
        });
    }

    /**
     * Example route handlers
     */
    private async getProducts(req: express.Request, res: express.Response): Promise<void> {
        // Simulate product fetching
        const products = [
            { id: 1, name: 'Product 1', price: 100 },
            { id: 2, name: 'Product 2', price: 200 },
        ];
        res.json(products);
    }

    private async getProduct(req: express.Request, res: express.Response): Promise<void> {
        const { id } = req.params;
        // Simulate product fetching
        const product = { id, name: `Product ${id}`, price: 100 };
        res.json(product);
    }

    private async searchProducts(req: express.Request, res: express.Response): Promise<void> {
        const { q } = req.query;
        // Simulate search
        const results = [
            { id: 1, name: `Search result for ${q}`, price: 100 },
        ];
        res.json(results);
    }

    private async getUserOrders(req: express.Request, res: express.Response): Promise<void> {
        const { id } = req.params;
        // Simulate user orders fetching
        const orders = [
            { id: 1, userId: id, total: 100, status: 'completed' },
        ];
        res.json(orders);
    }
}

/**
 * Example: Using cache decorators in service classes
 */
export class ProductService {
    /**
     * Cache expensive product calculations
     */
    @cacheable({ ttl: CacheSettings.TTL.LONG })
    async calculateProductRecommendations(userId: string): Promise<any[]> {
        // Expensive ML calculation here
        console.log(`Calculating recommendations for user ${userId}`);

        // Simulate expensive operation
        await new Promise(resolve => setTimeout(resolve, 1000));

        return [
            { id: 1, name: 'Recommended Product 1', score: 0.95 },
            { id: 2, name: 'Recommended Product 2', score: 0.87 },
        ];
    }

    /**
     * Cache product analytics
     */
    @cacheable({ ttl: CacheSettings.TTL.MEDIUM })
    async getProductAnalytics(productId: string): Promise<any> {
        console.log(`Fetching analytics for product ${productId}`);

        // Simulate analytics calculation
        return {
            views: 1250,
            purchases: 45,
            conversionRate: 0.036,
            revenue: 4500,
        };
    }
}

/**
 * Example: Real-time inventory management
 */
export class InventoryManager {
    /**
     * Reserve inventory with real-time updates
     */
    async reserveProduct(productId: string, quantity: number): Promise<boolean> {
        const success = await realtimeCache.reserveInventory(productId, quantity);

        if (success) {
            // Trigger cache invalidation
            await invalidationManager.invalidate({
                type: 'inventory.reserved',
                entityId: productId,
                entityType: 'product',
                data: { quantity },
                timestamp: Date.now(),
            });
        }

        return success;
    }

    /**
     * Get real-time inventory status
     */
    async getInventoryStatus(productIds: string[]): Promise<Record<string, any>> {
        return await realtimeCache.getMultipleInventories(productIds);
    }

    /**
     * Monitor low stock products
     */
    async getLowStockAlerts(): Promise<string[]> {
        return await realtimeCache.getLowStockProducts();
    }
}

/**
 * Example: Driver tracking service
 */
export class DriverTrackingService {
    /**
     * Update driver location and status
     */
    async updateDriverStatus(driverId: string, status: any): Promise<void> {
        await realtimeCache.updateDriverStatus(driverId, status);

        // Trigger location-based cache invalidation
        await invalidationManager.invalidate({
            type: 'driver.status.updated',
            entityId: driverId,
            entityType: 'driver',
            data: status,
            timestamp: Date.now(),
        });
    }

    /**
     * Find available drivers near location
     */
    async findAvailableDrivers(lat: number, lng: number, radius: number = 5): Promise<any[]> {
        return await realtimeCache.getAvailableDriversNear(lat, lng, radius);
    }

    /**
     * Get real-time driver statistics
     */
    async getDriverStats(): Promise<any> {
        return await realtimeCache.getRealtimeStats();
    }
}