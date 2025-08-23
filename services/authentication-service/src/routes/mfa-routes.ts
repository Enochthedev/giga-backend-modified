import express from 'express';
import { MfaService } from '../services/mfa-service';
import { authMiddleware } from '../middleware/auth-middleware';
import { ApiError } from '@giga/common';

const router = express.Router();

/**
 * Setup TOTP MFA
 */
router.post('/setup/totp', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.user!.userId;
        const userEmail = req.user!.email;

        const setupResult = await MfaService.setupTotp(userId, userEmail);

        res.json({
            success: true,
            data: {
                secret: setupResult.secret,
                qrCodeUrl: setupResult.qrCodeUrl,
                backupCodes: setupResult.backupCodes
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Verify and enable TOTP MFA
 */
router.post('/verify/totp', authMiddleware, async (req, res, next) => {
    try {
        const { token } = req.body;
        const userId = req.user!.userId;

        if (!token) {
            throw ApiError.badRequest('TOTP token is required');
        }

        await MfaService.verifyAndEnableTotp(userId, token);

        res.json({
            success: true,
            message: 'TOTP MFA enabled successfully'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Disable TOTP MFA
 */
router.post('/disable/totp', authMiddleware, async (req, res, next) => {
    try {
        const { currentPassword } = req.body;
        const userId = req.user!.userId;

        if (!currentPassword) {
            throw ApiError.badRequest('Current password is required');
        }

        await MfaService.disableTotp(userId, currentPassword);

        res.json({
            success: true,
            message: 'TOTP MFA disabled successfully'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Generate new backup codes
 */
router.post('/backup-codes/regenerate', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.user!.userId;

        const backupCodes = await MfaService.generateNewBackupCodes(userId);

        res.json({
            success: true,
            data: {
                backupCodes
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Get MFA status
 */
router.get('/status', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.user!.userId;

        const status = await MfaService.getMfaStatus(userId);

        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        next(error);
    }
});

export default router;