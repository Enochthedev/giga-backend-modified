import Driver, { IDriver, DriverStatus, VehicleType } from '../models/driver.model';
import ApiError from '../utils/api-error';
import httpStatus from 'http-status';

export interface DriverRegistrationData {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    licenseNumber: string;
    licenseExpiryDate: Date;
    vehicle: {
        make: string;
        model: string;
        year: number;
        color: string;
        licensePlate: string;
        vin: string;
        type: VehicleType;
        capacity: number;
        insuranceExpiryDate: Date;
        registrationExpiryDate: Date;
    };
}

export interface LocationUpdate {
    driverId: string;
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
    accuracy?: number;
}

class DriverService {
    /**
     * Register a new driver with vehicle information
     */
    async registerDriver(driverData: DriverRegistrationData): Promise<IDriver> {
        // Check if driver already exists
        if (await Driver.isUserTaken(driverData.userId)) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'User already has a driver account');
        }

        // Check if email is already taken
        const existingEmail = await Driver.findOne({ email: driverData.email });
        if (existingEmail) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Email already registered');
        }

        // Check if license number is already taken
        const existingLicense = await Driver.findOne({ licenseNumber: driverData.licenseNumber });
        if (existingLicense) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'License number already registered');
        }

        // Check if vehicle license plate is already taken
        const existingPlate = await Driver.findOne({ 'vehicle.licensePlate': driverData.vehicle.licensePlate });
        if (existingPlate) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Vehicle license plate already registered');
        }

        // Check if VIN is already taken
        const existingVin = await Driver.findOne({ 'vehicle.vin': driverData.vehicle.vin });
        if (existingVin) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Vehicle VIN already registered');
        }

        // Create new driver
        const driver = new Driver({
            ...driverData,
            status: DriverStatus.OFFLINE,
            rating: 0,
            totalRides: 0,
            totalEarnings: 0,
            isActive: true,
            isVerified: false,
            vehicle: {
                ...driverData.vehicle,
                isActive: true,
                isVerified: false
            },
            location: {
                type: 'Point',
                coordinates: [0, 0],
                timestamp: new Date()
            },
            rideOffers: []
        });

        return await driver.save();
    }

    /**
     * Get driver by ID
     */
    async getDriverById(driverId: string): Promise<IDriver | null> {
        return await Driver.findById(driverId).populate('currentRide');
    }

    /**
     * Get driver by user ID
     */
    async getDriverByUserId(userId: string): Promise<IDriver | null> {
        return await Driver.findOne({ userId }).populate('currentRide');
    }

    /**
     * Update driver status
     */
    async updateDriverStatus(driverId: string, status: DriverStatus): Promise<IDriver> {
        const driver = await Driver.findById(driverId);
        if (!driver) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Driver not found');
        }

        if (!driver.isActive || !driver.isVerified) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Driver account is not active or verified');
        }

        driver.status = status;
        return await driver.save();
    }

    /**
     * Update driver location
     */
    async updateDriverLocation(locationData: LocationUpdate): Promise<IDriver> {
        const driver = await Driver.findById(locationData.driverId);
        if (!driver) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Driver not found');
        }

        driver.location = {
            type: 'Point',
            coordinates: [locationData.longitude, locationData.latitude],
            heading: locationData.heading,
            speed: locationData.speed,
            accuracy: locationData.accuracy,
            timestamp: new Date()
        };

        return await driver.save();
    }

    /**
     * Find available drivers near location
     */
    async findAvailableDrivers(
        location: { latitude: number; longitude: number },
        radiusKm: number = 10,
        vehicleType?: VehicleType,
        limit: number = 10
    ): Promise<IDriver[]> {
        return await Driver.findAvailableDrivers(location, radiusKm, vehicleType, limit);
    }

    /**
     * Update driver profile
     */
    async updateDriverProfile(driverId: string, updateData: Partial<IDriver>): Promise<IDriver> {
        const driver = await Driver.findById(driverId);
        if (!driver) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Driver not found');
        }

        // Only allow updating certain fields
        const allowedFields = ['firstName', 'lastName', 'phoneNumber', 'profileImageUrl'];
        const filteredData: any = {};

        allowedFields.forEach(field => {
            if (updateData[field as keyof IDriver] !== undefined) {
                filteredData[field] = updateData[field as keyof IDriver];
            }
        });

        Object.assign(driver, filteredData);
        return await driver.save();
    }

    /**
     * Update vehicle information
     */
    async updateVehicle(driverId: string, vehicleData: any): Promise<IDriver> {
        const driver = await Driver.findById(driverId);
        if (!driver) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Driver not found');
        }

        // Check if license plate is being changed and if it's already taken
        if (vehicleData.licensePlate && vehicleData.licensePlate !== driver.vehicle.licensePlate) {
            const existingPlate = await Driver.findOne({
                'vehicle.licensePlate': vehicleData.licensePlate,
                _id: { $ne: driverId }
            });
            if (existingPlate) {
                throw new ApiError(httpStatus.BAD_REQUEST, 'Vehicle license plate already registered');
            }
        }

        // Update vehicle information
        Object.assign(driver.vehicle, vehicleData);
        return await driver.save();
    }

    /**
     * Get driver statistics
     */
    async getDriverStats(driverId: string): Promise<{
        totalRides: number;
        totalEarnings: number;
        averageRating: number;
        completionRate: number;
    }> {
        const driver = await Driver.findById(driverId);
        if (!driver) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Driver not found');
        }

        // TODO: Calculate completion rate from ride history
        const completionRate = 95; // Placeholder

        return {
            totalRides: driver.totalRides,
            totalEarnings: driver.totalEarnings,
            averageRating: driver.rating,
            completionRate
        };
    }

    /**
     * Verify driver account (admin only)
     */
    async verifyDriver(driverId: string): Promise<IDriver> {
        const driver = await Driver.findById(driverId);
        if (!driver) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Driver not found');
        }

        driver.isVerified = true;
        driver.vehicle.isVerified = true;
        return await driver.save();
    }

    /**
     * Deactivate driver account
     */
    async deactivateDriver(driverId: string, reason?: string): Promise<IDriver> {
        const driver = await Driver.findById(driverId);
        if (!driver) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Driver not found');
        }

        driver.isActive = false;
        driver.status = DriverStatus.OFFLINE;
        return await driver.save();
    }

    /**
     * Calculate distance between two points using Haversine formula
     */
    calculateDistance(
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
            Math.cos(this.toRadians(lat1)) *
            Math.cos(this.toRadians(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private toRadians(degrees: number): number {
        return degrees * (Math.PI / 180);
    }
}

export default new DriverService();