import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createProxyMiddleware } from 'http-proxy-middleware';

import { Logger } from '@giga/common';

const logger = Logger;
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { healthRouter } from './routes/health-routes';
import { ServiceRegistry } from './services/service-registry';
import { RateLimitConfig } from './config/rate-limit-config';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env['PORT'] || 8000;

// Initialize service registry
const serviceRegistry = new ServiceRegistry();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: process.env['NODE_ENV'] === 'production'
}));

// CORS configuration
app.use(cors({
    origin: process.env['CORS_ORIGIN'] || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use(requestLogger);

// Rate limiting middleware
const rateLimitConfig = new RateLimitConfig();
app.use('/api', rateLimitConfig.createRateLimit());

// Health check routes
app.use('/health', healthRouter);

// Service proxy routes
app.use('/api/auth', createProxyMiddleware({
    target: serviceRegistry.getServiceUrl('auth'),
    changeOrigin: true,
    pathRewrite: {
        '^/api/auth': ''
    },
    onError: (err, _req, res) => {
        logger.error('Auth service proxy error:', err);
        res.status(503).json({
            error: 'Auth service unavailable',
            message: 'The authentication service is currently unavailable'
        });
    },
    onProxyReq: (_proxyReq, req) => {
        logger.debug(`Proxying request to auth service: ${req.method} ${req.url}`);
    }
}));

app.use('/api/payment', createProxyMiddleware({
    target: serviceRegistry.getServiceUrl('payment'),
    changeOrigin: true,
    pathRewrite: {
        '^/api/payment': ''
    },
    onError: (err, _req, res) => {
        logger.error('Payment service proxy error:', err);
        res.status(503).json({
            error: 'Payment service unavailable',
            message: 'The payment service is currently unavailable'
        });
    }
}));

app.use('/api/notification', createProxyMiddleware({
    target: serviceRegistry.getServiceUrl('notification'),
    changeOrigin: true,
    pathRewrite: {
        '^/api/notification': ''
    },
    onError: (err, _req, res) => {
        logger.error('Notification service proxy error:', err);
        res.status(503).json({
            error: 'Notification service unavailable',
            message: 'The notification service is currently unavailable'
        });
    }
}));

app.use('/api/search', createProxyMiddleware({
    target: serviceRegistry.getServiceUrl('search'),
    changeOrigin: true,
    pathRewrite: {
        '^/api/search': ''
    },
    onError: (err, _req, res) => {
        logger.error('Search service proxy error:', err);
        res.status(503).json({
            error: 'Search service unavailable',
            message: 'The search service is currently unavailable'
        });
    }
}));

app.use('/api/file', createProxyMiddleware({
    target: serviceRegistry.getServiceUrl('file'),
    changeOrigin: true,
    pathRewrite: {
        '^/api/file': ''
    },
    onError: (err, _req, res) => {
        logger.error('File service proxy error:', err);
        res.status(503).json({
            error: 'File service unavailable',
            message: 'The file service is currently unavailable'
        });
    }
}));

app.use('/api/analytics', createProxyMiddleware({
    target: serviceRegistry.getServiceUrl('analytics'),
    changeOrigin: true,
    pathRewrite: {
        '^/api/analytics': ''
    },
    onError: (err, _req, res) => {
        logger.error('Analytics service proxy error:', err);
        res.status(503).json({
            error: 'Analytics service unavailable',
            message: 'The analytics service is currently unavailable'
        });
    }
}));

// Catch-all route for undefined endpoints
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        message: `The requested endpoint ${req.originalUrl} was not found`
    });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    logger.info(`API Gateway started on port ${PORT}`);
    logger.info(`Environment: ${process.env['NODE_ENV'] || 'development'}`);
    logger.info('Service registry initialized with services:', serviceRegistry.getRegisteredServices());
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
});

export default app;