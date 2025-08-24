import express from 'express';
import passport from 'passport';
import { AuthService } from '../services/auth-service';
import { OAuthService } from '../services/oauth-service';
import { ApiError, Logger } from '@giga/common';
import { authValidation } from '../validation/auth-validation';
import { validateRequest } from '../middleware/validation-middleware';
import { authMiddleware } from '../middleware/auth-middleware';

const router = express.Router();

/**
 * User registration
 */
router.post('/register', validateRequest(authValidation.register), async (req, res, next) => {
    try {
        const result = await AuthService.register(req.body);

        res.status(201).json({
            success: true,
            message: 'User registered successfully. Please check your email for OTP verification.',
            data: {
                user: {
                    id: result.user.id,
                    email: result.user.email,
                    username: result.user.username,
                    firstName: result.user.firstName,
                    lastName: result.user.lastName,
                    requiresOTPVerification: !result.user.isPhoneVerified
                },
                tokens: result.tokens
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * User login
 */
router.post('/login', validateRequest(authValidation.login), async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const ipAddress = req.ip || req.connection.remoteAddress || '';
        const userAgent = req.get('User-Agent') || '';

        const deviceInfo = {
            ipAddress,
            userAgent,
            deviceId: req.body.deviceId || `${ipAddress}_${userAgent}`
        };

        const result = await AuthService.login({ email, password }, deviceInfo);

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: result.user.id,
                    email: result.user.email,
                    username: result.user.username,
                    firstName: result.user.firstName,
                    lastName: result.user.lastName
                },
                tokens: result.tokens
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Refresh access token
 */
router.post('/refresh', validateRequest(authValidation.refreshToken), async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        const tokens = await AuthService.refreshToken(refreshToken);

        res.json({
            success: true,
            message: 'Token refreshed successfully',
            data: { tokens }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Logout user
 */
router.post('/logout', validateRequest(authValidation.logout), async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        await AuthService.logout(refreshToken);

        res.json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Logout from all devices
 */
router.post('/logout-all', authMiddleware, async (req, res, next) => {
    try {
        const userId = (req as any).user.userId;
        await AuthService.logoutAll(userId);

        res.json({
            success: true,
            message: 'Logged out from all devices successfully'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Change password
 */
router.post('/change-password', authMiddleware, validateRequest(authValidation.changePassword), async (req, res, next) => {
    try {
        const userId = (req as any).user.userId;
        const { currentPassword, newPassword } = req.body;

        await AuthService.changePassword(userId, currentPassword, newPassword);

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Send OTP for phone verification
 */
router.post('/send-otp', authMiddleware, async (req, res, next) => {
    try {
        const userId = (req as any).user.userId;
        const result = await AuthService.sendOTP(userId);

        res.json({
            success: true,
            message: result.message,
            data: { otpId: result.otpId }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Verify OTP
 */
router.post('/verify-otp', authMiddleware, validateRequest(authValidation.verifyOTP), async (req, res, next) => {
    try {
        const userId = (req as any).user.userId;
        const { otp } = req.body;

        const result = await AuthService.verifyOTP(userId, otp);

        res.json({
            success: true,
            message: result.message
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Resend OTP
 */
router.post('/resend-otp', authMiddleware, async (req, res, next) => {
    try {
        const userId = (req as any).user.userId;
        const result = await AuthService.resendOTP(userId);

        res.json({
            success: true,
            message: result.message
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Verify email with token
 */
router.post('/verify-email', validateRequest(authValidation.verifyEmail), async (req, res, next) => {
    try {
        const { email, token } = req.body;
        const result = await AuthService.verifyEmail(email, token);

        res.json({
            success: true,
            message: result.message
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Verify JWT token
 */
router.post('/verify-token', validateRequest(authValidation.verifyToken), async (req, res, next) => {
    try {
        const { token } = req.body;
        const payload = await AuthService.verifyAccessToken(token);

        res.json({
            success: true,
            message: 'Token is valid',
            data: { payload }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Google OAuth routes
 */
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

router.get('/google/callback',
    passport.authenticate('google', { session: false }),
    async (req, res, next) => {
        try {
            const user = req.user as any;
            const redirectUrl = process.env['FRONTEND_URL'] || 'http://localhost:3000';

            // Generate tokens for the OAuth user
            const tokens = await AuthService.generateTokensPublic(user.id);

            if (user.isNewUser) {
                res.redirect(`${redirectUrl}/welcome?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`);
            } else {
                res.redirect(`${redirectUrl}/dashboard?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`);
            }
        } catch (error) {
            Logger.error('Google OAuth callback error', error as Error);
            const redirectUrl = process.env['FRONTEND_URL'] || 'http://localhost:3000';
            res.redirect(`${redirectUrl}/login?error=oauth_failed`);
        }
    }
);

/**
 * Apple OAuth routes
 */
router.get('/apple', passport.authenticate('apple'));

router.post('/apple/callback',
    passport.authenticate('apple', { session: false }),
    async (req, res, next) => {
        try {
            const user = req.user as any;
            const redirectUrl = process.env['FRONTEND_URL'] || 'http://localhost:3000';

            // Generate tokens for the OAuth user
            const tokens = await AuthService.generateTokensPublic(user.id);

            if (user.isNewUser) {
                res.redirect(`${redirectUrl}/welcome?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`);
            } else {
                res.redirect(`${redirectUrl}/dashboard?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`);
            }
        } catch (error) {
            Logger.error('Apple OAuth callback error', error as Error);
            const redirectUrl = process.env['FRONTEND_URL'] || 'http://localhost:3000';
            res.redirect(`${redirectUrl}/login?error=oauth_failed`);
        }
    }
);

/**
 * Get OAuth authorization URL
 */
router.get('/oauth/:provider/url', async (req, res, next) => {
    try {
        const { provider } = req.params;
        const { redirectUri } = req.query;

        if (provider !== 'google' && provider !== 'apple') {
            throw ApiError.badRequest('Unsupported OAuth provider');
        }

        const authUrl = await AuthService.getOAuthAuthorizationUrl(
            provider as 'google' | 'apple',
            redirectUri as string
        );

        res.json({
            success: true,
            data: { authUrl }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Handle OAuth callback (alternative to Passport routes)
 */
router.post('/oauth/:provider/callback', async (req, res, next) => {
    try {
        const { provider } = req.params;
        const { code, state } = req.body;
        const ipAddress = req.ip || req.connection.remoteAddress || '';
        const userAgent = req.get('User-Agent') || '';

        if (provider !== 'google' && provider !== 'apple') {
            throw ApiError.badRequest('Unsupported OAuth provider');
        }

        const deviceInfo = {
            ipAddress,
            userAgent,
            deviceId: req.body.deviceId || `${ipAddress}_${userAgent}`
        };

        const result = await AuthService.handleOAuthCallback(
            provider as 'google' | 'apple',
            code,
            state,
            deviceInfo
        );

        res.json({
            success: true,
            message: result.isNewUser ? 'Account created successfully' : 'Login successful',
            data: {
                user: {
                    id: result.user.id,
                    email: result.user.email,
                    username: result.user.username,
                    firstName: result.user.firstName,
                    lastName: result.user.lastName
                },
                tokens: result.tokens,
                isNewUser: result.isNewUser
            }
        });
    } catch (error) {
        next(error);
    }
});

export default router;