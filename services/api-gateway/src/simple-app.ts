import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'api-gateway',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Basic routes
app.get('/', (req, res) => {
    res.json({
        message: 'Giga Multi-Service Platform API Gateway',
        version: '1.0.0',
        services: {
            authentication: 'http://authentication-service:3001',
            ecommerce: 'http://ecommerce-service:3002',
            payment: 'http://payment-service:3003',
            taxi: 'http://taxi-service:3004',
            hotel: 'http://hotel-service:3005'
        }
    });
});

// Start server
app.listen(port, () => {
    console.log(`🚀 API Gateway running on port ${port}`);
    console.log(`📊 Health check: http://localhost:${port}/health`);
});

export default app;