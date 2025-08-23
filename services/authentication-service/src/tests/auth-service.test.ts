import { AuthService } from '../services/auth-service';
import { UserModel } from '../models/user-model';
import { RefreshTokenModel } from '../models/refresh-token-model';
import { ApiError } from '@giga/common';

// Mock dependencies
jest.mock('../models/user-model');
jest.mock('../models/refresh-token-model');
jest.mock('@giga/common');

const mockUserModel = UserModel as jest.Mocked<typeof UserModel>;
const mockRefreshTokenModel = RefreshTokenModel as jest.Mocked<typeof RefreshTokenModel>;

describe('AuthService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('register', () => {
        const mockUserData = {
            email: 'test@example.com',
            password: 'Password123!',
            firstName: 'John',
            lastName: 'Doe'
        };

        const mockUser = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe',
            phone: null,
            dateOfBirth: null,
            isActive: true,
            isVerified: false,
            lastLoginAt: null,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        it('should register a new user successfully', async () => {
            // Mock UserModel.create
            mockUserModel.create.mockResolvedValue(mockUser);

            // Mock UserModel.findByIdWithRoles for token generation
            mockUserModel.findByIdWithRoles.mockResolvedValue({
                ...mockUser,
                roles: [{
                    id: 'role-id',
                    name: 'user',
                    permissions: []
                }]
            });

            // Mock RefreshTokenModel.create
            mockRefreshTokenModel.create.mockResolvedValue({
                id: 'token-id',
                userId: mockUser.id,
                tokenHash: 'hashed-token',
                expiresAt: new Date(),
                isRevoked: false,
                createdAt: new Date()
            });

            const result = await AuthService.register(mockUserData);

            expect(result.user).toEqual(mockUser);
            expect(result.tokens).toHaveProperty('accessToken');
            expect(result.tokens).toHaveProperty('refreshToken');
            expect(result.tokens).toHaveProperty('expiresIn');
            expect(mockUserModel.create).toHaveBeenCalledWith(mockUserData);
        });

        it('should throw error for invalid email', async () => {
            const invalidUserData = {
                ...mockUserData,
                email: 'invalid-email'
            };

            await expect(AuthService.register(invalidUserData))
                .rejects
                .toThrow('Invalid email format');
        });

        it('should throw error for weak password', async () => {
            const weakPasswordData = {
                ...mockUserData,
                password: 'weak'
            };

            await expect(AuthService.register(weakPasswordData))
                .rejects
                .toThrow('Password must be at least 8 characters long');
        });
    });

    describe('login', () => {
        const mockCredentials = {
            email: 'test@example.com',
            password: 'Password123!'
        };

        const mockUserWithPassword = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe',
            phone: null,
            dateOfBirth: null,
            isActive: true,
            isVerified: true,
            lastLoginAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            passwordHash: 'hashed-password'
        };

        it('should login user successfully', async () => {
            // Mock UserModel.findByEmailWithPassword
            mockUserModel.findByEmailWithPassword.mockResolvedValue(mockUserWithPassword);

            // Mock UserModel.verifyPassword
            mockUserModel.verifyPassword.mockResolvedValue(true);

            // Mock UserModel.updateLastLogin
            mockUserModel.updateLastLogin.mockResolvedValue();

            // Mock UserModel.findByIdWithRoles for token generation
            mockUserModel.findByIdWithRoles.mockResolvedValue({
                ...mockUserWithPassword,
                roles: [{
                    id: 'role-id',
                    name: 'user',
                    permissions: []
                }]
            });

            // Mock RefreshTokenModel.create
            mockRefreshTokenModel.create.mockResolvedValue({
                id: 'token-id',
                userId: mockUserWithPassword.id,
                tokenHash: 'hashed-token',
                expiresAt: new Date(),
                isRevoked: false,
                createdAt: new Date()
            });

            const result = await AuthService.login(mockCredentials);

            expect(result.user.email).toBe(mockCredentials.email);
            expect(result.tokens).toHaveProperty('accessToken');
            expect(result.tokens).toHaveProperty('refreshToken');
            expect(mockUserModel.findByEmailWithPassword).toHaveBeenCalledWith(mockCredentials.email);
            expect(mockUserModel.verifyPassword).toHaveBeenCalledWith(mockCredentials.password, mockUserWithPassword.passwordHash);
            expect(mockUserModel.updateLastLogin).toHaveBeenCalledWith(mockUserWithPassword.id);
        });

        it('should throw error for non-existent user', async () => {
            mockUserModel.findByEmailWithPassword.mockResolvedValue(null);

            await expect(AuthService.login(mockCredentials))
                .rejects
                .toThrow('Invalid email or password');
        });

        it('should throw error for invalid password', async () => {
            mockUserModel.findByEmailWithPassword.mockResolvedValue(mockUserWithPassword);
            mockUserModel.verifyPassword.mockResolvedValue(false);

            await expect(AuthService.login(mockCredentials))
                .rejects
                .toThrow('Invalid email or password');
        });
    });

    describe('refreshToken', () => {
        const mockRefreshToken = 'valid-refresh-token';
        const mockTokenData = {
            id: 'token-id',
            userId: '123e4567-e89b-12d3-a456-426614174000',
            tokenHash: 'hashed-token',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            isRevoked: false,
            createdAt: new Date()
        };

        it('should refresh token successfully', async () => {
            // Mock RefreshTokenModel.findByToken
            mockRefreshTokenModel.findByToken.mockResolvedValue(mockTokenData);

            // Mock UserModel.findByIdWithRoles for token generation
            mockUserModel.findByIdWithRoles.mockResolvedValue({
                id: mockTokenData.userId,
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe',
                phone: null,
                dateOfBirth: null,
                isActive: true,
                isVerified: true,
                lastLoginAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                roles: [{
                    id: 'role-id',
                    name: 'user',
                    permissions: []
                }]
            });

            // Mock RefreshTokenModel.create for new token
            mockRefreshTokenModel.create.mockResolvedValue({
                ...mockTokenData,
                id: 'new-token-id'
            });

            // Mock RefreshTokenModel.revoke for old token
            mockRefreshTokenModel.revoke.mockResolvedValue();

            const result = await AuthService.refreshToken(mockRefreshToken);

            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
            expect(result).toHaveProperty('expiresIn');
            expect(mockRefreshTokenModel.findByToken).toHaveBeenCalledWith(mockRefreshToken);
            expect(mockRefreshTokenModel.revoke).toHaveBeenCalledWith(mockTokenData.id);
        });

        it('should throw error for invalid refresh token', async () => {
            mockRefreshTokenModel.findByToken.mockResolvedValue(null);

            await expect(AuthService.refreshToken(mockRefreshToken))
                .rejects
                .toThrow('Invalid or expired refresh token');
        });

        it('should throw error for expired refresh token', async () => {
            const expiredTokenData = {
                ...mockTokenData,
                expiresAt: new Date(Date.now() - 1000) // 1 second ago
            };

            mockRefreshTokenModel.findByToken.mockResolvedValue(expiredTokenData);

            await expect(AuthService.refreshToken(mockRefreshToken))
                .rejects
                .toThrow('Invalid or expired refresh token');
        });

        it('should throw error for revoked refresh token', async () => {
            const revokedTokenData = {
                ...mockTokenData,
                isRevoked: true
            };

            mockRefreshTokenModel.findByToken.mockResolvedValue(revokedTokenData);

            await expect(AuthService.refreshToken(mockRefreshToken))
                .rejects
                .toThrow('Invalid or expired refresh token');
        });
    });

    describe('logout', () => {
        const mockRefreshToken = 'valid-refresh-token';
        const mockTokenData = {
            id: 'token-id',
            userId: '123e4567-e89b-12d3-a456-426614174000',
            tokenHash: 'hashed-token',
            expiresAt: new Date(),
            isRevoked: false,
            createdAt: new Date()
        };

        it('should logout successfully', async () => {
            mockRefreshTokenModel.findByToken.mockResolvedValue(mockTokenData);
            mockRefreshTokenModel.revoke.mockResolvedValue();

            await AuthService.logout(mockRefreshToken);

            expect(mockRefreshTokenModel.findByToken).toHaveBeenCalledWith(mockRefreshToken);
            expect(mockRefreshTokenModel.revoke).toHaveBeenCalledWith(mockTokenData.id);
        });

        it('should not throw error for non-existent token', async () => {
            mockRefreshTokenModel.findByToken.mockResolvedValue(null);

            await expect(AuthService.logout(mockRefreshToken)).resolves.not.toThrow();
        });
    });

    describe('changePassword', () => {
        const userId = '123e4567-e89b-12d3-a456-426614174000';
        const currentPassword = 'OldPassword123!';
        const newPassword = 'NewPassword123!';

        const mockUser = {
            id: userId,
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe',
            phone: null,
            dateOfBirth: null,
            isActive: true,
            isVerified: true,
            lastLoginAt: null,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const mockUserWithPassword = {
            ...mockUser,
            passwordHash: 'hashed-old-password'
        };

        it('should change password successfully', async () => {
            mockUserModel.findById.mockResolvedValue(mockUser);
            mockUserModel.findByEmailWithPassword.mockResolvedValue(mockUserWithPassword);
            mockUserModel.verifyPassword.mockResolvedValue(true);
            mockUserModel.updatePassword.mockResolvedValue();
            mockRefreshTokenModel.revokeAllForUser.mockResolvedValue();

            await AuthService.changePassword(userId, currentPassword, newPassword);

            expect(mockUserModel.findById).toHaveBeenCalledWith(userId);
            expect(mockUserModel.verifyPassword).toHaveBeenCalledWith(currentPassword, mockUserWithPassword.passwordHash);
            expect(mockUserModel.updatePassword).toHaveBeenCalledWith(userId, newPassword);
            expect(mockRefreshTokenModel.revokeAllForUser).toHaveBeenCalledWith(userId);
        });

        it('should throw error for non-existent user', async () => {
            mockUserModel.findById.mockResolvedValue(null);

            await expect(AuthService.changePassword(userId, currentPassword, newPassword))
                .rejects
                .toThrow('User not found');
        });

        it('should throw error for incorrect current password', async () => {
            mockUserModel.findById.mockResolvedValue(mockUser);
            mockUserModel.findByEmailWithPassword.mockResolvedValue(mockUserWithPassword);
            mockUserModel.verifyPassword.mockResolvedValue(false);

            await expect(AuthService.changePassword(userId, currentPassword, newPassword))
                .rejects
                .toThrow('Current password is incorrect');
        });

        it('should throw error for weak new password', async () => {
            const weakNewPassword = 'weak';

            await expect(AuthService.changePassword(userId, currentPassword, weakNewPassword))
                .rejects
                .toThrow('New password must be at least 8 characters long');
        });
    });
});