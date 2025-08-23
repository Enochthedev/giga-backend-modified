import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/api-error';
import { ApiResponseUtil } from '../utils/api-response';
import { Logger } from '../utils/logger';

/**
 * Global error handling middleware
 */
export const errorHandler = (
    error: Error,
    req: Request,
    res: Response,
    _next: NextFunction
): void => {
    // Log the error
    Logger.error('Unhandled error', error, {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip
    });

    // Handle known API errors
    if (error instanceof ApiError) {
        res.status(error.statusCode).json(
            ApiResponseUtil.error(error.message, error.code, req.headers['x-request-id'] as string)
        );
        return;
    }

    // Handle Joi validation errors
    if (error.name === 'ValidationError') {
        res.status(400).json(
            ApiResponseUtil.error('Validation failed', error.message, req.headers['x-request-id'] as string)
        );
        return;
    }

    // Handle JWT errors
    if (error.name === 'JsonWebTokenError') {
        res.status(401).json(
            ApiResponseUtil.error('Invalid token', 'INVALID_TOKEN', req.headers['x-request-id'] as string)
        );
        return;
    }

    if (error.name === 'TokenExpiredError') {
        res.status(401).json(
            ApiResponseUtil.error('Token expired', 'TOKEN_EXPIRED', req.headers['x-request-id'] as string)
        );
        return;
    }

    // Handle database errors
    if (error.name === 'SequelizeValidationError' || error.name === 'ValidationError') {
        res.status(400).json(
            ApiResponseUtil.error('Database validation failed', error.message, req.headers['x-request-id'] as string)
        );
        return;
    }

    // Handle unknown errors
    const isDevelopment = process.env['NODE_ENV'] === 'development';
    const message = isDevelopment ? error.message : 'Internal server error';
    const stack = isDevelopment ? error.stack : undefined;

    res.status(500).json(
        ApiResponseUtil.error(message, stack, req.headers['x-request-id'] as string)
    );
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req: Request, res: Response): void => {
    res.status(404).json(
        ApiResponseUtil.error(
            `Route ${req.method} ${req.path} not found`,
            'ROUTE_NOT_FOUND',
            req.headers['x-request-id'] as string
        )
    );
};