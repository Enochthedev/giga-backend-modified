import { Pact } from '@pact-foundation/pact';
import { like, eachLike } from '@pact-foundation/pact/dsl/matchers';
import path from 'path';
import axios from 'axios';

describe('Payment Service - Authentication Service Contract', () => {
    let provider: Pact;

    beforeAll(() => {
        provider = new Pact({
            consumer: 'PaymentService',
            provider: 'AuthenticationService',
            port: 1234,
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

    describe('User Validation', () => {
        it('should validate user token and return user details', async () => {
            // Arrange
            const expectedUser = {
                id: like('user-123'),
                email: like('user@example.com'),
                role: like('user'),
                isActive: like(true),
            };

            await provider.addInteraction({
                state: 'user exists with valid token',
                uponReceiving: 'a request to validate user token',
                withRequest: {
                    method: 'GET',
                    path: '/auth/validate',
                    headers: {
                        'Authorization': like('Bearer valid-jwt-token'),
                        'Content-Type': 'application/json',
                    },
                },
                willRespondWith: {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: {
                        success: true,
                        user: expectedUser,
                    },
                },
            });

            // Act
            const response = await axios.get('http://localhost:1234/auth/validate', {
                headers: {
                    'Authorization': 'Bearer valid-jwt-token',
                    'Content-Type': 'application/json',
                },
            });

            // Assert
            expect(response.status).toBe(200);
            expect(response.data.success).toBe(true);
            expect(response.data.user).toHaveProperty('id');
            expect(response.data.user).toHaveProperty('email');
            expect(response.data.user).toHaveProperty('role');
        });

        it('should reject invalid token', async () => {
            await provider.addInteraction({
                state: 'invalid token provided',
                uponReceiving: 'a request with invalid token',
                withRequest: {
                    method: 'GET',
                    path: '/auth/validate',
                    headers: {
                        'Authorization': like('Bearer invalid-token'),
                        'Content-Type': 'application/json',
                    },
                },
                willRespondWith: {
                    status: 401,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: {
                        success: false,
                        error: like('Invalid token'),
                    },
                },
            });

            try {
                await axios.get('http://localhost:1234/auth/validate', {
                    headers: {
                        'Authorization': 'Bearer invalid-token',
                        'Content-Type': 'application/json',
                    },
                });
            } catch (error: any) {
                expect(error.response.status).toBe(401);
                expect(error.response.data.success).toBe(false);
                expect(error.response.data.error).toBeDefined();
            }
        });
    });

    describe('User Permissions', () => {
        it('should check user permissions for payment operations', async () => {
            await provider.addInteraction({
                state: 'user has payment permissions',
                uponReceiving: 'a request to check payment permissions',
                withRequest: {
                    method: 'POST',
                    path: '/auth/permissions/check',
                    headers: {
                        'Authorization': like('Bearer valid-jwt-token'),
                        'Content-Type': 'application/json',
                    },
                    body: {
                        permissions: eachLike('payment:process'),
                    },
                },
                willRespondWith: {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: {
                        success: true,
                        permissions: {
                            'payment:process': true,
                            'payment:refund': like(true),
                            'payment:view': like(true),
                        },
                    },
                },
            });

            const response = await axios.post(
                'http://localhost:1234/auth/permissions/check',
                {
                    permissions: ['payment:process'],
                },
                {
                    headers: {
                        'Authorization': 'Bearer valid-jwt-token',
                        'Content-Type': 'application/json',
                    },
                }
            );

            expect(response.status).toBe(200);
            expect(response.data.success).toBe(true);
            expect(response.data.permissions).toHaveProperty('payment:process', true);
        });
    });
});