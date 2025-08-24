import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendValidationError } from '../utils/response';
import { logger } from '../utils/logger';

/**
 * Middleware factory for validating request body with Zod schema
 */
export const validateBody = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            req.body = schema.parse(req.body);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                logger.warn('Request body validation failed', {
                    errors: error.errors,
                    body: req.body
                });
                sendValidationError(res, error.errors);
                return;
            }
            next(error);
        }
    };
};

/**
 * Middleware factory for validating query parameters with Zod schema
 */
export const validateQuery = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            req.query = schema.parse(req.query);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                logger.warn('Query parameters validation failed', {
                    errors: error.errors,
                    query: req.query
                });
                sendValidationError(res, error.errors);
                return;
            }
            next(error);
        }
    };
};

/**
 * Middleware factory for validating route parameters with Zod schema
 */
export const validateParams = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            req.params = schema.parse(req.params);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                logger.warn('Route parameters validation failed', {
                    errors: error.errors,
                    params: req.params
                });
                sendValidationError(res, error.errors);
                return;
            }
            next(error);
        }
    };
};

/**
 * Middleware to validate UUID parameters
 */
export const validateUUIDParam = (paramName: string = 'id') => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const value = req.params[paramName];
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

        if (!value || !uuidRegex.test(value)) {
            sendValidationError(res, [{
                code: 'invalid_string',
                message: `Invalid UUID format for parameter '${paramName}'`,
                path: [paramName]
            }]);
            return;
        }

        next();
    };
};

/**
 * Middleware to sanitize and validate pagination parameters
 */
export const validatePagination = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        // Ensure reasonable limits
        req.query.page = Math.max(1, page).toString();
        req.query.limit = Math.min(Math.max(1, limit), 100).toString();

        next();
    } catch (error) {
        sendValidationError(res, [{
            code: 'invalid_type',
            message: 'Invalid pagination parameters',
            path: ['page', 'limit']
        }]);
    }
};