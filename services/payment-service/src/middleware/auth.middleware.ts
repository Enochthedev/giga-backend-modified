import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { sendUnauthorized, sendForbidden } from '../utils/response';
import { logger } from '../utils/logger';

interface JWTPayload {
    id: string;
    email: string;
    roles?: string[];
    iat?: number;
    exp?: number;
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            sendUnauthorized(res, 'Access token required');
            return;
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            logger.error('JWT_SECRET environment variable not set');
            sendUnauthorized(res, 'Authentication configuration error');
            return;
        }

        jwt.verify(token, jwtSecret, (err, decoded) => {
            if (err) {
                logger.warn('Invalid JWT token', { error: err.message });
                sendUnauthorized(res, 'Invalid or expired token');
                return;
            }

            const payload = decoded as JWTPayload;
            req.user = {
                id: payload.id,
                email: payload.email,
                roles: payload.roles || []
            };

            next();
        });
    } catch (error) {
        logger.error('Authentication middleware error', { error });
        sendUnauthorized(res, 'Authentication failed');
    }
};

/**
 * Middleware to check if user has required roles
 */
export const requireRoles = (requiredRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            if (!req.user) {
                sendUnauthorized(res, 'User not authenticated');
                return;
            }

            const userRoles = req.user.roles || [];
            const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));

            if (!hasRequiredRole) {
                sendForbidden(res, `Required roles: ${requiredRoles.join(', ')}`);
                return;
            }

            next();
        } catch (error) {
            logger.error('Role authorization middleware error', { error });
            sendForbidden(res, 'Authorization failed');
        }
    };
};

/**
 * Middleware for admin-only endpoints
 */
export const requireAdmin = requireRoles(['admin', 'super_admin']);

/**
 * Middleware for customer or admin access
 */
export const requireCustomerOrAdmin = requireRoles(['customer', 'admin', 'super_admin']);

/**
 * Optional authentication - sets user if token is valid but doesn't require it
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            next();
            return;
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            next();
            return;
        }

        jwt.verify(token, jwtSecret, (err, decoded) => {
            if (!err && decoded) {
                const payload = decoded as JWTPayload;
                req.user = {
                    id: payload.id,
                    email: payload.email,
                    roles: payload.roles || []
                };
            }
            next();
        });
    } catch (error) {
        logger.error('Optional auth middleware error', { error });
        next();
    }
};