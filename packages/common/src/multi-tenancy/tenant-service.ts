/**
 * Tenant management service
 * Handles tenant CRUD operations and caching
 */

import { TenantInfo, TenantSettings } from './tenant-context';

export interface CreateTenantRequest {
    name: string;
    domain?: string;
    subdomain?: string;
    region: string;
    timezone: string;
    currency: string;
    locale: string;
    settings: Partial<TenantSettings>;
}

export interface UpdateTenantRequest {
    name?: string;
    domain?: string;
    subdomain?: string;
    region?: string;
    timezone?: string;
    currency?: string;
    locale?: string;
    settings?: Partial<TenantSettings>;
    status?: 'active' | 'suspended' | 'inactive';
}

export class TenantService {
    private cache = new Map<string, TenantInfo>();
    private cacheTimeout = 5 * 60 * 1000; // 5 minutes

    constructor(
        private database: any, // Database connection
        private cacheService?: any // Redis or other cache service
    ) { }

    /**
     * Create a new tenant
     */
    async createTenant(data: CreateTenantRequest): Promise<TenantInfo> {
        const tenantId = this.generateTenantId();

        const tenant: TenantInfo = {
            id: tenantId,
            name: data.name,
            domain: data.domain || '',
            subdomain: data.subdomain,
            region: data.region,
            timezone: data.timezone,
            currency: data.currency,
            locale: data.locale,
            settings: this.mergeWithDefaults(data.settings),
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Create tenant in database
        await this.database.query(`
      INSERT INTO tenants (
        id, name, domain, subdomain, region, timezone, 
        currency, locale, settings, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
            tenant.id, tenant.name, tenant.domain, tenant.subdomain,
            tenant.region, tenant.timezone, tenant.currency, tenant.locale,
            JSON.stringify(tenant.settings), tenant.status,
            tenant.createdAt, tenant.updatedAt
        ]);

        // Create tenant-specific database schema
        await this.createTenantSchema(tenantId);

        // Cache the tenant
        this.setCachedTenant(tenant);

        return tenant;
    }

    /**
     * Find tenant by ID
     */
    async findById(id: string): Promise<TenantInfo | null> {
        // Check cache first
        const cached = this.getCachedTenant(id);
        if (cached) return cached;

        // Query database
        const result = await this.database.query(
            'SELECT * FROM tenants WHERE id = $1 AND status != $2',
            [id, 'inactive']
        );

        if (result.rows.length === 0) return null;

        const tenant = this.mapRowToTenant(result.rows[0]);
        this.setCachedTenant(tenant);
        return tenant;
    }

    /**
     * Find tenant by subdomain
     */
    async findBySubdomain(subdomain: string): Promise<TenantInfo | null> {
        const cacheKey = `subdomain:${subdomain}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;

        const result = await this.database.query(
            'SELECT * FROM tenants WHERE subdomain = $1 AND status = $2',
            [subdomain, 'active']
        );

        if (result.rows.length === 0) return null;

        const tenant = this.mapRowToTenant(result.rows[0]);
        this.cache.set(cacheKey, tenant);
        return tenant;
    }

    /**
     * Find tenant by custom domain
     */
    async findByDomain(domain: string): Promise<TenantInfo | null> {
        const cacheKey = `domain:${domain}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;

        const result = await this.database.query(
            'SELECT * FROM tenants WHERE domain = $1 AND status = $2',
            [domain, 'active']
        );

        if (result.rows.length === 0) return null;

        const tenant = this.mapRowToTenant(result.rows[0]);
        this.cache.set(cacheKey, tenant);
        return tenant;
    }

    /**
     * Update tenant
     */
    async updateTenant(id: string, data: UpdateTenantRequest): Promise<TenantInfo | null> {
        const existing = await this.findById(id);
        if (!existing) return null;

        const updated: TenantInfo = {
            ...existing,
            ...data,
            settings: data.settings ? { ...existing.settings, ...data.settings } : existing.settings,
            updatedAt: new Date()
        };

        await this.database.query(`
      UPDATE tenants SET 
        name = $2, domain = $3, subdomain = $4, region = $5,
        timezone = $6, currency = $7, locale = $8, settings = $9,
        status = $10, updated_at = $11
      WHERE id = $1
    `, [
            id, updated.name, updated.domain, updated.subdomain,
            updated.region, updated.timezone, updated.currency, updated.locale,
            JSON.stringify(updated.settings), updated.status, updated.updatedAt
        ]);

        // Clear cache
        this.clearTenantCache(id);

        return updated;
    }

    /**
     * Delete tenant (soft delete)
     */
    async deleteTenant(id: string): Promise<boolean> {
        const result = await this.database.query(
            'UPDATE tenants SET status = $2, updated_at = $3 WHERE id = $1',
            [id, 'inactive', new Date()]
        );

        if (result.rowCount > 0) {
            this.clearTenantCache(id);
            return true;
        }

        return false;
    }

    /**
     * Get tenant database connection string
     */
    getTenantDatabaseUrl(tenantId: string): string {
        // Return tenant-specific database URL
        // This could be a separate database or schema
        const baseUrl = process.env.DATABASE_URL || '';
        return `${baseUrl}_tenant_${tenantId}`;
    }

    /**
     * Create tenant-specific database schema
     */
    private async createTenantSchema(tenantId: string): Promise<void> {
        const schemaName = `tenant_${tenantId}`;

        await this.database.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);

        // Create tenant-specific tables
        const tables = [
            'users', 'products', 'orders', 'bookings', 'rides',
            'payments', 'notifications', 'files', 'analytics'
        ];

        for (const table of tables) {
            await this.database.query(`
        CREATE TABLE IF NOT EXISTS ${schemaName}.${table} (
          LIKE public.${table} INCLUDING ALL
        )
      `);
        }
    }

    /**
     * Generate unique tenant ID
     */
    private generateTenantId(): string {
        return `tenant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Merge tenant settings with defaults
     */
    private mergeWithDefaults(settings: Partial<TenantSettings> = {}): TenantSettings {
        return {
            features: {
                ecommerce: true,
                taxi: true,
                hotel: true,
                advertisements: true,
                ...settings.features
            },
            limits: {
                maxUsers: 10000,
                maxTransactions: 100000,
                storageLimit: 10 * 1024 * 1024 * 1024, // 10GB
                ...settings.limits
            },
            branding: {
                primaryColor: '#007bff',
                secondaryColor: '#6c757d',
                ...settings.branding
            },
            integrations: {
                paymentGateways: ['stripe'],
                notificationProviders: ['email'],
                ...settings.integrations
            }
        };
    }

    /**
     * Map database row to tenant object
     */
    private mapRowToTenant(row: any): TenantInfo {
        return {
            id: row.id,
            name: row.name,
            domain: row.domain,
            subdomain: row.subdomain,
            region: row.region,
            timezone: row.timezone,
            currency: row.currency,
            locale: row.locale,
            settings: JSON.parse(row.settings),
            status: row.status,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        };
    }

    /**
     * Cache management methods
     */
    private getCachedTenant(id: string): TenantInfo | null {
        return this.cache.get(id) || null;
    }

    private setCachedTenant(tenant: TenantInfo): void {
        this.cache.set(tenant.id, tenant);
        if (tenant.subdomain) {
            this.cache.set(`subdomain:${tenant.subdomain}`, tenant);
        }
        if (tenant.domain) {
            this.cache.set(`domain:${tenant.domain}`, tenant);
        }

        // Set cache expiration
        setTimeout(() => {
            this.clearTenantCache(tenant.id);
        }, this.cacheTimeout);
    }

    private clearTenantCache(id: string): void {
        const tenant = this.cache.get(id);
        if (tenant) {
            this.cache.delete(id);
            if (tenant.subdomain) {
                this.cache.delete(`subdomain:${tenant.subdomain}`);
            }
            if (tenant.domain) {
                this.cache.delete(`domain:${tenant.domain}`);
            }
        }
    }
}