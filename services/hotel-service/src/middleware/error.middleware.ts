import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/errors';
import { errorResponse } from '../utils/response';
import { logger } from '../utils/logger';

export const errorHandler = (
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    logger.error('Error occurred:', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        body: req.body,
        query: req.query,
        params: req.params
    });

    if (error instanceof ApiError) {
        return errorResponse(res, error.statusCode, error.message, error.code, error.details);
    }

    // Handle specific error types
    if (error.name === 'ValidationError') {
        return errorResponse(res, 400, error.message, 'VALIDATION_ERROR');
    }

    if (error.name === 'CastError') {
        return errorResponse(res, 400, 'Invalid ID format', 'INVALID_ID');
    }

    // Database errors
    if (error.message.includes('duplicate key')) {
        return errorResponse(res, 409, 'Resource already exists', 'DUPLICATE_RESOURCE');
    }

    if (error.message.includes('foreign key')) {
        return errorResponse(res, 400, 'Referenced resource does not exist', 'INVALID_REFERENCE');
    }

    // Default error
    return errorResponse(
        res,
        500,
        process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
        'INTERNAL_ERROR'
    );
};