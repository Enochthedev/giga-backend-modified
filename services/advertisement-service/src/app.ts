import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

// Import routes
import campaignRoutes from './routes/campaign.routes';
import advertisementRoutes from './routes/advertisement.routes';
import analyticsRoutes from './routes/analytics.routes';

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

// Import database
import { db } from './database/connection';

const app = express();
const port = process.env.PORT || 4003;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(morgan('combined'));

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

const specs = swaggerJsdoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }'
}));

// Health check endpoint
app.get('/health', async (_req, res) => {
  try {
    const dbHealthy = await db.healthCheck();
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
  } catch (error) {
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
app.use('/api/campaigns', campaignRoutes);
app.use('/api/advertisements', advertisementRoutes);
app.use('/api/analytics', analyticsRoutes);

// Legacy routes for backward compatibility
app.use('/ads', advertisementRoutes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize database and start server
const startServer = async () => {
  try {
    // Try to initialize database schema
    try {
      await db.initializeDatabase();
      console.log('Database initialized successfully');
    } catch (dbError) {
      console.warn('Database initialization failed, service will start but may have limited functionality:', dbError);
      // Continue starting the server even if database fails
    }

    app.listen(port, () => {
      console.log(`🚀 Advertisement service listening on port ${port}`);
      console.log(`📚 API Documentation available at http://localhost:${port}/docs`);
      console.log(`🏥 Health check available at http://localhost:${port}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await db.close();
  process.exit(0);
});

// Start the server
startServer();

export default app;
