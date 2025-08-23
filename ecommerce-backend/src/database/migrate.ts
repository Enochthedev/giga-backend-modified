import { readFileSync } from 'fs';
import { join } from 'path';
import { EcommerceDatabase } from './connection';

/**
 * Database migration utility
 */
export class DatabaseMigrator {
    /**
     * Run all migrations
     */
    public static async migrate(): Promise<void> {
        try {
            console.log('Starting database migration...');

            // Initialize database connection
            await EcommerceDatabase.initialize();

            // Read and execute migration file
            const migrationPath = join(__dirname, 'migrations', '001_create_ecommerce_tables.sql');
            const migrationSQL = readFileSync(migrationPath, 'utf8');

            // Execute the entire migration as one statement
            // PostgreSQL can handle multiple statements in a single query
            await EcommerceDatabase.query(migrationSQL);

            console.log('Database migration completed successfully');
        } catch (error) {
            console.error('Migration failed:', error);
            throw error;
        }
    }
}

// Run migration if this file is executed directly
if (require.main === module) {
    DatabaseMigrator.migrate()
        .then(() => {
            console.log('Migration completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}