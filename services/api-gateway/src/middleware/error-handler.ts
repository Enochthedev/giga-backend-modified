import { Request, Response, NextFunction } from 'express';
import { Logger } from '@giga/common';

const logger = Logger;

/**
 * Global error handler middleware for API Gateway
 * Handles all unhandled errors and provides consistent error responses
 */
export const errorHandler = (
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const requestId = (req as any).requestId || 'unknown';

    logger.error(`[${requestId}] Unhandled error in API Gateway: ${error.message}`, error);

    // Don't send error response if headers already sent
    if (res.headersSent) {
        return next(error);
    }

    // Determine error type and status code
    let statusCode = 500;
    let errorMessage = 'Internal server error';
    let errorCode = 'INTERNAL_ERROR';

    if (error.name === 'ValidationError') {
        statusCode = 400;
        errorMessage = 'Validation failed';
        errorCode = 'VALIDATION_ERROR';
    } else if (error.name === 'UnauthorizedError') {
        statusCode = 401;
        errorMessage = 'Unauthorized';
        errorCode = 'UNAUTHORIZED';
    } else if (error.name === 'ForbiddenError') {
        statusCode = 403;
        errorMessage = 'Forbidden';
        errorCode = 'FORBIDDEN';
    } else if (error.name === 'NotFoundError') {
        statusCode = 404;
        errorMessage = 'Resource not found';
        errorCode = 'NOT_FOUND';
    } else if (error.name === 'TimeoutError') {
        statusCode = 504;
        errorMessage = 'Gateway timeout';
        errorCode = 'GATEWAY_TIMEOUT';
    }

    // Send error response
    res.status(statusCode).json({
        error: errorCode,
        message: errorMessage,
        requestId,
        timestamp: new Date().toISOString(),
        ...(process.env['NODE_ENV'] === 'development' && {
            details: error.message,
            stack: error.stack
        })
    });
};

/**
 * Async error wrapper for route handlers
 * Catches async errors and passes them to error handler
 */
export const asyncErrorHandler = (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * 404 handler for undefined routes
 */
export const notFoundHandler = (req: Request, res: Response): void => {
    const requestId = (req as any).requestId || 'unknown';

    logger.warn(`[${requestId}] Route not found: ${req.method} ${req.url}`, {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.headers['user-agent']
    });

    res.status(404).json({
        error: 'NOT_FOUND',
        message: `The requested endpoint ${req.originalUrl} was not found`,
        requestId,
        timestamp: new Date().toISOString()
    });
};