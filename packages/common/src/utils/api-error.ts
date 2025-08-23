/**
 * Custom API Error class for consistent error handling across services
 */
export class ApiError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly details?: any;
    public readonly isOperational: boolean;

    constructor(
        message: string,
        statusCode: number = 500,
        code: string = 'INTERNAL_ERROR',
        details?: any,
        isOperational: boolean = true
    ) {
        super(message);

        this.name = 'ApiError';
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.isOperational = isOperational;

        Error.captureStackTrace(this, this.constructor);
    }

    public static badRequest(message: string, details?: any): ApiError {
        return new ApiError(message, 400, 'BAD_REQUEST', details);
    }

    public static unauthorized(message: string = 'Unauthorized'): ApiError {
        return new ApiError(message, 401, 'UNAUTHORIZED');
    }

    public static forbidden(message: string = 'Forbidden'): ApiError {
        return new ApiError(message, 403, 'FORBIDDEN');
    }

    public static notFound(message: string = 'Resource not found'): ApiError {
        return new ApiError(message, 404, 'NOT_FOUND');
    }

    public static conflict(message: string, details?: any): ApiError {
        return new ApiError(message, 409, 'CONFLICT', details);
    }

    public static unprocessableEntity(message: string, details?: any): ApiError {
        return new ApiError(message, 422, 'UNPROCESSABLE_ENTITY', details);
    }

    public static tooManyRequests(message: string = 'Too many requests'): ApiError {
        return new ApiError(message, 429, 'TOO_MANY_REQUESTS');
    }

    public static internal(message: string = 'Internal server error', details?: any): ApiError {
        return new ApiError(message, 500, 'INTERNAL_ERROR', details);
    }

    public static serviceUnavailable(message: string = 'Service unavailable'): ApiError {
        return new ApiError(message, 503, 'SERVICE_UNAVAILABLE');
    }

    public static gatewayTimeout(message: string = 'Gateway timeout'): ApiError {
        return new ApiError(message, 504, 'GATEWAY_TIMEOUT');
    }
}