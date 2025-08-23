import { Request, Response, NextFunction } from 'express';
import { Logger } from '@giga/common';

const logger = Logger;

/**
 * Request logging middleware for API Gateway
 * Logs incoming requests with timing and response information
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    const { method, url, ip, headers } = req;

    // Log incoming request
    logger.info(`Incoming request: ${method} ${url}`, {
        ip,
        userAgent: headers['user-agent'],
        contentType: headers['content-type'],
        contentLength: headers['content-length'],
        timestamp: new Date().toISOString()
    });

    // Override res.end to capture response information
    const originalEnd = res.end;
    res.end = function (chunk?: any, encoding?: any): Response {
        const duration = Date.now() - startTime;
        const { statusCode } = res;

        // Log response information
        logger.info(`Request completed: ${method} ${url}`, {
            statusCode,
            duration: `${duration}ms`,
            ip,
            responseSize: res.get('content-length') || 'unknown',
            timestamp: new Date().toISOString()
        });

        // Log errors for non-2xx status codes
        if (statusCode >= 400) {
            logger.warn(`Request failed: ${method} ${url}`, {
                statusCode,
                duration: `${duration}ms`,
                ip,
                userAgent: headers['user-agent']
            });
        }

        // Call original end method
        return originalEnd.call(this, chunk, encoding);
    };

    next();
};

/**
 * Enhanced request logger with additional context
 * Includes request ID and more detailed logging
 */
export const enhancedRequestLogger = (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    const requestId = generateRequestId();
    const { method, url, ip, headers } = req;

    // Add request ID to request object for downstream use
    (req as any).requestId = requestId;

    // Add request ID to response headers
    res.setHeader('X-Request-ID', requestId);

    logger.info(`[${requestId}] Incoming request: ${method} ${url}`, {
        requestId,
        ip,
        userAgent: headers['user-agent'],
        contentType: headers['content-type'],
        contentLength: headers['content-length'],
        referer: headers.referer,
        timestamp: new Date().toISOString()
    });

    // Override res.end to capture response information
    const originalEnd = res.end;
    res.end = function (chunk?: any, encoding?: any): Response {
        const duration = Date.now() - startTime;
        const { statusCode } = res;

        logger.info(`[${requestId}] Request completed: ${method} ${url}`, {
            requestId,
            statusCode,
            duration: `${duration}ms`,
            ip,
            responseSize: res.get('content-length') || 'unknown',
            timestamp: new Date().toISOString()
        });

        // Log performance warnings for slow requests
        if (duration > 5000) {
            logger.warn(`[${requestId}] Slow request detected: ${method} ${url}`, {
                requestId,
                duration: `${duration}ms`,
                statusCode
            });
        }

        return originalEnd.call(this, chunk, encoding);
    };

    next();
};

/**
 * Generate unique request ID
 * @returns Unique request identifier
 */
function generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}