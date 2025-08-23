import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth-service';
import { SecurityAuditService } from '../services/security-audit-service';
import { ApiError } from '@giga/common';

export interface AuthenticatedRequest extends Request {
    user?: {
        userId: string;
        email: string;
        roles: string[];
        permissions: string[];
        iat: number;
        exp: number;
    };
}

/**
 * Enhanced authentication middleware with security logging
 */
export const authMiddleware = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            await SecurityAuditService.logEvent({
                eventType: 'unauthorized_access_attempt',
                eventCategory: 'authentication',
                severity: 'warning',
                ipAddress: req.ip || req.connection.remoteAddress,
                userAgent: req.get('User-Agent'),
                eventData: {
                    path: req.path,
                    method: req.method,
                    reason: 'missing_token'
                },
                success: false
            });
            throw ApiError.unauthorized('Access token required');
        }

        const token = authHeader.substring(7);

        try {
            const payload = await AuthService.verifyAccessToken(token);
            req.user = payload;

            // Log successful authentication for sensitive endpoints
            const sensitiveEndpoints = ['/admin', '/mfa', '/security', '/devices'];
            const isSensitiveEndpoint = sensitiveEndpoints.some(endpoint =>
                req.path.startsWith(endpoint)
            );

            if (isSensitiveEndpoint) {
                await SecurityAuditService.logEvent({
                    userId: payload.userId,
                    eventType: 'sensitive_endpoint_access',
                    eventCategory: 'authorization',
                    severity: 'info',
                    ipAddress: req.ip || req.connection.remoteAddress,
                    userAgent: req.get('User-Agent'),
                    eventData: {
                        path: req.path,
                        method: req.method
                    },
                    success: true
                });
            }

            next();
        } catch (tokenError) {
            await SecurityAuditService.logEvent({
                eventType: 'invalid_token_access_attempt',
                eventCategory: 'authentication',
                severity: 'warning',
                ipAddress: req.ip || req.connection.remoteAddress,
                userAgent: req.get('User-Agent'),
                eventData: {
                    path: req.path,
                    method: req.method,
                    error: tokenError instanceof Error ? tokenError.message : 'Unknown error'
                },
                success: false
            });
            throw tokenError;
        }
    } catch (error) {
        next(error);
    }
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (requiredRoles: string[]) => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            if (!req.user) {
                throw ApiError.unauthorized('Authentication required');
            }

            const userRoles = req.user.roles || [];
            const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));

            if (!hasRequiredRole) {
                await SecurityAuditService.logEvent({
                    userId: req.user.userId,
                    eventType: 'insufficient_permissions',
                    eventCategory: 'authorization',
                    severity: 'warning',
                    ipAddress: req.ip || req.connection.remoteAddress,
                    userAgent: req.get('User-Agent'),
                    eventData: {
                        path: req.path,
                        method: req.method,
                        requiredRoles,
                        userRoles
                    },
                    success: false
                });
                throw ApiError.forbidden('Insufficient permissions');
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Permission-based authorization middleware
 */
export const requirePermission = (requiredPermissions: string[]) => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            if (!req.user) {
                throw ApiError.unauthorized('Authentication required');
            }

            const userPermissions = req.user.permissions || [];
            const hasRequiredPermission = requiredPermissions.some(permission =>
                userPermissions.includes(permission)
            );

            if (!hasRequiredPermission) {
                await SecurityAuditService.logEvent({
                    userId: req.user.userId,
                    eventType: 'insufficient_permissions',
                    eventCategory: 'authorization',
                    severity: 'warning',
                    ipAddress: req.ip || req.connection.remoteAddress,
                    userAgent: req.get('User-Agent'),
                    eventData: {
                        path: req.path,
                        method: req.method,
                        requiredPermissions,
                        userPermissions
                    },
                    success: false
                });
                throw ApiError.forbidden('Insufficient permissions');
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};