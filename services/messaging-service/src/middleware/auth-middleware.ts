import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../database/connection';
import logger from '../utils/logger';

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
    };
}

/**
 * Authentication middleware for messaging service
 * Validates JWT tokens and attaches user information to request
 */
export const authenticateToken = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            res.status(401).json({
                success: false,
                error: 'Access token required'
            });
            return;
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            logger.error('JWT_SECRET not configured');
            res.status(500).json({
                success: false,
                error: 'Server configuration error'
            });
            return;
        }

        const decoded = jwt.verify(token, jwtSecret) as any;

        // Get user information from database
        const userResult = await db.query(
            'SELECT id, email, role FROM users WHERE id = $1',
            [decoded.userId || decoded.id]
        );

        if (userResult.rows.length === 0) {
            res.status(401).json({
                success: false,
                error: 'Invalid token - user not found'
            });
            return;
        }

        req.user = userResult.rows[0];
        next();
    } catch (error) {
        logger.error('Authentication error:', error);

        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({
                success: false,
                error: 'Invalid token'
            });
            return;
        }

        res.status(500).json({
            success: false,
            error: 'Authentication failed'
        });
    }
};

/**
 * Authorization middleware to check user roles
 */
export const requireRole = (roles: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
            return;
        }

        if (!roles.includes(req.user.role)) {
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
 * Optional authentication middleware
 * Attaches user info if token is present but doesn't require it
 */
export const optionalAuth = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
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

        const decoded = jwt.verify(token, jwtSecret) as any;

        const userResult = await db.query(
            'SELECT id, email, role FROM users WHERE id = $1',
            [decoded.userId || decoded.id]
        );

        if (userResult.rows.length > 0) {
            req.user = userResult.rows[0];
        }

        next();
    } catch (error) {
        // Ignore authentication errors for optional auth
        next();
    }
};