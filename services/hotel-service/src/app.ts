import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

// Routes
import bookingsRouter from './routes/bookings';
import propertiesRouter from './routes/properties';
import roomsRouter from './routes/rooms';
import reviewsRouter from './routes/reviews';
import advancedSearchRouter from './routes/advanced-search';
import bookingModificationsRouter from './routes/booking-modifications';
import availabilityCalendarRouter from './routes/availability-calendar';
import pricingOptimizationRouter from './routes/pricing-optimization';

// Middleware
import { errorHandler } from './middleware/error.middleware';
import { logger } from './utils/logger';

const app = express();
const port = process.env.PORT || 4001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method !== 'GET' ? req.body : undefined
  });
  next();
});

// Setup Swagger documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Hotel Service API',
      version: '1.0.0',
      description: 'Hotel booking service for property management, room availability, reservations, and booking management',
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
        name: 'Properties',
        description: 'Property management operations'
      },
      {
        name: 'Rooms',
        description: 'Room management operations'
      },
      {
        name: 'Bookings',
        description: 'Booking management operations'
      },
      {
        name: 'Reviews',
        description: 'Property review and rating operations'
      },
      {
        name: 'Search',
        description: 'Advanced property search operations'
      },
      {
        name: 'Booking Modifications',
        description: 'Booking modification and cancellation operations'
      },
      {
        name: 'Availability Calendar',
        description: 'Room availability and calendar management'
      },
      {
        name: 'Pricing Optimization',
        description: 'Dynamic pricing and optimization operations'
      }
    ]
  },
  apis: ['./src/routes/**/*.ts', './src/docs/**/*.ts']
};

const specs = swaggerJsdoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }'
}));

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'hotel-service',
    version: '1.0.0'
  });
});

// API routes
app.use('/api', propertiesRouter);
app.use('/api', roomsRouter);
app.use('/api', bookingsRouter);
app.use('/api', reviewsRouter);
app.use('/api', advancedSearchRouter);
app.use('/api', bookingModificationsRouter);
app.use('/api', availabilityCalendarRouter);
app.use('/api', pricingOptimizationRouter);

// Legacy route for backward compatibility
app.use('/', bookingsRouter);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`
    }
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

app.listen(port, () => {
  logger.info(`Hotel service listening on port ${port}`);
  logger.info(`API documentation available at http://localhost:${port}/docs`);
});

export default app;
