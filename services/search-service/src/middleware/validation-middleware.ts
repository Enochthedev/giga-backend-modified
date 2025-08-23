import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ResponseHelper } from '../utils/response';
import { logger } from '../utils/logger';

export interface ValidationSchema {
    body?: Joi.ObjectSchema;
    query?: Joi.ObjectSchema;
    params?: Joi.ObjectSchema;
}

/**
 * Middleware to validate request data using Joi schemas
 */
export function validateRequest(schema: ValidationSchema) {
    return (req: Request, res: Response, next: NextFunction) => {
        const errors: string[] = [];

        // Validate request body
        if (schema.body) {
            const { error } = schema.body.validate(req.body);
            if (error) {
                errors.push(`Body: ${error.details.map(d => d.message).join(', ')}`);
            }
        }

        // Validate query parameters
        if (schema.query) {
            const { error } = schema.query.validate(req.query);
            if (error) {
                errors.push(`Query: ${error.details.map(d => d.message).join(', ')}`);
            }
        }

        // Validate path parameters
        if (schema.params) {
            const { error } = schema.params.validate(req.params);
            if (error) {
                errors.push(`Params: ${error.details.map(d => d.message).join(', ')}`);
            }
        }

        if (errors.length > 0) {
            logger.warn('Validation error:', { errors, path: req.path, method: req.method });
            return ResponseHelper.validationError(res, errors.join('; '));
        }

        next();
    };
}

/**
 * Middleware to sanitize request data
 */
export function sanitizeRequest(req: Request, res: Response, next: NextFunction) {
    // Remove any potentially dangerous characters from string inputs
    const sanitizeString = (str: string): string => {
        if (typeof str !== 'string') return str;

        // Remove script tags and other potentially dangerous content
        return str
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .trim();
    };

    const sanitizeObject = (obj: any): any => {
        if (typeof obj === 'string') {
            return sanitizeString(obj);
        }

        if (Array.isArray(obj)) {
            return obj.map(sanitizeObject);
        }

        if (obj && typeof obj === 'object') {
            const sanitized: any = {};
            for (const [key, value] of Object.entries(obj)) {
                sanitized[key] = sanitizeObject(value);
            }
            return sanitized;
        }

        return obj;
    };

    // Sanitize request body
    if (req.body) {
        req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
        req.query = sanitizeObject(req.query);
    }

    next();
}