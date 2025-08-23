import { ApiResponse, PaginatedResponse } from '../types';

/**
 * Utility class for creating consistent API responses
 */
export class ApiResponseUtil {
    /**
     * Create a successful response
     */
    public static success<T>(
        data: T,
        message: string = 'Success',
        requestId?: string
    ): ApiResponse<T> {
        return {
            success: true,
            message,
            data,
            timestamp: new Date(),
            ...(requestId && { requestId })
        };
    }

    /**
     * Create an error response
     */
    public static error(
        message: string,
        error?: string,
        requestId?: string
    ): ApiResponse {
        return {
            success: false,
            message,
            ...(error && { error }),
            timestamp: new Date(),
            ...(requestId && { requestId })
        };
    }

    /**
     * Create a paginated response
     */
    public static paginated<T>(
        data: T[],
        page: number,
        limit: number,
        total: number,
        message: string = 'Success',
        requestId?: string
    ): PaginatedResponse<T> {
        const totalPages = Math.ceil(total / limit);

        return {
            success: true,
            message,
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages
            },
            timestamp: new Date(),
            ...(requestId && { requestId })
        };
    }

    /**
     * Create a response for created resources
     */
    public static created<T>(
        data: T,
        message: string = 'Resource created successfully',
        requestId?: string
    ): ApiResponse<T> {
        return {
            success: true,
            message,
            data,
            timestamp: new Date(),
            ...(requestId && { requestId })
        };
    }

    /**
     * Create a response for updated resources
     */
    public static updated<T>(
        data: T,
        message: string = 'Resource updated successfully',
        requestId?: string
    ): ApiResponse<T> {
        return {
            success: true,
            message,
            data,
            timestamp: new Date(),
            ...(requestId && { requestId })
        };
    }

    /**
     * Create a response for deleted resources
     */
    public static deleted(
        message: string = 'Resource deleted successfully',
        requestId?: string
    ): ApiResponse {
        return {
            success: true,
            message,
            timestamp: new Date(),
            ...(requestId && { requestId })
        };
    }
}