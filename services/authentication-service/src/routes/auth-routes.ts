import express from 'express';
import passport from 'passport';
import { AuthService } from '../services/auth-service';
import { OAuthService } from '../services/oauth-service';
import { MfaService } from '../services/mfa-service';
import { DeviceManagementService } from '../services/device-management-service';
import { FraudDetectionService } from '../services/fraud-detection-service';
import { SecurityAuditService } from '../services/security-audit-service';
import { ApiError } from '@giga/common';

const router = express.Router();

/**
 * Enhanced login with fraud detection and device management
 */
router.post('/login', async (req, res, next) => {
    try {
        const { email, password, deviceId } = req.body;
        const ipAddress = req.ip || req.connection.remoteAddress || '';
        const userAgent = req.get('User-Agent') || '';

        // Parse device information
        const deviceInfo = DeviceManagementService.parseDeviceInfo(
            userAgent,
            ipAddress,
            deviceId
        );

        // Get user first to check if account exists
        const user = await AuthService.findUserByEmail(email);
        if (!user) {
            await FraudDetectionService.logLoginAttempt({
                email,
                ipAddress,
                userAgent,
                success: false,
                failureReason: 'user_not_found',
                deviceFingerprint: deviceInfo.deviceId
            });
            throw ApiError.unauthorized('Invalid email or password');
        }

        // Perform fraud analysis
        const fraudCheck = await FraudDetectionService.analyzeLoginAttempt(
            user.id,
            email,
            ipAddress,
            userAgent,
            deviceInfo.deviceId
        );

        // Block if fraud score is too high
        if (fraudCheck.shouldBlock) {
            await SecurityAuditService.logEvent({
                userId: user.id,
                eventType: 'login_blocked',
                eventCategory: 'authentication',
                severity: 'warning',
                ipAddress,
                userAgent,
                deviceId: deviceInfo.deviceId,
                eventData: { fraudCheck },
                success: false
            });
            throw ApiError.unauthorized('Login blocked due to suspicious activity');
        }

        // Attempt login
        const loginResult = await AuthService.login({ email, password }, deviceInfo);

        // Update login attempt as successful
        await FraudDetectionService.updateLoginAttemptSuccess(email, ipAddress, true);

        // Register/update device
        const isNewDevice = !(await DeviceManagementService.findUserDevice(user.id, deviceInfo.deviceId));
        await DeviceManagementService.registerDevice(user.id, deviceInfo, false);

        // Check if MFA is required
        const mfaStatus = await MfaService.getMfaStatus(user.id);
        const requireMfa = mfaStatus.totpEnabled || fraudCheck.shouldRequireMfa || isNewDevice;

        if (requireMfa && mfaStatus.totpEnabled) {
            // Return partial success, require MFA
            res.json({
                success: true,
                requireMfa: true,
                user: {
                    id: loginResult.user.id,
                    email: loginResult.user.email,
                    firstName: loginResult.user.firstName,
                    lastName: loginResult.user.lastName
                },
                fraudCheck: {
                    riskLevel: fraudCheck.riskLevel,
                    flags: fraudCheck.flags
                }
            });
        } else {
            // Complete login
            res.json({
                success: true,
                user: loginResult.user,
                tokens: loginResult.tokens,
                isNewDevice,
                fraudCheck: {
                    riskLevel: fraudCheck.riskLevel,
                    flags: fraudCheck.flags
                }
            });
        }
    } catch (error) {
        next(error);
    }
});

/**
 * Verify MFA token and complete login
 */
router.post('/login/mfa', async (req, res, next) => {
    try {
        const { email, token, deviceId } = req.body;
        const ipAddress = req.ip || req.connection.remoteAddress || '';
        const userAgent = req.get('User-Agent') || '';

        const user = await AuthService.findUserByEmail(email);
        if (!user) {
            throw ApiError.unauthorized('Invalid session');
        }

        // Verify MFA token
        const mfaResult = await MfaService.verifyTotp(user.id, token);
        if (!mfaResult.success) {
            throw ApiError.unauthorized('Invalid MFA token');
        }

        // Parse device information
        const deviceInfo = DeviceManagementService.parseDeviceInfo(
            userAgent,
            ipAddress,
            deviceId
        );

        // Generate tokens
        const tokens = await AuthService.generateTokensPublic(user.id, deviceInfo);

        // Update device as trusted if MFA was successful
        if (mfaResult.success) {
            await DeviceManagementService.trustDevice(user.id, deviceInfo.deviceId);
        }

        res.json({
            success: true,
            user,
            tokens,
            backupCodeUsed: mfaResult.backupCodeUsed
        });
    } catch (error) {
        next(error);
    }
});

/**
 * OAuth login routes
 */
router.get('/oauth/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

router.get('/oauth/google/callback',
    passport.authenticate('google', { session: false }),
    async (req, res, next) => {
        try {
            const result = req.user as any;
            const redirectUrl = process.env['FRONTEND_URL'] || 'http://localhost:3000';

            if (result.isNewUser) {
                res.redirect(`${redirectUrl}/welcome?token=${result.tokens.accessToken}`);
            } else {
                res.redirect(`${redirectUrl}/dashboard?token=${result.tokens.accessToken}`);
            }
        } catch (error) {
            next(error);
        }
    }
);

router.get('/oauth/facebook', passport.authenticate('facebook', {
    scope: ['email']
}));

router.get('/oauth/facebook/callback',
    passport.authenticate('facebook', { session: false }),
    async (req, res, next) => {
        try {
            const result = req.user as any;
            const redirectUrl = process.env['FRONTEND_URL'] || 'http://localhost:3000';

            res.redirect(`${redirectUrl}/dashboard?token=${result.tokens.accessToken}`);
        } catch (error) {
            next(error);
        }
    }
);

router.get('/oauth/github', passport.authenticate('github', {
    scope: ['user:email']
}));

router.get('/oauth/github/callback',
    passport.authenticate('github', { session: false }),
    async (req, res, next) => {
        try {
            const result = req.user as any;
            const redirectUrl = process.env['FRONTEND_URL'] || 'http://localhost:3000';

            res.redirect(`${redirectUrl}/dashboard?token=${result.tokens.accessToken}`);
        } catch (error) {
            next(error);
        }
    }
);

export default router;