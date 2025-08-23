import { Pool, PoolConfig } from 'pg';
import { Logger } from '../utils/logger';

/**
 * Database connection utility
 */
export class DatabaseConnection {
    private static pool: Pool;

    /**
     * Initialize database connection pool
     */
    public static async initialize(config?: PoolConfig): Promise<void> {
        const poolConfig: PoolConfig = config || {
            connectionString: process.env['DATABASE_URL'],
            max: parseInt(process.env['DATABASE_POOL_SIZE'] || '10'),
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        };

        this.pool = new Pool(poolConfig);

        // Test connection
        try {
            const client = await this.pool.connect();
            Logger.info('Database connected successfully');
            client.release();
        } catch (error) {
            Logger.error('Failed to connect to database', error as Error);
            throw error;
        }

        // Handle pool errors
        this.pool.on('error', (error) => {
            Logger.error('Database pool error', error);
        });
    }

    /**
     * Get database pool instance
     */
    public static getPool(): Pool {
        if (!this.pool) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
        return this.pool;
    }

    /**
     * Execute a query
     */
    public static async query(text: string, params?: any[]): Promise<any> {
        const pool = this.getPool();
        const start = Date.now();

        try {
            const result = await pool.query(text, params);
            const duration = Date.now() - start;

            Logger.debug('Database query executed', {
                query: text,
                duration,
                rows: result.rowCount
            });

            return result;
        } catch (error) {
            Logger.error('Database query failed', error as Error, {
                query: text,
                params
            });
            throw error;
        }
    }

    /**
     * Close database connection
     */
    public static async close(): Promise<void> {
        if (this.pool) {
            await this.pool.end();
            Logger.info('Database connection closed');
        }
    }
}