import request from 'supertest';
import app from '../app';

// Mock the logger to avoid console output during tests
jest.mock('@giga/common', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    }
}));

describe('API Gateway App', () => {
    describe('Health endpoints', () => {
        it('should return health status on GET /health', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            expect(response.body).toMatchObject({
                status: 'healthy',
                service: 'api-gateway',
                timestamp: expect.any(String),
                uptime: expect.any(Number),
                memory: expect.any(Object),
                version: expect.any(String)
            });
        });

        it('should return liveness status on GET /health/live', async () => {
            const response = await request(app)
                .get('/health/live')
                .expect(200);

            expect(response.body).toMatchObject({
                status: 'alive',
                message: 'API Gateway is alive',
                timestamp: expect.any(String),
                uptime: expect.any(Number)
            });
        });
    });

    describe('CORS headers', () => {
        it('should include CORS headers in response', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            expect(response.headers['access-control-allow-origin']).toBeDefined();
        });

        it('should handle preflight OPTIONS requests', async () => {
            await request(app)
                .options('/api/auth/login')
                .expect(204);
        });
    });

    describe('Security headers', () => {
        it('should include security headers', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            // Helmet should add security headers
            expect(response.headers['x-content-type-options']).toBe('nosniff');
            expect(response.headers['x-frame-options']).toBeDefined();
        });
    });

    describe('Rate limiting', () => {
        it('should apply rate limiting to API endpoints', async () => {
            // Make multiple requests to trigger rate limiting
            // Note: This test might be flaky depending on rate limit settings
            const requests = Array(10).fill(null).map(() =>
                request(app).get('/api/auth/test')
            );

            const responses = await Promise.all(requests);

            // At least some requests should go through (even if service is down)
            // We're testing that rate limiting middleware is applied, not that it blocks
            responses.forEach(response => {
                expect(response.headers['x-ratelimit-limit']).toBeDefined();
                expect(response.headers['x-ratelimit-remaining']).toBeDefined();
            });
        });
    });

    describe('Error handling', () => {
        it('should return 404 for undefined routes', async () => {
            const response = await request(app)
                .get('/nonexistent-route')
                .expect(404);

            expect(response.body).toMatchObject({
                error: 'Endpoint not found',
                message: expect.stringContaining('/nonexistent-route')
            });
        });

        it('should handle malformed JSON in request body', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .set('Content-Type', 'application/json')
                .send('{"invalid": json}')
                .expect(400);

            // Express should handle malformed JSON and return 400
            expect(response.status).toBe(400);
        });
    });

    describe('Request logging', () => {
        it('should add request ID to response headers', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            expect(response.headers['x-request-id']).toBeDefined();
        });
    });

    describe('Proxy routes', () => {
        it('should proxy requests to auth service', async () => {
            // This will fail because auth service is not running, but we can test the route exists
            const response = await request(app)
                .get('/api/auth/health');

            // Should get 503 (service unavailable) rather than 404 (route not found)
            expect(response.status).toBe(503);
            expect(response.body.error).toBe('Auth service unavailable');
        });

        it('should proxy requests to payment service', async () => {
            const response = await request(app)
                .get('/api/payment/health');

            expect(response.status).toBe(503);
            expect(response.body.error).toBe('Payment service unavailable');
        });

        it('should proxy requests to notification service', async () => {
            const response = await request(app)
                .get('/api/notification/health');

            expect(response.status).toBe(503);
            expect(response.body.error).toBe('Notification service unavailable');
        });
    });
});