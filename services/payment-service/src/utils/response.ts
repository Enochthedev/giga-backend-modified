import { Response } from 'express';
import { PaymentResponse } from '../types/payment.types';
import { logger } from './logger';

export function sendSuccess(res: Response, data: any, statusCode: number = 200): void {
    const response: PaymentResponse = {
        success: true,
        data
    };
    res.status(statusCode).json(response);
}

export function sendError(res: Response, error: string, code?: string, statusCode: number = 400, details?: any): void {
    const response: PaymentResponse = {
        success: false,
        error,
        code
    };

    // Log error for debugging
    logger.error('API Error Response', {
        error,
        code,
        statusCode,
        details
    });

    res.status(statusCode).json(response);
}

export function sendValidationError(res: Response, errors: any): void {
    sendError(res, 'Validation failed', 'VALIDATION_ERROR', 400, errors);
}

export function sendNotFound(res: Response, resource: string): void {
    sendError(res, `${resource} not found`, 'NOT_FOUND', 404);
}

export function sendUnauthorized(res: Response, message: string = 'Unauthorized'): void {
    sendError(res, message, 'UNAUTHORIZED', 401);
}

export function sendForbidden(res: Response, message: string = 'Forbidden'): void {
    sendError(res, message, 'FORBIDDEN', 403);
}

export function sendInternalError(res: Response, message: string = 'Internal server error'): void {
    sendError(res, message, 'INTERNAL_ERROR', 500);
}