import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
    statusCode?: number;
    code?: string;
    details?: any;
}

export const errorHandler = (
    error: ApiError,
    req: Request,
    res: Response,
    _next: NextFunction
): void => {
    console.error('Error occurred:', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
    });

    // Default error response
    let statusCode = error.statusCode || 500;
    let message = error.message || 'Internal server error';
    let code = error.code || 'INTERNAL_ERROR';

    // Handle specific error types
    if (error.name === 'ValidationError') {
        statusCode = 400;
        code = 'VALIDATION_ERROR';
    } else if (error.name === 'UnauthorizedError') {
        statusCode = 401;
        code = 'UNAUTHORIZED';
    } else if (error.name === 'ForbiddenError') {
        statusCode = 403;
        code = 'FORBIDDEN';
    } else if (error.name === 'NotFoundError') {
        statusCode = 404;
        code = 'NOT_FOUND';
    }

    // Don't expose internal errors in production
    if (statusCode === 500 && process.env.NODE_ENV === 'production') {
        message = 'Internal server error';
    }

    res.status(statusCode).json({
        error: message,
        code,
        timestamp: new Date().toISOString(),
        path: req.path,
        ...(error.details && { details: error.details })
    });
};

export const createError = (
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: any
): ApiError => {
    const error = new Error(message) as ApiError;
    error.statusCode = statusCode;
    if (code) {
        error.code = code;
    }
    error.details = details;
    return error;
};