import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { ApiError, Logger } from '@giga/common';
import { UserMfaModel } from '../models/user-mfa-model';
import { SecurityAuditService } from './security-audit-service';

export interface MfaSetupResult {
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
}

export interface MfaVerificationResult {
    success: boolean;
    backupCodeUsed?: boolean;
}

/**
 * Multi-Factor Authentication service
 */
export class MfaService {
    private static readonly APP_NAME = process.env['APP_NAME'] || 'Giga Platform';
    private static readonly BACKUP_CODES_COUNT = 10;

    /**
     * Setup TOTP MFA for user
     */
    public static async setupTotp(userId: string, userEmail: string): Promise<MfaSetupResult> {
        try {
            // Check if TOTP is already enabled
            const existingMfa = await UserMfaModel.findByUserIdAndMethod(userId, 'totp');
            if (existingMfa && existingMfa.isEnabled) {
                throw ApiError.conflict('TOTP MFA is already enabled');
            }

            // Generate secret
            const secret = speakeasy.generateSecret({
                name: userEmail,
                issuer: this.APP_NAME,
                length: 32
            });

            // Generate backup codes
            const backupCodes = this.generateBackupCodes();

            // Save MFA configuration (not enabled yet)
            if (existingMfa) {
                await UserMfaModel.update(existingMfa.id, {
                    secret: secret.base32,
                    backupCodes,
                    isEnabled: false,
                    isVerified: false
                });
            } else {
                await UserMfaModel.create({
                    userId,
                    method: 'totp',
                    secret: secret.base32,
                    backupCodes,
                    isEnabled: false,
                    isVerified: false
                });
            }

            // Generate QR code
            const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

            Logger.info('TOTP MFA setup initiated', { userId });

            return {
                secret: secret.base32,
                qrCodeUrl,
                backupCodes
            };
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            Logger.error('TOTP MFA setup failed', error as Error);
            throw ApiError.internal('Failed to setup TOTP MFA');
        }
    }
    /**
      * Verify and enable TOTP MFA
      */
    public static async verifyAndEnableTotp(
        userId: string,
        token: string
    ): Promise<void> {
        try {
            const mfa = await UserMfaModel.findByUserIdAndMethod(userId, 'totp');
            if (!mfa || !mfa.secret) {
                throw ApiError.notFound('TOTP MFA not setup');
            }

            if (mfa.isEnabled) {
                throw ApiError.conflict('TOTP MFA is already enabled');
            }

            // Verify token
            const verified = speakeasy.totp.verify({
                secret: mfa.secret,
                encoding: 'base32',
                token,
                window: 2 // Allow 2 time steps (60 seconds) tolerance
            });

            if (!verified) {
                await SecurityAuditService.logEvent({
                    userId,
                    eventType: 'mfa_verification_failed',
                    eventCategory: 'authentication',
                    severity: 'warning',
                    eventData: { method: 'totp' },
                    success: false
                });
                throw ApiError.unauthorized('Invalid TOTP token');
            }

            // Enable MFA
            await UserMfaModel.update(mfa.id, {
                isEnabled: true,
                isVerified: true
            });

            // Update user MFA status
            await UserMfaModel.updateUserMfaStatus(userId, true);

            await SecurityAuditService.logEvent({
                userId,
                eventType: 'mfa_enabled',
                eventCategory: 'account_management',
                severity: 'info',
                eventData: { method: 'totp' },
                success: true
            });

            Logger.info('TOTP MFA enabled successfully', { userId });
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            Logger.error('TOTP MFA verification failed', error as Error);
            throw ApiError.internal('Failed to verify TOTP MFA');
        }
    }

    /**
     * Verify TOTP token for login
     */
    public static async verifyTotp(userId: string, token: string): Promise<MfaVerificationResult> {
        try {
            const mfa = await UserMfaModel.findByUserIdAndMethod(userId, 'totp');
            if (!mfa || !mfa.isEnabled || !mfa.secret) {
                throw ApiError.notFound('TOTP MFA not enabled');
            }

            // Check if it's a backup code
            if (mfa.backupCodes && mfa.backupCodes.includes(token)) {
                // Use backup code
                const updatedBackupCodes = mfa.backupCodes.filter(code => code !== token);
                await UserMfaModel.update(mfa.id, {
                    backupCodes: updatedBackupCodes
                });

                await SecurityAuditService.logEvent({
                    userId,
                    eventType: 'mfa_backup_code_used',
                    eventCategory: 'authentication',
                    severity: 'info',
                    eventData: { method: 'totp' },
                    success: true
                });

                return { success: true, backupCodeUsed: true };
            }

            // Verify TOTP token
            const verified = speakeasy.totp.verify({
                secret: mfa.secret,
                encoding: 'base32',
                token,
                window: 2
            });

            if (!verified) {
                await SecurityAuditService.logEvent({
                    userId,
                    eventType: 'mfa_verification_failed',
                    eventCategory: 'authentication',
                    severity: 'warning',
                    eventData: { method: 'totp' },
                    success: false
                });
                return { success: false };
            }

            return { success: true };
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            Logger.error('TOTP verification failed', error as Error);
            throw ApiError.internal('Failed to verify TOTP');
        }
    }

    /**
     * Disable TOTP MFA
     */
    public static async disableTotp(userId: string, currentPassword: string): Promise<void> {
        try {
            // Verify current password for security
            const user = await UserMfaModel.getUserWithPassword(userId);
            if (!user) {
                throw ApiError.notFound('User not found');
            }

            const isPasswordValid = await UserMfaModel.verifyPassword(currentPassword, user.passwordHash);
            if (!isPasswordValid) {
                throw ApiError.unauthorized('Invalid password');
            }

            const mfa = await UserMfaModel.findByUserIdAndMethod(userId, 'totp');
            if (!mfa || !mfa.isEnabled) {
                throw ApiError.notFound('TOTP MFA not enabled');
            }

            // Disable MFA
            await UserMfaModel.update(mfa.id, {
                isEnabled: false,
                isVerified: false,
                secret: null,
                backupCodes: null
            });

            // Update user MFA status
            await UserMfaModel.updateUserMfaStatus(userId, false);

            await SecurityAuditService.logEvent({
                userId,
                eventType: 'mfa_disabled',
                eventCategory: 'account_management',
                severity: 'warning',
                eventData: { method: 'totp' },
                success: true
            });

            Logger.info('TOTP MFA disabled', { userId });
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            Logger.error('Failed to disable TOTP MFA', error as Error);
            throw ApiError.internal('Failed to disable TOTP MFA');
        }
    }

    /**
     * Generate new backup codes
     */
    public static async generateNewBackupCodes(userId: string): Promise<string[]> {
        try {
            const mfa = await UserMfaModel.findByUserIdAndMethod(userId, 'totp');
            if (!mfa || !mfa.isEnabled) {
                throw ApiError.notFound('TOTP MFA not enabled');
            }

            const backupCodes = this.generateBackupCodes();
            await UserMfaModel.update(mfa.id, { backupCodes });

            await SecurityAuditService.logEvent({
                userId,
                eventType: 'mfa_backup_codes_regenerated',
                eventCategory: 'account_management',
                severity: 'info',
                eventData: { method: 'totp' },
                success: true
            });

            Logger.info('New backup codes generated', { userId });
            return backupCodes;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            Logger.error('Failed to generate backup codes', error as Error);
            throw ApiError.internal('Failed to generate backup codes');
        }
    }

    /**
     * Get MFA status for user
     */
    public static async getMfaStatus(userId: string): Promise<{
        totpEnabled: boolean;
        backupCodesRemaining: number;
        methods: Array<{
            method: string;
            enabled: boolean;
            verified: boolean;
        }>;
    }> {
        try {
            const mfaMethods = await UserMfaModel.findByUserId(userId);

            const totpMfa = mfaMethods.find(m => m.method === 'totp');
            const backupCodesRemaining = totpMfa?.backupCodes?.length || 0;

            return {
                totpEnabled: totpMfa?.isEnabled || false,
                backupCodesRemaining,
                methods: mfaMethods.map(m => ({
                    method: m.method,
                    enabled: m.isEnabled,
                    verified: m.isVerified
                }))
            };
        } catch (error) {
            Logger.error('Failed to get MFA status', error as Error);
            throw ApiError.internal('Failed to get MFA status');
        }
    }

    /**
     * Generate backup codes
     */
    private static generateBackupCodes(): string[] {
        const codes: string[] = [];
        for (let i = 0; i < this.BACKUP_CODES_COUNT; i++) {
            const code = crypto.randomBytes(4).toString('hex').toUpperCase();
            codes.push(code);
        }
        return codes;
    }
}