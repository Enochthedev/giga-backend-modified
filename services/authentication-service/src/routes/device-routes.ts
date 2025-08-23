import express from 'express';
import { DeviceManagementService } from '../services/device-management-service';
import { authMiddleware } from '../middleware/auth-middleware';
import { ApiError } from '@giga/common';

const router = express.Router();

/**
 * Get user devices
 */
router.get('/', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.user!.userId;

        const devices = await DeviceManagementService.getUserDevices(userId);

        res.json({
            success: true,
            data: {
                devices: devices.map(device => ({
                    id: device.id,
                    deviceId: device.deviceId,
                    deviceName: device.deviceName,
                    deviceType: device.deviceType,
                    browser: device.browser,
                    os: device.os,
                    location: device.location,
                    isTrusted: device.isTrusted,
                    lastUsedAt: device.lastUsedAt,
                    createdAt: device.createdAt
                    // Don't expose IP address for privacy
                }))
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Trust a device
 */
router.post('/:deviceId/trust', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.user!.userId;
        const { deviceId } = req.params;

        await DeviceManagementService.trustDevice(userId, deviceId);

        res.json({
            success: true,
            message: 'Device trusted successfully'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Untrust a device
 */
router.post('/:deviceId/untrust', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.user!.userId;
        const { deviceId } = req.params;

        await DeviceManagementService.untrustDevice(userId, deviceId);

        res.json({
            success: true,
            message: 'Device untrusted successfully'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Remove a device
 */
router.delete('/:deviceId', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.user!.userId;
        const { deviceId } = req.params;

        await DeviceManagementService.removeDevice(userId, deviceId);

        res.json({
            success: true,
            message: 'Device removed successfully'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Update device name
 */
router.patch('/:deviceId/name', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.user!.userId;
        const { deviceId } = req.params;
        const { deviceName } = req.body;

        if (!deviceName || deviceName.trim().length === 0) {
            throw ApiError.badRequest('Device name is required');
        }

        await DeviceManagementService.updateDeviceName(userId, deviceId, deviceName.trim());

        res.json({
            success: true,
            message: 'Device name updated successfully'
        });
    } catch (error) {
        next(error);
    }
});

export default router;