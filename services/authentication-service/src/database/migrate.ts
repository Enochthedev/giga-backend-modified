import fs from 'fs';
import path from 'path';
import { DatabaseConnection } from './connection';
import { Logger } from '@giga/common';

/**
 * Database migration runner
 */
export class MigrationRunner {
    private static migrationsPath = path.join(__dirname, 'migrations');

    /**
     * Run all pending migrations
     */
    public static async runMigrations(): Promise<void> {
        try {
            await DatabaseConnection.initialize();

            // Create migrations table if it doesn't exist
            await this.createMigrationsTable();

            // Get list of migration files
            const migrationFiles = this.getMigrationFiles();

            // Get executed migrations
            const executedMigrations = await this.getExecutedMigrations();

            // Run pending migrations
            for (const file of migrationFiles) {
                if (!executedMigrations.includes(file)) {
                    await this.runMigration(file);
                }
            }

            Logger.info('All migrations completed successfully');
        } catch (error) {
            Logger.error('Migration failed', error as Error);
            throw error;
        }
    }

    /**
     * Create migrations tracking table
     */
    private static async createMigrationsTable(): Promise<void> {
        const query = `
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) NOT NULL UNIQUE,
                executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `;

        await DatabaseConnection.query(query);
    }

    /**
     * Get list of migration files
     */
    private static getMigrationFiles(): string[] {
        const files = fs.readdirSync(this.migrationsPath);
        return files
            .filter(file => file.endsWith('.sql'))
            .sort();
    }

    /**
     * Get list of executed migrations
     */
    private static async getExecutedMigrations(): Promise<string[]> {
        try {
            const query = 'SELECT filename FROM migrations ORDER BY filename';
            const result = await DatabaseConnection.query(query);
            return result.rows.map((row: any) => row.filename);
        } catch (error) {
            // If migrations table doesn't exist, return empty array
            return [];
        }
    }

    /**
     * Run a single migration
     */
    private static async runMigration(filename: string): Promise<void> {
        try {
            Logger.info(`Running migration: ${filename}`);

            // Read migration file
            const migrationPath = path.join(this.migrationsPath, filename);
            const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

            // Execute migration in a transaction
            await DatabaseConnection.transaction(async (client) => {
                // Execute migration SQL
                await client.query(migrationSQL);

                // Record migration as executed
                await client.query(
                    'INSERT INTO migrations (filename) VALUES ($1)',
                    [filename]
                );
            });

            Logger.info(`Migration completed: ${filename}`);
        } catch (error) {
            Logger.error(`Migration failed: ${filename}`, error as Error);
            throw error;
        }
    }

    /**
     * Rollback last migration (if rollback file exists)
     */
    public static async rollbackLastMigration(): Promise<void> {
        try {
            await DatabaseConnection.initialize();

            // Get last executed migration
            const query = 'SELECT filename FROM migrations ORDER BY executed_at DESC LIMIT 1';
            const result = await DatabaseConnection.query(query);

            if (result.rows.length === 0) {
                Logger.info('No migrations to rollback');
                return;
            }

            const lastMigration = result.rows[0].filename;
            const rollbackFile = lastMigration.replace('.sql', '.rollback.sql');
            const rollbackPath = path.join(this.migrationsPath, rollbackFile);

            if (!fs.existsSync(rollbackPath)) {
                throw new Error(`Rollback file not found: ${rollbackFile}`);
            }

            Logger.info(`Rolling back migration: ${lastMigration}`);

            // Read rollback file
            const rollbackSQL = fs.readFileSync(rollbackPath, 'utf8');

            // Execute rollback in a transaction
            await DatabaseConnection.transaction(async (client) => {
                // Execute rollback SQL
                await client.query(rollbackSQL);

                // Remove migration record
                await client.query(
                    'DELETE FROM migrations WHERE filename = $1',
                    [lastMigration]
                );
            });

            Logger.info(`Rollback completed: ${lastMigration}`);
        } catch (error) {
            Logger.error('Rollback failed', error as Error);
            throw error;
        }
    }

    /**
     * Get migration status
     */
    public static async getMigrationStatus(): Promise<{
        total: number;
        executed: number;
        pending: string[];
    }> {
        try {
            await DatabaseConnection.initialize();

            const migrationFiles = this.getMigrationFiles();
            const executedMigrations = await this.getExecutedMigrations();
            const pendingMigrations = migrationFiles.filter(
                file => !executedMigrations.includes(file)
            );

            return {
                total: migrationFiles.length,
                executed: executedMigrations.length,
                pending: pendingMigrations
            };
        } catch (error) {
            Logger.error('Failed to get migration status', error as Error);
            throw error;
        }
    }
}

// CLI interface
if (require.main === module) {
    const command = process.argv[2];

    switch (command) {
        case 'migrate':
            MigrationRunner.runMigrations()
                .then(() => process.exit(0))
                .catch(() => process.exit(1));
            break;

        case 'rollback':
            MigrationRunner.rollbackLastMigration()
                .then(() => process.exit(0))
                .catch(() => process.exit(1));
            break;

        case 'status':
            MigrationRunner.getMigrationStatus()
                .then(status => {
                    console.log('Migration Status:');
                    console.log(`Total migrations: ${status.total}`);
                    console.log(`Executed: ${status.executed}`);
                    console.log(`Pending: ${status.pending.length}`);
                    if (status.pending.length > 0) {
                        console.log('Pending migrations:');
                        status.pending.forEach(file => console.log(`  - ${file}`));
                    }
                    process.exit(0);
                })
                .catch(() => process.exit(1));
            break;

        default:
            console.log('Usage: ts-node migrate.ts [migrate|rollback|status]');
            process.exit(1);
    }
}