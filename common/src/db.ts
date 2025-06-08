import { Pool } from 'pg';
import logger from './logger';

const connEnv = process.env.DATABASE_URL;
if (!connEnv) {
  throw new Error('DATABASE_URL not set');
}
const pool = new Pool({
  connectionString: connEnv
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
