import { EcommerceDatabase } from './connection';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Run advanced ecommerce features migration
 */
async function migrateAdvancedFeatures(): Promise<void> {
    try {
        console.log('Starting advanced ecommerce features migration...');

        // Initialize database connection
        await EcommerceDatabase.initialize();
        console.log('Database connected successfully');

        // Read and execute migration
        const migrationPath = join(__dirname, 'migrations', '002_add_advanced_ecommerce_features.sql');
        const migrationSQL = readFileSync(migrationPath, 'utf8');

        await EcommerceDatabase.query(migrationSQL);
        console.log('Advanced ecommerce features migration completed successfully');

    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    } finally {
        await EcommerceDatabase.close();
        console.log('Database connection closed');
    }
}

// Run migration if called directly
if (require.main === module) {
    migrateAdvancedFeatures()
        .then(() => {
            console.log('Migration completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

export { migrateAdvancedFeatures };