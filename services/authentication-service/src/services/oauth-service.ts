import axios from 'axios';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as AppleStrategy } from 'passport-apple';
import { ApiError, Logger } from '@giga/common';
import { OAuthUserData } from './auth-service';
import { UserModel } from '../models/user-model';

interface GoogleTokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
    scope: string;
}

interface GoogleUserInfo {
    id: string;
    email: string;
    verified_email: boolean;
    name: string;
    given_name: string;
    family_name: string;
    picture: string;
    locale: string;
}

interface AppleTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
    id_token: string;
}

interface AppleUserInfo {
    sub: string;
    email: string;
    email_verified: boolean;
    name?: {
        firstName: string;
        lastName: string;
    };
}

/**
 * OAuth service for handling Google and Apple OAuth flows with Passport.js integration
 */
export class OAuthService {
    private static googleClientId = process.env.GOOGLE_CLIENT_ID;
    private static googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    private static googleRedirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8001/api/auth/google/callback';

    private static appleClientId = process.env.APPLE_CLIENT_ID;
    private static appleTeamId = process.env.APPLE_TEAM_ID;
    private static appleKeyId = process.env.APPLE_KEY_ID;
    private static applePrivateKeyPath = process.env.APPLE_PRIVATE_KEY_PATH;
    private static appleRedirectUri = process.env.APPLE_REDIRECT_URI || 'http://localhost:8001/api/auth/apple/callback';

    /**
     * Initialize OAuth strategies
     */
    public static initialize(): void {
        this.initializeGoogleStrategy();
        this.initializeAppleStrategy();
        this.initializePassportSerialization();
    }

    /**
     * Initialize Google OAuth strategy
     */
    private static initializeGoogleStrategy(): void {
        if (!this.googleClientId || !this.googleClientSecret) {
            Logger.warn('Google OAuth credentials not configured');
            return;
        }

        passport.use(new GoogleStrategy({
            clientID: this.googleClientId,
            clientSecret: this.googleClientSecret,
            callbackURL: this.googleRedirectUri,
            scope: ['profile', 'email']
        }, async (accessToken, refreshToken, profile, done) => {
            try {
                const oauthData = {
                    provider: 'google' as const,
                    providerId: profile.id,
                    email: profile.emails?.[0]?.value,
                    firstName: profile.name?.givenName || 'Google',
                    lastName: profile.name?.familyName || 'User',
                    profilePicture: profile.photos?.[0]?.value,
                    accessToken,
                    refreshToken
                };

                const user = await this.findOrCreateOAuthUser(oauthData);
                return done(null, user);
            } catch (error) {
                Logger.error('Google OAuth strategy error', error as Error);
                return done(error as Error);
            }
        }));
    }

    /**
     * Initialize Apple OAuth strategy
     */
    private static initializeAppleStrategy(): void {
        if (!this.appleClientId || !this.appleTeamId || !this.appleKeyId || !this.applePrivateKeyPath) {
            Logger.warn('Apple OAuth credentials not configured');
            return;
        }

        passport.use(new AppleStrategy({
            clientID: this.appleClientId,
            teamID: this.appleTeamId,
            keyID: this.appleKeyId,
            privateKeyLocation: this.applePrivateKeyPath,
            callbackURL: this.appleRedirectUri,
            passReqToCallback: true
        }, async (req, accessToken, refreshToken, idToken, profile, done) => {
            try {
                const oauthData = {
                    provider: 'apple' as const,
                    providerId: profile.id,
                    email: profile.email,
                    firstName: 'Apple',
                    lastName: 'User',
                    accessToken,
                    refreshToken
                };

                const user = await this.findOrCreateOAuthUser(oauthData);
                return done(null, user);
            } catch (error) {
                Logger.error('Apple OAuth strategy error', error as Error);
                return done(error as Error);
            }
        }));
    }

    /**
     * Initialize Passport serialization
     */
    private static initializePassportSerialization(): void {
        passport.serializeUser((user: any, done) => {
            done(null, user.id);
        });

        passport.deserializeUser(async (id: string, done) => {
            try {
                const user = await UserModel.findById(id);
                done(null, user);
            } catch (error) {
                done(error);
            }
        });
    }

    /**
     * Find or create OAuth user
     */
    private static async findOrCreateOAuthUser(oauthData: {
        provider: 'google' | 'apple';
        providerId: string;
        email?: string;
        firstName: string;
        lastName: string;
        profilePicture?: string;
        accessToken: string;
        refreshToken?: string;
    }) {
        const { provider, providerId, email, firstName, lastName, profilePicture, accessToken, refreshToken } = oauthData;

        // Check if user already exists with this OAuth ID
        let user = await UserModel.findByOAuthId(provider, providerId);

        if (user) {
            // Update OAuth tokens
            await UserModel.updateOAuthTokens(user.id, accessToken, refreshToken);
            return await UserModel.findById(user.id);
        }

        // Check if user exists with this email
        if (email) {
            user = await UserModel.findByEmail(email);

            if (user) {
                // Link existing user to OAuth - this would require updating the user model
                // For now, we'll create a new user to avoid conflicts
                Logger.info(`User with email ${email} already exists, creating new OAuth user`);
            }
        }

        // Create new OAuth user with default values
        const newUserData = {
            email: email || `${provider}_${providerId}@${provider}.com`,
            firstName,
            lastName,
            username: `${provider}_${providerId}`,
            phone: '0000000000', // Default phone, user can update later
            country: 'Not specified',
            address: 'Not specified',
            street: 'Not specified',
            city: 'Not specified',
            zipCode: '00000',
            gender: 'prefer-not-to-say' as const,
            weight: 70,
            maritalStatus: 'prefer-not-to-say' as const,
            ageGroup: '25-34' as const,
            areaOfInterest: 'General',
            profilePicture,
            oauthProvider: provider,
            oauthId: providerId,
            oauthAccessToken: accessToken,
            oauthRefreshToken: refreshToken
        };

        return await UserModel.create(newUserData);
    }

    /**
     * Get OAuth authorization URL
     */
    public static async getAuthorizationUrl(provider: 'google' | 'apple', redirectUri?: string): Promise<string> {
        switch (provider) {
            case 'google':
                return this.getGoogleAuthUrl(redirectUri);
            case 'apple':
                return this.getAppleAuthUrl(redirectUri);
            default:
                throw ApiError.badRequest(`Unsupported OAuth provider: ${provider}`);
        }
    }

    /**
     * Handle OAuth callback
     */
    public static async handleCallback(
        provider: 'google' | 'apple',
        code: string,
        state?: string
    ): Promise<OAuthUserData> {
        switch (provider) {
            case 'google':
                return this.handleGoogleCallback(code, state);
            case 'apple':
                return this.handleAppleCallback(code, state);
            default:
                throw ApiError.badRequest(`Unsupported OAuth provider: ${provider}`);
        }
    }

    /**
     * Get Google OAuth authorization URL
     */
    private static getGoogleAuthUrl(redirectUri?: string): string {
        const baseUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
        const params = new URLSearchParams({
            client_id: this.googleClientId!,
            redirect_uri: redirectUri || this.googleRedirectUri,
            response_type: 'code',
            scope: 'openid email profile',
            access_type: 'offline',
            prompt: 'consent'
        });

        return `${baseUrl}?${params.toString()}`;
    }

    /**
     * Get Apple OAuth authorization URL
     */
    private static getAppleAuthUrl(redirectUri?: string): string {
        const baseUrl = 'https://appleid.apple.com/auth/authorize';
        const params = new URLSearchParams({
            client_id: this.appleClientId!,
            redirect_uri: redirectUri || this.appleRedirectUri,
            response_type: 'code',
            scope: 'name email',
            response_mode: 'form_post'
        });

        return `${baseUrl}?${params.toString()}`;
    }

    /**
     * Handle Google OAuth callback
     */
    private static async handleGoogleCallback(code: string, state?: string): Promise<OAuthUserData> {
        try {
            // Exchange code for tokens
            const tokenResponse = await this.exchangeGoogleCode(code);

            // Get user info
            const userInfo = await this.getGoogleUserInfo(tokenResponse.access_token);

            return {
                provider: 'google',
                providerId: userInfo.id,
                email: userInfo.email,
                firstName: userInfo.given_name,
                lastName: userInfo.family_name,
                profilePicture: userInfo.picture,
                accessToken: tokenResponse.access_token,
                refreshToken: tokenResponse.refresh_token
            };
        } catch (error) {
            Logger.error('Google OAuth callback failed', error as Error);
            throw ApiError.internal('Google OAuth authentication failed');
        }
    }

    /**
     * Handle Apple OAuth callback
     */
    private static async handleAppleCallback(code: string, state?: string): Promise<OAuthUserData> {
        try {
            // Exchange code for tokens
            const tokenResponse = await this.exchangeAppleCode(code);

            // Decode ID token to get user info
            const userInfo = this.decodeAppleIdToken(tokenResponse.id_token);

            return {
                provider: 'apple',
                providerId: userInfo.sub,
                email: userInfo.email,
                firstName: userInfo.name?.firstName || '',
                lastName: userInfo.name?.lastName || '',
                accessToken: tokenResponse.access_token,
                refreshToken: tokenResponse.refresh_token
            };
        } catch (error) {
            Logger.error('Apple OAuth callback failed', error as Error);
            throw ApiError.internal('Apple OAuth authentication failed');
        }
    }

    /**
     * Exchange Google authorization code for tokens
     */
    private static async exchangeGoogleCode(code: string): Promise<GoogleTokenResponse> {
        const tokenUrl = 'https://oauth2.googleapis.com/token';

        const params = {
            client_id: this.googleClientId!,
            client_secret: this.googleClientSecret!,
            code,
            grant_type: 'authorization_code',
            redirect_uri: this.googleRedirectUri
        };

        const response = await axios.post(tokenUrl, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        return response.data;
    }

    /**
     * Get Google user information
     */
    private static async getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
        const userInfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo';

        const response = await axios.get(userInfoUrl, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        return response.data;
    }

    /**
     * Exchange Apple authorization code for tokens
     */
    private static async exchangeAppleCode(code: string): Promise<AppleTokenResponse> {
        const tokenUrl = 'https://appleid.apple.com/auth/token';

        const params = {
            client_id: this.appleClientId!,
            client_secret: this.appleClientSecret!,
            code,
            grant_type: 'authorization_code',
            redirect_uri: this.appleRedirectUri
        };

        const response = await axios.post(tokenUrl, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        return response.data;
    }

    /**
     * Decode Apple ID token (simplified - in production, use proper JWT verification)
     */
    private static decodeAppleIdToken(idToken: string): AppleUserInfo {
        try {
            // In production, you should verify the JWT signature
            const payload = idToken.split('.')[1];
            const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
            return decoded;
        } catch (error) {
            throw ApiError.internal('Failed to decode Apple ID token');
        }
    }

    /**
     * Refresh OAuth tokens
     */
    public static async refreshOAuthToken(
        provider: 'google' | 'apple',
        refreshToken: string
    ): Promise<{ accessToken: string; refreshToken?: string }> {
        switch (provider) {
            case 'google':
                return this.refreshGoogleToken(refreshToken);
            case 'apple':
                return this.refreshAppleToken(refreshToken);
            default:
                throw ApiError.badRequest(`Unsupported OAuth provider: ${provider}`);
        }
    }

    /**
     * Refresh Google access token
     */
    private static async refreshGoogleToken(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string }> {
        const tokenUrl = 'https://oauth2.googleapis.com/token';

        const params = {
            client_id: this.googleClientId!,
            client_secret: this.googleClientSecret!,
            refresh_token: refreshToken,
            grant_type: 'refresh_token'
        };

        const response = await axios.post(tokenUrl, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        return {
            accessToken: response.data.access_token,
            refreshToken: response.data.refresh_token || refreshToken
        };
    }

    /**
     * Refresh Apple access token
     */
    private static async refreshAppleToken(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string }> {
        const tokenUrl = 'https://appleid.apple.com/auth/token';

        const params = {
            client_id: this.appleClientId!,
            client_secret: this.appleClientSecret!,
            refresh_token: refreshToken,
            grant_type: 'refresh_token'
        };

        const response = await axios.post(tokenUrl, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        return {
            accessToken: response.data.access_token,
            refreshToken: response.data.refresh_token || refreshToken
        };
    }
}