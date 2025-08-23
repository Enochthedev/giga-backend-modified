import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from './connection';
import { logger } from '../utils/logger';

export async function runMigrations(): Promise<void> {
    try {
        logger.info('Starting database migrations...');

        // Create migrations table if it doesn't exist
        await db.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // List of migration files in order
        const migrations = [
            '001_create_payment_tables.sql'
        ];

        for (const migration of migrations) {
            // Check if migration has already been run
            const result = await db.query(
                'SELECT id FROM migrations WHERE filename = $1',
                [migration]
            );

            if (result.rows.length === 0) {
                logger.info(`Running migration: ${migration}`);

                // Read and execute migration file
                const migrationPath = join(__dirname, 'migrations', migration);
                const migrationSQL = readFileSync(migrationPath, 'utf8');

                await db.query('BEGIN');
                try {
                    await db.query(migrationSQL);
                    await db.query(
                        'INSERT INTO migrations (filename) VALUES ($1)',
                        [migration]
                    );
                    await db.query('COMMIT');
                    logger.info(`Migration completed: ${migration}`);
                } catch (error) {
                    await db.query('ROLLBACK');
                    throw error;
                }
            } else {
                logger.info(`Migration already executed: ${migration}`);
            }
        }

        logger.info('All migrations completed successfully');
    } catch (error) {
        logger.error('Migration failed:', error);
        throw error;
    }
}