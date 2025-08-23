import { AdminDatabase } from '../database/connection';
import { SystemHealthMetric, SystemHealthResponse } from '../types/admin.types';
import { logger } from '../utils/logger';
import axios from 'axios';

/**
 * System health monitoring service
 */
export class SystemHealthService {
    private static readonly SERVICE_URLS = {
        'api-gateway': process.env.API_GATEWAY_URL || 'http://localhost:3000',
        'auth-service': process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
        'ecommerce-service': process.env.ECOMMERCE_SERVICE_URL || 'http://localhost:3002',
        'taxi-service': process.env.TAXI_SERVICE_URL || 'http://localhost:3003',
        'hotel-service': process.env.HOTEL_SERVICE_URL || 'http://localhost:3004',
        'payment-service': process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005',
        'admin-service': 'http://localhost:3006' // Self
    };

    private static readonly HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds

    /**
     * Get overall system health status
     */
    public static async getSystemHealth(): Promise<SystemHealthResponse> {
        try {
            const services: SystemHealthResponse['services'] = {};
            let healthyCount = 0;
            let warningCount = 0;
            let criticalCount = 0;

            // Check each service
            for (const [serviceName, serviceUrl] of Object.entries(this.SERVICE_URLS)) {
                try {
                    const serviceHealth = await this.checkServiceHealth(serviceName, serviceUrl);
                    services[serviceName] = serviceHealth;

                    switch (serviceHealth.status) {
                        case 'healthy':
                            healthyCount++;
                            break;
                        case 'warning':
                            warningCount++;
                            break;
                        case 'critical':
                            criticalCount++;
                            break;
                    }
                } catch (error) {
                    logger.error(`Health check failed for ${serviceName}:`, error);
                    services[serviceName] = {
                        status: 'critical',
                        lastCheck: new Date(),
                        metrics: []
                    };
                    criticalCount++;
                }
            }

            // Determine overall health
            let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
            if (criticalCount > 0) {
                overallStatus = 'critical';
            } else if (warningCount > 0) {
                overallStatus = 'warning';
            }

            const totalServices = Object.keys(this.SERVICE_URLS).length;

            return {
                overall: overallStatus,
                services,
                summary: {
                    totalServices,
                    healthyServices: healthyCount,
                    warningServices: warningCount,
                    criticalServices: criticalCount
                }
            };
        } catch (error) {
            logger.error('Get system health error:', error);
            throw error;
        }
    }

    /**
     * Check health of a specific service
     */
    private static async checkServiceHealth(
        serviceName: string,
        serviceUrl: string
    ): Promise<SystemHealthResponse['services'][string]> {
        const startTime = Date.now();
        let status: 'healthy' | 'warning' | 'critical' = 'healthy';
        const metrics: SystemHealthMetric[] = [];

        try {
            // Make health check request
            const response = await axios.get(`${serviceUrl}/health`, {
                timeout: this.HEALTH_CHECK_TIMEOUT,
                validateStatus: (status) => status < 500 // Accept 4xx as non-critical
            });

            const responseTime = Date.now() - startTime;

            // Record response time metric
            const responseTimeMetric = await this.recordMetric(
                serviceName,
                'response_time',
                responseTime,
                'ms',
                responseTime > 2000 ? 'warning' : responseTime > 5000 ? 'critical' : 'healthy'
            );
            metrics.push(responseTimeMetric);

            // Check response status
            if (response.status >= 500) {
                status = 'critical';
            } else if (response.status >= 400) {
                status = 'warning';
            }

            // Parse service-specific metrics if available
            if (response.data && response.data.metrics) {
                for (const metric of response.data.metrics) {
                    const serviceMetric = await this.recordMetric(
                        serviceName,
                        metric.type,
                        metric.value,
                        metric.unit,
                        metric.status || 'healthy',
                        metric.metadata
                    );
                    metrics.push(serviceMetric);

                    // Update overall status based on metric status
                    if (metric.status === 'critical') {
                        status = 'critical';
                    } else if (metric.status === 'warning' && status !== 'critical') {
                        status = 'warning';
                    }
                }
            }

            // Record availability metric
            const availabilityMetric = await this.recordMetric(
                serviceName,
                'availability',
                1,
                'boolean',
                'healthy'
            );
            metrics.push(availabilityMetric);

        } catch (error) {
            status = 'critical';

            // Record availability metric as down
            const availabilityMetric = await this.recordMetric(
                serviceName,
                'availability',
                0,
                'boolean',
                'critical',
                { error: error instanceof Error ? error.message : 'Unknown error' }
            );
            metrics.push(availabilityMetric);

            logger.warn(`Service ${serviceName} health check failed:`, error);
        }

        return {
            status,
            lastCheck: new Date(),
            metrics
        };
    }

    /**
     * Record a system health metric
     */
    public static async recordMetric(
        serviceName: string,
        metricType: string,
        metricValue: number,
        metricUnit: string = '',
        status: 'healthy' | 'warning' | 'critical' = 'healthy',
        metadata: Record<string, any> = {}
    ): Promise<SystemHealthMetric> {
        try {
            const result = await AdminDatabase.query(`
                INSERT INTO system_health_metrics (
                    service_name, metric_type, metric_value, metric_unit, status, metadata
                ) VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `, [
                serviceName,
                metricType,
                metricValue,
                metricUnit,
                status,
                JSON.stringify(metadata)
            ]);

            return this.mapHealthMetricFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Record metric error:', error);
            throw error;
        }
    }

    /**
     * Get historical metrics for a service
     */
    public static async getServiceMetrics(
        serviceName: string,
        metricType?: string,
        hours: number = 24
    ): Promise<SystemHealthMetric[]> {
        try {
            const startTime = new Date();
            startTime.setHours(startTime.getHours() - hours);

            let query = `
                SELECT * FROM system_health_metrics 
                WHERE service_name = $1 AND recorded_at >= $2
            `;
            const params: any[] = [serviceName, startTime];

            if (metricType) {
                query += ' AND metric_type = $3';
                params.push(metricType);
            }

            query += ' ORDER BY recorded_at DESC';

            const result = await AdminDatabase.query(query, params);
            return result.rows.map(row => this.mapHealthMetricFromDb(row));
        } catch (error) {
            logger.error('Get service metrics error:', error);
            throw error;
        }
    }

    /**
     * Get system performance summary
     */
    public static async getPerformanceSummary(hours: number = 24): Promise<{
        averageResponseTime: number;
        totalRequests: number;
        errorRate: number;
        uptime: number;
        serviceStats: Array<{
            serviceName: string;
            averageResponseTime: number;
            uptime: number;
            errorCount: number;
        }>;
    }> {
        try {
            const startTime = new Date();
            startTime.setHours(startTime.getHours() - hours);

            // Get overall performance metrics
            const overallResult = await AdminDatabase.query(`
                SELECT 
                    AVG(metric_value) FILTER (WHERE metric_type = 'response_time') as avg_response_time,
                    COUNT(*) FILTER (WHERE metric_type = 'response_time') as total_requests,
                    COUNT(*) FILTER (WHERE status = 'critical') as error_count,
                    COUNT(*) FILTER (WHERE metric_type = 'availability' AND metric_value = 1) as uptime_count,
                    COUNT(*) FILTER (WHERE metric_type = 'availability') as total_availability_checks
                FROM system_health_metrics 
                WHERE recorded_at >= $1
            `, [startTime]);

            const overall = overallResult.rows[0];

            // Get per-service stats
            const serviceStatsResult = await AdminDatabase.query(`
                SELECT 
                    service_name,
                    AVG(metric_value) FILTER (WHERE metric_type = 'response_time') as avg_response_time,
                    COUNT(*) FILTER (WHERE metric_type = 'availability' AND metric_value = 1) as uptime_count,
                    COUNT(*) FILTER (WHERE metric_type = 'availability') as total_availability_checks,
                    COUNT(*) FILTER (WHERE status = 'critical') as error_count
                FROM system_health_metrics 
                WHERE recorded_at >= $1
                GROUP BY service_name
                ORDER BY service_name
            `, [startTime]);

            const serviceStats = serviceStatsResult.rows.map(row => ({
                serviceName: row.service_name,
                averageResponseTime: parseFloat(row.avg_response_time) || 0,
                uptime: row.total_availability_checks > 0
                    ? (parseInt(row.uptime_count) / parseInt(row.total_availability_checks)) * 100
                    : 0,
                errorCount: parseInt(row.error_count) || 0
            }));

            return {
                averageResponseTime: parseFloat(overall.avg_response_time) || 0,
                totalRequests: parseInt(overall.total_requests) || 0,
                errorRate: overall.total_requests > 0
                    ? (parseInt(overall.error_count) / parseInt(overall.total_requests)) * 100
                    : 0,
                uptime: overall.total_availability_checks > 0
                    ? (parseInt(overall.uptime_count) / parseInt(overall.total_availability_checks)) * 100
                    : 0,
                serviceStats
            };
        } catch (error) {
            logger.error('Get performance summary error:', error);
            throw error;
        }
    }

    /**
     * Clean up old health metrics
     */
    public static async cleanupOldMetrics(retentionDays: number = 30): Promise<number> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

            const result = await AdminDatabase.query(
                'DELETE FROM system_health_metrics WHERE recorded_at < $1',
                [cutoffDate]
            );

            const deletedCount = result.rowCount || 0;

            if (deletedCount > 0) {
                logger.info(`Cleaned up ${deletedCount} old health metrics`);
            }

            return deletedCount;
        } catch (error) {
            logger.error('Cleanup old metrics error:', error);
            throw error;
        }
    }

    /**
     * Start periodic health checks
     */
    public static startPeriodicHealthChecks(intervalMs: number = 60000): void {
        setInterval(async () => {
            try {
                await this.getSystemHealth();
                logger.debug('Periodic health check completed');
            } catch (error) {
                logger.error('Periodic health check failed:', error);
            }
        }, intervalMs);

        logger.info(`Started periodic health checks every ${intervalMs}ms`);
    }

    /**
     * Map database row to SystemHealthMetric object
     */
    private static mapHealthMetricFromDb(row: any): SystemHealthMetric {
        return {
            id: row.id,
            serviceName: row.service_name,
            metricType: row.metric_type,
            metricValue: row.metric_value ? parseFloat(row.metric_value) : undefined,
            metricUnit: row.metric_unit,
            status: row.status,
            metadata: row.metadata ? JSON.parse(row.metadata) : {},
            recordedAt: new Date(row.recorded_at)
        };
    }
}