import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

export interface RedisConfig {
    url: string;
    password?: string;
    db?: number;
}

export class RedisClient {
    private client: RedisClientType;
    private config: RedisConfig;

    constructor(config: RedisConfig) {
        this.config = config;
        this.client = createClient({
            url: config.url,
            password: config.password,
            database: config.db || 0,
        });

        this.client.on('error', (error) => {
            logger.error('Redis client error:', error);
        });

        this.client.on('connect', () => {
            logger.info('Redis client connected');
        });
    }

    /**
     * Connect to Redis
     */
    async connect(): Promise<void> {
        try {
            await this.client.connect();
            logger.info('Connected to Redis successfully');
        } catch (error) {
            logger.error('Failed to connect to Redis:', error);
            throw error;
        }
    }

    /**
     * Get the Redis client instance
     */
    getClient(): RedisClientType {
        return this.client;
    }

    /**
     * Set a value with optional expiration
     */
    async set(key: string, value: string, expirationSeconds?: number): Promise<void> {
        try {
            if (expirationSeconds) {
                await this.client.setEx(key, expirationSeconds, value);
            } else {
                await this.client.set(key, value);
            }
        } catch (error) {
            logger.error(`Error setting Redis key ${key}:`, error);
            throw error;
        }
    }

    /**
     * Get a value by key
     */
    async get(key: string): Promise<string | null> {
        try {
            return await this.client.get(key);
        } catch (error) {
            logger.error(`Error getting Redis key ${key}:`, error);
            throw error;
        }
    }

    /**
     * Delete a key
     */
    async del(key: string): Promise<void> {
        try {
            await this.client.del(key);
        } catch (error) {
            logger.error(`Error deleting Redis key ${key}:`, error);
            throw error;
        }
    }

    /**
     * Check if key exists
     */
    async exists(key: string): Promise<boolean> {
        try {
            const result = await this.client.exists(key);
            return result === 1;
        } catch (error) {
            logger.error(`Error checking Redis key existence ${key}:`, error);
            throw error;
        }
    }

    /**
     * Close the Redis connection
     */
    async disconnect(): Promise<void> {
        await this.client.disconnect();
    }
}