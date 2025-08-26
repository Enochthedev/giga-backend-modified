import Redis, { RedisOptions, Cluster } from 'ioredis';
import { Logger } from '../utils/logger';

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
            Logger.info('Redis client connected');
        });

        this.client.on('ready', () => {
            Logger.info('Redis client ready');
        });

        this.client.on('error', (error: Error) => {
            Logger.error('Redis client error:', error);
        });

        this.client.on('close', () => {
            Logger.warn('Redis client connection closed');
        });

        this.client.on('reconnecting', () => {
            Logger.info('Redis client reconnecting');
        });

        if (this.client instanceof Redis.Cluster) {
            this.client.on('node error', (error: Error, node: any) => {
                Logger.error(`Redis cluster node error on ${node.options.host}:${node.options.port}:`, error);
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
            Logger.error(`Error getting cache key ${key}:`, error as Error);
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
            Logger.error(`Error setting cache key ${key}:`, error as Error);
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
            Logger.error(`Error deleting cache key ${key}:`, error as Error);
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
            Logger.error(`Error deleting cache pattern ${pattern}:`, error as Error);
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
            Logger.error(`Error checking cache key existence ${key}:`, error as Error);
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
            Logger.error(`Error setting expiration for cache key ${key}:`, error as Error);
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
            Logger.error(`Error getting TTL for cache key ${key}:`, error as Error);
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
            Logger.error(`Error incrementing cache key ${key}:`, error as Error);
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
            Logger.error(`Error incrementing cache key ${key} by ${increment}:`, error as Error);
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
            Logger.error(`Error getting hash field ${field} from ${key}:`, error as Error);
            return null;
        }
    }

    async hset(key: string, field: string, value: string): Promise<number> {
        try {
            return await this.client.hset(key, field, value);
        } catch (error) {
            Logger.error(`Error setting hash field ${field} in ${key}:`, error as Error);
            throw error;
        }
    }

    async hgetall(key: string): Promise<Record<string, string>> {
        try {
            return await this.client.hgetall(key);
        } catch (error) {
            Logger.error(`Error getting all hash fields from ${key}:`, error as Error);
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
            Logger.error(`Error pushing to list ${key}:`, error as Error);
            throw error;
        }
    }

    async rpop(key: string): Promise<string | null> {
        try {
            return await this.client.rpop(key);
        } catch (error) {
            Logger.error(`Error popping from list ${key}:`, error as Error);
            return null;
        }
    }

    async lrange(key: string, start: number, stop: number): Promise<string[]> {
        try {
            return await this.client.lrange(key, start, stop);
        } catch (error) {
            Logger.error(`Error getting range from list ${key}:`, error as Error);
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
            Logger.error(`Error adding to set ${key}:`, error as Error);
            throw error;
        }
    }

    async smembers(key: string): Promise<string[]> {
        try {
            return await this.client.smembers(key);
        } catch (error) {
            Logger.error(`Error getting set members from ${key}:`, error as Error);
            return [];
        }
    }

    async sismember(key: string, member: string): Promise<boolean> {
        try {
            const result = await this.client.sismember(key, member);
            return result === 1;
        } catch (error) {
            Logger.error(`Error checking set membership in ${key}:`, error as Error);
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
            Logger.error(`Error publishing to channel ${channel}:`, error as Error);
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
            Logger.info('Redis client disconnected');
        } catch (error) {
            Logger.error('Error disconnecting Redis client:', error as Error);
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
            Logger.error('Redis ping failed:', error as Error);
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