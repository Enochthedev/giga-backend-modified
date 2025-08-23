import { Request, Response } from 'express';
import driverService, { DriverRegistrationData, LocationUpdate } from '../services/driver.service';
import { DriverStatus, VehicleType } from '../models/driver.model';
import catchAsync from '../utils/catch-async';
import httpStatus from 'http-status';

class DriverController {
    /**
     * Register a new driver
     */
    registerDriver = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const driverData: DriverRegistrationData = req.body;
        const driver = await driverService.registerDriver(driverData);

        res.status(httpStatus.CREATED).json({
            success: true,
            message: 'Driver registered successfully',
            data: {
                id: driver._id,
                userId: driver.userId,
                fullName: `${driver.firstName} ${driver.lastName}`,
                email: driver.email,
                phoneNumber: driver.phoneNumber,
                status: driver.status,
                isVerified: driver.isVerified,
                vehicle: driver.vehicle
            }
        });
    });

    /**
     * Get driver profile
     */
    getDriverProfile = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const { driverId } = req.params;
        const driver = await driverService.getDriverById(driverId);

        if (!driver) {
            res.status(httpStatus.NOT_FOUND).json({
                success: false,
                message: 'Driver not found'
            });
            return;
        }

        res.json({
            success: true,
            data: {
                id: driver._id,
                userId: driver.userId,
                fullName: `${driver.firstName} ${driver.lastName}`,
                email: driver.email,
                phoneNumber: driver.phoneNumber,
                licenseNumber: driver.licenseNumber,
                licenseExpiryDate: driver.licenseExpiryDate,
                status: driver.status,
                rating: driver.rating,
                totalRides: driver.totalRides,
                totalEarnings: driver.totalEarnings,
                isActive: driver.isActive,
                isVerified: driver.isVerified,
                profileImageUrl: driver.profileImageUrl,
                vehicle: driver.vehicle,
                location: driver.location,
                createdAt: driver.createdAt
            }
        });
    });

    /**
     * Update driver status
     */
    updateDriverStatus = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const { driverId } = req.params;
        const { status } = req.body;

        if (!Object.values(DriverStatus).includes(status)) {
            res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Invalid driver status'
            });
            return;
        }

        const driver = await driverService.updateDriverStatus(driverId, status);

        res.json({
            success: true,
            message: 'Driver status updated successfully',
            data: {
                id: driver._id,
                status: driver.status
            }
        });
    });

    /**
     * Update driver location
     */
    updateDriverLocation = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const { driverId } = req.params;
        const { latitude, longitude, heading, speed, accuracy } = req.body;

        if (!latitude || !longitude) {
            res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Latitude and longitude are required'
            });
            return;
        }

        const locationData: LocationUpdate = {
            driverId,
            latitude,
            longitude,
            heading,
            speed,
            accuracy
        };

        const driver = await driverService.updateDriverLocation(locationData);

        res.json({
            success: true,
            message: 'Driver location updated successfully',
            data: {
                id: driver._id,
                location: driver.location
            }
        });
    });

    /**
     * Update driver profile
     */
    updateDriverProfile = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const { driverId } = req.params;
        const updateData = req.body;

        const driver = await driverService.updateDriverProfile(driverId, updateData);

        res.json({
            success: true,
            message: 'Driver profile updated successfully',
            data: {
                id: driver._id,
                fullName: `${driver.firstName} ${driver.lastName}`,
                phoneNumber: driver.phoneNumber,
                profileImageUrl: driver.profileImageUrl
            }
        });
    });

    /**
     * Update vehicle information
     */
    updateVehicle = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const { driverId } = req.params;
        const vehicleData = req.body;

        const driver = await driverService.updateVehicle(driverId, vehicleData);

        res.json({
            success: true,
            message: 'Vehicle information updated successfully',
            data: driver.vehicle
        });
    });

    /**
     * Get driver statistics
     */
    getDriverStats = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const { driverId } = req.params;
        const stats = await driverService.getDriverStats(driverId);

        res.json({
            success: true,
            data: stats
        });
    });

    /**
     * Find available drivers near location
     */
    findAvailableDrivers = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const { latitude, longitude, radius = 10, vehicleType, limit = 10 } = req.query;

        if (!latitude || !longitude) {
            res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Latitude and longitude are required'
            });
            return;
        }

        const drivers = await driverService.findAvailableDrivers(
            {
                latitude: parseFloat(latitude as string),
                longitude: parseFloat(longitude as string)
            },
            parseFloat(radius as string),
            vehicleType as VehicleType,
            parseInt(limit as string)
        );

        res.json({
            success: true,
            data: drivers.map(driver => ({
                id: driver._id,
                fullName: `${driver.firstName} ${driver.lastName}`,
                rating: driver.rating,
                totalRides: driver.totalRides,
                vehicle: {
                    type: driver.vehicle?.type,
                    make: driver.vehicle?.make,
                    model: driver.vehicle?.model,
                    year: driver.vehicle?.year,
                    color: driver.vehicle?.color,
                    licensePlate: driver.vehicle?.licensePlate
                },
                location: driver.location
            }))
        });
    });

    /**
     * Verify driver account (admin only)
     */
    verifyDriver = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const { driverId } = req.params;
        const driver = await driverService.verifyDriver(driverId);

        res.json({
            success: true,
            message: 'Driver verified successfully',
            data: {
                id: driver._id,
                isVerified: driver.isVerified
            }
        });
    });

    /**
     * Deactivate driver account (admin only)
     */
    deactivateDriver = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const { driverId } = req.params;
        const { reason } = req.body;

        const driver = await driverService.deactivateDriver(driverId, reason);

        res.json({
            success: true,
            message: 'Driver deactivated successfully',
            data: {
                id: driver._id,
                isActive: driver.isActive,
                status: driver.status
            }
        });
    });
}

export default new DriverController();