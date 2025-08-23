import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface RequestWithId extends Request {
    id?: string;
    startTime?: number;
}

/**
 * Logging middleware for HTTP requests
 */
export class LoggingMiddleware {
    /**
     * Request ID middleware - adds unique ID to each request
     */
    public static requestId() {
        return (req: RequestWithId, res: Response, next: NextFunction): void => {
            req.id = req.headers['x-request-id'] as string || uuidv4();
            res.setHeader('X-Request-ID', req.id);
            next();
        };
    }

    /**
     * Request logging middleware
     */
    public static logRequests(options: {
        logBody?: boolean;
        logHeaders?: boolean;
        excludePaths?: string[];
        excludeHeaders?: string[];
    } = {}) {
        const {
            logBody = false,
            logHeaders = false,
            excludePaths = ['/health', '/metrics'],
            excludeHeaders = ['authorization', 'cookie', 'x-api-key']
        } = options;

        return (req: RequestWithId, res: Response, next: NextFunction): void => {
            // Skip logging for excluded paths
            if (excludePaths.some(path => req.path.startsWith(path))) {
                return next();
            }

            req.startTime = Date.now();

            const logData: any = {
                requestId: req.id,
                method: req.method,
                url: req.url,
                path: req.path,
                query: req.query,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                contentLength: req.get('Content-Length'),
                contentType: req.get('Content-Type')
            };

            if (logHeaders) {
                const headers = { ...req.headers };
                excludeHeaders.forEach(header => delete headers[header]);
                logData.headers = headers;
            }

            if (logBody && req.body && Object.keys(req.body).length > 0) {
                logData.body = req.body;
            }

            Logger.info('Incoming request', logData);

            // Log response when it finishes
            const originalSend = res.send;
            res.send = function (body: any) {
                const responseTime = Date.now() - (req.startTime || Date.now());

                Logger.info('Request completed', {
                    requestId: req.id,
                    method: req.method,
                    url: req.url,
                    statusCode: res.statusCode,
                    responseTime: `${responseTime}ms`,
                    contentLength: res.get('Content-Length')
                });

                return originalSend.call(this, body);
            };

            next();
        };
    }

    /**
     * Error logging middleware
     */
    public static logErrors() {
        return (error: Error, req: RequestWithId, _res: Response, next: NextFunction): void => {
            Logger.error('Request error', error, {
                requestId: req.id,
                method: req.method,
                url: req.url,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                body: req.body
            });

            next(error);
        };
    }

    /**
     * Performance monitoring middleware
     */
    public static performanceMonitoring(slowRequestThreshold: number = 1000) {
        return (req: RequestWithId, res: Response, next: NextFunction): void => {
            req.startTime = Date.now();

            const originalSend = res.send;
            res.send = function (body: any) {
                const responseTime = Date.now() - (req.startTime || Date.now());

                if (responseTime > slowRequestThreshold) {
                    Logger.warn('Slow request detected', {
                        requestId: req.id,
                        method: req.method,
                        url: req.url,
                        responseTime: `${responseTime}ms`,
                        threshold: `${slowRequestThreshold}ms`
                    });
                }

                return originalSend.call(this, body);
            };

            next();
        };
    }

    /**
     * Security logging middleware
     */
    public static securityLogging() {
        return (req: RequestWithId, _res: Response, next: NextFunction): void => {
            const suspiciousPatterns = [
                /\.\./,  // Path traversal
                /<script/i,  // XSS
                /union.*select/i,  // SQL injection
                /javascript:/i,  // JavaScript injection
                /data:.*base64/i  // Data URI
            ];

            const checkForSuspiciousContent = (obj: any, path: string = ''): void => {
                if (typeof obj === 'string') {
                    suspiciousPatterns.forEach(pattern => {
                        if (pattern.test(obj)) {
                            Logger.warn('Suspicious request content detected', {
                                requestId: req.id,
                                method: req.method,
                                url: req.url,
                                path,
                                pattern: pattern.toString(),
                                content: obj.substring(0, 100),
                                ip: req.ip,
                                userAgent: req.get('User-Agent')
                            });
                        }
                    });
                } else if (typeof obj === 'object' && obj !== null) {
                    Object.keys(obj).forEach(key => {
                        checkForSuspiciousContent(obj[key], `${path}.${key}`);
                    });
                }
            };

            // Check query parameters
            checkForSuspiciousContent(req.query, 'query');

            // Check request body
            if (req.body) {
                checkForSuspiciousContent(req.body, 'body');
            }

            // Check for suspicious headers
            const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip', 'x-originating-ip'];
            suspiciousHeaders.forEach(header => {
                const value = req.get(header);
                if (value) {
                    Logger.info('Request with forwarded IP header', {
                        requestId: req.id,
                        header,
                        value,
                        ip: req.ip
                    });
                }
            });

            next();
        };
    }
}