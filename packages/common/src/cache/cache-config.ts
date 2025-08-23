import { CacheConfig } from './redis-client';
import { logger } from '../logger';

/**
 * Cache configuration factory
 */
export class CacheConfigFactory {
    /**
     * Create Redis configuration from environment variables
     */
    static fromEnvironment(): CacheConfig {
        const config: CacheConfig = {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            db: parseInt(process.env.REDIS_DB || '0'),
            keyPrefix: process.env.REDIS_KEY_PREFIX || 'app:',
            lazyConnect: true,
            maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
            retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100'),
        };

        // Sentinel configuration
        if (process.env.REDIS_SENTINELS) {
            try {
                const sentinels = JSON.parse(process.env.REDIS_SENTINELS);
                config.sentinels = sentinels;
                config.name = process.env.REDIS_SENTINEL_NAME || 'mymaster';
                logger.info('Redis Sentinel configuration loaded');
            } catch (error) {
                logger.error('Error parsing Redis Sentinels configuration:', error);
            }
        }

        // Cluster configuration
        if (process.env.REDIS_CLUSTER_NODES) {
            try {
                const clusterNodes = JSON.parse(process.env.REDIS_CLUSTER_NODES);
                config.cluster = clusterNodes;
                logger.info('Redis Cluster configuration loaded');
            } catch (error) {
                logger.error('Error parsing Redis Cluster configuration:', error);
            }
        }

        return config;
    }

    /**
     * Create development configuration
     */
    static forDevelopment(): CacheConfig {
        return {
            host: 'localhost',
            port: 6379,
            db: 0,
            keyPrefix: 'dev:',
            lazyConnect: true,
            maxRetriesPerRequest: 3,
        };
    }

    /**
     * Create test configuration
     */
    static forTesting(): CacheConfig {
        return {
            host: 'localhost',
            port: 6379,
            db: 15, // Use different DB for tests
            keyPrefix: 'test:',
            lazyConnect: true,
            maxRetriesPerRequest: 1,
        };
    }

    /**
     * Create production configuration with high availability
     */
    static forProduction(): CacheConfig {
        return {
            sentinels: [
                { host: 'redis-sentinel-1', port: 26379 },
                { host: 'redis-sentinel-2', port: 26380 },
                { host: 'redis-sentinel-3', port: 26381 },
            ],
            name: 'mymaster',
            password: process.env.REDIS_PASSWORD,
            keyPrefix: 'prod:',
            lazyConnect: true,
            maxRetriesPerRequest: 5,
            retryDelayOnFailover: 100,
        };
    }

    /**
     * Create cluster configuration
     */
    static forCluster(): CacheConfig {
        return {
            cluster: [
                { host: 'redis-cluster-1', port: 7000 },
                { host: 'redis-cluster-2', port: 7001 },
                { host: 'redis-cluster-3', port: 7002 },
                { host: 'redis-cluster-4', port: 7003 },
                { host: 'redis-cluster-5', port: 7004 },
                { host: 'redis-cluster-6', port: 7005 },
            ],
            password: process.env.REDIS_PASSWORD,
            keyPrefix: 'cluster:',
            lazyConnect: true,
            maxRetriesPerRequest: 3,
        };
    }
}

/**
 * Cache initialization utility
 */
export class CacheInitializer {
    /**
     * Initialize cache with appropriate configuration
     */
    static async initialize(): Promise<void> {
        const environment = process.env.NODE_ENV || 'development';
        let config: CacheConfig;

        switch (environment) {
            case 'production':
                config = CacheConfigFactory.forProduction();
                break;
            case 'test':
                config = CacheConfigFactory.forTesting();
                break;
            case 'development':
            default:
                config = CacheConfigFactory.fromEnvironment();
                break;
        }

        // Override with environment-specific config if available
        if (process.env.REDIS_CLUSTER_NODES) {
            config = CacheConfigFactory.forCluster();
        }

        try {
            const { createRedisClient } = await import('./redis-client');
            const client = createRedisClient(config);

            // Test connection
            const isConnected = await client.ping();
            if (isConnected) {
                logger.info(`Redis cache initialized successfully in ${environment} mode`);
            } else {
                throw new Error('Redis ping failed');
            }
        } catch (error) {
            logger.error('Failed to initialize Redis cache:', error);
            throw error;
        }
    }

    /**
     * Initialize cache with health checks
     */
    static async initializeWithHealthCheck(): Promise<void> {
        await this.initialize();

        // Set up periodic health checks
        setInterval(async () => {
            try {
                const { getRedisClient } = await import('./redis-client');
                const client = getRedisClient();
                const isHealthy = await client.ping();

                if (!isHealthy) {
                    logger.error('Redis health check failed');
                }
            } catch (error) {
                logger.error('Redis health check error:', error);
            }
        }, 30000); // Check every 30 seconds
    }

    /**
     * Graceful shutdown
     */
    static async shutdown(): Promise<void> {
        try {
            const { getRedisClient } = await import('./redis-client');
            const client = getRedisClient();
            await client.disconnect();
            logger.info('Redis cache disconnected gracefully');
        } catch (error) {
            logger.error('Error during Redis shutdown:', error);
        }
    }
}

/**
 * Environment-specific cache settings
 */
export const CacheSettings = {
    // TTL settings (in seconds)
    TTL: {
        SHORT: 60,        // 1 minute
        MEDIUM: 300,      // 5 minutes
        LONG: 3600,       // 1 hour
        VERY_LONG: 86400, // 24 hours
    },

    // Cache key patterns
    KEYS: {
        API_RESPONSE: 'api:',
        USER_SESSION: 'sess:',
        USER_DATA: 'user:',
        PRODUCT_DATA: 'product:',
        INVENTORY: 'inventory:',
        DRIVER_LOCATION: 'driver:location:',
        DRIVER_STATUS: 'driver:status:',
        SEARCH_RESULTS: 'search:',
        ANALYTICS: 'analytics:',
    },

    // Cache tags for invalidation
    TAGS: {
        USERS: 'users',
        PRODUCTS: 'products',
        ORDERS: 'orders',
        INVENTORY: 'inventory',
        DRIVERS: 'drivers',
        BOOKINGS: 'bookings',
        PAYMENTS: 'payments',
        SEARCH: 'search',
    },

    // Rate limiting settings
    RATE_LIMIT: {
        API_CALLS: 1000,     // per hour
        LOGIN_ATTEMPTS: 5,   // per 15 minutes
        SEARCH_QUERIES: 100, // per minute
    },
};