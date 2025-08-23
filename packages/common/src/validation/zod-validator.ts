import { z } from 'zod';
import { ApiError } from '../utils/api-error';

/**
 * Zod validation utility for request data
 */
export class ZodValidator {
    /**
     * Validate data against a Zod schema
     */
    public static validate<T>(data: unknown, schema: z.ZodSchema<T>): T {
        try {
            return schema.parse(data);
        } catch (error) {
            if (error instanceof z.ZodError) {
                const details = error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                    code: err.code,
                    received: (err as any).received
                }));

                throw ApiError.badRequest('Validation failed', details);
            }
            throw error;
        }
    }

    /**
     * Safely validate data and return result with success flag
     */
    public static safeParse<T>(data: unknown, schema: z.ZodSchema<T>): {
        success: boolean;
        data?: T;
        errors?: Array<{
            field: string;
            message: string;
            code: string;
            received?: any;
        }>;
    } {
        const result = schema.safeParse(data);

        if (result.success) {
            return {
                success: true,
                data: result.data
            };
        }

        return {
            success: false,
            errors: result.error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message,
                code: err.code,
                received: (err as any).received
            }))
        };
    }

    /**
     * Validate partial data (useful for updates)
     */
    public static validatePartial<T>(data: unknown, schema: z.ZodSchema<T>): Partial<T> {
        if (schema instanceof z.ZodObject) {
            return this.validate(data, schema.partial()) as Partial<T>;
        }
        throw new Error('Partial validation is only supported for ZodObject schemas');
    }

    /**
     * Create validation middleware for Express
     */
    public static middleware<T>(schema: z.ZodSchema<T>, property: 'body' | 'query' | 'params' = 'body') {
        return (req: any, _res: any, next: any) => {
            try {
                req[property] = this.validate(req[property], schema);
                next();
            } catch (error) {
                next(error);
            }
        };
    }

    /**
     * Validate array of items
     */
    public static validateArray<T>(data: unknown, itemSchema: z.ZodSchema<T>): T[] {
        const arraySchema = z.array(itemSchema);
        return this.validate(data, arraySchema);
    }

    /**
     * Validate with custom error message
     */
    public static validateWithMessage<T>(
        data: unknown,
        schema: z.ZodSchema<T>,
        customMessage: string
    ): T {
        try {
            return schema.parse(data);
        } catch (error) {
            if (error instanceof z.ZodError) {
                throw ApiError.badRequest(customMessage, error.errors);
            }
            throw error;
        }
    }

    /**
     * Transform and validate data
     */
    public static transform<T, U>(
        data: T,
        schema: z.ZodSchema<U>
    ): U {
        return this.validate(data, schema);
    }

    /**
     * Validate environment variables
     */
    public static validateEnv<T>(schema: z.ZodSchema<T>): T {
        try {
            return schema.parse(process.env);
        } catch (error) {
            if (error instanceof z.ZodError) {
                const missingVars = error.errors.map(err => err.path.join('.')).join(', ');
                throw new Error(`Missing or invalid environment variables: ${missingVars}`);
            }
            throw error;
        }
    }
}