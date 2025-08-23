import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { ElasticsearchClient } from './config/elasticsearch-config';
import { RedisClient } from './config/redis-config';
import { SearchService } from './services/search-service';
import { AutocompleteService } from './services/autocomplete-service';
import { RecommendationService } from './services/recommendation-service';
import { SearchController } from './controllers/search-controller';
import { createSearchRoutes } from './routes/search-routes';
import { sanitizeRequest } from './middleware/validation-middleware';
import { logger } from './utils/logger';
import { ResponseHelper } from './utils/response';

// Load environment variables
dotenv.config();

class SearchServiceApp {
    private app: express.Application;
    private esClient: ElasticsearchClient;
    private redisClient: RedisClient;
    private searchService: SearchService;
    private autocompleteService: AutocompleteService;
    private recommendationService: RecommendationService;
    private searchController: SearchController;

    constructor() {
        this.app = express();
        this.initializeClients();
        this.initializeServices();
        this.initializeMiddleware();
        this.initializeRoutes();
        this.initializeErrorHandling();
    }

    /**
     * Initialize external clients (Elasticsearch, Redis)
     */
    private initializeClients(): void {
        // Initialize Elasticsearch client
        this.esClient = new ElasticsearchClient({
            url: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
            username: process.env.ELASTICSEARCH_USERNAME,
            password: process.env.ELASTICSEARCH_PASSWORD,
            indexPrefix: process.env.ELASTICSEARCH_INDEX_PREFIX || 'search_'
        });

        // Initialize Redis client
        this.redisClient = new RedisClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379',
            password: process.env.REDIS_PASSWORD,
            db: parseInt(process.env.REDIS_DB || '0')
        });
    }

    /**
     * Initialize services and controllers
     */
    private initializeServices(): void {
        this.searchService = new SearchService(this.esClient, this.redisClient);
        this.autocompleteService = new AutocompleteService(this.esClient, this.redisClient);
        this.recommendationService = new RecommendationService(this.esClient, this.redisClient);
        this.searchController = new SearchController(
            this.searchService,
            this.autocompleteService,
            this.recommendationService
        );
    }

    /**
     * Initialize Express middleware
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
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'user-id', 'user-role']
        }));

        // Compression middleware
        this.app.use(compression());

        // Body parsing middleware
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Request sanitization
        this.app.use(sanitizeRequest);

        // Request logging
        this.app.use((req, res, next) => {
            logger.info('Incoming request', {
                method: req.method,
                path: req.path,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                userId: req.headers['user-id']
            });
            next();
        });
    }

    /**
     * Initialize API routes
     */
    private initializeRoutes(): void {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            ResponseHelper.success(res, {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                service: 'search-service',
                version: process.env.npm_package_version || '1.0.0'
            });
        });

        // API routes
        this.app.use('/api/search', createSearchRoutes(this.searchController));

        // 404 handler
        this.app.use('*', (req, res) => {
            ResponseHelper.notFound(res, `Route ${req.originalUrl} not found`);
        });
    }

    /**
     * Initialize error handling middleware
     */
    private initializeErrorHandling(): void {
        // Global error handler
        this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
            logger.error('Unhandled error:', {
                error: error.message,
                stack: error.stack,
                path: req.path,
                method: req.method,
                ip: req.ip,
                userId: req.headers['user-id']
            });

            // Don't leak error details in production
            const isDevelopment = process.env.NODE_ENV === 'development';
            const errorMessage = isDevelopment ? error.message : 'Internal server error';
            const errorDetails = isDevelopment ? error.stack : undefined;

            ResponseHelper.error(res, errorMessage, 500, 'INTERNAL_ERROR', errorDetails);
        });

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

    /**
     * Initialize search indices and start the server
     */
    public async start(): Promise<void> {
        try {
            const port = process.env.PORT || 3007;

            // Connect to Redis
            await this.redisClient.connect();

            // Test Elasticsearch connection
            const esConnected = await this.esClient.testConnection();
            if (!esConnected) {
                throw new Error('Failed to connect to Elasticsearch');
            }

            // Initialize search indices
            await this.searchService.initializeIndices();
            await this.recommendationService.initializeRecommendationIndices();

            // Start the server
            this.app.listen(port, () => {
                logger.info(`Search service started on port ${port}`, {
                    port,
                    environment: process.env.NODE_ENV || 'development',
                    elasticsearch: process.env.ELASTICSEARCH_URL,
                    redis: process.env.REDIS_URL
                });
            });

        } catch (error) {
            logger.error('Failed to start search service:', error);
            process.exit(1);
        }
    }

    /**
     * Graceful shutdown
     */
    public async shutdown(): Promise<void> {
        try {
            logger.info('Shutting down search service...');

            // Close database connections
            await this.esClient.close();
            await this.redisClient.disconnect();

            logger.info('Search service shutdown complete');
            process.exit(0);
        } catch (error) {
            logger.error('Error during shutdown:', error);
            process.exit(1);
        }
    }

    /**
     * Get Express app instance
     */
    public getApp(): express.Application {
        return this.app;
    }
}

// Handle graceful shutdown
const searchApp = new SearchServiceApp();

process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    searchApp.shutdown();
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    searchApp.shutdown();
});

// Start the application
if (require.main === module) {
    searchApp.start();
}

export default SearchServiceApp;