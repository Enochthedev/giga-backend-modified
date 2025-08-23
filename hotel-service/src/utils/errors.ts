export class ApiError extends Error {
    public statusCode: number;
    public code: string;
    public details?: any;

    constructor(statusCode: number, message: string, code?: string, details?: any) {
        super(message);
        this.statusCode = statusCode;
        this.code = code || 'UNKNOWN_ERROR';
        this.details = details;
        this.name = 'ApiError';
    }
}

export class ValidationError extends ApiError {
    constructor(message: string, details?: any) {
        super(400, message, 'VALIDATION_ERROR', details);
    }
}

export class NotFoundError extends ApiError {
    constructor(resource: string, id?: string) {
        const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
        super(404, message, 'NOT_FOUND');
    }
}

export class ConflictError extends ApiError {
    constructor(message: string, details?: any) {
        super(409, message, 'CONFLICT', details);
    }
}

export class UnauthorizedError extends ApiError {
    constructor(message: string = 'Unauthorized') {
        super(401, message, 'UNAUTHORIZED');
    }
}

export class ForbiddenError extends ApiError {
    constructor(message: string = 'Forbidden') {
        super(403, message, 'FORBIDDEN');
    }
}