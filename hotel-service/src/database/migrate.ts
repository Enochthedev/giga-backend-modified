import { readFileSync } from 'fs';
import { join } from 'path';
import { pool } from './connection';
import { logger } from '../utils/logger';

async function runMigrations() {
    try {
        logger.info('Starting database migrations...');

        // Read and execute the migration file
        const migrationPath = join(__dirname, 'migrations', '001_create_hotel_tables.sql');
        const migrationSQL = readFileSync(migrationPath, 'utf8');

        await pool.query(migrationSQL);

        logger.info('Database migrations completed successfully');
    } catch (error) {
        logger.error('Migration failed:', error);
        throw error;
    }
}

// Run migrations if this file is executed directly
if (require.main === module) {
    runMigrations()
        .then(() => {
            logger.info('Migrations completed');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('Migration error:', error);
            process.exit(1);
        });
}

export { runMigrations };