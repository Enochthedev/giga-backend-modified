import { getRedisClient } from './redis-client';
import { logger } from '../logger';
import { EventEmitter } from 'events';

export interface InvalidationRule {
    pattern: string;
    tags?: string[];
    condition?: (data: any) => boolean;
    delay?: number; // Delay in milliseconds before invalidation
}

export interface InvalidationEvent {
    type: string;
    entityId?: string;
    entityType?: string;
    data?: any;
    timestamp: number;
}

/**
 * Cache invalidation strategy manager
 */
export class CacheInvalidationManager extends EventEmitter {
    private redis = getRedisClient();
    private rules: Map<string, InvalidationRule[]> = new Map();
    private delayedInvalidations: Map<string, NodeJS.Timeout> = new Map();

    constructor() {
        super();
        this.setupEventHandlers();
    }

    private setupEventHandlers(): void {
        // Listen for invalidation events
        this.on('invalidate', this.handleInvalidationEvent.bind(this));
    }

    /**
     * Register invalidation rules for specific events
     */
    registerRule(eventType: string, rule: InvalidationRule): void {
        if (!this.rules.has(eventType)) {
            this.rules.set(eventType, []);
        }
        this.rules.get(eventType)!.push(rule);
        logger.debug(`Registered invalidation rule for event: ${eventType}`);
    }

    /**
     * Register multiple rules at once
     */
    registerRules(rules: Record<string, InvalidationRule[]>): void {
        Object.entries(rules).forEach(([eventType, eventRules]) => {
            eventRules.forEach(rule => this.registerRule(eventType, rule));
        });
    }

    /**
     * Trigger cache invalidation for an event
     */
    async invalidate(event: InvalidationEvent): Promise<void> {
        this.emit('invalidate', event);
    }

    /**
     * Handle invalidation event
     */
    private async handleInvalidationEvent(event: InvalidationEvent): Promise<void> {
        const rules = this.rules.get(event.type);
        if (!rules || rules.length === 0) {
            return;
        }

        logger.debug(`Processing invalidation for event: ${event.type}`);

        for (const rule of rules) {
            try {
                // Check condition if specified
                if (rule.condition && !rule.condition(event.data)) {
                    continue;
                }

                if (rule.delay && rule.delay > 0) {
                    // Delayed invalidation
                    await this.scheduleDelayedInvalidation(event, rule);
                } else {
                    // Immediate invalidation
                    await this.executeInvalidation(event, rule);
                }
            } catch (error) {
                logger.error(`Error processing invalidation rule for event ${event.type}:`, error);
            }
        }
    }

    /**
     * Schedule delayed invalidation
     */
    private async scheduleDelayedInvalidation(event: InvalidationEvent, rule: InvalidationRule): Promise<void> {
        const delayKey = `${event.type}:${event.entityId || 'global'}:${Date.now()}`;

        // Cancel existing delayed invalidation if any
        if (this.delayedInvalidations.has(delayKey)) {
            clearTimeout(this.delayedInvalidations.get(delayKey)!);
        }

        const timeout = setTimeout(async () => {
            await this.executeInvalidation(event, rule);
            this.delayedInvalidations.delete(delayKey);
        }, rule.delay);

        this.delayedInvalidations.set(delayKey, timeout);
        logger.debug(`Scheduled delayed invalidation for ${rule.delay}ms`);
    }

    /**
     * Execute cache invalidation
     */
    private async executeInvalidation(event: InvalidationEvent, rule: InvalidationRule): Promise<void> {
        let invalidatedCount = 0;

        // Invalidate by pattern
        if (rule.pattern) {
            const pattern = this.interpolatePattern(rule.pattern, event);
            invalidatedCount += await this.redis.delPattern(pattern);
            logger.debug(`Invalidated pattern: ${pattern}`);
        }

        // Invalidate by tags
        if (rule.tags && rule.tags.length > 0) {
            const interpolatedTags = rule.tags.map(tag => this.interpolatePattern(tag, event));
            invalidatedCount += await this.invalidateByTags(interpolatedTags);
            logger.debug(`Invalidated tags: ${interpolatedTags.join(', ')}`);
        }

        logger.info(`Invalidated ${invalidatedCount} cache entries for event: ${event.type}`);
    }

    /**
     * Interpolate pattern with event data
     */
    private interpolatePattern(pattern: string, event: InvalidationEvent): string {
        return pattern
            .replace('{entityId}', event.entityId || '*')
            .replace('{entityType}', event.entityType || '*')
            .replace('{type}', event.type);
    }

    /**
     * Invalidate cache by tags
     */
    private async invalidateByTags(tags: string[]): Promise<number> {
        let totalDeleted = 0;

        for (const tag of tags) {
            try {
                const cacheKeys = await this.redis.smembers(`cache:tag:${tag}`);

                if (cacheKeys.length > 0) {
                    // Delete cache entries
                    const deleted = await this.redis.getClient().del(...cacheKeys);
                    totalDeleted += deleted;

                    // Clean up tag set
                    await this.redis.del(`cache:tag:${tag}`);
                }
            } catch (error) {
                logger.error(`Error invalidating cache by tag ${tag}:`, error);
            }
        }

        return totalDeleted;
    }

    /**
     * Clear all delayed invalidations
     */
    clearDelayedInvalidations(): void {
        this.delayedInvalidations.forEach(timeout => clearTimeout(timeout));
        this.delayedInvalidations.clear();
    }
}

/**
 * Predefined invalidation strategies
 */
export class InvalidationStrategies {
    /**
     * User-related invalidation rules
     */
    static getUserRules(): Record<string, InvalidationRule[]> {
        return {
            'user.created': [
                { pattern: 'api:GET:/api/users*' },
                { tags: ['users', 'user-list'] }
            ],
            'user.updated': [
                { pattern: 'api:GET:/api/users/{entityId}*' },
                { pattern: 'api:GET:/api/users*' },
                { tags: ['users', 'user-profile'] }
            ],
            'user.deleted': [
                { pattern: 'api:GET:/api/users/{entityId}*' },
                { pattern: 'api:GET:/api/users*' },
                { tags: ['users', 'user-profile', 'user-list'] }
            ],
            'user.login': [
                { pattern: 'api:GET:/api/users/{entityId}/sessions*' },
                { tags: ['user-sessions'] }
            ],
            'user.logout': [
                { pattern: 'api:GET:/api/users/{entityId}/sessions*' },
                { tags: ['user-sessions'] }
            ]
        };
    }

    /**
     * Product/Ecommerce invalidation rules
     */
    static getEcommerceRules(): Record<string, InvalidationRule[]> {
        return {
            'product.created': [
                { pattern: 'api:GET:/api/products*' },
                { pattern: 'api:GET:/api/categories/*/products*' },
                { tags: ['products', 'product-list', 'search'] }
            ],
            'product.updated': [
                { pattern: 'api:GET:/api/products/{entityId}*' },
                { pattern: 'api:GET:/api/products*' },
                { pattern: 'api:GET:/api/categories/*/products*' },
                { tags: ['products', 'product-details', 'search'] }
            ],
            'product.deleted': [
                { pattern: 'api:GET:/api/products/{entityId}*' },
                { pattern: 'api:GET:/api/products*' },
                { pattern: 'api:GET:/api/categories/*/products*' },
                { tags: ['products', 'product-details', 'product-list', 'search'] }
            ],
            'inventory.updated': [
                { pattern: 'api:GET:/api/products/{entityId}*' },
                { pattern: 'api:GET:/api/products*' },
                { tags: ['products', 'inventory'] },
                { delay: 5000 } // Delay to batch inventory updates
            ],
            'order.created': [
                { pattern: 'api:GET:/api/orders*' },
                { pattern: 'api:GET:/api/users/*/orders*' },
                { tags: ['orders', 'user-orders'] }
            ],
            'order.updated': [
                { pattern: 'api:GET:/api/orders/{entityId}*' },
                { pattern: 'api:GET:/api/orders*' },
                { pattern: 'api:GET:/api/users/*/orders*' },
                { tags: ['orders', 'order-details'] }
            ]
        };
    }

    /**
     * Taxi service invalidation rules
     */
    static getTaxiRules(): Record<string, InvalidationRule[]> {
        return {
            'ride.created': [
                { pattern: 'api:GET:/api/rides*' },
                { pattern: 'api:GET:/api/users/*/rides*' },
                { pattern: 'api:GET:/api/drivers/*/rides*' },
                { tags: ['rides', 'user-rides', 'driver-rides'] }
            ],
            'ride.updated': [
                { pattern: 'api:GET:/api/rides/{entityId}*' },
                { pattern: 'api:GET:/api/rides*' },
                { tags: ['rides', 'ride-details'] }
            ],
            'driver.location.updated': [
                { pattern: 'realtime:driver:{entityId}:location' },
                { pattern: 'api:GET:/api/drivers/nearby*' },
                { tags: ['driver-locations', 'nearby-drivers'] },
                { delay: 1000 } // Batch location updates
            ],
            'driver.status.updated': [
                { pattern: 'api:GET:/api/drivers/{entityId}*' },
                { pattern: 'api:GET:/api/drivers/available*' },
                { tags: ['drivers', 'available-drivers'] }
            ]
        };
    }

    /**
     * Hotel service invalidation rules
     */
    static getHotelRules(): Record<string, InvalidationRule[]> {
        return {
            'property.created': [
                { pattern: 'api:GET:/api/properties*' },
                { pattern: 'api:GET:/api/search/properties*' },
                { tags: ['properties', 'property-list', 'search'] }
            ],
            'property.updated': [
                { pattern: 'api:GET:/api/properties/{entityId}*' },
                { pattern: 'api:GET:/api/properties*' },
                { tags: ['properties', 'property-details', 'search'] }
            ],
            'booking.created': [
                { pattern: 'api:GET:/api/bookings*' },
                { pattern: 'api:GET:/api/properties/{entityId}/availability*' },
                { pattern: 'api:GET:/api/users/*/bookings*' },
                { tags: ['bookings', 'availability', 'user-bookings'] }
            ],
            'booking.cancelled': [
                { pattern: 'api:GET:/api/bookings/{entityId}*' },
                { pattern: 'api:GET:/api/properties/*/availability*' },
                { tags: ['bookings', 'availability'] }
            ]
        };
    }

    /**
     * Payment service invalidation rules
     */
    static getPaymentRules(): Record<string, InvalidationRule[]> {
        return {
            'payment.processed': [
                { pattern: 'api:GET:/api/payments/{entityId}*' },
                { pattern: 'api:GET:/api/users/*/payments*' },
                { tags: ['payments', 'user-payments'] }
            ],
            'payment.failed': [
                { pattern: 'api:GET:/api/payments/{entityId}*' },
                { tags: ['payments'] }
            ],
            'refund.processed': [
                { pattern: 'api:GET:/api/payments/*/refunds*' },
                { pattern: 'api:GET:/api/refunds/{entityId}*' },
                { tags: ['payments', 'refunds'] }
            ]
        };
    }

    /**
     * Get all predefined rules
     */
    static getAllRules(): Record<string, InvalidationRule[]> {
        return {
            ...this.getUserRules(),
            ...this.getEcommerceRules(),
            ...this.getTaxiRules(),
            ...this.getHotelRules(),
            ...this.getPaymentRules()
        };
    }
}

/**
 * Cache warming strategies
 */
export class CacheWarmingManager {
    private redis = getRedisClient();

    /**
     * Warm cache with frequently accessed data
     */
    async warmCache(warmingRules: Array<{
        key: string;
        dataProvider: () => Promise<any>;
        ttl?: number;
    }>): Promise<void> {
        logger.info('Starting cache warming...');

        const promises = warmingRules.map(async (rule) => {
            try {
                const data = await rule.dataProvider();
                await this.redis.set(rule.key, data, rule.ttl || 3600);
                logger.debug(`Warmed cache key: ${rule.key}`);
            } catch (error) {
                logger.error(`Error warming cache key ${rule.key}:`, error);
            }
        });

        await Promise.allSettled(promises);
        logger.info(`Cache warming completed for ${warmingRules.length} keys`);
    }

    /**
     * Preload popular products
     */
    async warmPopularProducts(productService: any): Promise<void> {
        try {
            const popularProducts = await productService.getPopularProducts(50);

            for (const product of popularProducts) {
                const cacheKey = `api:GET:/api/products/${product.id}`;
                await this.redis.set(cacheKey, product, 3600); // 1 hour TTL
            }

            logger.info(`Warmed cache for ${popularProducts.length} popular products`);
        } catch (error) {
            logger.error('Error warming popular products cache:', error);
        }
    }

    /**
     * Preload user sessions
     */
    async warmUserSessions(userService: any): Promise<void> {
        try {
            const activeUsers = await userService.getActiveUsers(100);

            for (const user of activeUsers) {
                const cacheKey = `api:GET:/api/users/${user.id}`;
                await this.redis.set(cacheKey, user, 1800); // 30 minutes TTL
            }

            logger.info(`Warmed cache for ${activeUsers.length} active users`);
        } catch (error) {
            logger.error('Error warming user sessions cache:', error);
        }
    }
}

// Export singleton instances
export const invalidationManager = new CacheInvalidationManager();
export const warmingManager = new CacheWarmingManager();

// Initialize with predefined rules
invalidationManager.registerRules(InvalidationStrategies.getAllRules());