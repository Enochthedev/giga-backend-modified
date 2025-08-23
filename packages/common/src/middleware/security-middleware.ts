import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { ApiError } from '../utils/api-error';
import { Logger } from '../utils/logger';

/**
 * Security middleware collection
 */
export class SecurityMiddleware {
    /**
     * Rate limiting middleware
     */
    public static rateLimit(options: {
        windowMs?: number;
        max?: number;
        message?: string;
        skipSuccessfulRequests?: boolean;
        skipFailedRequests?: boolean;
        keyGenerator?: (req: Request) => string;
    } = {}) {
        const {
            windowMs = 15 * 60 * 1000, // 15 minutes
            max = 100, // limit each IP to 100 requests per windowMs
            message = 'Too many requests from this IP, please try again later',
            skipSuccessfulRequests = false,
            skipFailedRequests = false
        } = options;

        return rateLimit({
            windowMs,
            max,
            message: {
                success: false,
                message,
                error: 'RATE_LIMIT_EXCEEDED',
                timestamp: new Date()
            },
            skipSuccessfulRequests,
            skipFailedRequests,
            keyGenerator: (req: Request) => req.ip || 'unknown',
            onLimitReached: (req: Request) => {
                Logger.warn('Rate limit exceeded', {
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    url: req.url,
                    method: req.method
                });
            }
        });
    }

    /**
     * Helmet security headers
     */
    public static helmet(options: any = {}) {
        return helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'"],
                    fontSrc: ["'self'"],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    frameSrc: ["'none'"]
                }
            },
            crossOriginEmbedderPolicy: false,
            ...options
        });
    }

    /**
     * CORS middleware
     */
    public static cors(options: {
        origins?: string[] | string;
        methods?: string[];
        allowedHeaders?: string[];
        credentials?: boolean;
    } = {}) {
        const {
            origins = process.env['ALLOWED_ORIGINS']?.split(',') || ['http://localhost:3000'],
            methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowedHeaders = ['Content-Type', 'Authorization', 'X-Request-ID'],
            credentials = true
        } = options;

        return cors({
            origin: (origin, callback) => {
                // Allow requests with no origin (mobile apps, etc.)
                if (!origin) return callback(null, true);

                if (Array.isArray(origins)) {
                    if (origins.includes(origin) || origins.includes('*')) {
                        return callback(null, true);
                    }
                } else if (origins === '*' || origins === origin) {
                    return callback(null, true);
                }

                Logger.warn('CORS origin blocked', { origin, allowedOrigins: origins });
                callback(new Error('Not allowed by CORS'));
            },
            methods,
            allowedHeaders,
            credentials
        });
    }

    /**
     * API key authentication middleware
     */
    public static apiKey(validApiKeys: string[] | ((key: string) => boolean)) {
        return (req: Request, _res: Response, next: NextFunction): void => {
            const apiKey = req.headers['x-api-key'] as string;

            if (!apiKey) {
                return next(ApiError.unauthorized('API key is required'));
            }

            const isValid = Array.isArray(validApiKeys)
                ? validApiKeys.includes(apiKey)
                : validApiKeys(apiKey);

            if (!isValid) {
                Logger.warn('Invalid API key attempt', {
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    url: req.url
                });
                return next(ApiError.unauthorized('Invalid API key'));
            }

            next();
        };
    }

    /**
     * IP whitelist middleware
     */
    public static ipWhitelist(allowedIPs: string[]) {
        return (req: Request, _res: Response, next: NextFunction): void => {
            const clientIP = req.ip || 'unknown';

            if (!allowedIPs.includes(clientIP)) {
                Logger.warn('IP not in whitelist', {
                    ip: clientIP,
                    allowedIPs,
                    url: req.url
                });
                return next(ApiError.forbidden('IP address not allowed'));
            }

            next();
        };
    }

    /**
     * Request size limit middleware
     */
    public static requestSizeLimit(maxSize: string = '10mb') {
        return (req: Request, _res: Response, next: NextFunction): void => {
            const contentLength = req.get('Content-Length');

            if (contentLength) {
                const sizeInBytes = parseInt(contentLength);
                const maxSizeInBytes = this.parseSize(maxSize);

                if (sizeInBytes > maxSizeInBytes) {
                    return next(ApiError.badRequest(`Request size exceeds limit of ${maxSize}`));
                }
            }

            next();
        };
    }

    /**
     * Content type validation middleware
     */
    public static validateContentType(allowedTypes: string[]) {
        return (req: Request, _res: Response, next: NextFunction): void => {
            const contentType = req.get('Content-Type');

            if (req.method !== 'GET' && req.method !== 'DELETE') {
                if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
                    return next(ApiError.badRequest(`Content-Type must be one of: ${allowedTypes.join(', ')}`));
                }
            }

            next();
        };
    }

    /**
     * User agent validation middleware
     */
    public static validateUserAgent(blockedAgents: RegExp[] = []) {
        return (req: Request, _res: Response, next: NextFunction): void => {
            const userAgent = req.get('User-Agent');

            if (!userAgent) {
                Logger.warn('Request without User-Agent', {
                    ip: req.ip,
                    url: req.url
                });
            }

            if (userAgent && blockedAgents.some(pattern => pattern.test(userAgent))) {
                Logger.warn('Blocked user agent detected', {
                    userAgent,
                    ip: req.ip,
                    url: req.url
                });
                return next(ApiError.forbidden('User agent not allowed'));
            }

            next();
        };
    }

    /**
     * HTTPS redirect middleware
     */
    public static httpsRedirect(trustProxy: boolean = true) {
        return (req: Request, res: Response, next: NextFunction): void => {
            if (process.env['NODE_ENV'] === 'production') {
                const isSecure = trustProxy
                    ? req.headers['x-forwarded-proto'] === 'https'
                    : req.secure;

                if (!isSecure) {
                    const host = req.get('Host');
                    if (host) {
                        return res.redirect(301, `https://${host}${req.url}`);
                    }
                }
            }

            next();
        };
    }

    /**
     * Parse size string to bytes
     */
    private static parseSize(size: string): number {
        const units: { [key: string]: number } = {
            b: 1,
            kb: 1024,
            mb: 1024 * 1024,
            gb: 1024 * 1024 * 1024
        };

        const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
        if (!match) {
            throw new Error(`Invalid size format: ${size}`);
        }

        const value = parseFloat(match[1]!);
        const unit = match[2] || 'b';

        return Math.floor(value * (units[unit] || 1));
    }
}