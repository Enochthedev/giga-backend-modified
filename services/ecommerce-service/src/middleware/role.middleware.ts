import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';

/**
 * Role-based access control middleware
 */
export const roleMiddleware = (allowedRoles: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        try {
            // Check if user is authenticated
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
                return;
            }

            // Check if user has required role
            const userRoles = req.user.roles || ['user']; // Default to 'user' if no roles specified

            if (!allowedRoles.some(role => userRoles.includes(role))) {
                res.status(403).json({
                    success: false,
                    message: 'Insufficient permissions'
                });
                return;
            }

            next();
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    };
};