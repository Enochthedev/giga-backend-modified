import { Router, Request, Response } from 'express';
import { Logger } from '@giga/common';

const logger = Logger;
import { ServiceRegistry } from '../services/service-registry';
import { HealthCheckService } from '../services/health-check-service';
import { asyncErrorHandler } from '../middleware/error-handler';

const router = Router();
const serviceRegistry = new ServiceRegistry();
const healthCheckService = new HealthCheckService(serviceRegistry);

/**
 * Gateway health check endpoint
 * Returns basic health status of the API Gateway
 */
router.get('/', (_req: Request, res: Response) => {
    const healthStatus = {
        status: 'healthy',
        service: 'api-gateway',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env['npm_package_version'] || '1.0.0'
    };

    logger.debug('Health check requested for API Gateway');
    res.status(200).json(healthStatus);
});

/**
 * Detailed health check including all downstream services
 * Checks connectivity to all registered services
 */
router.get('/detailed', asyncErrorHandler(async (_req: Request, res: Response) => {
    logger.info('Detailed health check requested');

    const gatewayHealth = {
        status: 'healthy',
        service: 'api-gateway',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env['npm_package_version'] || '1.0.0'
    };

    const serviceHealthChecks = await healthCheckService.checkAllServices();

    const overallStatus = serviceHealthChecks.every(service => service.status === 'healthy')
        ? 'healthy'
        : 'degraded';

    const detailedHealth = {
        ...gatewayHealth,
        status: overallStatus,
        services: serviceHealthChecks,
        summary: {
            total: serviceHealthChecks.length,
            healthy: serviceHealthChecks.filter(s => s.status === 'healthy').length,
            unhealthy: serviceHealthChecks.filter(s => s.status === 'unhealthy').length
        }
    };

    const statusCode = overallStatus === 'healthy' ? 200 : 503;
    res.status(statusCode).json(detailedHealth);
    return;
}));

/**
 * Health check for specific service
 * Returns health status of a specific downstream service
 */
router.get('/service/:serviceName', asyncErrorHandler(async (req: Request, res: Response) => {
    const { serviceName } = req.params;

    if (!serviceName || !serviceRegistry.isServiceRegistered(serviceName)) {
        return res.status(404).json({
            error: 'Service not found',
            message: `Service '${serviceName}' is not registered`,
            availableServices: serviceRegistry.getRegisteredServices()
        });
    }

    logger.debug(`Health check requested for service: ${serviceName}`);

    const serviceHealth = await healthCheckService.checkService(serviceName!);
    const statusCode = serviceHealth.status === 'healthy' ? 200 : 503;

    res.status(statusCode).json(serviceHealth);
    return;
}));

/**
 * Readiness probe endpoint
 * Used by Kubernetes to determine if the service is ready to receive traffic
 */
router.get('/ready', asyncErrorHandler(async (_req: Request, res: Response) => {
    logger.debug('Readiness probe requested');

    // Check if critical services are available
    const criticalServices = ['auth']; // Add other critical services as needed
    const criticalServiceChecks = await Promise.all(
        criticalServices.map(service => healthCheckService.checkService(service))
    );

    const allCriticalServicesHealthy = criticalServiceChecks.every(
        service => service.status === 'healthy'
    );

    if (allCriticalServicesHealthy) {
        res.status(200).json({
            status: 'ready',
            message: 'API Gateway is ready to receive traffic',
            timestamp: new Date().toISOString()
        });
        return;
    } else {
        res.status(503).json({
            status: 'not ready',
            message: 'API Gateway is not ready - critical services unavailable',
            criticalServices: criticalServiceChecks,
            timestamp: new Date().toISOString()
        });
        return;
    }
}));

/**
 * Liveness probe endpoint
 * Used by Kubernetes to determine if the service is alive
 */
router.get('/live', (_req: Request, res: Response) => {
    logger.debug('Liveness probe requested');

    res.status(200).json({
        status: 'alive',
        message: 'API Gateway is alive',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

export { router as healthRouter };