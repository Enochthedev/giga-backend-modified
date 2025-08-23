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
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export const successResponse = <T>(
    res: Response,
    data: T,
    message?: string,
    statusCode: number = 200,
    pagination?: ApiResponse['pagination']
): Response => {
    const response: ApiResponse<T> = {
        success: true,
        data,
        message,
        pagination
    };
    return res.status(statusCode).json(response);
};

export const errorResponse = (
    res: Response,
    statusCode: number,
    message: string,
    code?: string,
    details?: any
): Response => {
    const response: ApiResponse = {
        success: false,
        error: {
            code: code || 'UNKNOWN_ERROR',
            message,
            details
        }
    };
    return res.status(statusCode).json(response);
};