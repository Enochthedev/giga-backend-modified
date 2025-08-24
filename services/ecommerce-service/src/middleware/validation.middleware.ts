import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

/**
 * Validation middleware using Zod schemas
 */

export interface ValidationTargets {
    body?: z.ZodSchema;
    params?: z.ZodSchema;
    query?: z.ZodSchema;
}

/**
 * Create validation middleware for request validation
 */
export const validate = (schemas: ValidationTargets) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            // Validate request body
            if (schemas.body) {
                req.body = schemas.body.parse(req.body);
            }

            // Validate request parameters
            if (schemas.params) {
                req.params = schemas.params.parse(req.params);
            }

            // Validate query parameters
            if (schemas.query) {
                req.query = schemas.query.parse(req.query);
            }

            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                const validationErrors = error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                    code: err.code
                }));

                res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: validationErrors
                });
                return;
            }

            // Handle other validation errors
            res.status(400).json({
                success: false,
                error: 'Invalid request data'
            });
        }
    };
};

/**
 * Middleware to validate request body only
 */
export const validateBody = (schema: z.ZodSchema) => validate({ body: schema });

/**
 * Middleware to validate request params only
 */
export const validateParams = (schema: z.ZodSchema) => validate({ params: schema });

/**
 * Middleware to validate query parameters only
 */
export const validateQuery = (schema: z.ZodSchema) => validate({ query: schema });