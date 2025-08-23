import { Request, Response, NextFunction } from 'express';
import { ResponseHelper } from '../utils/response';
import { logger } from '../utils/logger';

// Extend Request interface to include user information
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                role: string;
                permissions: string[];
            };
        }
    }
}

/**
 * Basic authentication middleware
 * In a real implementation, this would validate JWT tokens
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization;
        const userId = req.headers['user-id'] as string;
        const userRole = req.headers['user-role'] as string;

        // Check for authorization header
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            logger.warn('Missing or invalid authorization header', {
                path: req.path,
                method: req.method,
                ip: req.ip
            });
            return ResponseHelper.unauthorized(res, 'Missing or invalid authorization token');
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // In a real implementation, you would:
        // 1. Validate the JWT token
        // 2. Extract user information from the token
        // 3. Check token expiration
        // 4. Verify token signature

        // For now, we'll do basic validation
        if (!token || token.length < 10) {
            logger.warn('Invalid token format', {
                path: req.path,
                method: req.method,
                ip: req.ip
            });
            return ResponseHelper.unauthorized(res, 'Invalid authorization token');
        }

        // Mock user extraction (in real implementation, decode JWT)
        req.user = {
            id: userId || 'unknown',
            role: userRole || 'user',
            permissions: ['read', 'write'] // This would come from the token/database
        };

        next();
    } catch (error) {
        logger.error('Authentication error:', error);
        return ResponseHelper.unauthorized(res, 'Authentication failed');
    }
}

/**
 * Authorization middleware to check user permissions
 */
export function requirePermission(permission: string) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return ResponseHelper.unauthorized(res, 'Authentication required');
        }

        if (!req.user.permissions.includes(permission)) {
            logger.warn('Insufficient permissions', {
                userId: req.user.id,
                requiredPermission: permission,
                userPermissions: req.user.permissions,
                path: req.path,
                method: req.method
            });
            return ResponseHelper.forbidden(res, 'Insufficient permissions');
        }

        next();
    };
}

/**
 * Role-based authorization middleware
 */
export function requireRole(role: string) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return ResponseHelper.unauthorized(res, 'Authentication required');
        }

        if (req.user.role !== role) {
            logger.warn('Insufficient role', {
                userId: req.user.id,
                requiredRole: role,
                userRole: req.user.role,
                path: req.path,
                method: req.method
            });
            return ResponseHelper.forbidden(res, `Role '${role}' required`);
        }

        next();
    };
}

/**
 * Admin authorization middleware
 */
export const requireAdmin = requireRole('admin');

/**
 * Optional authentication middleware
 * Extracts user info if present but doesn't require authentication
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization;
        const userId = req.headers['user-id'] as string;
        const userRole = req.headers['user-role'] as string;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);

            if (token && token.length >= 10) {
                // Mock user extraction (in real implementation, decode JWT)
                req.user = {
                    id: userId || 'unknown',
                    role: userRole || 'user',
                    permissions: ['read']
                };
            }
        }

        next();
    } catch (error) {
        logger.warn('Optional auth error:', error);
        // Continue without authentication
        next();
    }
}