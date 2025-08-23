import axios from 'axios';
import { ServiceRegistry } from '../services/service-registry';
import { HealthCheckService } from '../services/health-check-service';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('HealthCheckService', () => {
    let serviceRegistry: ServiceRegistry;
    let healthCheckService: HealthCheckService;

    beforeEach(() => {
        serviceRegistry = new ServiceRegistry();
        healthCheckService = new HealthCheckService(serviceRegistry);
        jest.clearAllMocks();
    });

    describe('checkService', () => {
        it('should return healthy status for successful response', async () => {
            mockedAxios.get.mockResolvedValueOnce({
                status: 200,
                statusText: 'OK',
                data: { status: 'healthy' }
            });

            const result = await healthCheckService.checkService('auth');

            expect(result.service).toBe('auth');
            expect(result.status).toBe('healthy');
            expect(result.statusCode).toBe(200);
            expect(result.message).toBe('Service is healthy');
            expect(mockedAxios.get).toHaveBeenCalledWith(
                'http://localhost:8001/health',
                expect.objectContaining({
                    timeout: expect.any(Number),
                    validateStatus: expect.any(Function)
                })
            );
        });

        it('should return unhealthy status for error response', async () => {
            mockedAxios.get.mockResolvedValueOnce({
                status: 500,
                statusText: 'Internal Server Error',
                data: { error: 'Service error' }
            });

            const result = await healthCheckService.checkService('auth');

            expect(result.service).toBe('auth');
            expect(result.status).toBe('unhealthy');
            expect(result.statusCode).toBe(500);
            expect(result.message).toBe('Service returned error status');
        });

        it('should return unhealthy status for connection error', async () => {
            const error = new Error('Connection refused');
            (error as any).code = 'ECONNREFUSED';
            mockedAxios.get.mockRejectedValueOnce(error);

            const result = await healthCheckService.checkService('auth');

            expect(result.service).toBe('auth');
            expect(result.status).toBe('unhealthy');
            expect(result.statusCode).toBe(0);
            expect(result.message).toBe('Connection refused - service may be down');
            expect(result.error).toBe('ECONNREFUSED');
        });

        it('should return unhealthy status for timeout error', async () => {
            const error = new Error('Timeout');
            (error as any).code = 'ETIMEDOUT';
            mockedAxios.get.mockRejectedValueOnce(error);

            const result = await healthCheckService.checkService('auth');

            expect(result.service).toBe('auth');
            expect(result.status).toBe('unhealthy');
            expect(result.message).toBe('Request timeout - service not responding');
            expect(result.error).toBe('ETIMEDOUT');
        });

        it('should throw error for unregistered service', async () => {
            await expect(
                healthCheckService.checkService('nonexistent')
            ).rejects.toThrow("Service 'nonexistent' not found in registry");
        });
    });

    describe('checkAllServices', () => {
        it('should check all registered services', async () => {
            // Mock successful responses for all services
            mockedAxios.get.mockResolvedValue({
                status: 200,
                statusText: 'OK',
                data: { status: 'healthy' }
            });

            const results = await healthCheckService.checkAllServices();

            expect(results).toHaveLength(6); // auth, payment, notification, search, file, analytics
            expect(results.every(result => result.status === 'healthy')).toBe(true);
            expect(mockedAxios.get).toHaveBeenCalledTimes(6);
        });

        it('should handle mixed service statuses', async () => {
            // Mock different responses for different services
            mockedAxios.get
                .mockResolvedValueOnce({ status: 200, statusText: 'OK' }) // auth - healthy
                .mockRejectedValueOnce(new Error('Connection refused')) // payment - unhealthy
                .mockResolvedValueOnce({ status: 200, statusText: 'OK' }) // notification - healthy
                .mockResolvedValueOnce({ status: 500, statusText: 'Error' }) // search - unhealthy
                .mockResolvedValueOnce({ status: 200, statusText: 'OK' }) // file - healthy
                .mockResolvedValueOnce({ status: 200, statusText: 'OK' }); // analytics - healthy

            const results = await healthCheckService.checkAllServices();

            expect(results).toHaveLength(6);
            expect(results.filter(r => r.status === 'healthy')).toHaveLength(4);
            expect(results.filter(r => r.status === 'unhealthy')).toHaveLength(2);
        });
    });

    describe('cache functionality', () => {
        it('should cache health check results', async () => {
            mockedAxios.get.mockResolvedValueOnce({
                status: 200,
                statusText: 'OK',
                data: { status: 'healthy' }
            });

            // First call should make HTTP request
            const result1 = await healthCheckService.checkService('auth');
            expect(mockedAxios.get).toHaveBeenCalledTimes(1);

            // Second call should use cache
            const result2 = await healthCheckService.checkService('auth');
            expect(mockedAxios.get).toHaveBeenCalledTimes(1); // Still 1, not 2

            expect(result1.timestamp).toBe(result2.timestamp);
        });

        it('should clear cache', () => {
            healthCheckService.clearCache();
            const stats = healthCheckService.getCacheStats();
            expect(stats.size).toBe(0);
            expect(stats.services).toHaveLength(0);
        });
    });
});