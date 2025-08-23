import { Pool, PoolClient } from 'pg';
import { Logger } from '@giga/common';

/**
 * Database connection manager for authentication service
 */
export class DatabaseConnection {
    private static pool: Pool;
    private static isInitialized: boolean = false;

    /**
     * Initialize database connection pool
     */
    public static async initialize(): Promise<void> {
        try {
            const databaseUrl = process.env['DATABASE_URL'];
            if (!databaseUrl) {
                throw new Error('DATABASE_URL environment variable is required');
            }

            this.pool = new Pool({
                connectionString: databaseUrl,
                max: 20,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 2000,
            });

            // Test connection
            const client = await this.pool.connect();
            await client.query('SELECT NOW()');
            client.release();

            this.isInitialized = true;
            Logger.info('Database connection initialized successfully');
        } catch (error) {
            Logger.error('Failed to initialize database connection', error as Error);
            throw error;
        }
    }

    /**
     * Get database connection pool
     */
    public static getPool(): Pool {
        if (!this.isInitialized || !this.pool) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
        return this.pool;
    }

    /**
     * Get a client from the pool
     */
    public static async getClient(): Promise<PoolClient> {
        if (!this.isInitialized || !this.pool) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
        return await this.pool.connect();
    }

    /**
     * Execute a query
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
     * Close database connection
     */
    public static async close(): Promise<void> {
        if (this.pool) {
            await this.pool.end();
            this.isInitialized = false;
            Logger.info('Database connection closed');
        }
    }

    /**
     * Check if database is connected
     */
    public static isConnected(): boolean {
        return this.isInitialized && !!this.pool;
    }
}