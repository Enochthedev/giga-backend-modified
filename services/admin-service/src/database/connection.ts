import { Pool, PoolClient } from 'pg';
import { logger } from '../utils/logger';

/**
 * Database connection manager for Admin Service
 * Handles PostgreSQL connection pooling and management
 */
export class AdminDatabase {
    private static pool: Pool;
    private static isConnected = false;

    /**
     * Initialize database connection pool
     */
    public static async initialize(): Promise<void> {
        try {
            this.pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                max: parseInt(process.env.DATABASE_POOL_SIZE || '10'),
                idleTimeoutMillis: parseInt(process.env.DATABASE_TIMEOUT || '30000'),
                connectionTimeoutMillis: parseInt(process.env.DATABASE_TIMEOUT || '30000'),
            });

            // Test connection
            const client = await this.pool.connect();
            await client.query('SELECT NOW()');
            client.release();

            this.isConnected = true;
            logger.info('Admin database connection established successfully');
        } catch (error) {
            logger.error('Failed to initialize admin database connection:', error);
            throw error;
        }
    }

    /**
     * Get database connection pool
     */
    public static getPool(): Pool {
        if (!this.pool || !this.isConnected) {
            throw new Error('Database not initialized. Call AdminDatabase.initialize() first.');
        }
        return this.pool;
    }

    /**
     * Get a client from the pool
     */
    public static async getClient(): Promise<PoolClient> {
        if (!this.pool || !this.isConnected) {
            throw new Error('Database not initialized. Call AdminDatabase.initialize() first.');
        }
        return await this.pool.connect();
    }

    /**
     * Execute a query with automatic connection management
     */
    public static async query(text: string, params?: any[]): Promise<any> {
        const client = await this.getClient();
        try {
            const result = await client.query(text, params);
            return result;
        } finally {
            client.release();
        }
    }

    /**
     * Execute a transaction
     */
    public static async transaction<T>(
        callback: (client: PoolClient) => Promise<T>
    ): Promise<T> {
        const client = await this.getClient();
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

    /**
     * Close all database connections
     */
    public static async close(): Promise<void> {
        if (this.pool) {
            await this.pool.end();
            this.isConnected = false;
            logger.info('Admin database connections closed');
        }
    }

    /**
     * Check if database is connected
     */
    public static isHealthy(): boolean {
        return this.isConnected && !!this.pool;
    }

    /**
     * Get connection pool stats
     */
    public static getStats() {
        if (!this.pool) {
            return null;
        }

        return {
            totalCount: this.pool.totalCount,
            idleCount: this.pool.idleCount,
            waitingCount: this.pool.waitingCount,
        };
    }
}