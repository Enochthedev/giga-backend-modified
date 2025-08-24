/**
 * Tenant middleware for ecommerce service
 * Integrates multi-tenancy support into the ecommerce backend
 */

import { Request, Response, NextFunction } from 'express';
import { tenantMiddleware, requireTenant, requireFeature, TenantService } from '@common/multi-tenancy';
import { dbPartitionManager } from '@common/multi-tenancy';

// Initialize tenant service with database connection
const tenantService = new TenantService(
    // This would be your database connection
    null, // Replace with actual database connection
    null  // Replace with cache service if available
);

/**
 * Apply tenant middleware to ecommerce service
 */
export const ecommerceTenantMiddleware = tenantMiddleware(tenantService);

/**
 * Require ecommerce feature to be enabled for tenant
 */
export const requireEcommerceFeature = requireFeature('ecommerce');

/**
 * Middleware to ensure tenant has ecommerce access
 */
export function requireEcommerceAccess() {
    return [
        requireTenant(),
        requireEcommerceFeature
    ];
}

/**
 * Middleware to set up tenant-specific database connection
 */
export async function setupTenantDatabase(req: Request, res: Response, next: NextFunction) {
    try {
        // The tenant context is already set by tenantMiddleware
        // Database connection will be automatically routed to tenant partition
        next();
    } catch (error) {
        console.error('Failed to setup tenant database:', error);
        res.status(500).json({
            error: 'Database setup failed',
            message: 'Unable to establish tenant database connection'
        });
    }
}

/**
 * Middleware to validate tenant limits
 */
export async function validateTenantLimits(req: Request, res: Response, next: NextFunction) {
    try {
        // This would check tenant-specific limits like max products, orders, etc.
        // Implementation would depend on your business logic
        next();
    } catch (error) {
        console.error('Tenant limits validation failed:', error);
        res.status(429).json({
            error: 'Tenant limits exceeded',
            message: 'This operation would exceed your tenant limits'
        });
    }
}