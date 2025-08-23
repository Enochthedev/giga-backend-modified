import { Pool, PoolClient } from 'pg';
import { createClient, RedisClientType } from 'redis';
import logger from '../utils/logger';

class DatabaseConnection {
    private pool: Pool;
    private redisClient: RedisClientType;

    constructor() {
        // PostgreSQL connection
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            max: parseInt(process.env.DATABASE_POOL_SIZE || '10'),
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        // Redis connection
        this.redisClient = createClient({
            url: process.env.REDIS_URL,
            password: process.env.REDIS_PASSWORD,
        });

        this.initializeConnections();
    }

    private async initializeConnections(): Promise<void> {
        try {
            // Test PostgreSQL connection
            const client = await this.pool.connect();
            await client.query('SELECT NOW()');
            client.release();
            logger.info('PostgreSQL connected successfully');

            // Connect to Redis
            await this.redisClient.connect();
            logger.info('Redis connected successfully');
        } catch (error) {
            logger.error('Database connection failed:', error);
            throw error;
        }
    }

    public getPool(): Pool {
        return this.pool;
    }

    public getRedisClient(): RedisClientType {
        return this.redisClient;
    }

    public async query(text: string, params?: any[]): Promise<any> {
        const client = await this.pool.connect();
        try {
            const result = await client.query(text, params);
            return result;
        } finally {
            client.release();
        }
    }

    public async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    public async close(): Promise<void> {
        await this.pool.end();
        await this.redisClient.quit();
        logger.info('Database connections closed');
    }
}

export default new DatabaseConnection();