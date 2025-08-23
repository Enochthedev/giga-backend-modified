/**
 * Express middleware for tenant resolution and context management
 */

import { Request, Response, NextFunction } from 'express';
import { tenantContext, TenantInfo, TenantContext } from './tenant-context';
import { TenantService } from './tenant-service';

export interface TenantRequest extends Request {
    tenant?: TenantInfo;
    tenantId?: string;
}

/**
 * Middleware to resolve tenant from request and set context
 */
export function tenantMiddleware(tenantService: TenantService) {
    return async (req: TenantRequest, res: Response, next: NextFunction) => {
        try {
            const tenant = await resolveTenant(req, tenantService);

            if (!tenant) {
                return res.status(404).json({
                    error: 'Tenant not found',
                    message: 'Unable to resolve tenant from request'
                });
            }

            if (tenant.status !== 'active') {
                return res.status(403).json({
                    error: 'Tenant suspended',
                    message: 'This tenant account is not active'
                });
            }

            // Set tenant info on request
            req.tenant = tenant;
            req.tenantId = tenant.id;

            // Create tenant context
            const context: TenantContext = {
                tenant,
                user: (req as any).user, // Assuming auth middleware sets this
                request: {
                    id: req.headers['x-request-id'] as string || generateRequestId(),
                    ip: req.ip,
                    userAgent: req.headers['user-agent'] || ''
                }
            };

            // Run the rest of the request in tenant context
            tenantContext.run(context, () => {
                next();
            });
        } catch (error) {
            console.error('Tenant middleware error:', error);
            res.status(500).json({
                error: 'Internal server error',
                message: 'Failed to resolve tenant context'
            });
        }
    };
}

/**
 * Resolve tenant from various request sources
 */
async function resolveTenant(req: Request, tenantService: TenantService): Promise<TenantInfo | null> {
    // Strategy 1: Subdomain-based tenant resolution
    const host = req.headers.host;
    if (host) {
        const subdomain = extractSubdomain(host);
        if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
            const tenant = await tenantService.findBySubdomain(subdomain);
            if (tenant) return tenant;
        }
    }

    // Strategy 2: Custom domain resolution
    if (host) {
        const tenant = await tenantService.findByDomain(host);
        if (tenant) return tenant;
    }

    // Strategy 3: Header-based tenant resolution
    const tenantHeader = req.headers['x-tenant-id'] as string;
    if (tenantHeader) {
        return await tenantService.findById(tenantHeader);
    }

    // Strategy 4: Query parameter (for development/testing)
    const tenantQuery = req.query.tenant as string;
    if (tenantQuery) {
        return await tenantService.findById(tenantQuery);
    }

    // Strategy 5: JWT token tenant claim
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const tenantId = extractTenantFromToken(authHeader);
        if (tenantId) {
            return await tenantService.findById(tenantId);
        }
    }

    return null;
}

/**
 * Extract subdomain from host header
 */
function extractSubdomain(host: string): string | null {
    const parts = host.split('.');
    if (parts.length >= 3) {
        return parts[0];
    }
    return null;
}

/**
 * Extract tenant ID from JWT token
 */
function extractTenantFromToken(authHeader: string): string | null {
    try {
        const token = authHeader.replace('Bearer ', '');
        // This would decode the JWT and extract tenant claim
        // Implementation depends on your JWT library
        return null; // Placeholder
    } catch (error) {
        return null;
    }
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Middleware to ensure tenant context exists
 */
export function requireTenant() {
    return (req: Request, res: Response, next: NextFunction) => {
        const context = tenantContext.getContext();
        if (!context || !context.tenant) {
            return res.status(400).json({
                error: 'Tenant required',
                message: 'This endpoint requires a valid tenant context'
            });
        }
        next();
    };
}

/**
 * Middleware to check if a feature is enabled for the tenant
 */
export function requireFeature(feature: keyof TenantInfo['settings']['features']) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!tenantContext.isFeatureEnabled(feature)) {
            return res.status(403).json({
                error: 'Feature not available',
                message: `The ${feature} feature is not enabled for this tenant`
            });
        }
        next();
    };
}