import Joi from 'joi';
import { ApiError } from './api-error';

/**
 * Validation utility for request data
 */
export class ValidationUtil {
    /**
     * Validate request data against a Joi schema
     */
    public static validate<T>(data: any, schema: Joi.ObjectSchema): T {
        const { error, value } = schema.validate(data, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const details = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            throw ApiError.badRequest('Validation failed', details);
        }

        return value as T;
    }

    /**
     * Safely validate data and return result with success flag
     */
    public static safeParse<T>(data: any, schema: Joi.ObjectSchema): {
        success: boolean;
        data?: T;
        errors?: Array<{
            field: string;
            message: string;
        }>;
    } {
        const { error, value } = schema.validate(data, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            return {
                success: false,
                errors: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message
                }))
            };
        }

        return {
            success: true,
            data: value as T
        };
    }

    /**
     * Validate partial data (useful for updates)
     */
    public static validatePartial<T>(data: any, schema: Joi.ObjectSchema): Partial<T> {
        const partialSchema = schema.fork(Object.keys(schema.describe()['keys']), (field) => field.optional());
        return this.validate(data, partialSchema);
    }

    /**
     * Common validation schemas
     */
    public static schemas = {
        email: Joi.string().email().required(),
        password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}')).required(),
        uuid: Joi.string().uuid().required(),
        pagination: Joi.object({
            page: Joi.number().integer().min(1).default(1),
            limit: Joi.number().integer().min(1).max(100).default(10)
        }),
        id: Joi.string().uuid().required(),
        name: Joi.string().min(2).max(100).required(),
        phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required(),
        url: Joi.string().uri().required(),
        date: Joi.date().iso().required(),
        amount: Joi.number().positive().precision(2).required()
    };

    /**
     * Validate environment variables
     */
    public static validateEnv<T>(schema: Joi.ObjectSchema): T {
        const { error, value } = schema.validate(process.env, {
            allowUnknown: true,
            stripUnknown: false
        });

        if (error) {
            const missingVars = error.details.map(detail => detail.path.join('.')).join(', ');
            throw new Error(`Missing or invalid environment variables: ${missingVars}`);
        }

        return value as T;
    }

    /**
     * Create validation middleware for Express
     */
    public static middleware(schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params' = 'body') {
        return (req: any, _res: any, next: any) => {
            try {
                req[property] = this.validate(req[property], schema);
                next();
            } catch (error) {
                next(error);
            }
        };
    }
}