import { z } from 'zod';
import { ZodValidator } from '../../validation/zod-validator';
import { ApiError } from '../../utils/api-error';

describe('ZodValidator', () => {
    const testSchema = z.object({
        name: z.string().min(2),
        age: z.number().min(0),
        email: z.string().email()
    });

    describe('validate', () => {
        it('should validate valid data successfully', () => {
            const validData = {
                name: 'John Doe',
                age: 30,
                email: 'john@example.com'
            };

            const result = ZodValidator.validate(validData, testSchema);
            expect(result).toEqual(validData);
        });

        it('should throw ApiError for invalid data', () => {
            const invalidData = {
                name: 'J',
                age: -5,
                email: 'invalid-email'
            };

            expect(() => ZodValidator.validate(invalidData, testSchema))
                .toThrow(ApiError);
        });
    });

    describe('safeParse', () => {
        it('should return success result for valid data', () => {
            const validData = {
                name: 'John Doe',
                age: 30,
                email: 'john@example.com'
            };

            const result = ZodValidator.safeParse(validData, testSchema);
            expect(result.success).toBe(true);
            expect(result.data).toEqual(validData);
            expect(result.errors).toBeUndefined();
        });

        it('should return error result for invalid data', () => {
            const invalidData = {
                name: 'J',
                age: -5,
                email: 'invalid-email'
            };

            const result = ZodValidator.safeParse(invalidData, testSchema);
            expect(result.success).toBe(false);
            expect(result.data).toBeUndefined();
            expect(result.errors).toBeDefined();
            expect(result.errors).toHaveLength(3);
        });
    });

    describe('validateArray', () => {
        it('should validate array of items successfully', () => {
            const itemSchema = z.object({
                id: z.number(),
                name: z.string()
            });

            const validArray = [
                { id: 1, name: 'Item 1' },
                { id: 2, name: 'Item 2' }
            ];

            const result = ZodValidator.validateArray(validArray, itemSchema);
            expect(result).toEqual(validArray);
        });

        it('should throw error for invalid array items', () => {
            const itemSchema = z.object({
                id: z.number(),
                name: z.string()
            });

            const invalidArray = [
                { id: 1, name: 'Item 1' },
                { id: 'invalid', name: 2 }
            ];

            expect(() => ZodValidator.validateArray(invalidArray, itemSchema))
                .toThrow(ApiError);
        });
    });

    describe('middleware', () => {
        it('should create validation middleware', () => {
            const middleware = ZodValidator.middleware(testSchema, 'body');
            expect(typeof middleware).toBe('function');
        });

        it('should validate request body in middleware', () => {
            const middleware = ZodValidator.middleware(testSchema, 'body');
            const req = {
                body: {
                    name: 'John Doe',
                    age: 30,
                    email: 'john@example.com'
                }
            };
            const res = {};
            const next = jest.fn();

            middleware(req, res, next);

            expect(next).toHaveBeenCalledWith();
            expect(req.body).toEqual({
                name: 'John Doe',
                age: 30,
                email: 'john@example.com'
            });
        });

        it('should call next with error for invalid data', () => {
            const middleware = ZodValidator.middleware(testSchema, 'body');
            const req = {
                body: {
                    name: 'J',
                    age: -5,
                    email: 'invalid-email'
                }
            };
            const res = {};
            const next = jest.fn();

            middleware(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(ApiError));
        });
    });
});