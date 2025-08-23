import Redis, { RedisOptions, Cluster } from 'ioredis';
import { logger } from '../logger';

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

export class RedisClient {
    private client: Redis | Cluster;
    private config: CacheConfig;

    constructor(config: CacheConfig) {
        this.config = config;
        this.client = this.createClient();
        this.setupEventHandlers();
    }

    private createClient(): Redis | Cluster {
        if (this.config.cluster && this.config.cluster.length > 0) {
            // Redis Cluster mode
            return new Redis.Cluster(this.config.cluster, {
                redisOptions: {
                    password: this.config.password,
                    keyPrefix: this.config.keyPrefix,
                    lazyConnect: this.config.lazyConnect || true,
                    maxRetriesPerRequest: this.config.maxRetriesPerRequest || 3,
                },
                enableOfflineQueue: false,
            });
        } else if (this.config.sentinels && this.config.sentinels.length > 0) {
            // Redis Sentinel mode
            return new Redis({
                sentinels: this.config.sentinels,
                name: this.config.name || 'mymaster',
                password: this.config.password,
                keyPrefix: this.config.keyPrefix,
                lazyConnect: this.config.lazyConnect || true,
                maxRetriesPerRequest: this.config.maxRetriesPerRequest || 3,
                retryDelayOnFailover: this.config.retryDelayOnFailover || 100,
            });
        } else {
            // Single Redis instance
            return new Redis({
                host: this.config.host || 'localhost',
                port: this.config.port || 6379,
                password: this.config.password,
                db: this.config.db || 0,
                keyPrefix: this.config.keyPrefix,
                lazyConnect: this.config.lazyConnect || true,
                maxRetriesPerRequest: this.config.maxRetriesPerRequest || 3,
            });
        }
    }

    private setupEventHandlers(): void {
        this.client.on('connect', () => {
            logger.info('Redis client connected');
        });

        this.client.on('ready', () => {
            logger.info('Redis client ready');
        });

        this.client.on('error', (error) => {
            logger.error('Redis client error:', error);
        });

        this.client.on('close', () => {
            logger.warn('Redis client connection closed');
        });

        this.client.on('reconnecting', () => {
            logger.info('Redis client reconnecting');
        });

        if (this.client instanceof Redis.Cluster) {
            this.client.on('node error', (error, node) => {
                logger.error(`Redis cluster node error on ${node.options.host}:${node.options.port}:`, error);
            });
        }
    }

    /**
     * Get a value from cache
     */
    async get<T = any>(key: string): Promise<T | null> {
        try {
            const value = await this.client.get(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            logger.error(`Error getting cache key ${key}:`, error);
            return null;
        }
    }

    /**
     * Set a value in cache with optional TTL
     */
    async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
        try {
            const serializedValue = JSON.stringify(value);
            if (ttlSeconds) {
                await this.client.setex(key, ttlSeconds, serializedValue);
            } else {
                await this.client.set(key, serializedValue);
            }
            return true;
        } catch (error) {
            logger.error(`Error setting cache key ${key}:`, error);
            return false;
        }
    }

    /**
     * Delete a key from cache
     */
    async del(key: string): Promise<boolean> {
        try {
            const result = await this.client.del(key);
            return result > 0;
        } catch (error) {
            logger.error(`Error deleting cache key ${key}:`, error);
            return false;
        }
    }

    /**
     * Delete multiple keys matching a pattern
     */
    async delPattern(pattern: string): Promise<number> {
        try {
            const keys = await this.client.keys(pattern);
            if (keys.length === 0) return 0;

            const result = await this.client.del(...keys);
            return result;
        } catch (error) {
            logger.error(`Error deleting cache pattern ${pattern}:`, error);
            return 0;
        }
    }

    /**
     * Check if a key exists
     */
    async exists(key: string): Promise<boolean> {
        try {
            const result = await this.client.exists(key);
            return result === 1;
        } catch (error) {
            logger.error(`Error checking cache key existence ${key}:`, error);
            return false;
        }
    }

    /**
     * Set expiration for a key
     */
    async expire(key: string, ttlSeconds: number): Promise<boolean> {
        try {
            const result = await this.client.expire(key, ttlSeconds);
            return result === 1;
        } catch (error) {
            logger.error(`Error setting expiration for cache key ${key}:`, error);
            return false;
        }
    }

    /**
     * Get TTL for a key
     */
    async ttl(key: string): Promise<number> {
        try {
            return await this.client.ttl(key);
        } catch (error) {
            logger.error(`Error getting TTL for cache key ${key}:`, error);
            return -1;
        }
    }

    /**
     * Increment a numeric value
     */
    async incr(key: string): Promise<number> {
        try {
            return await this.client.incr(key);
        } catch (error) {
            logger.error(`Error incrementing cache key ${key}:`, error);
            throw error;
        }
    }

    /**
     * Increment by a specific amount
     */
    async incrby(key: string, increment: number): Promise<number> {
        try {
            return await this.client.incrby(key, increment);
        } catch (error) {
            logger.error(`Error incrementing cache key ${key} by ${increment}:`, error);
            throw error;
        }
    }

    /**
     * Hash operations
     */
    async hget(key: string, field: string): Promise<string | null> {
        try {
            return await this.client.hget(key, field);
        } catch (error) {
            logger.error(`Error getting hash field ${field} from ${key}:`, error);
            return null;
        }
    }

    async hset(key: string, field: string, value: string): Promise<number> {
        try {
            return await this.client.hset(key, field, value);
        } catch (error) {
            logger.error(`Error setting hash field ${field} in ${key}:`, error);
            throw error;
        }
    }

    async hgetall(key: string): Promise<Record<string, string>> {
        try {
            return await this.client.hgetall(key);
        } catch (error) {
            logger.error(`Error getting all hash fields from ${key}:`, error);
            return {};
        }
    }

    /**
     * List operations
     */
    async lpush(key: string, ...values: string[]): Promise<number> {
        try {
            return await this.client.lpush(key, ...values);
        } catch (error) {
            logger.error(`Error pushing to list ${key}:`, error);
            throw error;
        }
    }

    async rpop(key: string): Promise<string | null> {
        try {
            return await this.client.rpop(key);
        } catch (error) {
            logger.error(`Error popping from list ${key}:`, error);
            return null;
        }
    }

    async lrange(key: string, start: number, stop: number): Promise<string[]> {
        try {
            return await this.client.lrange(key, start, stop);
        } catch (error) {
            logger.error(`Error getting range from list ${key}:`, error);
            return [];
        }
    }

    /**
     * Set operations
     */
    async sadd(key: string, ...members: string[]): Promise<number> {
        try {
            return await this.client.sadd(key, ...members);
        } catch (error) {
            logger.error(`Error adding to set ${key}:`, error);
            throw error;
        }
    }

    async smembers(key: string): Promise<string[]> {
        try {
            return await this.client.smembers(key);
        } catch (error) {
            logger.error(`Error getting set members from ${key}:`, error);
            return [];
        }
    }

    async sismember(key: string, member: string): Promise<boolean> {
        try {
            const result = await this.client.sismember(key, member);
            return result === 1;
        } catch (error) {
            logger.error(`Error checking set membership in ${key}:`, error);
            return false;
        }
    }

    /**
     * Pub/Sub operations
     */
    async publish(channel: string, message: string): Promise<number> {
        try {
            return await this.client.publish(channel, message);
        } catch (error) {
            logger.error(`Error publishing to channel ${channel}:`, error);
            throw error;
        }
    }

    /**
     * Get Redis client instance for advanced operations
     */
    getClient(): Redis | Cluster {
        return this.client;
    }

    /**
     * Close the connection
     */
    async disconnect(): Promise<void> {
        try {
            await this.client.quit();
            logger.info('Redis client disconnected');
        } catch (error) {
            logger.error('Error disconnecting Redis client:', error);
        }
    }

    /**
     * Health check
     */
    async ping(): Promise<boolean> {
        try {
            const result = await this.client.ping();
            return result === 'PONG';
        } catch (error) {
            logger.error('Redis ping failed:', error);
            return false;
        }
    }
}

// Singleton instance
let redisClient: RedisClient | null = null;

export const createRedisClient = (config: CacheConfig): RedisClient => {
    if (!redisClient) {
        redisClient = new RedisClient(config);
    }
    return redisClient;
};

export const getRedisClient = (): RedisClient => {
    if (!redisClient) {
        throw new Error('Redis client not initialized. Call createRedisClient first.');
    }
    return redisClient;
};