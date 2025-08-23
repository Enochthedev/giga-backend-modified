import { ApiError } from '../utils/api-error';

describe('ApiError', () => {
    it('should create a basic API error', () => {
        const error = new ApiError('Test error', 400, 'TEST_ERROR');

        expect(error.message).toBe('Test error');
        expect(error.statusCode).toBe(400);
        expect(error.code).toBe('TEST_ERROR');
        expect(error.isOperational).toBe(true);
    });

    it('should create a bad request error', () => {
        const error = ApiError.badRequest('Invalid input');

        expect(error.message).toBe('Invalid input');
        expect(error.statusCode).toBe(400);
        expect(error.code).toBe('BAD_REQUEST');
    });

    it('should create an unauthorized error', () => {
        const error = ApiError.unauthorized();

        expect(error.message).toBe('Unauthorized');
        expect(error.statusCode).toBe(401);
        expect(error.code).toBe('UNAUTHORIZED');
    });

    it('should create a not found error', () => {
        const error = ApiError.notFound();

        expect(error.message).toBe('Resource not found');
        expect(error.statusCode).toBe(404);
        expect(error.code).toBe('NOT_FOUND');
    });

    it('should create an internal server error', () => {
        const error = ApiError.internal();

        expect(error.message).toBe('Internal server error');
        expect(error.statusCode).toBe(500);
        expect(error.code).toBe('INTERNAL_ERROR');
    });
});