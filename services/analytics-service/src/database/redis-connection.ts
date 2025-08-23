/**
 * Redis connection for caching and session management
 */

import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

export class RedisConnection {
    private static instance: RedisConnection;
    private client: RedisClientType;
    private isConnected: boolean = false;

    private constructor() {
        const redisConfig: any = {
            url: process.env.REDIS_URL || 'redis://localhost:6379'
        };

        if (process.env.REDIS_PASSWORD) {
            redisConfig.password = process.env.REDIS_PASSWORD;
        }

        this.client = createClient(redisConfig);

        this.client.on('error', (error) => {
            logger.error('Redis connection error:', error);
            this.isConnected = false;
        });

        this.client.on('connect', () => {
            logger.info('Redis connected successfully');
            this.isConnected = true;
        });

        this.client.on('disconnect', () => {
            logger.warn('Redis disconnected');
            this.isConnected = false;
        });
    }

    public static getInstance(): RedisConnection {
        if (!RedisConnection.instance) {
            RedisConnection.instance = new RedisConnection();
        }
        return RedisConnection.instance;
    }

    public async connect(): Promise<void> {
        if (!this.isConnected) {
            await this.client.connect();
        }
    }

    public getClient(): RedisClientType {
        return this.client;
    }

    public isClientConnected(): boolean {
        return this.isConnected;
    }

    /**
     * Set a key-value pair with optional expiration
     */
    public async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
        try {
            if (ttlSeconds) {
                await this.client.setEx(key, ttlSeconds, value);
            } else {
                await this.client.set(key, value);
            }
        } catch (error) {
            logger.error(`Redis SET error for key ${key}:`, error);
            throw error;
        }
    }

    /**
     * Get value by key
     */
    public async get(key: string): Promise<string | null> {
        try {
            return await this.client.get(key);
        } catch (error) {
            logger.error(`Redis GET error for key ${key}:`, error);
            throw error;
        }
    }

    /**
     * Delete a key
     */
    public async del(key: string): Promise<number> {
        try {
            return await this.client.del(key);
        } catch (error) {
            logger.error(`Redis DEL error for key ${key}:`, error);
            throw error;
        }
    }

    /**
     * Set JSON object with optional expiration
     */
    public async setJSON(key: string, value: any, ttlSeconds?: number): Promise<void> {
        const jsonString = JSON.stringify(value);
        await this.set(key, jsonString, ttlSeconds);
    }

    /**
     * Get JSON object by key
     */
    public async getJSON<T>(key: string): Promise<T | null> {
        const value = await this.get(key);
        if (!value) return null;

        try {
            return JSON.parse(value) as T;
        } catch (error) {
            logger.error(`JSON parse error for key ${key}:`, error);
            return null;
        }
    }

    /**
     * Check if key exists
     */
    public async exists(key: string): Promise<boolean> {
        try {
            const result = await this.client.exists(key);
            return result === 1;
        } catch (error) {
            logger.error(`Redis EXISTS error for key ${key}:`, error);
            return false;
        }
    }

    /**
     * Set expiration for a key
     */
    public async expire(key: string, ttlSeconds: number): Promise<boolean> {
        try {
            const result = await this.client.expire(key, ttlSeconds);
            return result;
        } catch (error) {
            logger.error(`Redis EXPIRE error for key ${key}:`, error);
            return false;
        }
    }

    /**
     * Get keys matching pattern
     */
    public async keys(pattern: string): Promise<string[]> {
        try {
            return await this.client.keys(pattern);
        } catch (error) {
            logger.error(`Redis KEYS error for pattern ${pattern}:`, error);
            return [];
        }
    }

    /**
     * Increment a counter
     */
    public async incr(key: string): Promise<number> {
        try {
            return await this.client.incr(key);
        } catch (error) {
            logger.error(`Redis INCR error for key ${key}:`, error);
            throw error;
        }
    }

    /**
     * Add to set
     */
    public async sadd(key: string, ...members: string[]): Promise<number> {
        try {
            return await this.client.sAdd(key, members);
        } catch (error) {
            logger.error(`Redis SADD error for key ${key}:`, error);
            throw error;
        }
    }

    /**
     * Get set members
     */
    public async smembers(key: string): Promise<string[]> {
        try {
            return await this.client.sMembers(key);
        } catch (error) {
            logger.error(`Redis SMEMBERS error for key ${key}:`, error);
            return [];
        }
    }

    /**
     * Close Redis connection
     */
    public async close(): Promise<void> {
        try {
            await this.client.quit();
            this.isConnected = false;
            logger.info('Redis connection closed');
        } catch (error) {
            logger.error('Error closing Redis connection:', error);
        }
    }
}

export const redisConnection = RedisConnection.getInstance();