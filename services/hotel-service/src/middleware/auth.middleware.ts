import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../utils/errors';

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        roles: string[];
    };
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            throw new UnauthorizedError('Access token is required');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
        req.user = {
            id: decoded.id || decoded.userId,
            email: decoded.email,
            roles: decoded.roles || []
        };

        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            next(new UnauthorizedError('Invalid token'));
        } else {
            next(error);
        }
    }
};

export const optionalAuthMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
            req.user = {
                id: decoded.id || decoded.userId,
                email: decoded.email,
                roles: decoded.roles || []
            };
        }

        next();
    } catch (error) {
        // For optional auth, we don't throw errors, just continue without user
        next();
    }
};

export const requireRole = (roles: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new UnauthorizedError('Authentication required'));
        }

        const hasRole = roles.some(role => req.user!.roles.includes(role));
        if (!hasRole) {
            return next(new UnauthorizedError('Insufficient permissions'));
        }

        next();
    };
};