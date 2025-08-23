import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import dotenv from 'dotenv';

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/error-middleware';
import logger from './utils/logger';

// Import routes
import routes from './routes';

// Import services
import db from './database/connection';
import socketService from './services/socket-service';
import migrator from './database/migrate';

// Load environment variables
dotenv.config();

/**
 * Messaging Service Application
 * Handles real-time communication, support tickets, FAQs, and notification preferences
 */
class MessagingServiceApp {
    public app: express.Application;
    public server: any;
    private port: number;

    constructor() {
        this.app = express();
        this.port = parseInt(process.env.PORT || '3007');

        this.initializeMiddleware();
        this.initializeRoutes();
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
            origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
        }));

        // Compression middleware
        this.app.use(compression());

        // Rate limiting
        const limiter = rateLimit({
            windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
            max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
            message: {
                success: false,
                error: 'Too many requests from this IP, please try again later.',
                code: 'RATE_LIMIT_EXCEEDED'
            },
            standardHeaders: true,
            legacyHeaders: false,
        });

        this.app.use('/api/', limiter);

        // Body parsing middleware
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Request logging middleware
        this.app.use((req, res, next) => {
            logger.info('Request received:', {
                method: req.method,
                url: req.url,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            next();
        });

        // Health check middleware (before rate limiting)
        this.app.get('/health', (req, res) => {
            res.json({
                success: true,
                message: 'Messaging service is healthy',
                timestamp: new Date().toISOString(),
                service: 'messaging-service',
                version: '1.0.0',
                uptime: process.uptime()
            });
        });
    }

    /**
     * Initialize routes
     */
    private initializeRoutes(): void {
        // API routes
        this.app.use('/api', routes);

        // Root endpoint
        this.app.get('/', (req, res) => {
            res.json({
                success: true,
                message: 'Messaging Service API',
                version: '1.0.0',
                documentation: '/api/docs',
                health: '/health'
            });
        });
    }

    /**
     * Initialize error handling
     */
    private initializeErrorHandling(): void {
        // 404 handler
        this.app.use(notFoundHandler);

        // Global error handler
        this.app.use(errorHandler);
    }

    /**
     * Initialize database and run migrations
     */
    private async initializeDatabase(): Promise<void> {
        try {
            logger.info('Initializing database...');

            // Run migrations
            await migrator.migrate();

            // Seed database in development
            if (process.env.NODE_ENV === 'development') {
                await migrator.seed();
            }

            logger.info('Database initialized successfully');
        } catch (error) {
            logger.error('Database initialization failed:', error);
            throw error;
        }
    }

    /**
     * Initialize Socket.IO server
     */
    private initializeSocketIO(): void {
        this.server = createServer(this.app);
        socketService.initialize(this.server);
        logger.info('Socket.IO server initialized');
    }

    /**
     * Start the server
     */
    public async start(): Promise<void> {
        try {
            // Initialize database
            await this.initializeDatabase();

            // Initialize Socket.IO
            this.initializeSocketIO();

            // Start server
            this.server.listen(this.port, () => {
                logger.info(`Messaging service started on port ${this.port}`, {
                    port: this.port,
                    environment: process.env.NODE_ENV || 'development',
                    nodeVersion: process.version
                });
            });

            // Graceful shutdown handling
            this.setupGracefulShutdown();

        } catch (error) {
            logger.error('Failed to start messaging service:', error);
            process.exit(1);
        }
    }

    /**
     * Setup graceful shutdown
     */
    private setupGracefulShutdown(): void {
        const gracefulShutdown = async (signal: string) => {
            logger.info(`Received ${signal}, starting graceful shutdown...`);

            // Close server
            if (this.server) {
                this.server.close(() => {
                    logger.info('HTTP server closed');
                });
            }

            // Close database connections
            try {
                await db.close();
                logger.info('Database connections closed');
            } catch (error) {
                logger.error('Error closing database connections:', error);
            }

            logger.info('Graceful shutdown completed');
            process.exit(0);
        };

        // Listen for termination signals
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught exception:', error);
            gracefulShutdown('uncaughtException');
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled rejection at:', promise, 'reason:', reason);
            gracefulShutdown('unhandledRejection');
        });
    }

    /**
     * Get Express app instance
     */
    public getApp(): express.Application {
        return this.app;
    }

    /**
     * Get HTTP server instance
     */
    public getServer(): any {
        return this.server;
    }
}

// Create and start the application
const messagingApp = new MessagingServiceApp();

// Start the server if this file is run directly
if (require.main === module) {
    messagingApp.start().catch((error) => {
        logger.error('Failed to start application:', error);
        process.exit(1);
    });
}

export default messagingApp;