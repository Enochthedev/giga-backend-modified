import { Pool, PoolConfig } from 'pg';

/**
 * Database connection utility for ecommerce service
 */
export class EcommerceDatabase {
    private static pool: Pool;

    /**
     * Initialize database connection pool
     */
    public static async initialize(config?: PoolConfig): Promise<void> {
        const poolConfig: PoolConfig = config || {
            connectionString: process.env.DATABASE_URL,
            max: parseInt(process.env.DATABASE_POOL_SIZE || '10'),
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        };

        this.pool = new Pool(poolConfig);

        // Test connection
        try {
            const client = await this.pool.connect();
            console.log('Ecommerce database connected successfully');
            client.release();
        } catch (error) {
            console.error('Failed to connect to ecommerce database:', error);
            throw error;
        }

        // Handle pool errors
        this.pool.on('error', (error) => {
            console.error('Ecommerce database pool error:', error);
        });
    }

    /**
     * Get database pool instance
     */
    public static getPool(): Pool {
        if (!this.pool) {
            throw new Error('Ecommerce database not initialized. Call initialize() first.');
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

            if (process.env.NODE_ENV === 'development') {
                console.log(`Query executed in ${duration}ms: ${text}`);
            }

            return result;
        } catch (error) {
            console.error('Database query failed:', error);
            console.error('Query:', text);
            console.error('Params:', params);
            throw error;
        }
    }

    /**
     * Close database connection
     */
    public static async close(): Promise<void> {
        if (this.pool) {
            await this.pool.end();
            console.log('Ecommerce database connection closed');
        }
    }
}