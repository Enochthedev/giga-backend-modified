import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { ApiError, Logger } from '@giga/common';
import { UserModel, User, CreateUserData } from '../models/user-model';
import { OAuthProviderModel } from '../models/oauth-provider-model';
import { AuthService } from './auth-service';
import { SecurityAuditService } from './security-audit-service';

export interface OAuthProfile {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    provider: string;
    profileData: any;
}

export interface OAuthLoginResult {
    user: User;
    tokens: any;
    isNewUser: boolean;
}

/**
 * OAuth service for social login integration
 */
export class OAuthService {
    /**
     * Initialize OAuth strategies
     */
    public static initialize(): void {
        // Google OAuth Strategy
        if (process.env['GOOGLE_CLIENT_ID'] && process.env['GOOGLE_CLIENT_SECRET']) {
            passport.use(new GoogleStrategy({
                clientID: process.env['GOOGLE_CLIENT_ID'],
                clientSecret: process.env['GOOGLE_CLIENT_SECRET'],
                callbackURL: process.env['GOOGLE_CALLBACK_URL'] || '/auth/google/callback'
            }, async (accessToken, refreshToken, profile, done) => {
                try {
                    const oauthProfile: OAuthProfile = {
                        id: profile.id,
                        email: profile.emails?.[0]?.value || '',
                        firstName: profile.name?.givenName || '',
                        lastName: profile.name?.familyName || '',
                        provider: 'google',
                        profileData: {
                            accessToken,
                            refreshToken,
                            profile: profile._json
                        }
                    };

                    const result = await this.handleOAuthLogin(oauthProfile);
                    return done(null, result);
                } catch (error) {
                    return done(error, null);
                }
            }));
        }

        // Facebook OAuth Strategy
        if (process.env['FACEBOOK_APP_ID'] && process.env['FACEBOOK_APP_SECRET']) {
            passport.use(new FacebookStrategy({
                clientID: process.env['FACEBOOK_APP_ID'],
                clientSecret: process.env['FACEBOOK_APP_SECRET'],
                callbackURL: process.env['FACEBOOK_CALLBACK_URL'] || '/auth/facebook/callback',
                profileFields: ['id', 'emails', 'name']
            }, async (accessToken, refreshToken, profile, done) => {
                try {
                    const oauthProfile: OAuthProfile = {
                        id: profile.id,
                        email: profile.emails?.[0]?.value || '',
                        firstName: profile.name?.givenName || '',
                        lastName: profile.name?.familyName || '',
                        provider: 'facebook',
                        profileData: {
                            accessToken,
                            refreshToken,
                            profile: profile._json
                        }
                    };

                    const result = await this.handleOAuthLogin(oauthProfile);
                    return done(null, result);
                } catch (error) {
                    return done(error, null);
                }
            }));
        }

        // GitHub OAuth Strategy
        if (process.env['GITHUB_CLIENT_ID'] && process.env['GITHUB_CLIENT_SECRET']) {
            passport.use(new GitHubStrategy({
                clientID: process.env['GITHUB_CLIENT_ID'],
                clientSecret: process.env['GITHUB_CLIENT_SECRET'],
                callbackURL: process.env['GITHUB_CALLBACK_URL'] || '/auth/github/callback'
            }, async (accessToken, refreshToken, profile, done) => {
                try {
                    const oauthProfile: OAuthProfile = {
                        id: profile.id,
                        email: profile.emails?.[0]?.value || '',
                        firstName: profile.displayName?.split(' ')[0] || '',
                        lastName: profile.displayName?.split(' ').slice(1).join(' ') || '',
                        provider: 'github',
                        profileData: {
                            accessToken,
                            refreshToken,
                            profile: profile._json
                        }
                    };

                    const result = await this.handleOAuthLogin(oauthProfile);
                    return done(null, result);
                } catch (error) {
                    return done(error, null);
                }
            }));
        }

        passport.serializeUser((user: any, done) => {
            done(null, user);
        });

        passport.deserializeUser((user: any, done) => {
            done(null, user);
        });
    }

    /**
     * Handle OAuth login/registration
     */
    public static async handleOAuthLogin(
        oauthProfile: OAuthProfile,
        deviceInfo?: any
    ): Promise<OAuthLoginResult> {
        try {
            // Check if OAuth provider already exists
            let oauthProvider = await OAuthProviderModel.findByProviderUserId(
                oauthProfile.provider,
                oauthProfile.id
            );

            let user: User;
            let isNewUser = false;

            if (oauthProvider) {
                // Existing OAuth user
                user = await UserModel.findById(oauthProvider.userId);
                if (!user) {
                    throw ApiError.notFound('User not found');
                }

                // Update OAuth provider data
                await OAuthProviderModel.update(oauthProvider.id, {
                    providerEmail: oauthProfile.email,
                    providerData: oauthProfile.profileData
                });
            } else {
                // Check if user exists with this email
                const existingUser = await UserModel.findByEmail(oauthProfile.email);

                if (existingUser) {
                    // Link OAuth provider to existing user
                    user = existingUser;
                    await OAuthProviderModel.create({
                        userId: user.id,
                        provider: oauthProfile.provider,
                        providerUserId: oauthProfile.id,
                        providerEmail: oauthProfile.email,
                        providerData: oauthProfile.profileData,
                        isVerified: true
                    });
                } else {
                    // Create new user
                    const userData: CreateUserData = {
                        email: oauthProfile.email,
                        password: this.generateRandomPassword(), // Random password for OAuth users
                        firstName: oauthProfile.firstName,
                        lastName: oauthProfile.lastName
                    };

                    const { user: newUser } = await AuthService.register(userData);
                    user = newUser;
                    isNewUser = true;

                    // Verify email automatically for OAuth users
                    await UserModel.verifyEmail(user.id);

                    // Create OAuth provider record
                    await OAuthProviderModel.create({
                        userId: user.id,
                        provider: oauthProfile.provider,
                        providerUserId: oauthProfile.id,
                        providerEmail: oauthProfile.email,
                        providerData: oauthProfile.profileData,
                        isVerified: true
                    });
                }
            }

            // Update last login
            await UserModel.updateLastLogin(user.id);

            // Generate tokens
            const tokens = await AuthService.generateTokens(user.id, deviceInfo);

            // Log security event
            await SecurityAuditService.logEvent({
                userId: user.id,
                eventType: 'oauth_login',
                eventCategory: 'authentication',
                severity: 'info',
                eventData: {
                    provider: oauthProfile.provider,
                    isNewUser,
                    email: oauthProfile.email
                },
                success: true
            });

            Logger.info('OAuth login successful', {
                userId: user.id,
                provider: oauthProfile.provider,
                isNewUser
            });

            return { user, tokens, isNewUser };
        } catch (error) {
            // Log failed OAuth attempt
            await SecurityAuditService.logEvent({
                eventType: 'oauth_login_failed',
                eventCategory: 'authentication',
                severity: 'warning',
                eventData: {
                    provider: oauthProfile.provider,
                    email: oauthProfile.email,
                    error: error instanceof Error ? error.message : 'Unknown error'
                },
                success: false
            });

            if (error instanceof ApiError) {
                throw error;
            }
            Logger.error('OAuth login failed', error as Error);
            throw ApiError.internal('OAuth login failed');
        }
    }

    /**
     * Link OAuth provider to existing user
     */
    public static async linkProvider(
        userId: string,
        oauthProfile: OAuthProfile
    ): Promise<void> {
        try {
            // Check if provider is already linked to another user
            const existingProvider = await OAuthProviderModel.findByProviderUserId(
                oauthProfile.provider,
                oauthProfile.id
            );

            if (existingProvider && existingProvider.userId !== userId) {
                throw ApiError.conflict('This social account is already linked to another user');
            }

            if (existingProvider && existingProvider.userId === userId) {
                throw ApiError.conflict('This social account is already linked to your account');
            }

            // Create OAuth provider record
            await OAuthProviderModel.create({
                userId,
                provider: oauthProfile.provider,
                providerUserId: oauthProfile.id,
                providerEmail: oauthProfile.email,
                providerData: oauthProfile.profileData,
                isVerified: true
            });

            // Log security event
            await SecurityAuditService.logEvent({
                userId,
                eventType: 'oauth_provider_linked',
                eventCategory: 'account_management',
                severity: 'info',
                eventData: {
                    provider: oauthProfile.provider,
                    providerEmail: oauthProfile.email
                },
                success: true
            });

            Logger.info('OAuth provider linked successfully', {
                userId,
                provider: oauthProfile.provider
            });
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            Logger.error('Failed to link OAuth provider', error as Error);
            throw ApiError.internal('Failed to link OAuth provider');
        }
    }

    /**
     * Unlink OAuth provider from user
     */
    public static async unlinkProvider(userId: string, provider: string): Promise<void> {
        try {
            const oauthProvider = await OAuthProviderModel.findByUserIdAndProvider(userId, provider);
            if (!oauthProvider) {
                throw ApiError.notFound('OAuth provider not found');
            }

            // Check if user has password or other OAuth providers
            const user = await UserModel.findById(userId);
            if (!user) {
                throw ApiError.notFound('User not found');
            }

            const otherProviders = await OAuthProviderModel.findByUserId(userId);
            const hasOtherProviders = otherProviders.filter(p => p.provider !== provider).length > 0;

            // If no password and no other providers, prevent unlinking
            if (!hasOtherProviders) {
                // Check if user has a password set (this would require checking if password is not a random one)
                // For now, we'll prevent unlinking if it's the only provider
                throw ApiError.badRequest('Cannot unlink the only authentication method. Please set a password first.');
            }

            await OAuthProviderModel.delete(oauthProvider.id);

            // Log security event
            await SecurityAuditService.logEvent({
                userId,
                eventType: 'oauth_provider_unlinked',
                eventCategory: 'account_management',
                severity: 'info',
                eventData: {
                    provider,
                    providerEmail: oauthProvider.providerEmail
                },
                success: true
            });

            Logger.info('OAuth provider unlinked successfully', {
                userId,
                provider
            });
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            Logger.error('Failed to unlink OAuth provider', error as Error);
            throw ApiError.internal('Failed to unlink OAuth provider');
        }
    }

    /**
     * Get user's linked OAuth providers
     */
    public static async getUserProviders(userId: string): Promise<Array<{
        provider: string;
        providerEmail: string;
        isVerified: boolean;
        linkedAt: Date;
    }>> {
        try {
            const providers = await OAuthProviderModel.findByUserId(userId);
            return providers.map(p => ({
                provider: p.provider,
                providerEmail: p.providerEmail || '',
                isVerified: p.isVerified,
                linkedAt: p.createdAt
            }));
        } catch (error) {
            Logger.error('Failed to get user OAuth providers', error as Error);
            throw ApiError.internal('Failed to get OAuth providers');
        }
    }

    /**
     * Generate random password for OAuth users
     */
    private static generateRandomPassword(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < 16; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }
}