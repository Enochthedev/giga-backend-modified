import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { ApiError, Logger } from '@giga/common';
import { UserModel, User, CreateUserData } from '../models/user-model';
import { RefreshTokenModel } from '../models/refresh-token-model';

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

export interface JwtPayload {
    userId: string;
    email: string;
    roles: string[];
    permissions: string[];
    iat: number;
    exp: number;
}

/**
 * Authentication service for user login, registration, and token management
 */
export class AuthService {
    private static jwtSecret: string = process.env['JWT_SECRET'] || 'default-secret';
    private static jwtExpiresIn: string = process.env['JWT_EXPIRES_IN'] || '24h';
    private static refreshExpiresIn: string = process.env['JWT_REFRESH_EXPIRES_IN'] || '7d';

    /**
     * Register a new user
     */
    public static async register(userData: CreateUserData): Promise<{ user: User; tokens: AuthTokens }> {
        try {
            // Validate email format
            if (!this.isValidEmail(userData.email)) {
                throw ApiError.badRequest('Invalid email format');
            }

            // Validate password strength
            if (!this.isValidPassword(userData.password)) {
                throw ApiError.badRequest(
                    'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'
                );
            }

            // Create user
            const user = await UserModel.create(userData);

            // Generate tokens
            const tokens = await this.generateTokens(user.id);

            Logger.info('User registered successfully', {
                userId: user.id,
                email: user.email
            });

            return { user, tokens };
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            Logger.error('Registration failed', error as Error);
            throw ApiError.internal('Registration failed');
        }
    }

    /**
     * Login user with email and password
     */
    public static async login(credentials: LoginCredentials, deviceInfo?: any): Promise<{ user: User; tokens: AuthTokens }> {
        try {
            // Find user with password
            const userWithPassword = await UserModel.findByEmailWithPassword(credentials.email);
            if (!userWithPassword) {
                throw ApiError.unauthorized('Invalid email or password');
            }

            // Verify password
            const isPasswordValid = await UserModel.verifyPassword(
                credentials.password,
                userWithPassword.passwordHash
            );

            if (!isPasswordValid) {
                throw ApiError.unauthorized('Invalid email or password');
            }

            // Check if user is verified (optional - can be disabled for development)
            if (process.env['NODE_ENV'] === 'production' && !userWithPassword.isVerified) {
                throw ApiError.unauthorized('Please verify your email before logging in');
            }

            // Update last login
            await UserModel.updateLastLogin(userWithPassword.id);

            // Generate tokens
            const tokens = await this.generateTokens(userWithPassword.id, deviceInfo);

            const { passwordHash, ...user } = userWithPassword;

            Logger.info('User logged in successfully', {
                userId: user.id,
                email: user.email
            });

            return { user, tokens };
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            Logger.error('Login failed', error as Error);
            throw ApiError.internal('Login failed');
        }
    }

    /**
     * Refresh access token using refresh token
     */
    public static async refreshToken(refreshToken: string): Promise<AuthTokens> {
        try {
            // Verify refresh token
            const tokenData = await RefreshTokenModel.findByToken(refreshToken);
            if (!tokenData || tokenData.isRevoked || tokenData.expiresAt < new Date()) {
                throw ApiError.unauthorized('Invalid or expired refresh token');
            }

            // Generate new tokens
            const tokens = await this.generateTokens(tokenData.userId);

            // Revoke old refresh token
            await RefreshTokenModel.revoke(tokenData.id);

            Logger.info('Token refreshed successfully', {
                userId: tokenData.userId
            });

            return tokens;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            Logger.error('Token refresh failed', error as Error);
            throw ApiError.internal('Token refresh failed');
        }
    }

    /**
     * Logout user by revoking refresh token
     */
    public static async logout(refreshToken: string): Promise<void> {
        try {
            const tokenData = await RefreshTokenModel.findByToken(refreshToken);
            if (tokenData) {
                await RefreshTokenModel.revoke(tokenData.id);

                Logger.info('User logged out successfully', {
                    userId: tokenData.userId
                });
            }
        } catch (error) {
            Logger.error('Logout failed', error as Error);
            // Don't throw error for logout failure
        }
    }

    /**
     * Logout from all devices by revoking all refresh tokens
     */
    public static async logoutAll(userId: string): Promise<void> {
        try {
            await RefreshTokenModel.revokeAllForUser(userId);

            Logger.info('User logged out from all devices', {
                userId
            });
        } catch (error) {
            Logger.error('Logout all failed', error as Error);
            throw ApiError.internal('Logout all failed');
        }
    }

    /**
     * Verify JWT access token
     */
    public static async verifyAccessToken(token: string): Promise<JwtPayload> {
        try {
            const decoded = jwt.verify(token, this.jwtSecret) as any;

            // Verify user still exists and is active
            const user = await UserModel.findById(decoded.userId);
            if (!user) {
                throw ApiError.unauthorized('User not found');
            }

            return {
                userId: decoded.userId,
                email: decoded.email,
                roles: decoded.roles || [],
                permissions: decoded.permissions || [],
                iat: decoded.iat,
                exp: decoded.exp
            };
        } catch (error) {
            if (error instanceof jwt.JsonWebTokenError) {
                throw ApiError.unauthorized('Invalid token');
            }
            if (error instanceof jwt.TokenExpiredError) {
                throw ApiError.unauthorized('Token expired');
            }
            throw error;
        }
    }

    /**
     * Generate access and refresh tokens
     */
    private static async generateTokens(userId: string, deviceInfo?: any): Promise<AuthTokens> {
        try {
            // Get user with roles and permissions
            const userWithRoles = await UserModel.findByIdWithRoles(userId);
            if (!userWithRoles) {
                throw ApiError.notFound('User not found');
            }

            // Extract roles and permissions
            const roles = userWithRoles.roles.map(role => role.name);
            const permissions = userWithRoles.roles.flatMap(role =>
                role.permissions.map(permission => permission.name)
            );

            // Generate access token
            const accessTokenPayload: any = {
                userId: userWithRoles.id,
                email: userWithRoles.email,
                roles,
                permissions
            };

            const accessToken = jwt.sign(accessTokenPayload, this.jwtSecret, {
                expiresIn: this.jwtExpiresIn
            } as any);

            // Generate refresh token
            const refreshTokenValue = uuidv4();
            const refreshExpiresAt = new Date();
            refreshExpiresAt.setTime(refreshExpiresAt.getTime() + this.parseTimeToMs(this.refreshExpiresIn));

            await RefreshTokenModel.create({
                userId: userWithRoles.id,
                token: refreshTokenValue,
                expiresAt: refreshExpiresAt,
                deviceInfo
            });

            // Calculate expires in seconds
            const decoded = jwt.decode(accessToken) as any;
            const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

            return {
                accessToken,
                refreshToken: refreshTokenValue,
                expiresIn
            };
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            throw ApiError.internal('Failed to generate tokens');
        }
    }

    /**
     * Validate email format
     */
    private static isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate password strength
     */
    private static isValidPassword(password: string): boolean {
        // At least 8 characters, one uppercase, one lowercase, one number, one special character
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return passwordRegex.test(password);
    }

    /**
     * Parse time string to milliseconds
     */
    private static parseTimeToMs(timeString: string): number {
        const units: { [key: string]: number } = {
            s: 1000,
            m: 60 * 1000,
            h: 60 * 60 * 1000,
            d: 24 * 60 * 60 * 1000
        };

        const match = timeString.match(/^(\d+)([smhd])$/);
        if (!match || !match[1] || !match[2]) {
            throw new Error(`Invalid time format: ${timeString}`);
        }

        const value = parseInt(match[1]);
        const unit = match[2];

        const multiplier = units[unit];
        if (multiplier === undefined) {
            throw new Error(`Invalid time unit: ${unit}`);
        }

        return value * multiplier;
    }

    /**
     * Find user by email (public method for routes)
     */
    public static async findUserByEmail(email: string): Promise<any> {
        return await UserModel.findByEmail(email);
    }

    /**
     * Generate tokens (public method for routes)
     */
    public static async generateTokensPublic(userId: string, deviceInfo?: any): Promise<any> {
        return await this.generateTokens(userId, deviceInfo);
    }

    /**
     * Change user password
     */
    public static async changePassword(
        userId: string,
        currentPassword: string,
        newPassword: string
    ): Promise<void> {
        try {
            // Get user with current password
            const user = await UserModel.findById(userId);
            if (!user) {
                throw ApiError.notFound('User not found');
            }

            const userWithPassword = await UserModel.findByEmailWithPassword(user.email);
            if (!userWithPassword) {
                throw ApiError.notFound('User not found');
            }

            // Verify current password
            const isCurrentPasswordValid = await UserModel.verifyPassword(
                currentPassword,
                userWithPassword.passwordHash
            );

            if (!isCurrentPasswordValid) {
                throw ApiError.unauthorized('Current password is incorrect');
            }

            // Validate new password
            if (!this.isValidPassword(newPassword)) {
                throw ApiError.badRequest(
                    'New password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'
                );
            }

            // Update password
            await UserModel.updatePassword(userId, newPassword);

            // Revoke all refresh tokens to force re-login
            await RefreshTokenModel.revokeAllForUser(userId);

            Logger.info('Password changed successfully', {
                userId
            });
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            Logger.error('Password change failed', error as Error);
            throw ApiError.internal('Password change failed');
        }
    }
}