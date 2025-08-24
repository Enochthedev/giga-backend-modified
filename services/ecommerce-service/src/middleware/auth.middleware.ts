import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Authentication middleware
 */

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        roles: string[];
    };
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        res.status(401).json({
            success: false,
            error: 'Access token required'
        });
        return;
    }

    try {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new Error('JWT_SECRET not configured');
        }

        const decoded = jwt.verify(token, jwtSecret) as any;
        req.user = {
            id: decoded.id || decoded.userId,
            email: decoded.email,
            roles: decoded.roles || ['customer']
        };

        next();
    } catch (error) {
        res.status(403).json({
            success: false,
            error: 'Invalid or expired token'
        });
    }
};

/**
 * Middleware to check if user has required roles
 */
export const requireRoles = (roles: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
            return;
        }

        const hasRequiredRole = roles.some(role => req.user!.roles.includes(role));

        if (!hasRequiredRole) {
            res.status(403).json({
                success: false,
                error: 'Insufficient permissions'
            });
            return;
        }

        next();
    };
};

/**
 * Middleware for optional authentication (doesn't fail if no token)
 */
export const optionalAuth = (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        next();
        return;
    }

    try {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            next();
            return;
        }

        const decoded = jwt.verify(token, jwtSecret) as any;
        req.user = {
            id: decoded.id || decoded.userId,
            email: decoded.email,
            roles: decoded.roles || ['customer']
        };
    } catch (error) {
        // Ignore invalid tokens for optional auth
    }

    next();
};

/**
 * Middleware to check if user is vendor or admin
 */
export const requireVendorOrAdmin = requireRoles(['vendor', 'admin']);

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = requireRoles(['admin']);