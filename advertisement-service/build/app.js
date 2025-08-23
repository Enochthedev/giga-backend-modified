"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
// Import routes
const campaign_routes_1 = __importDefault(require("./routes/campaign.routes"));
const advertisement_routes_1 = __importDefault(require("./routes/advertisement.routes"));
const analytics_routes_1 = __importDefault(require("./routes/analytics.routes"));
// Import middleware
const error_middleware_1 = require("./middleware/error.middleware");
// Import database
const connection_1 = require("./database/connection");
const app = (0, express_1.default)();
const port = process.env.PORT || 4003;
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: ((_a = process.env.ALLOWED_ORIGINS) === null || _a === void 0 ? void 0 : _a.split(',')) || ['http://localhost:3000'],
    credentials: true
}));
// Body parsing middleware
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Logging middleware
app.use((0, morgan_1.default)('combined'));
// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);
// Setup Swagger documentation
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Advertisement Service API',
            version: '2.0.0',
            description: 'Comprehensive advertisement management service with campaign management, targeting, analytics, and payment integration',
            contact: {
                name: 'Giga Backend Team',
                email: 'support@giga-backend.com'
            }
        },
        servers: [
            {
                url: `http://localhost:${port}`,
                description: 'Development server'
            },
            {
                url: process.env.API_BASE_URL || `http://localhost:${port}`,
                description: 'Production server'
            }
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'JWT token for authentication'
                }
            }
        },
        tags: [
            {
                name: 'Campaigns',
                description: 'Campaign management operations'
            },
            {
                name: 'Advertisements',
                description: 'Advertisement management and serving'
            },
            {
                name: 'Analytics',
                description: 'Analytics and reporting operations'
            }
        ]
    },
    apis: ['./src/routes/**/*.ts', './src/controllers/**/*.ts']
};
const specs = (0, swagger_jsdoc_1.default)(swaggerOptions);
app.use('/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }'
}));
// Health check endpoint
app.get('/health', async (_req, res) => {
    try {
        const dbHealthy = await connection_1.db.healthCheck();
        const status = dbHealthy ? 'ok' : 'degraded';
        const httpStatus = dbHealthy ? 200 : 503;
        res.status(httpStatus).json({
            status,
            timestamp: new Date().toISOString(),
            service: 'advertisement-service',
            version: '2.0.0',
            database: dbHealthy ? 'connected' : 'disconnected',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            environment: process.env.NODE_ENV || 'development'
        });
    }
    catch (error) {
        res.status(503).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            service: 'advertisement-service',
            version: '2.0.0',
            database: 'disconnected',
            error: 'Health check failed',
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development'
        });
    }
});
// API routes
app.use('/api/campaigns', campaign_routes_1.default);
app.use('/api/advertisements', advertisement_routes_1.default);
app.use('/api/analytics', analytics_routes_1.default);
// Legacy routes for backward compatibility
app.use('/ads', advertisement_routes_1.default);
// Error handling middleware
app.use(error_middleware_1.notFoundHandler);
app.use(error_middleware_1.errorHandler);
// Initialize database and start server
const startServer = async () => {
    try {
        // Try to initialize database schema
        try {
            await connection_1.db.initializeDatabase();
            console.log('Database initialized successfully');
        }
        catch (dbError) {
            console.warn('Database initialization failed, service will start but may have limited functionality:', dbError);
            // Continue starting the server even if database fails
        }
        app.listen(port, () => {
            console.log(`🚀 Advertisement service listening on port ${port}`);
            console.log(`📚 API Documentation available at http://localhost:${port}/docs`);
            console.log(`🏥 Health check available at http://localhost:${port}/health`);
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};
// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await connection_1.db.close();
    process.exit(0);
});
process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    await connection_1.db.close();
    process.exit(0);
});
// Start the server
startServer();
exports.default = app;
//# sourceMappingURL=app.js.map