import { readFileSync } from 'fs';
import { join } from 'path';
import { AdminDatabase } from './connection';
import { logger } from '../utils/logger';
import bcrypt from 'bcryptjs';

/**
 * Database migration manager for Admin Service
 */
export class AdminMigration {
    /**
     * Run all migrations
     */
    public static async runMigrations(): Promise<void> {
        try {
            logger.info('Starting admin service database migrations...');

            // Initialize database connection
            await AdminDatabase.initialize();

            // Run schema migration
            await this.runSchemaMigration();

            // Create default super admin if not exists
            await this.createDefaultSuperAdmin();

            logger.info('Admin service database migrations completed successfully');
        } catch (error) {
            logger.error('Failed to run admin service migrations:', error);
            throw error;
        }
    }

    /**
     * Run schema migration
     */
    private static async runSchemaMigration(): Promise<void> {
        try {
            const schemaPath = join(__dirname, 'schema.sql');
            const schemaSql = readFileSync(schemaPath, 'utf8');

            await AdminDatabase.query(schemaSql);
            logger.info('Schema migration completed');
        } catch (error) {
            logger.error('Schema migration failed:', error);
            throw error;
        }
    }

    /**
     * Create default super admin user
     */
    private static async createDefaultSuperAdmin(): Promise<void> {
        try {
            const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@platform.com';
            const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'admin123';

            // Check if super admin already exists
            const existingAdmin = await AdminDatabase.query(
                'SELECT id FROM admin_users WHERE email = $1',
                [superAdminEmail]
            );

            if (existingAdmin.rows.length > 0) {
                logger.info('Super admin user already exists');
                return;
            }

            // Get super admin role
            const roleResult = await AdminDatabase.query(
                'SELECT id FROM admin_roles WHERE name = $1',
                ['super_admin']
            );

            if (roleResult.rows.length === 0) {
                throw new Error('Super admin role not found');
            }

            const roleId = roleResult.rows[0].id;

            // Hash password
            const passwordHash = await bcrypt.hash(superAdminPassword, 12);

            // Create super admin user
            await AdminDatabase.query(`
                INSERT INTO admin_users (
                    email, password_hash, first_name, last_name, role_id
                ) VALUES ($1, $2, $3, $4, $5)
            `, [
                superAdminEmail,
                passwordHash,
                'Super',
                'Admin',
                roleId
            ]);

            logger.info(`Default super admin created with email: ${superAdminEmail}`);
            logger.warn(`Please change the default password: ${superAdminPassword}`);
        } catch (error) {
            logger.error('Failed to create default super admin:', error);
            throw error;
        }
    }

    /**
     * Rollback migrations (for development)
     */
    public static async rollbackMigrations(): Promise<void> {
        try {
            logger.info('Rolling back admin service database migrations...');

            await AdminDatabase.initialize();

            // Drop all tables in reverse order
            const dropTablesQuery = `
                DROP TABLE IF EXISTS system_alerts CASCADE;
                DROP TABLE IF EXISTS user_management_cache CASCADE;
                DROP TABLE IF EXISTS platform_configurations CASCADE;
                DROP TABLE IF EXISTS system_health_metrics CASCADE;
                DROP TABLE IF EXISTS audit_logs CASCADE;
                DROP TABLE IF EXISTS admin_sessions CASCADE;
                DROP TABLE IF EXISTS admin_users CASCADE;
                DROP TABLE IF EXISTS admin_roles CASCADE;
                DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
            `;

            await AdminDatabase.query(dropTablesQuery);
            logger.info('Admin service database rollback completed');
        } catch (error) {
            logger.error('Failed to rollback admin service migrations:', error);
            throw error;
        }
    }
}

// Run migrations if this file is executed directly
if (require.main === module) {
    const command = process.argv[2];

    if (command === 'rollback') {
        AdminMigration.rollbackMigrations()
            .then(() => process.exit(0))
            .catch(() => process.exit(1));
    } else {
        AdminMigration.runMigrations()
            .then(() => process.exit(0))
            .catch(() => process.exit(1));
    }
}