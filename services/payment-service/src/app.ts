import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
// import swaggerJsdoc from 'swagger-jsdoc';
// import swaggerUi from 'swagger-ui-express';
import {
  Logger,
  errorHandler,
  notFoundHandler
} from '@giga/common';

import payRouter from './routes/pay';
import { getServiceConfig, validateConfig } from './config/service-config';
import { ServiceInitializer } from './services/service-initializer';

// Load environment variables
dotenv.config();

// Get and validate configuration
const config = getServiceConfig();
validateConfig(config);

const app = express();
const logger = Logger;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.allowedOrigins,
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: config.limits.bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: config.limits.bodyLimit }));

// Raw body for webhooks (Stripe requires raw body for signature verification)
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));

// Request logging middleware
app.use((req, _res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  next();
});

// TODO: Setup Swagger documentation
// Temporarily disabled due to dependency issues
app.get('/docs', (req, res) => {
  res.json({
    message: 'API Documentation will be available soon',
    service: 'payment-service',
    version: config.version,
    endpoints: {
      health: '/health',
      ready: '/ready',
      api: '/api/v1'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'payment-service',
    version: process.env.SERVICE_VERSION || '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Readiness check endpoint
app.get('/ready', async (req, res) => {
  try {
    const health = await ServiceInitializer.healthCheck();

    if (!health.database || !health.messaging) {
      return res.status(503).json({
        status: 'not ready',
        service: 'payment-service',
        checks: {
          database: health.database ? 'healthy' : 'unhealthy',
          messaging: health.messaging ? 'healthy' : 'unhealthy'
        },
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      status: 'ready',
      service: 'payment-service',
      checks: {
        database: 'healthy',
        messaging: 'healthy'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Readiness check failed', error as Error);
    res.status(503).json({
      status: 'not ready',
      service: 'payment-service',
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    });
  }
});

// Routes
app.use('/api/v1', payRouter);

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Setup graceful shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<any>) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  logger.error('Unhandled promise rejection', error);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Initialize services


// Graceful shutdown handler
const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`${signal} received, shutting down gracefully`);

  try {
    await ServiceInitializer.shutdown();
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', error as Error);
    process.exit(1);
  }
};

// Start server
const startServer = async (): Promise<void> => {
  try {
    // Initialize all services
    await ServiceInitializer.initialize(config);

    // Start HTTP server
    const server = app.listen(config.port, () => {
      logger.info('Payment service started successfully', {
        port: config.port,
        environment: config.environment,
        version: config.version
      });
      console.log(`Payment service listening on port ${config.port}`);
      console.log(`API Documentation available at http://localhost:${config.port}/docs`);
    });

    // Handle server errors
    server.on('error', (error: Error) => {
      logger.error('Server error', error);
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
};

// Start the server only if this file is run directly
if (require.main === module) {
  startServer();
}

export default app;
