import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { notificationRoutes } from './routes/notification-routes';
import { errorHandler } from './middleware/error-middleware';
import { requestLogger } from './middleware/logging-middleware';
import { connectDatabase } from './database/connection';

dotenv.config();

const app = express();
const PORT = process.env['PORT'] || 3006;

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(requestLogger);

// Health check endpoint
app.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: 'notification-service',
        timestamp: new Date().toISOString()
    });
});

// API routes
app.use('/api/notifications', notificationRoutes);

// Error handling middleware
app.use(errorHandler);

// Start server
async function startServer() {
    try {
        await connectDatabase();
        console.log('Database connected successfully');

        app.listen(PORT, () => {
            console.log(`Notification service running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

export default app;