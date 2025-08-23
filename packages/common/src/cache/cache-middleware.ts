import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from './redis-client';
import { logger } from '../logger';
import crypto from 'crypto';

export interface CacheOptions {
    ttl?: number; // Time to live in seconds
    keyGenerator?: (req: Request) => string;
    condition?: (req: Request, res: Response) => boolean;
    skipCache?: (req: Request) => boolean;
    varyBy?: string[]; // Headers to vary cache by
    tags?: string[]; // Cache tags for invalidation
}

export interface CacheMetadata {
    timestamp: number;
    ttl: number;
    tags?: string[];
    headers?: Record<string, string>;
}

export interface CachedResponse {
    data: any;
    statusCode: number;
    headers: Record<string, string>;
    metadata: CacheMetadata;
}

/**
 * Generate cache key from request
 */
const generateCacheKey = (req: Request, options: CacheOptions): string => {
    if (options.keyGenerator) {
        return options.keyGenerator(req);
    }

    const baseKey = `api:${req.method}:${req.path}`;

    // Include query parameters
    const queryString = Object.keys(req.query)
        .sort()
        .map(key => `${key}=${req.query[key]}`)
        .join('&');

    // Include vary headers
    const varyHeaders = options.varyBy || [];
    const headerString = varyHeaders
        .map(header => `${header}:${req.get(header) || ''}`)
        .join('|');

    const fullKey = `${baseKey}?${queryString}&${headerString}`;

    // Hash long keys to avoid Redis key length limits
    if (fullKey.length > 250) {
        return `${baseKey}:${crypto.createHash('md5').update(fullKey).digest('hex')}`;
    }

    return fullKey;
};

/**
 * Cache middleware factory
 */
export const cacheMiddleware = (options: CacheOptions = {}) => {
    const defaultTTL = options.ttl || 300; // 5 minutes default

    return async (req: Request, res: Response, next: NextFunction) => {
        // Skip cache for non-GET requests by default
        if (req.method !== 'GET') {
            return next();
        }

        // Skip cache if condition is not met
        if (options.skipCache && options.skipCache(req)) {
            return next();
        }

        const redis = getRedisClient();
        const cacheKey = generateCacheKey(req, options);

        try {
            // Try to get cached response
            const cachedData = await redis.get<CachedResponse>(cacheKey);

            if (cachedData) {
                logger.debug(`Cache hit for key: ${cacheKey}`);

                // Check if cache is still valid
                const now = Date.now();
                const cacheAge = (now - cachedData.metadata.timestamp) / 1000;

                if (cacheAge < cachedData.metadata.ttl) {
                    // Set cached headers
                    Object.entries(cachedData.headers).forEach(([key, value]) => {
                        res.set(key, value);
                    });

                    // Add cache headers
                    res.set('X-Cache', 'HIT');
                    res.set('X-Cache-Age', Math.floor(cacheAge).toString());
                    res.set('X-Cache-TTL', cachedData.metadata.ttl.toString());

                    return res.status(cachedData.statusCode).json(cachedData.data);
                } else {
                    // Cache expired, delete it
                    await redis.del(cacheKey);
                }
            }

            logger.debug(`Cache miss for key: ${cacheKey}`);

            // Store original response methods
            const originalSend = res.send;
            const originalJson = res.json;
            const originalStatus = res.status;
            let statusCode = 200;
            let responseData: any;
            let shouldCache = true;

            // Override status method to capture status code
            res.status = function (code: number) {
                statusCode = code;
                return originalStatus.call(this, code);
            };

            // Override json method to capture response data
            res.json = function (data: any) {
                responseData = data;

                // Check if we should cache this response
                if (options.condition) {
                    shouldCache = options.condition(req, res);
                } else {
                    // Default: cache successful responses (2xx status codes)
                    shouldCache = statusCode >= 200 && statusCode < 300;
                }

                // Cache the response if conditions are met
                if (shouldCache) {
                    const cachedResponse: CachedResponse = {
                        data,
                        statusCode,
                        headers: {
                            'content-type': res.get('content-type') || 'application/json',
                        },
                        metadata: {
                            timestamp: Date.now(),
                            ttl: defaultTTL,
                            tags: options.tags,
                        }
                    };

                    // Store in cache asynchronously
                    redis.set(cacheKey, cachedResponse, defaultTTL).catch(error => {
                        logger.error(`Error caching response for key ${cacheKey}:`, error);
                    });

                    // Store cache tags for invalidation
                    if (options.tags && options.tags.length > 0) {
                        options.tags.forEach(tag => {
                            redis.sadd(`cache:tag:${tag}`, cacheKey).catch(error => {
                                logger.error(`Error adding cache tag ${tag}:`, error);
                            });
                        });
                    }

                    logger.debug(`Response cached for key: ${cacheKey}`);
                }

                // Add cache headers
                res.set('X-Cache', 'MISS');

                return originalJson.call(this, data);
            };

            // Override send method for non-JSON responses
            res.send = function (data: any) {
                responseData = data;

                if (options.condition) {
                    shouldCache = options.condition(req, res);
                } else {
                    shouldCache = statusCode >= 200 && statusCode < 300;
                }

                if (shouldCache && typeof data === 'string') {
                    const cachedResponse: CachedResponse = {
                        data,
                        statusCode,
                        headers: {
                            'content-type': res.get('content-type') || 'text/html',
                        },
                        metadata: {
                            timestamp: Date.now(),
                            ttl: defaultTTL,
                            tags: options.tags,
                        }
                    };

                    redis.set(cacheKey, cachedResponse, defaultTTL).catch(error => {
                        logger.error(`Error caching response for key ${cacheKey}:`, error);
                    });
                }

                res.set('X-Cache', 'MISS');
                return originalSend.call(this, data);
            };

            next();
        } catch (error) {
            logger.error(`Cache middleware error for key ${cacheKey}:`, error);
            // Continue without caching on error
            next();
        }
    };
};

/**
 * Cache invalidation utilities
 */
export class CacheInvalidator {
    private redis = getRedisClient();

    /**
     * Invalidate cache by key pattern
     */
    async invalidatePattern(pattern: string): Promise<number> {
        try {
            const deletedCount = await this.redis.delPattern(pattern);
            logger.info(`Invalidated ${deletedCount} cache entries matching pattern: ${pattern}`);
            return deletedCount;
        } catch (error) {
            logger.error(`Error invalidating cache pattern ${pattern}:`, error);
            return 0;
        }
    }

    /**
     * Invalidate cache by tags
     */
    async invalidateByTags(tags: string[]): Promise<number> {
        try {
            let totalDeleted = 0;

            for (const tag of tags) {
                const cacheKeys = await this.redis.smembers(`cache:tag:${tag}`);

                if (cacheKeys.length > 0) {
                    // Delete cache entries
                    const deleted = await this.redis.getClient().del(...cacheKeys);
                    totalDeleted += deleted;

                    // Clean up tag set
                    await this.redis.del(`cache:tag:${tag}`);

                    logger.info(`Invalidated ${deleted} cache entries for tag: ${tag}`);
                }
            }

            return totalDeleted;
        } catch (error) {
            logger.error(`Error invalidating cache by tags ${tags.join(', ')}:`, error);
            return 0;
        }
    }

    /**
     * Invalidate specific cache key
     */
    async invalidateKey(key: string): Promise<boolean> {
        try {
            const deleted = await this.redis.del(key);
            if (deleted) {
                logger.info(`Invalidated cache key: ${key}`);
            }
            return deleted;
        } catch (error) {
            logger.error(`Error invalidating cache key ${key}:`, error);
            return false;
        }
    }

    /**
     * Clear all cache
     */
    async clearAll(): Promise<void> {
        try {
            await this.redis.getClient().flushdb();
            logger.info('Cleared all cache');
        } catch (error) {
            logger.error('Error clearing all cache:', error);
        }
    }
}

// Export singleton invalidator
export const cacheInvalidator = new CacheInvalidator();

/**
 * Decorator for caching method results
 */
export const cacheable = (options: CacheOptions = {}) => {
    return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
        const method = descriptor.value;
        const defaultTTL = options.ttl || 300;

        descriptor.value = async function (...args: any[]) {
            const redis = getRedisClient();

            // Generate cache key from method name and arguments
            const argsHash = crypto.createHash('md5')
                .update(JSON.stringify(args))
                .digest('hex');
            const cacheKey = `method:${target.constructor.name}:${propertyName}:${argsHash}`;

            try {
                // Try to get cached result
                const cachedResult = await redis.get(cacheKey);
                if (cachedResult !== null) {
                    logger.debug(`Method cache hit for: ${cacheKey}`);
                    return cachedResult;
                }

                // Execute method and cache result
                const result = await method.apply(this, args);

                await redis.set(cacheKey, result, defaultTTL);
                logger.debug(`Method result cached for: ${cacheKey}`);

                return result;
            } catch (error) {
                logger.error(`Method cache error for ${cacheKey}:`, error);
                // Execute method without caching on error
                return await method.apply(this, args);
            }
        };

        return descriptor;
    };
};