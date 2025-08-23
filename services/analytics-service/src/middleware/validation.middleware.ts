/**
 * Request validation middleware
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '../utils/logger';

export const validateRequest = (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errorDetails = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value
            }));

            logger.warn('Request validation failed:', {
                path: req.path,
                method: req.method,
                errors: errorDetails
            });

            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errorDetails
            });
            return;
        }

        // Replace request body with validated and sanitized data
        req.body = value;
        next();
    };
};