import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiError } from '@giga/common';

/**
 * Middleware to validate request data using Joi schemas
 */
export const validateRequest = (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errorMessages = error.details.map(detail => detail.message);
            throw ApiError.badRequest(`Validation error: ${errorMessages.join(', ')}`);
        }

        // Replace req.body with validated and sanitized data
        req.body = value;
        next();
    };
};

/**
 * Middleware to validate query parameters
 */
export const validateQuery = (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const { error, value } = schema.validate(req.query, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errorMessages = error.details.map(detail => detail.message);
            throw ApiError.badRequest(`Query validation error: ${errorMessages.join(', ')}`);
        }

        // Replace req.query with validated and sanitized data
        req.query = value;
        next();
    };
};

/**
 * Middleware to validate URL parameters
 */
export const validateParams = (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const { error, value } = schema.validate(req.params, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errorMessages = error.details.map(detail => detail.message);
            throw ApiError.badRequest(`Parameter validation error: ${errorMessages.join(', ')}`);
        }

        // Replace req.params with validated and sanitized data
        req.params = value;
        next();
    };
};