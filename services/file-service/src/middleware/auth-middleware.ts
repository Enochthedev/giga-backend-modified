import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        roles: string[];
    };
    validatedBody?: any;
    validatedQuery?: any;
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        res.status(401).json({
            error: 'Access token required',
            code: 'MISSING_TOKEN'
        });
        return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        console.error('JWT_SECRET environment variable is not set');
        res.status(500).json({
            error: 'Server configuration error',
            code: 'SERVER_ERROR'
        });
        return;
    }

    try {
        const decoded = jwt.verify(token, jwtSecret) as any;
        req.user = {
            id: decoded.id || decoded.userId,
            email: decoded.email,
            roles: decoded.roles || []
        };
        next();
    } catch (error) {
        console.error('Token verification failed:', error);
        res.status(403).json({
            error: 'Invalid or expired token',
            code: 'INVALID_TOKEN'
        });
    }
};

export const optionalAuth = (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        next(); // Continue without authentication
        return;
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        next(); // Continue without authentication if JWT_SECRET is not set
        return;
    }

    try {
        const decoded = jwt.verify(token, jwtSecret) as any;
        req.user = {
            id: decoded.id || decoded.userId,
            email: decoded.email,
            roles: decoded.roles || []
        };
    } catch (error) {
        // Invalid token, but continue without authentication
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn('Invalid token provided, continuing without auth:', errorMessage);
    }

    next();
};