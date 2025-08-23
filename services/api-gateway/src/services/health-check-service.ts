import axios from 'axios';
import { Logger } from '@giga/common';

const logger = Logger;
import { ServiceRegistry } from './service-registry';

/**
 * Health check service for monitoring downstream services
 * Provides methods to check individual and all service health
 */
export class HealthCheckService {
    private serviceRegistry: ServiceRegistry;
    private timeout: number;
    private healthCache: Map<string, ServiceHealthStatus>;
    private cacheTimeout: number;

    constructor(serviceRegistry: ServiceRegistry) {
        this.serviceRegistry = serviceRegistry;
        this.timeout = parseInt(process.env['HEALTH_CHECK_TIMEOUT'] || '5000');
        this.cacheTimeout = parseInt(process.env['HEALTH_CACHE_TIMEOUT'] || '30000'); // 30 seconds
        this.healthCache = new Map();
    }

    /**
     * Check health of a specific service
     * @param serviceName - Name of the service to check
     * @returns Service health status
     */
    async checkService(serviceName: string): Promise<ServiceHealthStatus> {
        // Check cache first
        const cached = this.getCachedHealth(serviceName);
        if (cached) {
            return cached;
        }

        const startTime = Date.now();
        let healthStatus: ServiceHealthStatus;

        try {
            const healthUrl = this.serviceRegistry.getServiceHealthUrl(serviceName);

            logger.debug(`Checking health for service: ${serviceName} at ${healthUrl}`);

            const response = await axios.get(healthUrl, {
                timeout: this.timeout,
                validateStatus: (status) => status < 500 // Accept 2xx, 3xx, 4xx as "reachable"
            });

            const responseTime = Date.now() - startTime;

            healthStatus = {
                service: serviceName,
                status: response.status < 400 ? 'healthy' : 'unhealthy',
                responseTime: `${responseTime}ms`,
                statusCode: response.status,
                message: response.status < 400 ? 'Service is healthy' : 'Service returned error status',
                timestamp: new Date().toISOString(),
                url: healthUrl
            };

            logger.debug(`Health check completed for ${serviceName}: ${healthStatus.status}`);

        } catch (error: any) {
            const responseTime = Date.now() - startTime;

            healthStatus = {
                service: serviceName,
                status: 'unhealthy',
                responseTime: `${responseTime}ms`,
                statusCode: 0,
                message: this.getErrorMessage(error),
                timestamp: new Date().toISOString(),
                url: this.serviceRegistry.getServiceHealthUrl(serviceName),
                error: error.code || error.message
            };

            logger.warn(`Health check failed for ${serviceName}:`, {
                error: error.message,
                code: error.code,
                responseTime: `${responseTime}ms`
            });
        }

        // Cache the result
        this.cacheHealth(serviceName, healthStatus);

        return healthStatus;
    }

    /**
     * Check health of all registered services
     * @returns Array of service health statuses
     */
    async checkAllServices(): Promise<ServiceHealthStatus[]> {
        const services = this.serviceRegistry.getRegisteredServices();

        logger.info(`Checking health for ${services.length} services`);

        const healthChecks = await Promise.allSettled(
            services.map(service => this.checkService(service))
        );

        return healthChecks.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            } else {
                // Handle rejected promises
                const serviceName = services[index];
                if (serviceName) {
                    logger.error(`Health check promise rejected for ${serviceName}:`, result.reason);

                    return {
                        service: serviceName,
                        status: 'unhealthy' as const,
                        responseTime: 'timeout',
                        statusCode: 0,
                        message: 'Health check promise rejected',
                        timestamp: new Date().toISOString(),
                        url: this.serviceRegistry.getServiceHealthUrl(serviceName),
                        error: result.reason?.message || 'Unknown error'
                    };
                } else {
                    // Fallback for undefined service name
                    return {
                        service: 'unknown',
                        status: 'unhealthy' as const,
                        responseTime: 'timeout',
                        statusCode: 0,
                        message: 'Health check promise rejected',
                        timestamp: new Date().toISOString(),
                        url: 'unknown',
                        error: result.reason?.message || 'Unknown error'
                    };
                }
            }
        });
    }

    /**
     * Get cached health status if available and not expired
     * @param serviceName - Name of the service
     * @returns Cached health status or null
     */
    private getCachedHealth(serviceName: string): ServiceHealthStatus | null {
        const cached = this.healthCache.get(serviceName);
        if (!cached) {
            return null;
        }

        const cacheAge = Date.now() - new Date(cached.timestamp).getTime();
        if (cacheAge > this.cacheTimeout) {
            this.healthCache.delete(serviceName);
            return null;
        }

        logger.debug(`Using cached health status for ${serviceName}`);
        return cached;
    }

    /**
     * Cache health status for a service
     * @param serviceName - Name of the service
     * @param healthStatus - Health status to cache
     */
    private cacheHealth(serviceName: string, healthStatus: ServiceHealthStatus): void {
        this.healthCache.set(serviceName, healthStatus);

        // Clean up old cache entries periodically
        if (this.healthCache.size > 100) {
            const oldestEntry = Array.from(this.healthCache.entries())
                .sort((a, b) => new Date(a[1].timestamp).getTime() - new Date(b[1].timestamp).getTime())[0];

            if (oldestEntry) {
                this.healthCache.delete(oldestEntry[0]);
            }
        }
    }

    /**
     * Get human-readable error message from axios error
     * @param error - Axios error object
     * @returns Human-readable error message
     */
    private getErrorMessage(error: any): string {
        if (error.code === 'ECONNREFUSED') {
            return 'Connection refused - service may be down';
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
            return 'Request timeout - service not responding';
        } else if (error.code === 'ENOTFOUND') {
            return 'Service not found - DNS resolution failed';
        } else if (error.code === 'ECONNRESET') {
            return 'Connection reset - service may be restarting';
        } else if (error.response) {
            return `HTTP ${error.response.status}: ${error.response.statusText}`;
        } else {
            return error.message || 'Unknown error occurred';
        }
    }

    /**
     * Clear health cache for all services
     */
    clearCache(): void {
        this.healthCache.clear();
        logger.info('Health check cache cleared');
    }

    /**
     * Get cache statistics
     * @returns Cache statistics
     */
    getCacheStats(): { size: number; services: string[] } {
        return {
            size: this.healthCache.size,
            services: Array.from(this.healthCache.keys())
        };
    }
}

/**
 * Service health status interface
 */
export interface ServiceHealthStatus {
    service: string;
    status: 'healthy' | 'unhealthy';
    responseTime: string;
    statusCode: number;
    message: string;
    timestamp: string;
    url: string;
    error?: string;
}