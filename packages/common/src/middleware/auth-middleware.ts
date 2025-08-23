import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/api-error';
import { Logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        roles: string[];
        permissions: string[];
    };
}

/**
 * JWT Authentication middleware
 */
export class AuthMiddleware {
    private static jwtSecret: string = process.env['JWT_SECRET'] || 'default-secret';

    /**
     * Set JWT secret
     */
    public static setJwtSecret(secret: string): void {
        this.jwtSecret = secret;
    }

    /**
     * Authenticate JWT token
     */
    public static authenticate() {
        return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
            try {
                const authHeader = req.headers.authorization;

                if (!authHeader) {
                    throw ApiError.unauthorized('Authorization header is required');
                }

                const token = authHeader.startsWith('Bearer ')
                    ? authHeader.slice(7)
                    : authHeader;

                if (!token) {
                    throw ApiError.unauthorized('Token is required');
                }

                const decoded = jwt.verify(token, this.jwtSecret) as any;

                req.user = {
                    id: decoded.id || decoded.userId,
                    email: decoded.email,
                    roles: decoded.roles || [],
                    permissions: decoded.permissions || []
                };

                Logger.debug('User authenticated', {
                    userId: req.user.id,
                    email: req.user.email,
                    roles: req.user.roles
                });

                next();
            } catch (error) {
                if (error instanceof jwt.JsonWebTokenError) {
                    next(ApiError.unauthorized('Invalid token'));
                } else if (error instanceof jwt.TokenExpiredError) {
                    next(ApiError.unauthorized('Token expired'));
                } else {
                    next(error);
                }
            }
        };
    }

    /**
     * Optional authentication (doesn't fail if no token)
     */
    public static optionalAuth() {
        return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
            try {
                const authHeader = req.headers.authorization;

                if (!authHeader) {
                    return next();
                }

                const token = authHeader.startsWith('Bearer ')
                    ? authHeader.slice(7)
                    : authHeader;

                if (!token) {
                    return next();
                }

                const decoded = jwt.verify(token, this.jwtSecret) as any;

                req.user = {
                    id: decoded.id || decoded.userId,
                    email: decoded.email,
                    roles: decoded.roles || [],
                    permissions: decoded.permissions || []
                };

                next();
            } catch (error) {
                // For optional auth, we don't fail on invalid tokens
                Logger.warn('Invalid token in optional auth', { error: (error as Error).message });
                next();
            }
        };
    }

    /**
     * Require specific roles
     */
    public static requireRoles(...roles: string[]) {
        return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
            if (!req.user) {
                return next(ApiError.unauthorized('Authentication required'));
            }

            const hasRole = roles.some(role => req.user!.roles.includes(role));

            if (!hasRole) {
                return next(ApiError.forbidden(`Required roles: ${roles.join(', ')}`));
            }

            next();
        };
    }

    /**
     * Require specific permissions
     */
    public static requirePermissions(...permissions: string[]) {
        return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
            if (!req.user) {
                return next(ApiError.unauthorized('Authentication required'));
            }

            const hasPermission = permissions.every(permission =>
                req.user!.permissions.includes(permission)
            );

            if (!hasPermission) {
                return next(ApiError.forbidden(`Required permissions: ${permissions.join(', ')}`));
            }

            next();
        };
    }

    /**
     * Require user to be the owner of the resource
     */
    public static requireOwnership(userIdParam: string = 'userId') {
        return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
            if (!req.user) {
                return next(ApiError.unauthorized('Authentication required'));
            }

            const resourceUserId = req.params[userIdParam] || req.body[userIdParam];

            if (req.user.id !== resourceUserId) {
                return next(ApiError.forbidden('Access denied: not resource owner'));
            }

            next();
        };
    }

    /**
     * Generate JWT token
     */
    public static generateToken(payload: {
        id: string;
        email: string;
        roles?: string[];
        permissions?: string[];
    }, expiresIn: string = '24h'): string {
        return jwt.sign(payload, this.jwtSecret, { expiresIn } as jwt.SignOptions);
    }

    /**
     * Verify JWT token
     */
    public static verifyToken(token: string): any {
        return jwt.verify(token, this.jwtSecret);
    }

    /**
     * Decode JWT token without verification
     */
    public static decodeToken(token: string): any {
        return jwt.decode(token);
    }
}