import crypto from 'crypto';
import geoip from 'geoip-lite';
import { UAParser } from 'ua-parser-js';
import { DatabaseConnection } from '../database/connection';
import { ApiError, Logger } from '@giga/common';
import { SecurityAuditService } from './security-audit-service';

export interface DeviceInfo {
    deviceId: string;
    deviceName?: string;
    deviceType: string;
    browser: string;
    os: string;
    ipAddress: string;
    location?: any;
    userAgent: string;
}

export interface UserDevice {
    id: string;
    userId: string;
    deviceId: string;
    deviceName?: string;
    deviceType: string;
    browser: string;
    os: string;
    ipAddress: string;
    location?: any;
    isTrusted: boolean;
    lastUsedAt: Date;
    createdAt: Date;
}

/**
 * Device management service for tracking and managing user devices
 */
export class DeviceManagementService {
    /**
     * Generate device fingerprint
     */
    public static generateDeviceFingerprint(
        userAgent: string,
        ipAddress: string,
        additionalData?: any
    ): string {
        const parser = new UAParser(userAgent);
        const result = parser.getResult();

        const fingerprint = {
            browser: result.browser.name,
            browserVersion: result.browser.version,
            os: result.os.name,
            osVersion: result.os.version,
            device: result.device.type || 'desktop',
            ipAddress: ipAddress.split('.').slice(0, 3).join('.'), // Partial IP for privacy
            ...additionalData
        };

        return crypto
            .createHash('sha256')
            .update(JSON.stringify(fingerprint))
            .digest('hex');
    }

    /**
     * Parse device information from user agent and IP
     */
    public static parseDeviceInfo(
        userAgent: string,
        ipAddress: string,
        deviceId?: string
    ): DeviceInfo {
        const parser = new UAParser(userAgent);
        const result = parser.getResult();

        // Get location from IP
        let location;
        const geo = geoip.lookup(ipAddress);
        if (geo) {
            location = {
                country: geo.country,
                region: geo.region,
                city: geo.city,
                timezone: geo.timezone,
                coordinates: [geo.ll[1], geo.ll[0]] // [longitude, latitude]
            };
        }

        const generatedDeviceId = deviceId || this.generateDeviceFingerprint(userAgent, ipAddress);

        return {
            deviceId: generatedDeviceId,
            deviceType: result.device.type || 'desktop',
            browser: `${result.browser.name || 'Unknown'} ${result.browser.version || ''}`.trim(),
            os: `${result.os.name || 'Unknown'} ${result.os.version || ''}`.trim(),
            ipAddress,
            location,
            userAgent
        };
    }    /**
   
  * Register or update device for user
     */
    public static async registerDevice(
        userId: string,
        deviceInfo: DeviceInfo,
        isTrusted: boolean = false
    ): Promise<UserDevice> {
        try {
            // Check if device already exists
            const existingDevice = await this.findUserDevice(userId, deviceInfo.deviceId);

            if (existingDevice) {
                // Update existing device
                const query = `
                    UPDATE user_devices
                    SET device_name = $1, device_type = $2, browser = $3, os = $4, 
                        ip_address = $5, location = $6, last_used_at = CURRENT_TIMESTAMP
                    WHERE user_id = $7 AND device_id = $8
                    RETURNING id, user_id, device_id, device_name, device_type, browser, os,
                             ip_address, location, is_trusted, last_used_at, created_at
                `;

                const values = [
                    deviceInfo.deviceName || null,
                    deviceInfo.deviceType,
                    deviceInfo.browser,
                    deviceInfo.os,
                    deviceInfo.ipAddress,
                    deviceInfo.location ? JSON.stringify(deviceInfo.location) : null,
                    userId,
                    deviceInfo.deviceId
                ];

                const result = await DatabaseConnection.query(query, values);
                return this.mapDbDeviceToDevice(result.rows[0]);
            } else {
                // Create new device
                const query = `
                    INSERT INTO user_devices (
                        user_id, device_id, device_name, device_type, browser, os,
                        ip_address, location, is_trusted
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    RETURNING id, user_id, device_id, device_name, device_type, browser, os,
                             ip_address, location, is_trusted, last_used_at, created_at
                `;

                const values = [
                    userId,
                    deviceInfo.deviceId,
                    deviceInfo.deviceName || null,
                    deviceInfo.deviceType,
                    deviceInfo.browser,
                    deviceInfo.os,
                    deviceInfo.ipAddress,
                    deviceInfo.location ? JSON.stringify(deviceInfo.location) : null,
                    isTrusted
                ];

                const result = await DatabaseConnection.query(query, values);
                const device = this.mapDbDeviceToDevice(result.rows[0]);

                // Log new device registration
                await SecurityAuditService.logEvent({
                    userId,
                    eventType: 'new_device_registered',
                    eventCategory: 'account_management',
                    severity: 'info',
                    ipAddress: deviceInfo.ipAddress,
                    userAgent: deviceInfo.userAgent,
                    deviceId: deviceInfo.deviceId,
                    location: deviceInfo.location,
                    eventData: {
                        deviceType: deviceInfo.deviceType,
                        browser: deviceInfo.browser,
                        os: deviceInfo.os,
                        isTrusted
                    },
                    success: true
                });

                return device;
            }
        } catch (error) {
            Logger.error('Failed to register device', error as Error);
            throw ApiError.internal('Failed to register device');
        }
    }

    /**
     * Find user device by device ID
     */
    public static async findUserDevice(userId: string, deviceId: string): Promise<UserDevice | null> {
        try {
            const query = `
                SELECT id, user_id, device_id, device_name, device_type, browser, os,
                       ip_address, location, is_trusted, last_used_at, created_at
                FROM user_devices
                WHERE user_id = $1 AND device_id = $2
            `;

            const result = await DatabaseConnection.query(query, [userId, deviceId]);

            if (result.rows.length === 0) {
                return null;
            }

            return this.mapDbDeviceToDevice(result.rows[0]);
        } catch (error) {
            throw ApiError.internal('Failed to find user device');
        }
    }

    /**
     * Get all devices for a user
     */
    public static async getUserDevices(userId: string): Promise<UserDevice[]> {
        try {
            const query = `
                SELECT id, user_id, device_id, device_name, device_type, browser, os,
                       ip_address, location, is_trusted, last_used_at, created_at
                FROM user_devices
                WHERE user_id = $1
                ORDER BY last_used_at DESC
            `;

            const result = await DatabaseConnection.query(query, [userId]);
            return result.rows.map(this.mapDbDeviceToDevice);
        } catch (error) {
            Logger.error('Failed to get user devices', error as Error);
            throw ApiError.internal('Failed to get user devices');
        }
    }

    /**
     * Trust a device
     */
    public static async trustDevice(userId: string, deviceId: string): Promise<void> {
        try {
            const query = `
                UPDATE user_devices
                SET is_trusted = true
                WHERE user_id = $1 AND device_id = $2
            `;

            const result = await DatabaseConnection.query(query, [userId, deviceId]);

            if (result.rowCount === 0) {
                throw ApiError.notFound('Device not found');
            }

            await SecurityAuditService.logEvent({
                userId,
                eventType: 'device_trusted',
                eventCategory: 'account_management',
                severity: 'info',
                deviceId,
                eventData: { deviceId },
                success: true
            });

            Logger.info('Device trusted', { userId, deviceId });
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            Logger.error('Failed to trust device', error as Error);
            throw ApiError.internal('Failed to trust device');
        }
    }

    /**
     * Untrust a device
     */
    public static async untrustDevice(userId: string, deviceId: string): Promise<void> {
        try {
            const query = `
                UPDATE user_devices
                SET is_trusted = false
                WHERE user_id = $1 AND device_id = $2
            `;

            const result = await DatabaseConnection.query(query, [userId, deviceId]);

            if (result.rowCount === 0) {
                throw ApiError.notFound('Device not found');
            }

            await SecurityAuditService.logEvent({
                userId,
                eventType: 'device_untrusted',
                eventCategory: 'account_management',
                severity: 'info',
                deviceId,
                eventData: { deviceId },
                success: true
            });

            Logger.info('Device untrusted', { userId, deviceId });
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            Logger.error('Failed to untrust device', error as Error);
            throw ApiError.internal('Failed to untrust device');
        }
    }

    /**
     * Remove a device
     */
    public static async removeDevice(userId: string, deviceId: string): Promise<void> {
        try {
            // Get device info before deletion for logging
            const device = await this.findUserDevice(userId, deviceId);
            if (!device) {
                throw ApiError.notFound('Device not found');
            }

            const query = `DELETE FROM user_devices WHERE user_id = $1 AND device_id = $2`;
            await DatabaseConnection.query(query, [userId, deviceId]);

            // Revoke all refresh tokens for this device
            await this.revokeDeviceTokens(userId, deviceId);

            await SecurityAuditService.logEvent({
                userId,
                eventType: 'device_removed',
                eventCategory: 'account_management',
                severity: 'info',
                deviceId,
                eventData: {
                    deviceType: device.deviceType,
                    browser: device.browser,
                    os: device.os
                },
                success: true
            });

            Logger.info('Device removed', { userId, deviceId });
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            Logger.error('Failed to remove device', error as Error);
            throw ApiError.internal('Failed to remove device');
        }
    }

    /**
     * Update device name
     */
    public static async updateDeviceName(
        userId: string,
        deviceId: string,
        deviceName: string
    ): Promise<void> {
        try {
            const query = `
                UPDATE user_devices
                SET device_name = $1
                WHERE user_id = $2 AND device_id = $3
            `;

            const result = await DatabaseConnection.query(query, [deviceName, userId, deviceId]);

            if (result.rowCount === 0) {
                throw ApiError.notFound('Device not found');
            }

            Logger.info('Device name updated', { userId, deviceId, deviceName });
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            Logger.error('Failed to update device name', error as Error);
            throw ApiError.internal('Failed to update device name');
        }
    }

    /**
     * Check if device is trusted
     */
    public static async isDeviceTrusted(userId: string, deviceId: string): Promise<boolean> {
        try {
            const device = await this.findUserDevice(userId, deviceId);
            return device?.isTrusted || false;
        } catch (error) {
            Logger.error('Failed to check device trust status', error as Error);
            return false;
        }
    }

    /**
     * Revoke all refresh tokens for a device
     */
    private static async revokeDeviceTokens(userId: string, deviceId: string): Promise<void> {
        try {
            const query = `
                UPDATE refresh_tokens
                SET is_revoked = true
                WHERE user_id = $1 AND device_id = $2 AND is_revoked = false
            `;

            await DatabaseConnection.query(query, [userId, deviceId]);
        } catch (error) {
            Logger.error('Failed to revoke device tokens', error as Error);
        }
    }

    /**
     * Map database device to UserDevice interface
     */
    private static mapDbDeviceToDevice(dbDevice: any): UserDevice {
        return {
            id: dbDevice.id,
            userId: dbDevice.user_id,
            deviceId: dbDevice.device_id,
            deviceName: dbDevice.device_name,
            deviceType: dbDevice.device_type,
            browser: dbDevice.browser,
            os: dbDevice.os,
            ipAddress: dbDevice.ip_address,
            location: dbDevice.location ? JSON.parse(dbDevice.location) : undefined,
            isTrusted: dbDevice.is_trusted,
            lastUsedAt: dbDevice.last_used_at,
            createdAt: dbDevice.created_at
        };
    }
}