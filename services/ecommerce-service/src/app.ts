import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import routes from './routes';
import { EcommerceDatabase } from './database/connection';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { requestLogger } from './middleware/logging.middleware';

// Multi-tenancy and localization middleware
import {
  ecommerceTenantMiddleware,
  setupTenantDatabase
} from './middleware/tenant-middleware';
import { localizationMiddleware } from './middleware/localization-middleware';

// Initialize multi-tenancy and localization services
import { dbPartitionManager } from '@common/multi-tenancy';
import { i18n, currencyService, regionConfig } from '@common/localization';

const app = express();
const port = process.env.PORT || 4000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later'
  }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(requestLogger);

// Multi-tenancy middleware (must be before routes)
app.use('/api', ecommerceTenantMiddleware);
app.use('/api', setupTenantDatabase);

// Localization middleware
app.use('/api', ...localizationMiddleware);

// Setup Swagger documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'E-commerce Service API',
      version: '1.0.0',
      description: 'E-commerce backend service for product catalog, shopping cart, and order management',
      contact: {
        name: 'Giga Backend Team',
        email: 'support@giga-backend.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: 'Development server'
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
    }
  },
  apis: ['./src/routes/**/*.ts', './src/docs/**/*.ts']
};

const specs = swaggerJsdoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }'
}));

// API routes
app.use('/api', routes);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Ecommerce service is healthy',
    timestamp: new Date().toISOString(),
    service: 'ecommerce-backend',
    version: '1.0.0'
  });
});

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize database and start server
const startServer = async () => {
  try {
    // Initialize database connection
    await EcommerceDatabase.initialize();
    console.log('Database connected successfully');

    // Initialize multi-tenancy database partitioning
    await dbPartitionManager.initialize({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'ecommerce_db',
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      ssl: process.env.DB_SSL === 'true'
    }, 'schema'); // Use schema-based partitioning
    console.log('Multi-tenancy database partitioning initialized');

    // Initialize localization services
    await i18n.initialize([
      {
        code: 'en-US',
        name: 'English (US)',
        direction: 'ltr',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: 'h:mm A',
        numberFormat: {
          decimal: '.',
          thousands: ',',
          currency: { symbol: '$', position: 'before' }
        },
        pluralRules: [
          { condition: 'n === 1', form: 'one' },
          { condition: 'n !== 1', form: 'other' }
        ]
      },
      {
        code: 'en-NG',
        name: 'English (Nigeria)',
        direction: 'ltr',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: 'HH:mm',
        numberFormat: {
          decimal: '.',
          thousands: ',',
          currency: { symbol: '₦', position: 'before' }
        },
        pluralRules: [
          { condition: 'n === 1', form: 'one' },
          { condition: 'n !== 1', form: 'other' }
        ]
      }
    ]);

    await currencyService.initialize();
    await regionConfig.initialize();
    console.log('Localization services initialized');

    // Start server
    app.listen(port, () => {
      console.log(`🚀 Ecommerce service listening on port ${port}`);
      console.log(`📚 API Documentation available at http://localhost:${port}/docs`);
      console.log(`🏥 Health check available at http://localhost:${port}/health`);
      console.log(`🌍 Multi-tenancy and localization enabled`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await EcommerceDatabase.close();
  await dbPartitionManager.cleanup();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await EcommerceDatabase.close();
  await dbPartitionManager.cleanup();
  process.exit(0);
});

// Start the server
if (require.main === module) {
  startServer();
}

export default app;
