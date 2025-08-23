import { Logger } from '@giga/common';

const logger = Logger;

/**
 * Service registry for managing service discovery and routing
 * Handles service URL resolution and health checking
 */
export class ServiceRegistry {
    private services: Map<string, ServiceConfig>;

    constructor() {
        this.services = new Map();
        this.initializeServices();
    }

    /**
     * Initialize service configurations from environment variables
     */
    private initializeServices(): void {
        const serviceConfigs: ServiceConfig[] = [
            {
                name: 'auth',
                url: process.env['AUTH_SERVICE_URL'] || 'http://localhost:8001',
                healthPath: '/health'
            },
            {
                name: 'payment',
                url: process.env['PAYMENT_SERVICE_URL'] || 'http://localhost:8002',
                healthPath: '/health'
            },
            {
                name: 'notification',
                url: process.env['NOTIFICATION_SERVICE_URL'] || 'http://localhost:8003',
                healthPath: '/health'
            },
            {
                name: 'search',
                url: process.env['SEARCH_SERVICE_URL'] || 'http://localhost:8004',
                healthPath: '/health'
            },
            {
                name: 'file',
                url: process.env['FILE_SERVICE_URL'] || 'http://localhost:8005',
                healthPath: '/health'
            },
            {
                name: 'analytics',
                url: process.env['ANALYTICS_SERVICE_URL'] || 'http://localhost:8006',
                healthPath: '/health'
            }
        ];

        serviceConfigs.forEach(config => {
            this.services.set(config.name, config);
            logger.info(`Registered service: ${config.name} at ${config.url}`);
        });
    }

    /**
     * Get service URL by service name
     * @param serviceName - Name of the service
     * @returns Service URL or throws error if not found
     */
    getServiceUrl(serviceName: string): string {
        const service = this.services.get(serviceName);
        if (!service) {
            throw new Error(`Service '${serviceName}' not found in registry`);
        }
        return service.url;
    }

    /**
     * Get service configuration by name
     * @param serviceName - Name of the service
     * @returns Service configuration or undefined if not found
     */
    getService(serviceName: string): ServiceConfig | undefined {
        return this.services.get(serviceName);
    }

    /**
     * Get all registered services
     * @returns Array of service names
     */
    getRegisteredServices(): string[] {
        return Array.from(this.services.keys());
    }

    /**
     * Check if a service is registered
     * @param serviceName - Name of the service
     * @returns True if service is registered
     */
    isServiceRegistered(serviceName: string): boolean {
        return this.services.has(serviceName);
    }

    /**
     * Update service URL (useful for dynamic service discovery)
     * @param serviceName - Name of the service
     * @param url - New service URL
     */
    updateServiceUrl(serviceName: string, url: string): void {
        const service = this.services.get(serviceName);
        if (service) {
            service.url = url;
            logger.info(`Updated service URL: ${serviceName} -> ${url}`);
        } else {
            logger.warn(`Attempted to update non-existent service: ${serviceName}`);
        }
    }

    /**
     * Get service health check URL
     * @param serviceName - Name of the service
     * @returns Full health check URL
     */
    getServiceHealthUrl(serviceName: string): string {
        const service = this.services.get(serviceName);
        if (!service) {
            throw new Error(`Service '${serviceName}' not found in registry`);
        }
        return `${service.url}${service.healthPath}`;
    }
}

/**
 * Service configuration interface
 */
export interface ServiceConfig {
    name: string;
    url: string;
    healthPath: string;
}