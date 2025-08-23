// Simple test to verify basic functionality
import express from 'express';

const app = express();

app.get('/health', (_req, res) => {
    res.json({ status: 'healthy', service: 'api-gateway' });
});

console.log('API Gateway basic test - OK');

export default app;