import { Request, Response, NextFunction } from 'express';
import { JWTUtils } from '../utils/jwt';
import { AdminService } from '../services/admin.service';
import { AuditService } from '../services/audit.service';
import { Permission, PERMISSIONS } from '../types/admin.types';
import { logger } from '../utils/logger';

/**
 * Extended request interface with admin user information
 */
export interface AuthenticatedRequest extends Request {
    admin?: {
        id: string;
        email: string;
        roleId: string;
        permissions: string[];
    };
}

/**
 * Authentication middleware for admin routes
 */
export class AuthMiddleware {
    /**
     * Verify JWT token and authenticate admin user
     */
    public static async authenticate(
        req: AuthenticatedRequest,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const token = JWTUtils.extractTokenFromHeader(req.headers.authorization);

            if (!token) {
                res.status(401).json({
                    success: false,
                    message: 'Access token required'
                });
                return;
            }

            // Verify token
            const decoded = JWTUtils.verifyToken(token);

            if (decoded.type !== 'access') {
                res.status(401).json({
                    success: false,
                    message: 'Invalid token type'
                });
                return;
            }

            // Check if session exists and is valid
            const isValidSession = await AdminService.validateSession(decoded.id, token);

            if (!isValidSession) {
                res.status(401).json({
                    success: false,
                    message: 'Invalid or expired session'
                });
                return;
            }

            // Get admin user details
            const adminUser = await AdminService.getAdminById(decoded.id);

            if (!adminUser || adminUser.status !== 'active') {
                res.status(401).json({
                    success: false,
                    message: 'Admin user not found or inactive'
                });
                return;
            }

            // Attach admin info to request
            req.admin = {
                id: adminUser.id,
                email: adminUser.email,
                roleId: adminUser.roleId,
                permissions: adminUser.role?.permissions || []
            };

            next();
        } catch (error) {
            logger.error('Authentication error:', error);

            // Log failed authentication attempt
            await AuditService.logAction({
                action: 'authentication_failed',
                resourceType: 'admin_session',
                success: false,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                metadata: {
                    path: req.path,
                    method: req.method
                }
            });

            res.status(401).json({
                success: false,
                message: 'Authentication failed'
            });
        }
    }

    /**
     * Check if admin has required permission
     */
    public static requirePermission(permission: Permission) {
        return async (
            req: AuthenticatedRequest,
            res: Response,
            next: NextFunction
        ): Promise<void> => {
            try {
                if (!req.admin) {
                    res.status(401).json({
                        success: false,
                        message: 'Authentication required'
                    });
                    return;
                }

                const hasPermission = this.checkPermission(req.admin.permissions, permission);

                if (!hasPermission) {
                    // Log unauthorized access attempt
                    await AuditService.logAction({
                        adminId: req.admin.id,
                        action: 'unauthorized_access_attempt',
                        resourceType: 'permission',
                        success: false,
                        errorMessage: `Missing permission: ${permission}`,
                        ipAddress: req.ip,
                        userAgent: req.get('User-Agent'),
                        metadata: {
                            requiredPermission: permission,
                            userPermissions: req.admin.permissions,
                            path: req.path,
                            method: req.method
                        }
                    });

                    res.status(403).json({
                        success: false,
                        message: 'Insufficient permissions'
                    });
                    return;
                }

                next();
            } catch (error) {
                logger.error('Permission check error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Permission check failed'
                });
            }
        };
    }

    /**
     * Check if admin has any of the required permissions
     */
    public static requireAnyPermission(permissions: Permission[]) {
        return async (
            req: AuthenticatedRequest,
            res: Response,
            next: NextFunction
        ): Promise<void> => {
            try {
                if (!req.admin) {
                    res.status(401).json({
                        success: false,
                        message: 'Authentication required'
                    });
                    return;
                }

                const hasAnyPermission = permissions.some(permission =>
                    this.checkPermission(req.admin!.permissions, permission)
                );

                if (!hasAnyPermission) {
                    // Log unauthorized access attempt
                    await AuditService.logAction({
                        adminId: req.admin.id,
                        action: 'unauthorized_access_attempt',
                        resourceType: 'permission',
                        success: false,
                        errorMessage: `Missing any of permissions: ${permissions.join(', ')}`,
                        ipAddress: req.ip,
                        userAgent: req.get('User-Agent'),
                        metadata: {
                            requiredPermissions: permissions,
                            userPermissions: req.admin.permissions,
                            path: req.path,
                            method: req.method
                        }
                    });

                    res.status(403).json({
                        success: false,
                        message: 'Insufficient permissions'
                    });
                    return;
                }

                next();
            } catch (error) {
                logger.error('Permission check error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Permission check failed'
                });
            }
        };
    }

    /**
     * Check if user has specific permission
     */
    private static checkPermission(userPermissions: string[], requiredPermission: Permission): boolean {
        // Super admin has all permissions
        if (userPermissions.includes(PERMISSIONS.ALL)) {
            return true;
        }

        // Check for specific permission
        return userPermissions.includes(requiredPermission);
    }

    /**
     * Rate limiting middleware for admin endpoints
     */
    public static rateLimit(windowMs: number = 15 * 60 * 1000, maxRequests: number = 100) {
        const requests = new Map<string, { count: number; resetTime: number }>();

        return (req: Request, res: Response, next: NextFunction): void => {
            const key = req.ip || 'unknown';
            const now = Date.now();
            const windowStart = now - windowMs;

            // Clean up old entries
            for (const [ip, data] of requests.entries()) {
                if (data.resetTime < windowStart) {
                    requests.delete(ip);
                }
            }

            // Get or create request data
            let requestData = requests.get(key);
            if (!requestData || requestData.resetTime < windowStart) {
                requestData = { count: 0, resetTime: now + windowMs };
                requests.set(key, requestData);
            }

            // Check rate limit
            if (requestData.count >= maxRequests) {
                res.status(429).json({
                    success: false,
                    message: 'Too many requests, please try again later',
                    retryAfter: Math.ceil((requestData.resetTime - now) / 1000)
                });
                return;
            }

            // Increment counter
            requestData.count++;
            next();
        };
    }
}