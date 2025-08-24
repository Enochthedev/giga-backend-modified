import { Pool } from 'pg';
import { logger } from '../utils/logger';

class DatabaseConnection {
    private static instance: DatabaseConnection;
    private pool: Pool;

    private constructor() {
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            max: parseInt(process.env.DATABASE_POOL_SIZE || '10'),
            ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
        });

        this.pool.on('error', (err) => {
            logger.error('Unexpected error on idle client', err);
        });
    }

    public static getInstance(): DatabaseConnection {
        if (!DatabaseConnection.instance) {
            DatabaseConnection.instance = new DatabaseConnection();
        }
        return DatabaseConnection.instance;
    }

    public getPool(): Pool {
        return this.pool;
    }

    public async query(text: string, params?: any[]): Promise<any> {
        const start = Date.now();
        try {
            const res = await this.pool.query(text, params);
            const duration = Date.now() - start;
            logger.debug('Executed query', { text, duration, rows: res.rowCount });
            return res;
        } catch (error) {
            logger.error('Database query error', { text, error });
            throw error;
        }
    }

    public async close(): Promise<void> {
        await this.pool.end();
    }
}

export const db = DatabaseConnection.getInstance();