import geoip from 'geoip-lite';
import { DatabaseConnection } from '../database/connection';
import { ApiError, Logger } from '@giga/common';
import { SecurityAuditService } from './security-audit-service';

export interface FraudCheckResult {
    riskScore: number; // 0-100, higher is more risky
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    flags: string[];
    shouldBlock: boolean;
    shouldRequireMfa: boolean;
    shouldRequireVerification: boolean;
}

export interface LoginAttempt {
    email: string;
    ipAddress: string;
    userAgent: string;
    success: boolean;
    failureReason?: string;
    deviceFingerprint?: string;
    location?: any;
}

/**
 * Fraud detection service for identifying suspicious activities
 */
export class FraudDetectionService {
    private static readonly MAX_FAILED_ATTEMPTS = 5;
    private static readonly LOCKOUT_DURATION_MINUTES = 30;
    private static readonly SUSPICIOUS_LOCATION_THRESHOLD_KM = 1000;
    private static readonly RAPID_LOGIN_THRESHOLD_MINUTES = 5;

    /**
     * Analyze login attempt for fraud indicators
     */
    public static async analyzeLoginAttempt(
        userId: string,
        email: string,
        ipAddress: string,
        userAgent: string,
        deviceFingerprint?: string
    ): Promise<FraudCheckResult> {
        try {
            const flags: string[] = [];
            let riskScore = 0;

            // Log the login attempt
            await this.logLoginAttempt({
                email,
                ipAddress,
                userAgent,
                success: false, // Will be updated later if successful
                deviceFingerprint
            });

            // Check 1: Failed login attempts from this IP
            const recentFailedAttempts = await this.getRecentFailedAttempts(ipAddress, 60); // Last hour
            if (recentFailedAttempts >= 3) {
                flags.push('multiple_failed_attempts_from_ip');
                riskScore += 30;
            }

            // Check 2: Failed login attempts for this email
            const emailFailedAttempts = await this.getRecentFailedAttemptsForEmail(email, 60);
            if (emailFailedAttempts >= this.MAX_FAILED_ATTEMPTS) {
                flags.push('account_brute_force_attempt');
                riskScore += 40;
            }

            // Check 3: New device/location
            const isNewDevice = await this.isNewDevice(userId, deviceFingerprint);
            if (isNewDevice) {
                flags.push('new_device');
                riskScore += 15;
            }

            // Check 4: Suspicious location change
            const locationRisk = await this.checkLocationRisk(userId, ipAddress);
            if (locationRisk.isSuspicious) {
                flags.push('suspicious_location_change');
                riskScore += locationRisk.riskScore;
            }

            // Check 5: Rapid successive logins
            const rapidLoginRisk = await this.checkRapidLogins(userId, 5); // Last 5 minutes
            if (rapidLoginRisk) {
                flags.push('rapid_successive_logins');
                riskScore += 20;
            }

            // Check 6: Known malicious IP patterns
            const ipRisk = await this.checkIpReputation(ipAddress);
            if (ipRisk.isMalicious) {
                flags.push('malicious_ip');
                riskScore += ipRisk.riskScore;
            }

            // Check 7: Unusual time patterns
            const timeRisk = this.checkTimePatterns(userId);
            if (timeRisk.isUnusual) {
                flags.push('unusual_time_pattern');
                riskScore += 10;
            }

            // Determine risk level and actions
            const result = this.calculateRiskLevel(riskScore, flags);

            // Log fraud analysis
            await SecurityAuditService.logEvent({
                userId,
                eventType: 'fraud_analysis',
                eventCategory: 'authentication',
                severity: result.riskLevel === 'critical' ? 'critical' :
                    result.riskLevel === 'high' ? 'error' : 'info',
                ipAddress,
                userAgent,
                deviceId: deviceFingerprint,
                eventData: {
                    riskScore: result.riskScore,
                    riskLevel: result.riskLevel,
                    flags: result.flags,
                    shouldBlock: result.shouldBlock
                },
                success: true
            });

            return result;
        } catch (error) {
            Logger.error('Fraud analysis failed', error as Error);
            // Return safe defaults on error
            return {
                riskScore: 50,
                riskLevel: 'medium',
                flags: ['analysis_error'],
                shouldBlock: false,
                shouldRequireMfa: true,
                shouldRequireVerification: false
            };
        }
    }    /**

     * Log login attempt
     */
    public static async logLoginAttempt(attempt: LoginAttempt): Promise<void> {
        try {
            // Get location from IP
            let location = attempt.location;
            if (!location && attempt.ipAddress) {
                const geo = geoip.lookup(attempt.ipAddress);
                if (geo) {
                    location = {
                        country: geo.country,
                        region: geo.region,
                        city: geo.city,
                        timezone: geo.timezone,
                        coordinates: [geo.ll[1], geo.ll[0]]
                    };
                }
            }

            const query = `
                INSERT INTO login_attempts (
                    email, ip_address, user_agent, success, failure_reason,
                    device_fingerprint, location
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `;

            const values = [
                attempt.email,
                attempt.ipAddress,
                attempt.userAgent,
                attempt.success,
                attempt.failureReason || null,
                attempt.deviceFingerprint || null,
                location ? JSON.stringify(location) : null
            ];

            await DatabaseConnection.query(query, values);
        } catch (error) {
            Logger.error('Failed to log login attempt', error as Error);
        }
    }

    /**
     * Update login attempt success status
     */
    public static async updateLoginAttemptSuccess(
        email: string,
        ipAddress: string,
        success: boolean
    ): Promise<void> {
        try {
            const query = `
                UPDATE login_attempts
                SET success = $1
                WHERE email = $2 AND ip_address = $3 AND created_at > NOW() - INTERVAL '5 minutes'
                ORDER BY created_at DESC
                LIMIT 1
            `;

            await DatabaseConnection.query(query, [success, email, ipAddress]);
        } catch (error) {
            Logger.error('Failed to update login attempt', error as Error);
        }
    }

    /**
     * Get recent failed attempts from IP
     */
    private static async getRecentFailedAttempts(
        ipAddress: string,
        minutes: number
    ): Promise<number> {
        try {
            const query = `
                SELECT COUNT(*) as count
                FROM login_attempts
                WHERE ip_address = $1 
                AND success = false 
                AND created_at > NOW() - INTERVAL '${minutes} minutes'
            `;

            const result = await DatabaseConnection.query(query, [ipAddress]);
            return parseInt(result.rows[0].count) || 0;
        } catch (error) {
            Logger.error('Failed to get recent failed attempts', error as Error);
            return 0;
        }
    }

    /**
     * Get recent failed attempts for email
     */
    private static async getRecentFailedAttemptsForEmail(
        email: string,
        minutes: number
    ): Promise<number> {
        try {
            const query = `
                SELECT COUNT(*) as count
                FROM login_attempts
                WHERE email = $1 
                AND success = false 
                AND created_at > NOW() - INTERVAL '${minutes} minutes'
            `;

            const result = await DatabaseConnection.query(query, [email]);
            return parseInt(result.rows[0].count) || 0;
        } catch (error) {
            Logger.error('Failed to get recent failed attempts for email', error as Error);
            return 0;
        }
    }

    /**
     * Check if device is new for user
     */
    private static async isNewDevice(
        userId: string,
        deviceFingerprint?: string
    ): Promise<boolean> {
        if (!deviceFingerprint) return true;

        try {
            const query = `
                SELECT COUNT(*) as count
                FROM user_devices
                WHERE user_id = $1 AND device_id = $2
            `;

            const result = await DatabaseConnection.query(query, [userId, deviceFingerprint]);
            return parseInt(result.rows[0].count) === 0;
        } catch (error) {
            Logger.error('Failed to check if device is new', error as Error);
            return true; // Assume new device on error for safety
        }
    }

    /**
     * Check location risk based on previous logins
     */
    private static async checkLocationRisk(
        userId: string,
        ipAddress: string
    ): Promise<{ isSuspicious: boolean; riskScore: number }> {
        try {
            const currentGeo = geoip.lookup(ipAddress);
            if (!currentGeo) {
                return { isSuspicious: false, riskScore: 0 };
            }

            // Get recent login locations
            const query = `
                SELECT DISTINCT location
                FROM security_audit_log
                WHERE user_id = $1 
                AND event_type = 'login'
                AND success = true
                AND location IS NOT NULL
                AND created_at > NOW() - INTERVAL '30 days'
                ORDER BY created_at DESC
                LIMIT 10
            `;

            const result = await DatabaseConnection.query(query, [userId]);

            if (result.rows.length === 0) {
                return { isSuspicious: false, riskScore: 0 };
            }

            // Check distance from previous locations
            let minDistance = Infinity;
            for (const row of result.rows) {
                const location = JSON.parse(row.location);
                if (location.coordinates) {
                    const distance = this.calculateDistance(
                        currentGeo.ll[0], currentGeo.ll[1],
                        location.coordinates[1], location.coordinates[0]
                    );
                    minDistance = Math.min(minDistance, distance);
                }
            }

            const isSuspicious = minDistance > this.SUSPICIOUS_LOCATION_THRESHOLD_KM;
            const riskScore = isSuspicious ? Math.min(30, minDistance / 100) : 0;

            return { isSuspicious, riskScore };
        } catch (error) {
            Logger.error('Failed to check location risk', error as Error);
            return { isSuspicious: false, riskScore: 0 };
        }
    }

    /**
     * Check for rapid successive logins
     */
    private static async checkRapidLogins(
        userId: string,
        minutes: number
    ): Promise<boolean> {
        try {
            const query = `
                SELECT COUNT(*) as count
                FROM security_audit_log
                WHERE user_id = $1 
                AND event_type = 'login'
                AND success = true
                AND created_at > NOW() - INTERVAL '${minutes} minutes'
            `;

            const result = await DatabaseConnection.query(query, [userId]);
            return parseInt(result.rows[0].count) > 3;
        } catch (error) {
            Logger.error('Failed to check rapid logins', error as Error);
            return false;
        }
    }

    /**
     * Check IP reputation (simplified implementation)
     */
    private static async checkIpReputation(
        ipAddress: string
    ): Promise<{ isMalicious: boolean; riskScore: number }> {
        try {
            // Check against known malicious patterns
            const suspiciousPatterns = [
                /^10\./, // Private networks (could be VPN/proxy)
                /^192\.168\./, // Private networks
                /^172\.(1[6-9]|2[0-9]|3[0-1])\./ // Private networks
            ];

            // Check for Tor exit nodes or known VPN ranges (simplified)
            const isTorOrVpn = suspiciousPatterns.some(pattern => pattern.test(ipAddress));

            // Check recent malicious activity from this IP
            const query = `
                SELECT COUNT(*) as count
                FROM login_attempts
                WHERE ip_address = $1 
                AND success = false
                AND created_at > NOW() - INTERVAL '24 hours'
            `;

            const result = await DatabaseConnection.query(query, [ipAddress]);
            const recentFailures = parseInt(result.rows[0].count);

            const isMalicious = isTorOrVpn || recentFailures > 10;
            const riskScore = isTorOrVpn ? 25 : Math.min(25, recentFailures * 2);

            return { isMalicious, riskScore };
        } catch (error) {
            Logger.error('Failed to check IP reputation', error as Error);
            return { isMalicious: false, riskScore: 0 };
        }
    }

    /**
     * Check time patterns (simplified implementation)
     */
    private static checkTimePatterns(userId: string): { isUnusual: boolean } {
        // Simplified: Check if login is during unusual hours (2 AM - 6 AM)
        const currentHour = new Date().getHours();
        const isUnusual = currentHour >= 2 && currentHour <= 6;

        return { isUnusual };
    }

    /**
     * Calculate risk level based on score and flags
     */
    private static calculateRiskLevel(
        riskScore: number,
        flags: string[]
    ): FraudCheckResult {
        let riskLevel: 'low' | 'medium' | 'high' | 'critical';
        let shouldBlock = false;
        let shouldRequireMfa = false;
        let shouldRequireVerification = false;

        if (riskScore >= 80 || flags.includes('account_brute_force_attempt')) {
            riskLevel = 'critical';
            shouldBlock = true;
            shouldRequireMfa = true;
            shouldRequireVerification = true;
        } else if (riskScore >= 60 || flags.includes('malicious_ip')) {
            riskLevel = 'high';
            shouldRequireMfa = true;
            shouldRequireVerification = true;
        } else if (riskScore >= 30 || flags.includes('new_device')) {
            riskLevel = 'medium';
            shouldRequireMfa = true;
        } else {
            riskLevel = 'low';
        }

        return {
            riskScore,
            riskLevel,
            flags,
            shouldBlock,
            shouldRequireMfa,
            shouldRequireVerification
        };
    }

    /**
     * Calculate distance between two coordinates in kilometers
     */
    private static calculateDistance(
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number
    ): number {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Convert degrees to radians
     */
    private static toRadians(degrees: number): number {
        return degrees * (Math.PI / 180);
    }

    /**
     * Check if account should be locked
     */
    public static async shouldLockAccount(email: string): Promise<boolean> {
        const recentFailures = await this.getRecentFailedAttemptsForEmail(email, 60);
        return recentFailures >= this.MAX_FAILED_ATTEMPTS;
    }

    /**
     * Lock user account
     */
    public static async lockAccount(
        userId: string,
        reason: string,
        durationMinutes: number = this.LOCKOUT_DURATION_MINUTES
    ): Promise<void> {
        try {
            const lockedUntil = new Date();
            lockedUntil.setMinutes(lockedUntil.getMinutes() + durationMinutes);

            const userQuery = `
                UPDATE users
                SET account_locked_until = $1, failed_login_attempts = failed_login_attempts + 1
                WHERE id = $2
            `;

            await DatabaseConnection.query(userQuery, [lockedUntil, userId]);

            // Log lockout
            const lockoutQuery = `
                INSERT INTO account_lockouts (user_id, reason, locked_until)
                VALUES ($1, $2, $3)
            `;

            await DatabaseConnection.query(lockoutQuery, [userId, reason, lockedUntil]);

            await SecurityAuditService.logEvent({
                userId,
                eventType: 'account_locked',
                eventCategory: 'authentication',
                severity: 'warning',
                eventData: { reason, lockedUntil, durationMinutes },
                success: true
            });

            Logger.warn('Account locked', { userId, reason, lockedUntil });
        } catch (error) {
            Logger.error('Failed to lock account', error as Error);
            throw ApiError.internal('Failed to lock account');
        }
    }
}