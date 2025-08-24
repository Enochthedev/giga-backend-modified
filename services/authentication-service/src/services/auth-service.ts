import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { ApiError, Logger } from '@giga/common';
import { UserModel, User, CreateUserData } from '../models/user-model';
import { RefreshTokenModel } from '../models/refresh-token-model';
import { OAuthService } from './oauth-service';

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

export interface OAuthUserData {
    provider: 'google' | 'apple';
    providerId: string;
    email: string;
    firstName: string;
    lastName?: string;
    profilePicture?: string;
    accessToken?: string;
    refreshToken?: string;
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
     * OAuth login/registration
     */
    public static async oauthLogin(oauthData: OAuthUserData, deviceInfo?: any): Promise<{ user: User; tokens: AuthTokens; isNewUser: boolean }> {
        try {
            // Check if user exists with OAuth provider
            let user = await UserModel.findByOAuthProvider(oauthData.provider, oauthData.providerId);
            let isNewUser = false;

            if (!user) {
                // Check if user exists with same email
                const existingUser = await UserModel.findByEmail(oauthData.email);

                if (existingUser) {
                    // Link OAuth account to existing user
                    user = await UserModel.linkOAuthAccount(existingUser.id, {
                        provider: oauthData.provider,
                        providerId: oauthData.providerId,
                        accessToken: oauthData.accessToken,
                        refreshToken: oauthData.refreshToken
                    });
                } else {
                    // Create new user with OAuth data
                    user = await UserModel.createOAuthUser({
                        email: oauthData.email,
                        firstName: oauthData.firstName,
                        lastName: oauthData.lastName || '',
                        profilePicture: oauthData.profilePicture || '',
                        oauthProvider: oauthData.provider,
                        oauthId: oauthData.providerId,
                        oauthAccessToken: oauthData.accessToken,
                        oauthRefreshToken: oauthData.refreshToken,
                        isVerified: true // OAuth users are pre-verified
                    });
                    isNewUser = true;
                }
            } else {
                // Update OAuth tokens for existing user
                await UserModel.updateOAuthTokens(user.id, {
                    accessToken: oauthData.accessToken,
                    refreshToken: oauthData.refreshToken
                });
            }

            // Update last login
            await UserModel.updateLastLogin(user.id);

            // Generate tokens
            const tokens = await this.generateTokens(user.id, deviceInfo);

            Logger.info('OAuth login successful', {
                userId: user.id,
                email: user.email,
                provider: oauthData.provider,
                isNewUser
            });

            return { user, tokens, isNewUser };
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            Logger.error('OAuth login failed', error as Error);
            throw ApiError.internal('OAuth login failed');
        }
    }

    /**
     * Get OAuth authorization URL
     */
    public static async getOAuthAuthorizationUrl(provider: 'google' | 'apple', redirectUri?: string): Promise<string> {
        try {
            return await OAuthService.getAuthorizationUrl(provider, redirectUri);
        } catch (error) {
            Logger.error('Failed to get OAuth authorization URL', error as Error);
            throw ApiError.internal('Failed to get OAuth authorization URL');
        }
    }

    /**
     * Handle OAuth callback
     */
    public static async handleOAuthCallback(
        provider: 'google' | 'apple',
        code: string,
        state?: string,
        deviceInfo?: any
    ): Promise<{ user: User; tokens: AuthTokens; isNewUser: boolean }> {
        try {
            // Exchange code for tokens and user data
            const oauthData = await OAuthService.handleCallback(provider, code, state);

            // Process OAuth login
            return await this.oauthLogin(oauthData, deviceInfo);
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            Logger.error('OAuth callback failed', error as Error);
            throw ApiError.internal('OAuth callback failed');
        }
    }

    /**
     * Unlink OAuth account
     */
    public static async unlinkOAuthAccount(userId: string, provider: 'google' | 'apple'): Promise<void> {
        try {
            const user = await UserModel.findById(userId);
            if (!user) {
                throw ApiError.notFound('User not found');
            }

            // Check if user has password set (can't unlink if it's the only auth method)
            const userWithPassword = await UserModel.findByEmailWithPassword(user.email);
            if (!userWithPassword?.passwordHash) {
                throw ApiError.badRequest('Cannot unlink OAuth account without setting a password first');
            }

            await UserModel.unlinkOAuthAccount(userId, provider);

            Logger.info('OAuth account unlinked', {
                userId,
                provider
            });
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            Logger.error('Failed to unlink OAuth account', error as Error);
            throw ApiError.internal('Failed to unlink OAuth account');
        }
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

    /**
     * Send OTP for phone verification
     */
    public static async sendOTP(userId: string): Promise<{ message: string; otpId: string }> {
        try {
            const user = await UserModel.findById(userId);
            if (!user) {
                throw ApiError.notFound('User not found');
            }

            if (user.isPhoneVerified) {
                throw ApiError.badRequest('Phone number already verified');
            }

            const otp = await UserModel.generateOTP(userId);

            // TODO: Send OTP via SMS service
            Logger.info('OTP generated for user', {
                userId,
                phone: user.phone,
                otp: process.env.NODE_ENV === 'development' ? otp : '***'
            });

            return {
                message: 'OTP sent successfully',
                otpId: userId // Using userId as otpId for simplicity
            };
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            Logger.error('Send OTP failed', error as Error);
            throw ApiError.internal('Failed to send OTP');
        }
    }

    /**
     * Verify OTP for phone verification
     */
    public static async verifyOTP(userId: string, otp: string): Promise<{ message: string }> {
        try {
            const isValid = await UserModel.verifyOTP(userId, otp);

            if (!isValid) {
                throw ApiError.badRequest('Invalid or expired OTP');
            }

            Logger.info('Phone verified successfully', { userId });

            return { message: 'Phone number verified successfully' };
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            Logger.error('OTP verification failed', error as Error);
            throw ApiError.internal('OTP verification failed');
        }
    }

    /**
     * Resend OTP for phone verification
     */
    public static async resendOTP(userId: string): Promise<{ message: string }> {
        try {
            const user = await UserModel.findById(userId);
            if (!user) {
                throw ApiError.notFound('User not found');
            }

            if (user.isPhoneVerified) {
                throw ApiError.badRequest('Phone number already verified');
            }

            const otp = await UserModel.generateOTP(userId);

            // TODO: Send OTP via SMS service
            Logger.info('OTP resent for user', {
                userId,
                phone: user.phone,
                otp: process.env.NODE_ENV === 'development' ? otp : '***'
            });

            return { message: 'OTP resent successfully' };
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            Logger.error('Resend OTP failed', error as Error);
            throw ApiError.internal('Failed to resend OTP');
        }
    }

    /**
     * Verify email with token
     */
    public static async verifyEmail(email: string, token: string): Promise<{ message: string }> {
        try {
            const isValid = await UserModel.verifyEmailWithToken(email, token);

            if (!isValid) {
                throw ApiError.badRequest('Invalid or expired email verification token');
            }

            Logger.info('Email verified successfully', { email });

            return { message: 'Email verified successfully' };
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            Logger.error('Email verification failed', error as Error);
            throw ApiError.internal('Email verification failed');
        }
    }

    /**
     * Add rating to user
     */
    public static async addRating(userId: string, rating: number): Promise<{ message: string }> {
        try {
            if (rating < 1 || rating > 5) {
                throw ApiError.badRequest('Rating must be between 1 and 5');
            }

            await UserModel.addRating(userId, rating);

            Logger.info('Rating added successfully', { userId, rating });

            return { message: 'Rating added successfully' };
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            Logger.error('Add rating failed', error as Error);
            throw ApiError.internal('Failed to add rating');
        }
    }

    /**
     * Update user profile
     */
    public static async updateProfile(userId: string, updateData: any): Promise<{ user: User; message: string }> {
        try {
            const user = await UserModel.update(userId, updateData);

            Logger.info('Profile updated successfully', { userId });

            return {
                user,
                message: 'Profile updated successfully'
            };
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            Logger.error('Profile update failed', error as Error);
            throw ApiError.internal('Profile update failed');
        }
    }

    /**
     * Get user profile with roles
     */
    public static async getUserProfile(userId: string): Promise<any> {
        try {
            const userWithRoles = await UserModel.findByIdWithRoles(userId);

            if (!userWithRoles) {
                throw ApiError.notFound('User not found');
            }

            return userWithRoles;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            Logger.error('Get user profile failed', error as Error);
            throw ApiError.internal('Failed to get user profile');
        }
    }

    /**
     * Create taxi account association
     */
    public static async createTaxiAccount(userId: string, taxiData: { taxiProfileId: string; type: 'TaxiDriver' | 'TaxiCustomer' }): Promise<{ message: string }> {
        try {
            const user = await UserModel.findById(userId);
            if (!user) {
                throw ApiError.notFound('User not found');
            }

            // Update user with taxi profile information
            await UserModel.update(userId, {
                taxiProfileId: taxiData.taxiProfileId,
                taxiProfileType: taxiData.type
            });

            // Assign appropriate taxi role
            const roleName = taxiData.type === 'TaxiDriver' ? 'taxi_driver' : 'taxi_customer';
            await UserModel.assignRole(userId, roleName);

            Logger.info('Taxi account created successfully', { userId, type: taxiData.type });

            return { message: 'Taxi account created successfully' };
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            Logger.error('Create taxi account failed', error as Error);
            throw ApiError.internal('Failed to create taxi account');
        }
    }
}
}