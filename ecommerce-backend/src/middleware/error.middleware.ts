import { Request, Response, NextFunction } from 'express';

/**
 * Error handling middleware
 */

export class AppError extends Error {
    public statusCode: number;
    public isOperational: boolean;

    constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Global error handling middleware
 */
export const errorHandler = (
    error: Error | AppError,
    req: Request,
    res: Response,
    _next: NextFunction
): void => {
    let statusCode = 500;
    let message = 'Internal server error';
    let isOperational = false;

    // Handle custom AppError
    if (error instanceof AppError) {
        statusCode = error.statusCode;
        message = error.message;
        isOperational = error.isOperational;
    }
    // Handle PostgreSQL errors
    else if (error.name === 'QueryFailedError' || (error as any).code) {
        const pgError = error as any;

        switch (pgError.code) {
            case '23505': // Unique violation
                statusCode = 409;
                message = 'Resource already exists';
                isOperational = true;
                break;
            case '23503': // Foreign key violation
                statusCode = 400;
                message = 'Invalid reference to related resource';
                isOperational = true;
                break;
            case '23502': // Not null violation
                statusCode = 400;
                message = 'Required field is missing';
                isOperational = true;
                break;
            case '22P02': // Invalid input syntax
                statusCode = 400;
                message = 'Invalid data format';
                isOperational = true;
                break;
            default:
                statusCode = 500;
                message = 'Database error';
                isOperational = false;
        }
    }
    // Handle JWT errors
    else if (error.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
        isOperational = true;
    }
    else if (error.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
        isOperational = true;
    }

    // Log error for debugging
    if (!isOperational || statusCode >= 500) {
        console.error('Error:', {
            message: error.message,
            stack: error.stack,
            url: req.url,
            method: req.method,
            body: req.body,
            params: req.params,
            query: req.query
        });
    }

    // Send error response
    res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && {
            stack: error.stack,
            details: error
        })
    });
};

/**
 * Middleware to handle 404 errors
 */
export const notFoundHandler = (req: Request, res: Response): void => {
    res.status(404).json({
        success: false,
        error: `Route ${req.method} ${req.path} not found`
    });
};

/**
 * Async error wrapper to catch async errors
 */
export const asyncHandler = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};