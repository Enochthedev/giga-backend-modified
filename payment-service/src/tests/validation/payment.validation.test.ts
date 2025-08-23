import {
    validateCreatePaymentIntent,
    validateProcessPayment,
    validateCreateRefund,
    validateCreatePaymentMethod,
    validateTransactionFilters,
    validateUUID
} from '../../validation/payment.validation';
import { ZodError } from 'zod';

describe('Payment Validation', () => {
    describe('validateCreatePaymentIntent', () => {
        it('should validate valid payment intent data', () => {
            const validData = {
                amount: 100.50,
                currency: 'USD',
                serviceName: 'ecommerce',
                serviceTransactionId: 'order-123',
                description: 'Test payment'
            };

            const result = validateCreatePaymentIntent(validData);
            expect(result).toEqual({
                ...validData,
                metadata: {}
            });
        });

        it('should throw validation error for invalid amount', () => {
            const invalidData = {
                amount: -10,
                serviceName: 'ecommerce',
                serviceTransactionId: 'order-123'
            };

            expect(() => validateCreatePaymentIntent(invalidData)).toThrow(ZodError);
        });

        it('should throw validation error for empty service name', () => {
            const invalidData = {
                amount: 100.50,
                serviceName: '',
                serviceTransactionId: 'order-123'
            };

            expect(() => validateCreatePaymentIntent(invalidData)).toThrow(ZodError);
        });

        it('should set default currency to USD', () => {
            const data = {
                amount: 100.50,
                serviceName: 'ecommerce',
                serviceTransactionId: 'order-123'
            };

            const result = validateCreatePaymentIntent(data);
            expect(result.currency).toBe('USD');
        });
    });

    describe('validateProcessPayment', () => {
        it('should validate valid process payment data', () => {
            const validData = {
                paymentIntentId: '123e4567-e89b-12d3-a456-426614174000',
                paymentMethodId: '123e4567-e89b-12d3-a456-426614174001'
            };

            const result = validateProcessPayment(validData);
            expect(result).toEqual(validData);
        });

        it('should throw validation error for invalid UUID', () => {
            const invalidData = {
                paymentIntentId: 'invalid-uuid',
                paymentMethodId: '123e4567-e89b-12d3-a456-426614174001'
            };

            expect(() => validateProcessPayment(invalidData)).toThrow(ZodError);
        });
    });

    describe('validateCreateRefund', () => {
        it('should validate valid refund data', () => {
            const validData = {
                transactionId: '123e4567-e89b-12d3-a456-426614174000',
                amount: 50.25,
                reason: 'Customer request'
            };

            const result = validateCreateRefund(validData);
            expect(result).toEqual({
                ...validData,
                metadata: {}
            });
        });

        it('should throw validation error for invalid amount', () => {
            const invalidData = {
                transactionId: '123e4567-e89b-12d3-a456-426614174000',
                amount: -10
            };

            expect(() => validateCreateRefund(invalidData)).toThrow(ZodError);
        });
    });

    describe('validateCreatePaymentMethod', () => {
        it('should validate valid payment method data', () => {
            const validData = {
                type: 'card' as const,
                provider: 'stripe' as const,
                isDefault: true
            };

            const result = validateCreatePaymentMethod(validData);
            expect(result).toEqual({
                ...validData,
                metadata: {}
            });
        });

        it('should set default provider to stripe', () => {
            const data = {
                type: 'card' as const
            };

            const result = validateCreatePaymentMethod(data);
            expect(result.provider).toBe('stripe');
            expect(result.isDefault).toBe(false);
        });

        it('should throw validation error for invalid type', () => {
            const invalidData = {
                type: 'invalid_type'
            };

            expect(() => validateCreatePaymentMethod(invalidData)).toThrow(ZodError);
        });
    });

    describe('validateTransactionFilters', () => {
        it('should validate and set defaults for pagination', () => {
            const data = {};

            const result = validateTransactionFilters(data);
            expect(result).toEqual({
                page: 1,
                limit: 20,
                sortOrder: 'desc'
            });
        });

        it('should validate filters with all parameters', () => {
            const data = {
                page: '2',
                limit: '50',
                status: 'succeeded',
                type: 'payment',
                provider: 'stripe',
                startDate: '2023-01-01',
                endDate: '2023-12-31'
            };

            const result = validateTransactionFilters(data);
            expect(result.page).toBe(2);
            expect(result.limit).toBe(50);
            expect(result.status).toBe('succeeded');
            expect(result.type).toBe('payment');
            expect(result.provider).toBe('stripe');
            expect(result.startDate).toBeInstanceOf(Date);
            expect(result.endDate).toBeInstanceOf(Date);
        });

        it('should enforce maximum limit', () => {
            const data = {
                limit: '200' // Above max of 100
            };

            expect(() => validateTransactionFilters(data)).toThrow();
        });
    });

    describe('validateUUID', () => {
        it('should validate valid UUID', () => {
            const validUUID = '123e4567-e89b-12d3-a456-426614174000';
            const result = validateUUID(validUUID);
            expect(result).toBe(validUUID);
        });

        it('should throw validation error for invalid UUID', () => {
            const invalidUUID = 'invalid-uuid';
            expect(() => validateUUID(invalidUUID)).toThrow(ZodError);
        });
    });
});