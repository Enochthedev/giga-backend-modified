/**
 * Analytics Service Application
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
const compression = require('compression');
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { clickHouseConnection } from './database/clickhouse-connection';
import { redisConnection } from './database/redis-connection';

// Import routes
import analyticsRoutes from './routes/analytics.routes';
import featureFlagsRoutes from './routes/feature-flags.routes';
import dashboardRoutes from './routes/dashboard.routes';

class AnalyticsApp {
    public app: express.Application;
    private port: number;

    constructor() {
        this.app = express();
        this.port = parseInt(process.env.PORT || '3007');

        this.initializeMiddleware();
        this.initializeRoutes();
        this.initializeErrorHandling();
    }

    private initializeMiddleware(): void {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"],
                },
            },
        }));

        // CORS configuration
        this.app.use(cors({
            origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
        }));

        // Rate limiting
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 1000, // Limit each IP to 1000 requests per windowMs
            message: {
                success: false,
                message: 'Too many requests from this IP, please try again later'
            },
            standardHeaders: true,
            legacyHeaders: false
        });
        this.app.use(limiter);

        // Body parsing middleware
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Compression middleware
        this.app.use(compression());

        // Request logging middleware
        this.app.use((req, res, next) => {
            logger.info('Incoming request', {
                method: req.method,
                url: req.url,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            next();
        });

        // Trust proxy for accurate IP addresses
        this.app.set('trust proxy', 1);
    }

    private initializeRoutes(): void {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.status(200).json({
                success: true,
                message: 'Analytics service is healthy',
                timestamp: new Date().toISOString(),
                version: process.env.npm_package_version || '1.0.0'
            });
        });

        // API routes
        this.app.use('/api/analytics', analyticsRoutes);
        this.app.use('/api/feature-flags', featureFlagsRoutes);
        this.app.use('/api/dashboard', dashboardRoutes);

        // Root endpoint
        this.app.get('/', (req, res) => {
            res.status(200).json({
                success: true,
                message: 'Analytics Service API',
                version: process.env.npm_package_version || '1.0.0',
                endpoints: {
                    analytics: '/api/analytics',
                    featureFlags: '/api/feature-flags',
                    dashboard: '/api/dashboard',
                    health: '/health'
                }
            });
        });
    }

    private initializeErrorHandling(): void {
        // 404 handler
        this.app.use(notFoundHandler);

        // Global error handler
        this.app.use(errorHandler);
    }

    public async start(): Promise<void> {
        try {
            // Initialize database connections
            await this.initializeDatabases();

            // Start server
            this.app.listen(this.port, () => {
                logger.info(`Analytics service started on port ${this.port}`, {
                    port: this.port,
                    environment: process.env.NODE_ENV || 'development',
                    version: process.env.npm_package_version || '1.0.0'
                });
            });

            // Graceful shutdown handling
            this.setupGracefulShutdown();

        } catch (error) {
            logger.error('Failed to start analytics service:', error);
            process.exit(1);
        }
    }

    private async initializeDatabases(): Promise<void> {
        try {
            // Test ClickHouse connection
            const clickHouseHealthy = await clickHouseConnection.testConnection();
            if (!clickHouseHealthy) {
                throw new Error('ClickHouse connection failed');
            }

            // Initialize ClickHouse schema
            await clickHouseConnection.initializeSchema();
            logger.info('ClickHouse connection established and schema initialized');

            // Connect to Redis
            await redisConnection.connect();
            logger.info('Redis connection established');

        } catch (error) {
            logger.error('Database initialization failed:', error);
            throw error;
        }
    }

    private setupGracefulShutdown(): void {
        const gracefulShutdown = async (signal: string) => {
            logger.info(`Received ${signal}, starting graceful shutdown...`);

            try {
                // Close database connections
                await clickHouseConnection.close();
                await redisConnection.close();

                logger.info('Graceful shutdown completed');
                process.exit(0);
            } catch (error) {
                logger.error('Error during graceful shutdown:', error);
                process.exit(1);
            }
        };

        // Handle shutdown signals
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught exception:', error);
            process.exit(1);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled rejection at:', promise, 'reason:', reason);
            process.exit(1);
        });
    }
}

// Create and start the application
const analyticsApp = new AnalyticsApp();

if (require.main === module) {
    analyticsApp.start();
}

export default analyticsApp;