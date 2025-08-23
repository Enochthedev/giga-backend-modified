import { Response } from 'express';

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
    meta?: {
        timestamp: string;
        requestId?: string;
        took?: number;
    };
}

export class ResponseHelper {
    /**
     * Send success response
     */
    static success<T>(
        res: Response,
        data: T,
        message?: string,
        statusCode: number = 200,
        meta?: any
    ): Response {
        const response: ApiResponse<T> = {
            success: true,
            data,
            message,
            meta: {
                timestamp: new Date().toISOString(),
                ...meta
            }
        };

        return res.status(statusCode).json(response);
    }

    /**
     * Send error response
     */
    static error(
        res: Response,
        message: string,
        statusCode: number = 500,
        code: string = 'INTERNAL_ERROR',
        details?: any
    ): Response {
        const response: ApiResponse = {
            success: false,
            error: {
                code,
                message,
                details
            },
            meta: {
                timestamp: new Date().toISOString()
            }
        };

        return res.status(statusCode).json(response);
    }

    /**
     * Send validation error response
     */
    static validationError(
        res: Response,
        message: string,
        details?: any
    ): Response {
        return this.error(res, message, 400, 'VALIDATION_ERROR', details);
    }

    /**
     * Send not found response
     */
    static notFound(
        res: Response,
        message: string = 'Resource not found'
    ): Response {
        return this.error(res, message, 404, 'NOT_FOUND');
    }

    /**
     * Send unauthorized response
     */
    static unauthorized(
        res: Response,
        message: string = 'Unauthorized access'
    ): Response {
        return this.error(res, message, 401, 'UNAUTHORIZED');
    }

    /**
     * Send forbidden response
     */
    static forbidden(
        res: Response,
        message: string = 'Forbidden access'
    ): Response {
        return this.error(res, message, 403, 'FORBIDDEN');
    }
}