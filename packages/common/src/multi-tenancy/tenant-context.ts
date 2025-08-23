/**
 * Tenant context management for multi-tenant applications
 * Provides tenant isolation and context switching capabilities
 */

export interface TenantInfo {
    id: string;
    name: string;
    domain: string;
    subdomain?: string;
    region: string;
    timezone: string;
    currency: string;
    locale: string;
    settings: TenantSettings;
    status: 'active' | 'suspended' | 'inactive';
    createdAt: Date;
    updatedAt: Date;
}

export interface TenantSettings {
    features: {
        ecommerce: boolean;
        taxi: boolean;
        hotel: boolean;
        advertisements: boolean;
    };
    limits: {
        maxUsers: number;
        maxTransactions: number;
        storageLimit: number;
    };
    branding: {
        logo?: string;
        primaryColor: string;
        secondaryColor: string;
        customCss?: string;
    };
    integrations: {
        paymentGateways: string[];
        notificationProviders: string[];
    };
}

export interface TenantContext {
    tenant: TenantInfo;
    user?: {
        id: string;
        roles: string[];
        permissions: string[];
    };
    request?: {
        id: string;
        ip: string;
        userAgent: string;
    };
}

/**
 * Tenant context store using AsyncLocalStorage for Node.js
 */
import { AsyncLocalStorage } from 'async_hooks';

class TenantContextManager {
    private static instance: TenantContextManager;
    private asyncLocalStorage = new AsyncLocalStorage<TenantContext>();

    static getInstance(): TenantContextManager {
        if (!TenantContextManager.instance) {
            TenantContextManager.instance = new TenantContextManager();
        }
        return TenantContextManager.instance;
    }

    /**
     * Run a function within a tenant context
     */
    run<T>(context: TenantContext, callback: () => T): T {
        return this.asyncLocalStorage.run(context, callback);
    }

    /**
     * Get the current tenant context
     */
    getContext(): TenantContext | undefined {
        return this.asyncLocalStorage.getStore();
    }

    /**
     * Get the current tenant info
     */
    getCurrentTenant(): TenantInfo | undefined {
        const context = this.getContext();
        return context?.tenant;
    }

    /**
     * Get the current tenant ID
     */
    getCurrentTenantId(): string | undefined {
        return this.getCurrentTenant()?.id;
    }

    /**
     * Check if a feature is enabled for the current tenant
     */
    isFeatureEnabled(feature: keyof TenantSettings['features']): boolean {
        const tenant = this.getCurrentTenant();
        return tenant?.settings.features[feature] ?? false;
    }

    /**
     * Get tenant-specific configuration
     */
    getTenantConfig<T>(key: string, defaultValue?: T): T | undefined {
        const tenant = this.getCurrentTenant();
        // Implementation would fetch from tenant-specific config store
        return defaultValue;
    }
}

export const tenantContext = TenantContextManager.getInstance();