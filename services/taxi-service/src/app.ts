import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Import services
import WebSocketService from './services/websocket.service';
import EventService from './services/event.service';

// Import routes
import driverRoutes from './routes/driver.routes';
import rideRoutes from './routes/ride.routes';
import pricingRoutes from './routes/pricing.routes';
import ratingRoutes from './routes/rating.routes';
import analyticsRoutes from './routes/analytics.routes';
import routeRoutes from './routes/route.routes';
import legacyRoutes from './routes/legacy-compatibility.routes';

// Import utilities
import ApiError from './utils/api-error';
import httpStatus from 'http-status';

// Load environment variables
dotenv.config();

const app: express.Application = express();
const server = createServer(app);
const port = process.env.PORT || 3005;

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Taxi service is healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API info endpoint
app.get('/api/info', (req, res) => {
    res.json({
        service: 'Taxi Service',
        version: '1.0.0',
        description: 'Unified taxi service with driver and ride management',
        endpoints: {
            drivers: '/api/drivers',
            rides: '/api/rides',
            pricing: '/api/pricing',
            ratings: '/api/ratings',
            analytics: '/api/analytics',
            routes: '/api/routes',
            websocket: '/socket.io',
            health: '/health'
        },
        features: [
            'Driver registration and management',
            'Vehicle management',
            'Ride booking and matching',
            'Real-time location tracking',
            'WebSocket communication',
            'Ride rating and reviews',
            'Dynamic pricing with surge and promotions',
            'Advanced driver and passenger analytics',
            'Route optimization with traffic data',
            'Performance metrics and feedback system'
        ]
    });
});

// API routes
app.use('/api/drivers', driverRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/legacy', legacyRoutes);

// 404 handler for undefined routes
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
        availableEndpoints: {
            drivers: '/api/drivers',
            rides: '/api/rides',
            pricing: '/api/pricing',
            ratings: '/api/ratings',
            analytics: '/api/analytics',
            routes: '/api/routes',
            health: '/health',
            info: '/api/info'
        }
    });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error occurred:', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
    });

    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal server error';

    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && {
            error: {
                name: error.name,
                stack: error.stack
            }
        }),
        timestamp: new Date().toISOString(),
        path: req.url,
        method: req.method
    });
});

async function startServer() {
    try {
        // Connect to MongoDB
        const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017/taxi_service';
        await mongoose.connect(mongoUrl);
        console.log('✅ MongoDB connected successfully');

        // Initialize Event Service (RabbitMQ)
        try {
            await EventService.connect();
            console.log('✅ Event service connected to RabbitMQ');
        } catch (error) {
            console.warn('⚠️ Event service connection failed, continuing without RabbitMQ:', error);
        }

        // Initialize WebSocket service
        const websocketService = new WebSocketService(server);
        console.log('✅ WebSocket service initialized');

        // Start server
        server.listen(port, () => {
            console.log(`🚗 Taxi Service running on port ${port}`);
            console.log(`📡 WebSocket server available at ws://localhost:${port}`);
            console.log(`🏥 Health check: http://localhost:${port}/health`);
            console.log(`📋 API info: http://localhost:${port}/api/info`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        });

        // Graceful shutdown handling
        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);

    } catch (error) {
        console.error('❌ Failed to start taxi service:', error);
        process.exit(1);
    }
}

async function gracefulShutdown(signal: string) {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

    // Close server
    server.close(() => {
        console.log('✅ HTTP server closed');
    });

    // Close database connection
    try {
        await mongoose.connection.close();
        console.log('✅ Database connection closed');
    } catch (error) {
        console.error('❌ Error closing database connection:', error);
    }

    // Close event service connection
    try {
        await EventService.disconnect();
        console.log('✅ Event service disconnected');
    } catch (error) {
        console.error('❌ Error closing event service connection:', error);
    }

    console.log('✅ Graceful shutdown completed');
    process.exit(0);
}

// Start the server if this file is run directly
if (require.main === module) {
    startServer();
}

export default app;