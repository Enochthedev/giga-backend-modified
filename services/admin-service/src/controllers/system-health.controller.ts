import { Response } from 'express';
import { SystemHealthService } from '../services/system-health.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

/**
 * System health controller for monitoring system status and metrics
 */
export class SystemHealthController {
    /**
     * Get overall system health status
     */
    public static async getSystemHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const healthStatus = await SystemHealthService.getSystemHealth();

            res.json({
                success: true,
                data: healthStatus
            });
        } catch (error: any) {
            logger.error('Get system health error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get system health'
            });
        }
    }

    /**
     * Get metrics for a specific service
     */
    public static async getServiceMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { serviceName } = req.params;
            const metricType = req.query.metricType as string;
            const hours = parseInt(req.query.hours as string) || 24;

            const metrics = await SystemHealthService.getServiceMetrics(serviceName, metricType, hours);

            res.json({
                success: true,
                data: {
                    serviceName,
                    metricType,
                    hours,
                    metrics
                }
            });
        } catch (error: any) {
            logger.error('Get service metrics error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get service metrics'
            });
        }
    }

    /**
     * Get system performance summary
     */
    public static async getPerformanceSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const hours = parseInt(req.query.hours as string) || 24;
            const summary = await SystemHealthService.getPerformanceSummary(hours);

            res.json({
                success: true,
                data: summary
            });
        } catch (error: any) {
            logger.error('Get performance summary error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get performance summary'
            });
        }
    }

    /**
     * Record a custom metric
     */
    public static async recordMetric(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const {
                serviceName,
                metricType,
                metricValue,
                metricUnit,
                status,
                metadata
            } = req.body;

            // Validate required fields
            if (!serviceName || !metricType || metricValue === undefined) {
                res.status(400).json({
                    success: false,
                    message: 'Missing required fields: serviceName, metricType, metricValue'
                });
                return;
            }

            const metric = await SystemHealthService.recordMetric(
                serviceName,
                metricType,
                metricValue,
                metricUnit || '',
                status || 'healthy',
                metadata || {}
            );

            res.status(201).json({
                success: true,
                message: 'Metric recorded successfully',
                data: metric
            });
        } catch (error: any) {
            logger.error('Record metric error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to record metric'
            });
        }
    }

    /**
     * Clean up old metrics
     */
    public static async cleanupMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const retentionDays = parseInt(req.query.retentionDays as string) || 30;
            const deletedCount = await SystemHealthService.cleanupOldMetrics(retentionDays);

            res.json({
                success: true,
                message: `Cleaned up ${deletedCount} old metrics`,
                data: {
                    deletedCount,
                    retentionDays
                }
            });
        } catch (error: any) {
            logger.error('Cleanup metrics error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to cleanup metrics'
            });
        }
    }

    /**
     * Get health check endpoint for this service
     */
    public static async healthCheck(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            // Check database connection
            const dbHealthy = await SystemHealthService.recordMetric(
                'admin-service',
                'database_connection',
                1,
                'boolean',
                'healthy'
            );

            // Get basic metrics
            const metrics = [
                {
                    type: 'uptime',
                    value: process.uptime(),
                    unit: 'seconds',
                    status: 'healthy'
                },
                {
                    type: 'memory_usage',
                    value: process.memoryUsage().heapUsed / 1024 / 1024,
                    unit: 'MB',
                    status: process.memoryUsage().heapUsed > 500 * 1024 * 1024 ? 'warning' : 'healthy'
                },
                {
                    type: 'cpu_usage',
                    value: process.cpuUsage().user / 1000000,
                    unit: 'seconds',
                    status: 'healthy'
                }
            ];

            res.json({
                success: true,
                status: 'healthy',
                timestamp: new Date().toISOString(),
                service: 'admin-service',
                version: process.env.npm_package_version || '1.0.0',
                metrics
            });
        } catch (error: any) {
            logger.error('Health check error:', error);
            res.status(503).json({
                success: false,
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                service: 'admin-service',
                error: error.message
            });
        }
    }
}