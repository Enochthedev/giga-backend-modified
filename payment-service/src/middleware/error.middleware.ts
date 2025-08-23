import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { sendError } from '../utils/response';
import { PaymentError } from '../utils/errors';

/**
 * Global error handling middleware
 */
export const errorHandler = (
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    // Log the error
    logger.error('Unhandled error', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        body: req.body,
        params: req.params,
        query: req.query,
        headers: req.headers
    });

    // Handle known payment errors
    if (error instanceof PaymentError) {
        sendError(res, error.message, error.code, error.statusCode, error.details);
        return;
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
        sendError(res, error.message, 'VALIDATION_ERROR', 400);
        return;
    }

    // Handle JWT errors
    if (error.name === 'JsonWebTokenError') {
        sendError(res, 'Invalid token', 'INVALID_TOKEN', 401);
        return;
    }

    if (error.name === 'TokenExpiredError') {
        sendError(res, 'Token expired', 'TOKEN_EXPIRED', 401);
        return;
    }

    // Handle database errors
    if (error.message.includes('duplicate key value')) {
        sendError(res, 'Resource already exists', 'DUPLICATE_RESOURCE', 409);
        return;
    }

    if (error.message.includes('foreign key constraint')) {
        sendError(res, 'Referenced resource not found', 'INVALID_REFERENCE', 400);
        return;
    }

    // Handle syntax errors in JSON
    if (error instanceof SyntaxError && 'body' in error) {
        sendError(res, 'Invalid JSON in request body', 'INVALID_JSON', 400);
        return;
    }

    // Default to internal server error
    sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500);
};

/**
 * Middleware to handle 404 errors
 */
export const notFoundHandler = (req: Request, res: Response): void => {
    sendError(res, `Route ${req.method} ${req.path} not found`, 'NOT_FOUND', 404);
};

/**
 * Async error wrapper to catch async errors in route handlers
 */
export const asyncHandler = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};