import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Joi from 'joi';
import { ZodValidator } from '../validation/zod-validator';
import { ValidationUtil } from '../utils/validation';
import { ApiError } from '../utils/api-error';

/**
 * Validation middleware for request data
 */
export class ValidationMiddleware {
    /**
     * Zod validation middleware
     */
    public static validateZod<T>(
        schema: z.ZodSchema<T>,
        property: 'body' | 'query' | 'params' = 'body'
    ) {
        return (req: Request, _res: Response, next: NextFunction): void => {
            try {
                req[property] = ZodValidator.validate(req[property], schema);
                next();
            } catch (error) {
                next(error);
            }
        };
    }

    /**
     * Joi validation middleware
     */
    public static validateJoi(
        schema: Joi.ObjectSchema,
        property: 'body' | 'query' | 'params' = 'body'
    ) {
        return (req: Request, _res: Response, next: NextFunction): void => {
            try {
                req[property] = ValidationUtil.validate(req[property], schema);
                next();
            } catch (error) {
                next(error);
            }
        };
    }

    /**
     * Validate multiple properties with different schemas
     */
    public static validateMultiple(validations: {
        body?: z.ZodSchema<any> | Joi.ObjectSchema;
        query?: z.ZodSchema<any> | Joi.ObjectSchema;
        params?: z.ZodSchema<any> | Joi.ObjectSchema;
    }) {
        return (req: Request, _res: Response, next: NextFunction): void => {
            try {
                Object.entries(validations).forEach(([property, schema]) => {
                    if (schema && (property === 'body' || property === 'query' || property === 'params')) {
                        if (schema instanceof z.ZodSchema) {
                            (req as any)[property] = ZodValidator.validate(
                                (req as any)[property],
                                schema
                            );
                        } else {
                            (req as any)[property] = ValidationUtil.validate(
                                (req as any)[property],
                                schema
                            );
                        }
                    }
                });
                next();
            } catch (error) {
                next(error);
            }
        };
    }

    /**
     * Validate file uploads
     */
    public static validateFileUpload(options: {
        maxSize?: number;
        allowedMimeTypes?: string[];
        maxFiles?: number;
        required?: boolean;
    } = {}) {
        const {
            maxSize = 10 * 1024 * 1024, // 10MB
            allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
            maxFiles = 5,
            required = false
        } = options;

        return (req: Request, _res: Response, next: NextFunction): void => {
            const files = req.files as Express.Multer.File[] | undefined;

            if (required && (!files || files.length === 0)) {
                return next(ApiError.badRequest('File upload is required'));
            }

            if (files && files.length > 0) {
                if (files.length > maxFiles) {
                    return next(ApiError.badRequest(`Maximum ${maxFiles} files allowed`));
                }

                for (const file of files) {
                    if (file.size > maxSize) {
                        return next(ApiError.badRequest(
                            `File ${file.originalname} exceeds maximum size of ${maxSize} bytes`
                        ));
                    }

                    if (!allowedMimeTypes.includes(file.mimetype)) {
                        return next(ApiError.badRequest(
                            `File ${file.originalname} has unsupported type. Allowed types: ${allowedMimeTypes.join(', ')}`
                        ));
                    }
                }
            }

            next();
        };
    }

    /**
     * Validate pagination parameters
     */
    public static validatePagination(options: {
        maxLimit?: number;
        defaultLimit?: number;
        defaultPage?: number;
    } = {}) {
        const {
            maxLimit = 100,
            defaultLimit = 10,
            defaultPage = 1
        } = options;

        return (req: Request, _res: Response, next: NextFunction): void => {
            try {
                const page = parseInt(req.query['page'] as string) || defaultPage;
                const limit = parseInt(req.query['limit'] as string) || defaultLimit;

                if (page < 1) {
                    return next(ApiError.badRequest('Page must be greater than 0'));
                }

                if (limit < 1) {
                    return next(ApiError.badRequest('Limit must be greater than 0'));
                }

                if (limit > maxLimit) {
                    return next(ApiError.badRequest(`Limit cannot exceed ${maxLimit}`));
                }

                req.query['page'] = page.toString();
                req.query['limit'] = limit.toString();

                next();
            } catch (error) {
                next(ApiError.badRequest('Invalid pagination parameters'));
            }
        };
    }

    /**
     * Validate UUID parameters
     */
    public static validateUuidParams(...paramNames: string[]) {
        return (req: Request, _res: Response, next: NextFunction): void => {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

            for (const paramName of paramNames) {
                const value = req.params[paramName];
                if (value && !uuidRegex.test(value)) {
                    return next(ApiError.badRequest(`Invalid UUID format for parameter: ${paramName}`));
                }
            }

            next();
        };
    }

    /**
     * Sanitize input data
     */
    public static sanitize(options: {
        trim?: boolean;
        lowercase?: string[];
        uppercase?: string[];
        removeHtml?: boolean;
    } = {}) {
        const {
            trim = true,
            lowercase = [],
            uppercase = [],
            removeHtml = false
        } = options;

        return (req: Request, _res: Response, next: NextFunction): void => {
            const sanitizeObject = (obj: any): any => {
                if (typeof obj === 'string') {
                    let sanitized = obj;

                    if (trim) {
                        sanitized = sanitized.trim();
                    }

                    if (removeHtml) {
                        sanitized = sanitized.replace(/<[^>]*>/g, '');
                    }

                    return sanitized;
                } else if (Array.isArray(obj)) {
                    return obj.map(sanitizeObject);
                } else if (obj && typeof obj === 'object') {
                    const sanitized: any = {};
                    Object.keys(obj).forEach(key => {
                        let value = sanitizeObject(obj[key]);

                        if (typeof value === 'string') {
                            if (lowercase.includes(key)) {
                                value = value.toLowerCase();
                            }
                            if (uppercase.includes(key)) {
                                value = value.toUpperCase();
                            }
                        }

                        sanitized[key] = value;
                    });
                    return sanitized;
                }
                return obj;
            };

            if (req.body) {
                req.body = sanitizeObject(req.body);
            }
            if (req.query) {
                req.query = sanitizeObject(req.query);
            }

            next();
        };
    }

    /**
     * Validate request content type
     */
    public static validateContentType(allowedTypes: string[]) {
        return (req: Request, _res: Response, next: NextFunction): void => {
            const contentType = req.get('Content-Type');

            if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
                if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
                    return next(ApiError.badRequest(
                        `Content-Type must be one of: ${allowedTypes.join(', ')}`
                    ));
                }
            }

            next();
        };
    }
}