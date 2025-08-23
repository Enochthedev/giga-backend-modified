import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import { AdminDatabase } from './database/connection';
import { SystemHealthService } from './services/system-health.service';
import { AuthMiddleware } from './middleware/auth.middleware';
import { logger } from './utils/logger';

// Import routes
import { adminRoutes } from './routes/admin.routes';
import { systemHealthRoutes } from './routes/system-health.routes';
import { configurationRoutes } from './routes/configuration.routes';
import { userManagementRoutes } from './routes/user-management.routes';

// Load environment variables
dotenv.config();

/**
 * Admin Service Application
 * Provides admin management, system health monitoring, and configuration management
 */
class AdminServiceApp {
    public app: express.Application;
    private readonly port: number;

    constructor() {
        this.app = express();
        this.port = parseInt(process.env.PORT || '3006');

        this.initializeMiddleware();
        this.initializeRoutes();
        this.initializeSwagger();
        this.initializeErrorHandling();
    }

    /**
     * Initialize middleware
     */
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
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
        }));

        // Compression and parsing middleware
        this.app.use(compression());
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Logging middleware
        this.app.use(morgan('combined', {
            stream: {
                write: (message: string) => {
                    logger.info(message.trim());
                }
            }
        }));

        // Rate limiting for admin endpoints
        this.app.use('/api/admin', AuthMiddleware.rateLimit(
            parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
            parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
        ));
    }

    /**
     * Initialize routes
     */
    private initializeRoutes(): void {
        // Health check route (public)
        this.app.get('/health', (req, res) => {
            res.json({
                success: true,
                status: 'healthy',
                timestamp: new Date().toISOString(),
                service: 'admin-service',
                version: process.env.npm_package_version || '1.0.0'
            });
        });

        // API routes
        this.app.use('/api/admin', adminRoutes);
        this.app.use('/api/system-health', systemHealthRoutes);
        this.app.use('/api/configuration', configurationRoutes);
        this.app.use('/api/users', userManagementRoutes);

        // Root route
        this.app.get('/', (req, res) => {
            res.json({
                service: 'Admin Service',
                version: process.env.npm_package_version || '1.0.0',
                status: 'running',
                timestamp: new Date().toISOString(),
                endpoints: {
                    health: '/health',
                    admin: '/api/admin',
                    systemHealth: '/api/system-health',
                    configuration: '/api/configuration',
                    userManagement: '/api/users',
                    documentation: '/api-docs'
                }
            });
        });

        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                message: 'Endpoint not found',
                path: req.originalUrl,
                method: req.method
            });
        });
    }

    /**
     * Initialize Swagger documentation
     */
    private initializeSwagger(): void {
        const swaggerOptions = {
            definition: {
                openapi: '3.0.0',
                info: {
                    title: 'Admin Service API',
                    version: process.env.npm_package_version || '1.0.0',
                    description: 'Admin management service for multi-service platform',
                    contact: {
                        name: 'Platform Team',
                        email: 'admin@platform.com'
                    }
                },
                servers: [
                    {
                        url: `http://localhost:${this.port}`,
                        description: 'Development server'
                    }
                ],
                components: {
                    securitySchemes: {
                        bearerAuth: {
                            type: 'http',
                            scheme: 'bearer',
                            bearerFormat: 'JWT'
                        }
                    }
                },
                security: [
                    {
                        bearerAuth: []
                    }
                ]
            },
            apis: ['./src/routes/*.ts', './src/controllers/*.ts']
        };

        const swaggerSpec = swaggerJsdoc(swaggerOptions);

        this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
            explorer: true,
            customCss: '.swagger-ui .topbar { display: none }',
            customSiteTitle: 'Admin Service API Documentation'
        }));
    }

    /**
     * Initialize error handling
     */
    private initializeErrorHandling(): void {
        // Global error handler
        this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
            logger.error('Unhandled error:', error);

            // Don't leak error details in production
            const isDevelopment = process.env.NODE_ENV === 'development';

            res.status(error.status || 500).json({
                success: false,
                message: error.message || 'Internal server error',
                ...(isDevelopment && { stack: error.stack }),
                timestamp: new Date().toISOString(),
                path: req.path,
                method: req.method
            });
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (error: Error) => {
            logger.error('Uncaught Exception:', error);
            process.exit(1);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
            logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
            process.exit(1);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            logger.info('SIGTERM received, shutting down gracefully');
            this.shutdown();
        });

        process.on('SIGINT', () => {
            logger.info('SIGINT received, shutting down gracefully');
            this.shutdown();
        });
    }

    /**
     * Start the server
     */
    public async start(): Promise<void> {
        try {
            // Initialize database
            await AdminDatabase.initialize();
            logger.info('Database connection established');

            // Start periodic health checks
            if (process.env.ENABLE_HEALTH_CHECKS !== 'false') {
                const healthCheckInterval = parseInt(process.env.HEALTH_CHECK_INTERVAL || '60000');
                SystemHealthService.startPeriodicHealthChecks(healthCheckInterval);
            }

            // Start server
            this.app.listen(this.port, () => {
                logger.info(`Admin Service started on port ${this.port}`);
                logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
                logger.info(`API Documentation: http://localhost:${this.port}/api-docs`);
            });
        } catch (error) {
            logger.error('Failed to start Admin Service:', error);
            process.exit(1);
        }
    }

    /**
     * Graceful shutdown
     */
    private async shutdown(): Promise<void> {
        try {
            logger.info('Closing database connections...');
            await AdminDatabase.close();

            logger.info('Admin Service shutdown complete');
            process.exit(0);
        } catch (error) {
            logger.error('Error during shutdown:', error);
            process.exit(1);
        }
    }
}

// Start the application
const adminService = new AdminServiceApp();
adminService.start();

export default adminService.app;