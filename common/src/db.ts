import { Pool } from 'pg';
import logger from './logger';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@postgres:5432/postgres'
});

export async function initDb() {
  try {
    await pool.query('SELECT 1');
    logger.info('Connected to PostgreSQL');
  } catch (err: any) {
    logger.error(`PostgreSQL connection error: ${err.message}`);
  }
}

export default pool;
