import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import passport from 'passport';
import dotenv from 'dotenv';
import { Logger, errorHandler, notFoundHandler } from '@giga/common';
import { SecurityMiddleware, LoggingMiddleware } from '@giga/common';
import authRoutes from './routes/auth-routes';
import userRoutes from './routes/user-routes';
import mfaRoutes from './routes/mfa-routes';
import deviceRoutes from './routes/device-routes';
import securityRoutes from './routes/security-routes';
import { DatabaseConnection } from './database/connection';
import { OAuthService } from './services/oauth-service';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env['PORT'] || 8001;

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env['ALLOWED_ORIGINS']?.split(',') || ['http://localhost:3000'],
    credentials: true
}));

// Initialize OAuth strategies
OAuthService.initialize();

// Passport middleware
app.use(passport.initialize());

// Rate limiting
app.use(SecurityMiddleware.rateLimit({
    windowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000'),
    max: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100')
}));

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy for accurate IP addresses
app.set('trust proxy', true);

// Logging middleware
app.use(LoggingMiddleware.requestId());
app.use(LoggingMiddleware.logRequests({
    excludePaths: ['/health', '/metrics']
}));

// Health check endpoint
app.get('/health', (_req, res) => {
    res.json({
        status: 'healthy',
        service: 'authentication-service',
        timestamp: new Date().toISOString(),
        version: process.env['npm_package_version'] || '1.0.0'
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/mfa', mfaRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/security', securityRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
async function startServer() {
    try {
        // Initialize database connection
        await DatabaseConnection.initialize();

        app.listen(PORT, () => {
            Logger.info(`Authentication service started on port ${PORT}`, {
                service: 'authentication-service',
                port: PORT,
                environment: process.env['NODE_ENV'] || 'development'
            });
        });
    } catch (error) {
        Logger.error('Failed to start authentication service', error as Error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    Logger.info('SIGTERM received, shutting down gracefully');
    await DatabaseConnection.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    Logger.info('SIGINT received, shutting down gracefully');
    await DatabaseConnection.close();
    process.exit(0);
});

startServer();

export default app;