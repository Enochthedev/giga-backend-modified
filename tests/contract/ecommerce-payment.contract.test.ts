import { Pact } from '@pact-foundation/pact';
import { like, eachLike } from '@pact-foundation/pact/dsl/matchers';
import path from 'path';
import axios from 'axios';

describe('Ecommerce Service - Payment Service Contract', () => {
    let provider: Pact;

    beforeAll(() => {
        provider = new Pact({
            consumer: 'EcommerceService',
            provider: 'PaymentService',
            port: 1235,
            log: path.resolve(process.cwd(), 'tests/logs', 'pact.log'),
            dir: path.resolve(process.cwd(), 'tests/pacts'),
            logLevel: 'INFO',
        });

        return provider.setup();
    });

    afterAll(() => {
        return provider.finalize();
    });

    afterEach(() => {
        return provider.verify();
    });

    describe('Payment Processing', () => {
        it('should process payment for order', async () => {
            const paymentRequest = {
                orderId: like('order-123'),
                amount: like(2999), // $29.99 in cents
                currency: like('USD'),
                customerId: like('customer-123'),
                paymentMethodId: like('pm_card_123'),
            };

            const expectedResponse = {
                paymentId: like('payment-123'),
                status: like('succeeded'),
                amount: like(2999),
                currency: like('USD'),
                orderId: like('order-123'),
                createdAt: like('2023-01-01T00:00:00Z'),
            };

            await provider.addInteraction({
                state: 'payment can be processed',
                uponReceiving: 'a request to process payment',
                withRequest: {
                    method: 'POST',
                    path: '/payments/process',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': like('Bearer service-token'),
                    },
                    body: paymentRequest,
                },
                willRespondWith: {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: {
                        success: true,
                        payment: expectedResponse,
                    },
                },
            });

            const response = await axios.post(
                'http://localhost:1235/payments/process',
                {
                    orderId: 'order-123',
                    amount: 2999,
                    currency: 'USD',
                    customerId: 'customer-123',
                    paymentMethodId: 'pm_card_123',
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer service-token',
                    },
                }
            );

            expect(response.status).toBe(200);
            expect(response.data.success).toBe(true);
            expect(response.data.payment).toHaveProperty('paymentId');
            expect(response.data.payment).toHaveProperty('status');
            expect(response.data.payment.amount).toBe(2999);
        });

        it('should handle payment failure', async () => {
            await provider.addInteraction({
                state: 'payment fails due to insufficient funds',
                uponReceiving: 'a request to process payment with insufficient funds',
                withRequest: {
                    method: 'POST',
                    path: '/payments/process',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': like('Bearer service-token'),
                    },
                    body: {
                        orderId: like('order-456'),
                        amount: like(10000),
                        currency: like('USD'),
                        customerId: like('customer-123'),
                        paymentMethodId: like('pm_card_declined'),
                    },
                },
                willRespondWith: {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: {
                        success: false,
                        error: like('Payment failed: Insufficient funds'),
                        code: like('insufficient_funds'),
                    },
                },
            });

            try {
                await axios.post(
                    'http://localhost:1235/payments/process',
                    {
                        orderId: 'order-456',
                        amount: 10000,
                        currency: 'USD',
                        customerId: 'customer-123',
                        paymentMethodId: 'pm_card_declined',
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer service-token',
                        },
                    }
                );
            } catch (error: any) {
                expect(error.response.status).toBe(400);
                expect(error.response.data.success).toBe(false);
                expect(error.response.data.error).toContain('Payment failed');
                expect(error.response.data.code).toBe('insufficient_funds');
            }
        });
    });

    describe('Refund Processing', () => {
        it('should process refund for order', async () => {
            await provider.addInteraction({
                state: 'payment exists and can be refunded',
                uponReceiving: 'a request to process refund',
                withRequest: {
                    method: 'POST',
                    path: '/payments/refund',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': like('Bearer service-token'),
                    },
                    body: {
                        paymentId: like('payment-123'),
                        amount: like(2999),
                        reason: like('requested_by_customer'),
                        orderId: like('order-123'),
                    },
                },
                willRespondWith: {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: {
                        success: true,
                        refund: {
                            refundId: like('refund-123'),
                            status: like('succeeded'),
                            amount: like(2999),
                            paymentId: like('payment-123'),
                            createdAt: like('2023-01-01T00:00:00Z'),
                        },
                    },
                },
            });

            const response = await axios.post(
                'http://localhost:1235/payments/refund',
                {
                    paymentId: 'payment-123',
                    amount: 2999,
                    reason: 'requested_by_customer',
                    orderId: 'order-123',
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer service-token',
                    },
                }
            );

            expect(response.status).toBe(200);
            expect(response.data.success).toBe(true);
            expect(response.data.refund).toHaveProperty('refundId');
            expect(response.data.refund.status).toBe('succeeded');
        });
    });

    describe('Payment Status', () => {
        it('should get payment status', async () => {
            await provider.addInteraction({
                state: 'payment exists',
                uponReceiving: 'a request to get payment status',
                withRequest: {
                    method: 'GET',
                    path: '/payments/payment-123/status',
                    headers: {
                        'Authorization': like('Bearer service-token'),
                    },
                },
                willRespondWith: {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: {
                        success: true,
                        payment: {
                            id: like('payment-123'),
                            status: like('succeeded'),
                            amount: like(2999),
                            currency: like('USD'),
                            orderId: like('order-123'),
                            createdAt: like('2023-01-01T00:00:00Z'),
                            updatedAt: like('2023-01-01T00:00:00Z'),
                        },
                    },
                },
            });

            const response = await axios.get(
                'http://localhost:1235/payments/payment-123/status',
                {
                    headers: {
                        'Authorization': 'Bearer service-token',
                    },
                }
            );

            expect(response.status).toBe(200);
            expect(response.data.success).toBe(true);
            expect(response.data.payment.id).toBe('payment-123');
            expect(response.data.payment.status).toBe('succeeded');
        });
    });
});