import { Logger, DatabaseConnection, ConnectionManager } from '@giga/common';
import { runMigrations } from '../database/migrate';
import { PaymentServiceConfig } from '../config/service-config';

/**
 * Service initialization utility
 */
export class ServiceInitializer {
    private static logger = Logger;

    /**
     * Initialize all required services
     */
    public static async initialize(config: PaymentServiceConfig): Promise<void> {
        try {
            this.logger.info('Initializing payment service...');

            // Initialize database connection
            await this.initializeDatabase(config);

            // Initialize messaging connection
            await this.initializeMessaging();

            // Run database migrations
            if (config.environment !== 'test') {
                await this.runMigrations();
            }

            this.logger.info('Payment service initialization completed successfully');
        } catch (error) {
            this.logger.error('Failed to initialize payment service', error as Error);
            throw error;
        }
    }

    /**
     * Initialize database connection
     */
    private static async initializeDatabase(config: PaymentServiceConfig): Promise<void> {
        try {
            await DatabaseConnection.initialize({
                connectionString: config.database.url,
                max: config.database.poolSize,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 2000,
            });
            this.logger.info('Database connection initialized');
        } catch (error) {
            this.logger.error('Failed to initialize database connection', error as Error);
            throw error;
        }
    }

    /**
     * Initialize messaging connection
     */
    private static async initializeMessaging(): Promise<void> {
        try {
            const messagingManager = ConnectionManager.getInstance();
            await messagingManager.connect();
            this.logger.info('Messaging connection initialized');
        } catch (error) {
            this.logger.error('Failed to initialize messaging connection', error as Error);
            throw error;
        }
    }

    /**
     * Run database migrations
     */
    private static async runMigrations(): Promise<void> {
        try {
            await runMigrations();
            this.logger.info('Database migrations completed');
        } catch (error) {
            this.logger.error('Failed to run database migrations', error as Error);
            throw error;
        }
    }

    /**
     * Graceful shutdown of all services
     */
    public static async shutdown(): Promise<void> {
        try {
            this.logger.info('Shutting down payment service...');

            // Close messaging connection
            const messagingManager = ConnectionManager.getInstance();
            if (messagingManager.isConnected()) {
                await messagingManager.close();
                this.logger.info('Messaging connection closed');
            }

            // Close database connection
            await DatabaseConnection.close();
            this.logger.info('Database connection closed');

            this.logger.info('Payment service shutdown completed');
        } catch (error) {
            this.logger.error('Error during service shutdown', error as Error);
            throw error;
        }
    }

    /**
     * Health check for all services
     */
    public static async healthCheck(): Promise<{
        database: boolean;
        messaging: boolean;
    }> {
        const health = {
            database: false,
            messaging: false
        };

        try {
            // Check database connection
            await DatabaseConnection.query('SELECT 1');
            health.database = true;
        } catch (error) {
            this.logger.warn('Database health check failed', error as Error);
        }

        try {
            // Check messaging connection
            const messagingManager = ConnectionManager.getInstance();
            health.messaging = messagingManager.isConnected();
        } catch (error) {
            this.logger.warn('Messaging health check failed', error as Error);
        }

        return health;
    }
}