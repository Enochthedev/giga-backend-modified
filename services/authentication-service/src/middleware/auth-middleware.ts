import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth-service';
import { ApiError } from '@giga/common';

/**
 * Middleware to authenticate JWT tokens
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw ApiError.unauthorized('Access token required');
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        const payload = await AuthService.verifyAccessToken(token);

        // Attach user information to request
        (req as any).user = payload;

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Middleware to check if user has specific role
 */
export const requireRole = (roleName: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = (req as any).user;

            if (!user) {
                throw ApiError.unauthorized('Authentication required');
            }

            if (!user.roles || !user.roles.includes(roleName)) {
                throw ApiError.forbidden(`Role '${roleName}' required`);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Middleware to check if user has specific permission
 */
export const requirePermission = (permissionName: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = (req as any).user;

            if (!user) {
                throw ApiError.unauthorized('Authentication required');
            }

            if (!user.permissions || !user.permissions.includes(permissionName)) {
                throw ApiError.forbidden(`Permission '${permissionName}' required`);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Middleware to check if user has any of the specified roles
 */
export const requireAnyRole = (roleNames: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = (req as any).user;

            if (!user) {
                throw ApiError.unauthorized('Authentication required');
            }

            if (!user.roles || !roleNames.some(role => user.roles.includes(role))) {
                throw ApiError.forbidden(`One of the following roles required: ${roleNames.join(', ')}`);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Middleware to check if user has any of the specified permissions
 */
export const requireAnyPermission = (permissionNames: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const user = (req as any).user;

            if (!user) {
                throw ApiError.unauthorized('Authentication required');
            }

            if (!user.permissions || !permissionNames.some(permission => user.permissions.includes(permission))) {
                throw ApiError.forbidden(`One of the following permissions required: ${permissionNames.join(', ')}`);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Optional authentication middleware - doesn't throw error if no token
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const payload = await AuthService.verifyAccessToken(token);
            (req as any).user = payload;
        }

        next();
    } catch (error) {
        // Don't throw error for optional auth, just continue without user
        next();
    }
};