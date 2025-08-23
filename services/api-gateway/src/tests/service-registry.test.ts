import { ServiceRegistry } from '../services/service-registry';

describe('ServiceRegistry', () => {
    let serviceRegistry: ServiceRegistry;

    beforeEach(() => {
        serviceRegistry = new ServiceRegistry();
    });

    describe('getServiceUrl', () => {
        it('should return service URL for registered service', () => {
            const authUrl = serviceRegistry.getServiceUrl('auth');
            expect(authUrl).toBe('http://localhost:8001');
        });

        it('should throw error for unregistered service', () => {
            expect(() => {
                serviceRegistry.getServiceUrl('nonexistent');
            }).toThrow("Service 'nonexistent' not found in registry");
        });
    });

    describe('getRegisteredServices', () => {
        it('should return array of registered service names', () => {
            const services = serviceRegistry.getRegisteredServices();
            expect(services).toContain('auth');
            expect(services).toContain('payment');
            expect(services).toContain('notification');
            expect(services).toContain('search');
            expect(services).toContain('file');
            expect(services).toContain('analytics');
        });
    });

    describe('isServiceRegistered', () => {
        it('should return true for registered service', () => {
            expect(serviceRegistry.isServiceRegistered('auth')).toBe(true);
        });

        it('should return false for unregistered service', () => {
            expect(serviceRegistry.isServiceRegistered('nonexistent')).toBe(false);
        });
    });

    describe('updateServiceUrl', () => {
        it('should update URL for existing service', () => {
            const newUrl = 'http://localhost:9001';
            serviceRegistry.updateServiceUrl('auth', newUrl);
            expect(serviceRegistry.getServiceUrl('auth')).toBe(newUrl);
        });

        it('should handle update for non-existent service gracefully', () => {
            expect(() => {
                serviceRegistry.updateServiceUrl('nonexistent', 'http://localhost:9999');
            }).not.toThrow();
        });
    });

    describe('getServiceHealthUrl', () => {
        it('should return correct health check URL', () => {
            const healthUrl = serviceRegistry.getServiceHealthUrl('auth');
            expect(healthUrl).toBe('http://localhost:8001/health');
        });

        it('should throw error for unregistered service', () => {
            expect(() => {
                serviceRegistry.getServiceHealthUrl('nonexistent');
            }).toThrow("Service 'nonexistent' not found in registry");
        });
    });

    describe('getService', () => {
        it('should return service config for registered service', () => {
            const service = serviceRegistry.getService('auth');
            expect(service).toBeDefined();
            expect(service?.name).toBe('auth');
            expect(service?.url).toBe('http://localhost:8001');
            expect(service?.healthPath).toBe('/health');
        });

        it('should return undefined for unregistered service', () => {
            const service = serviceRegistry.getService('nonexistent');
            expect(service).toBeUndefined();
        });
    });
});