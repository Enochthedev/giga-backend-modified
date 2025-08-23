import jwt from 'jsonwebtoken';
import { AuthMiddleware, AuthenticatedRequest } from '../../middleware/auth-middleware';
import { ApiError } from '../../utils/api-error';

describe('AuthMiddleware', () => {
    const mockSecret = 'test-secret';
    const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        roles: ['user'],
        permissions: ['read']
    };

    beforeAll(() => {
        AuthMiddleware.setJwtSecret(mockSecret);
    });

    describe('authenticate', () => {
        it('should authenticate valid token', () => {
            const token = jwt.sign(mockUser, mockSecret);
            const req = {
                headers: {
                    authorization: `Bearer ${token}`
                }
            } as AuthenticatedRequest;
            const res = {} as any;
            const next = jest.fn();

            const middleware = AuthMiddleware.authenticate();
            middleware(req, res, next);

            expect(req.user).toEqual(mockUser);
            expect(next).toHaveBeenCalledWith();
        });

        it('should reject request without authorization header', () => {
            const req = {
                headers: {}
            } as AuthenticatedRequest;
            const res = {} as any;
            const next = jest.fn();

            const middleware = AuthMiddleware.authenticate();
            middleware(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(ApiError));
            expect(next.mock.calls[0][0].statusCode).toBe(401);
        });

        it('should reject invalid token', () => {
            const req = {
                headers: {
                    authorization: 'Bearer invalid-token'
                }
            } as AuthenticatedRequest;
            const res = {} as any;
            const next = jest.fn();

            const middleware = AuthMiddleware.authenticate();
            middleware(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(ApiError));
            expect(next.mock.calls[0][0].statusCode).toBe(401);
        });
    });

    describe('requireRoles', () => {
        it('should allow user with required role', () => {
            const req = {
                user: { ...mockUser, roles: ['admin', 'user'] }
            } as AuthenticatedRequest;
            const res = {} as any;
            const next = jest.fn();

            const middleware = AuthMiddleware.requireRoles('admin');
            middleware(req, res, next);

            expect(next).toHaveBeenCalledWith();
        });

        it('should reject user without required role', () => {
            const req = {
                user: { ...mockUser, roles: ['user'] }
            } as AuthenticatedRequest;
            const res = {} as any;
            const next = jest.fn();

            const middleware = AuthMiddleware.requireRoles('admin');
            middleware(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(ApiError));
            expect(next.mock.calls[0][0].statusCode).toBe(403);
        });

        it('should reject unauthenticated user', () => {
            const req = {} as AuthenticatedRequest;
            const res = {} as any;
            const next = jest.fn();

            const middleware = AuthMiddleware.requireRoles('admin');
            middleware(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(ApiError));
            expect(next.mock.calls[0][0].statusCode).toBe(401);
        });
    });

    describe('requirePermissions', () => {
        it('should allow user with required permissions', () => {
            const req = {
                user: { ...mockUser, permissions: ['read', 'write'] }
            } as AuthenticatedRequest;
            const res = {} as any;
            const next = jest.fn();

            const middleware = AuthMiddleware.requirePermissions('read', 'write');
            middleware(req, res, next);

            expect(next).toHaveBeenCalledWith();
        });

        it('should reject user without all required permissions', () => {
            const req = {
                user: { ...mockUser, permissions: ['read'] }
            } as AuthenticatedRequest;
            const res = {} as any;
            const next = jest.fn();

            const middleware = AuthMiddleware.requirePermissions('read', 'write');
            middleware(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(ApiError));
            expect(next.mock.calls[0][0].statusCode).toBe(403);
        });
    });

    describe('generateToken', () => {
        it('should generate valid JWT token', () => {
            const token = AuthMiddleware.generateToken(mockUser);
            const decoded = jwt.verify(token, mockSecret) as any;

            expect(decoded.id).toBe(mockUser.id);
            expect(decoded.email).toBe(mockUser.email);
        });
    });

    describe('verifyToken', () => {
        it('should verify valid token', () => {
            const token = jwt.sign(mockUser, mockSecret);
            const decoded = AuthMiddleware.verifyToken(token);

            expect(decoded.id).toBe(mockUser.id);
            expect(decoded.email).toBe(mockUser.email);
        });

        it('should throw error for invalid token', () => {
            expect(() => AuthMiddleware.verifyToken('invalid-token'))
                .toThrow();
        });
    });
});