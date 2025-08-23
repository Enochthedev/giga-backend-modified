import { Pool } from 'pg';

let pool: Pool;

export const connectDatabase = async (): Promise<void> => {
    try {
        pool = new Pool({
            host: process.env['DB_HOST'] || 'localhost',
            port: parseInt(process.env['DB_PORT'] || '5432'),
            database: process.env['DB_NAME'] || 'notification_db',
            user: process.env['DB_USER'] || 'postgres',
            password: process.env['DB_PASSWORD'] || 'password',
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        // Test the connection
        await pool.query('SELECT NOW()');
        console.log('Database connection established');
    } catch (error) {
        console.error('Database connection failed:', error);
        throw error;
    }
};

export const getPool = (): Pool => {
    if (!pool) {
        throw new Error('Database not initialized. Call connectDatabase() first.');
    }
    return pool;
};

export const closeDatabase = async (): Promise<void> => {
    if (pool) {
        await pool.end();
        console.log('Database connection closed');
    }
};