// Cache module exports
export { RedisClient, createRedisClient, getRedisClient } from './redis-client';
export { cacheMiddleware, CacheInvalidator, cacheInvalidator, cacheable } from './cache-middleware';
export { RedisSessionStore, SessionManager, sessionManager } from './session-store';
export {
    CacheInvalidationManager,
    InvalidationStrategies,
    CacheWarmingManager,
    invalidationManager,
    warmingManager
} from './invalidation-strategies';
export {
    RealtimeCacheManager,
    realtimeCache,
    LocationData,
    InventoryData,
    DriverStatus
} from './realtime-cache';

// Types
export interface CacheConfig {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
    retryDelayOnFailover?: number;
    maxRetriesPerRequest?: number;
    lazyConnect?: boolean;
    sentinels?: Array<{ host: string; port: number }>;
    name?: string;
    cluster?: Array<{ host: string; port: number }>;
}

export interface CacheOptions {
    ttl?: number;
    keyGenerator?: (req: any) => string;
    condition?: (req: any, res: any) => boolean;
    skipCache?: (req: any) => boolean;
    varyBy?: string[];
    tags?: string[];
}

export interface SessionConfig {
    prefix?: string;
    ttl?: number;
    serializer?: {
        stringify: (obj: any) => string;
        parse: (str: string) => any;
    };
}