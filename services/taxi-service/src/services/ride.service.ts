import Ride, { IRide, RideStatus } from '../models/ride.model';
import Driver, { IDriver, DriverStatus, VehicleType } from '../models/driver.model';
import Customer, { ICustomer } from '../models/customer.model';
import ApiError from '../utils/api-error';
import httpStatus from 'http-status';
import rideConfig from '../config/ride-config';
import pricingService from './pricing.service';
import routeOptimizationService from './route-optimization.service';

export interface RideRequestData {
    customerId: string;
    pickupLocation: {
        latitude: number;
        longitude: number;
        address?: string;
    };
    dropoffLocation: {
        latitude: number;
        longitude: number;
        address?: string;
    };
    vehicleType?: VehicleType;
    customerNotes?: string;
}

export interface RideEstimate {
    distance: number; // in meters
    duration: number; // in seconds
    fare: number;
    currency: string;
}

export interface DriverMatch {
    driverId: string;
    estimatedArrivalTime: number;
    distance: number;
}

class RideService {
    /**
     * Request a ride
     */
    async requestRide(requestData: RideRequestData): Promise<{
        ride: IRide;
        availableDrivers: DriverMatch[];
    }> {
        // Check if customer exists
        const customer = await Customer.findOne({ userId: requestData.customerId });
        if (!customer) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Customer not found');
        }

        // Check if customer already has an active ride
        const existingRide = await Ride.findActiveRideForCustomer(requestData.customerId);
        if (existingRide) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Customer already has an active ride');
        }

        // Calculate ride estimate
        const estimate = await this.calculateRideEstimate(
            requestData.pickupLocation,
            requestData.dropoffLocation,
            requestData.vehicleType || VehicleType.REGULAR
        );

        // Create ride
        const ride = new Ride({
            customerId: requestData.customerId,
            driverId: null, // Will be set when driver accepts
            status: RideStatus.REQUESTED,
            vehicleType: requestData.vehicleType || VehicleType.REGULAR,
            pickupLocation: {
                type: 'Point',
                coordinates: [requestData.pickupLocation.longitude, requestData.pickupLocation.latitude],
                address: requestData.pickupLocation.address
            },
            dropoffLocation: {
                type: 'Point',
                coordinates: [requestData.dropoffLocation.longitude, requestData.dropoffLocation.latitude],
                address: requestData.dropoffLocation.address
            },
            estimatedFare: estimate.fare,
            estimatedDistance: estimate.distance,
            estimatedDuration: estimate.duration,
            customerNotes: requestData.customerNotes
        });

        const savedRide = await ride.save();

        // Update customer's current ride
        customer.currentRide = savedRide._id as any;
        await customer.save();

        // Find available drivers
        const availableDrivers = await this.findMatchingDrivers(requestData);

        return {
            ride: savedRide,
            availableDrivers
        };
    }

    /**
     * Find matching drivers for a ride request
     */
    async findMatchingDrivers(requestData: RideRequestData): Promise<DriverMatch[]> {
        const drivers = await Driver.findAvailableDrivers(
            requestData.pickupLocation,
            rideConfig.defaultSearchRadius,
            requestData.vehicleType,
            5
        );

        const matches: DriverMatch[] = [];

        for (const driver of drivers) {
            const distance = this.calculateDistance(
                driver.location.coordinates[1], // latitude
                driver.location.coordinates[0], // longitude
                requestData.pickupLocation.latitude,
                requestData.pickupLocation.longitude
            );

            const estimatedArrivalTime = this.calculateETA(distance);

            matches.push({
                driverId: (driver._id as any).toString(),
                estimatedArrivalTime,
                distance: Math.round(distance * 1000) // Convert to meters
            });
        }

        return matches.sort((a, b) => a.estimatedArrivalTime - b.estimatedArrivalTime);
    }

    /**
     * Driver accepts a ride
     */
    async acceptRide(driverId: string, rideId: string): Promise<IRide> {
        const driver = await Driver.findById(driverId);
        if (!driver) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Driver not found');
        }

        if (!driver.canAcceptRide()) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Driver is not available to accept rides');
        }

        const ride = await Ride.findById(rideId);
        if (!ride) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Ride not found');
        }

        if (ride.status !== RideStatus.REQUESTED) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Ride is no longer available');
        }

        // Update ride
        ride.driverId = driver._id;
        ride.status = RideStatus.ACCEPTED;
        ride.acceptedAt = new Date();

        // Calculate driver arrival time
        const distance = this.calculateDistance(
            driver.location.coordinates[1],
            driver.location.coordinates[0],
            ride.pickupLocation.coordinates[1],
            ride.pickupLocation.coordinates[0]
        );
        ride.driverArrivalTime = this.calculateETA(distance);

        await ride.save();

        // Update driver status
        driver.status = DriverStatus.BUSY;
        driver.currentRide = ride._id;
        await driver.save();

        return ride;
    }

    /**
     * Driver arrives at pickup location
     */
    async driverArrived(rideId: string, driverId: string): Promise<IRide> {
        const ride = await this.validateRideAndDriver(rideId, driverId);

        if (ride.status !== RideStatus.ACCEPTED) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid ride status for driver arrival');
        }

        ride.status = RideStatus.DRIVER_ARRIVING;
        ride.driverArrivedAt = new Date();

        return await ride.save();
    }

    /**
     * Start the ride
     */
    async startRide(rideId: string, driverId: string): Promise<IRide> {
        const ride = await this.validateRideAndDriver(rideId, driverId);

        if (ride.status !== RideStatus.DRIVER_ARRIVING) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid ride status for starting ride');
        }

        ride.status = RideStatus.IN_PROGRESS;
        ride.startedAt = new Date();

        // Update driver status
        const driver = await Driver.findById(driverId);
        if (driver) {
            driver.status = DriverStatus.ON_RIDE;
            await driver.save();
        }

        return await ride.save();
    }

    /**
     * Complete the ride
     */
    async completeRide(
        rideId: string,
        driverId: string,
        finalFare?: number,
        actualDistance?: number
    ): Promise<IRide> {
        const ride = await this.validateRideAndDriver(rideId, driverId);

        if (ride.status !== RideStatus.IN_PROGRESS) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid ride status for completing ride');
        }

        ride.status = RideStatus.COMPLETED;
        ride.completedAt = new Date();
        ride.finalFare = finalFare || ride.estimatedFare;
        ride.actualDistance = actualDistance || ride.estimatedDistance;

        if (ride.startedAt) {
            ride.actualDuration = Math.floor((ride.completedAt.getTime() - ride.startedAt.getTime()) / 1000);
        }

        await ride.save();

        // Update driver
        const driver = await Driver.findById(driverId);
        if (driver) {
            driver.status = DriverStatus.AVAILABLE;
            driver.currentRide = undefined;
            driver.totalRides += 1;
            driver.totalEarnings += ride.finalFare;
            await driver.save();
        }

        // Update customer
        const customer = await Customer.findOne({ userId: ride.customerId });
        if (customer) {
            customer.currentRide = undefined;
            customer.rideHistory.push(ride._id);
            customer.totalRides += 1;
            await customer.save();
        }

        return ride;
    }

    /**
     * Cancel a ride
     */
    async cancelRide(
        rideId: string,
        cancelledBy: 'customer' | 'driver',
        reason?: string
    ): Promise<IRide> {
        const ride = await Ride.findById(rideId);
        if (!ride) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Ride not found');
        }

        if (!ride.canBeCancelled()) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Ride cannot be cancelled at this stage');
        }

        ride.status = RideStatus.CANCELLED;
        ride.cancelledAt = new Date();
        ride.cancellationReason = reason;

        await ride.save();

        // Update driver if ride was accepted
        if (ride.driverId) {
            const driver = await Driver.findById(ride.driverId);
            if (driver) {
                driver.status = DriverStatus.AVAILABLE;
                driver.currentRide = undefined;
                await driver.save();
            }
        }

        // Update customer
        const customer = await Customer.findOne({ userId: ride.customerId });
        if (customer) {
            customer.currentRide = undefined;
            await customer.save();
        }

        return ride;
    }

    /**
     * Rate a ride
     */
    async rateRide(
        rideId: string,
        ratedBy: 'customer' | 'driver',
        rating: number,
        review?: string
    ): Promise<IRide> {
        const ride = await Ride.findById(rideId);
        if (!ride) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Ride not found');
        }

        if (!ride.canBeRated()) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Ride cannot be rated');
        }

        if (rating < 1 || rating > 5) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Rating must be between 1 and 5');
        }

        if (ratedBy === 'customer') {
            ride.driverRating = rating;
            ride.driverReview = review;
        } else {
            ride.customerRating = rating;
            ride.customerReview = review;
        }

        await ride.save();

        // Update driver's average rating if customer rated
        if (ratedBy === 'customer' && ride.driverId) {
            await this.updateDriverRating(ride.driverId.toString());
        }

        return ride;
    }

    /**
     * Get ride by ID
     */
    async getRideById(rideId: string): Promise<IRide | null> {
        return await Ride.findById(rideId).populate('driverId');
    }

    /**
     * Get customer rides
     */
    async getCustomerRides(customerId: string, limit: number = 20, offset: number = 0): Promise<IRide[]> {
        return await Ride.find({ customerId })
            .populate('driverId')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(offset);
    }

    /**
     * Get driver rides
     */
    async getDriverRides(driverId: string, limit: number = 20, offset: number = 0): Promise<IRide[]> {
        return await Ride.find({ driverId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(offset);
    }

    /**
     * Calculate ride estimate with dynamic pricing and route optimization
     */
    async calculateRideEstimate(
        pickupLocation: { latitude: number; longitude: number },
        dropoffLocation: { latitude: number; longitude: number },
        vehicleType: VehicleType,
        customerId?: string,
        requestTime: Date = new Date()
    ): Promise<RideEstimate & {
        breakdown?: any;
        appliedPromotions?: string[];
        surgeInfo?: any;
        optimizedRoute?: any;
    }> {
        try {
            // Get optimized route
            const optimizedRoute = await routeOptimizationService.getOptimizedRoute(
                pickupLocation,
                dropoffLocation,
                { vehicleType: vehicleType === VehicleType.MOTORCYCLE ? 'motorcycle' : 'car' }
            );

            // Calculate dynamic fare
            const pricingResult = await pricingService.calculateDynamicFare(
                pickupLocation,
                dropoffLocation,
                vehicleType,
                requestTime,
                customerId
            );

            return {
                distance: optimizedRoute.distance,
                duration: optimizedRoute.duration,
                fare: pricingResult.fare,
                currency: rideConfig.currency,
                breakdown: pricingResult.breakdown,
                appliedPromotions: pricingResult.appliedPromotions,
                surgeInfo: pricingResult.surgeInfo,
                optimizedRoute: {
                    polyline: optimizedRoute.polyline,
                    instructions: optimizedRoute.instructions.slice(0, 5) // First 5 instructions
                }
            };
        } catch (error) {
            console.error('Enhanced estimate calculation failed, falling back to basic calculation:', error);

            // Fallback to basic calculation
            const distance = this.calculateDistance(
                pickupLocation.latitude,
                pickupLocation.longitude,
                dropoffLocation.latitude,
                dropoffLocation.longitude
            );

            const duration = this.calculateETA(distance);
            const fare = this.calculateFare(distance, vehicleType);

            return {
                distance: Math.round(distance * 1000),
                duration,
                fare,
                currency: rideConfig.currency
            };
        }
    }

    // Private helper methods

    private async validateRideAndDriver(rideId: string, driverId: string): Promise<IRide> {
        const ride = await Ride.findById(rideId);
        if (!ride) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Ride not found');
        }

        if (ride.driverId?.toString() !== driverId) {
            throw new ApiError(httpStatus.FORBIDDEN, 'Unauthorized: You are not the driver for this ride');
        }

        return ride;
    }

    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

    private calculateETA(distanceKm: number): number {
        // Assume average speed of 30 km/h in city traffic
        const averageSpeedKmh = 30;
        return Math.round((distanceKm / averageSpeedKmh) * 3600); // Convert to seconds
    }

    private calculateFare(distanceKm: number, vehicleType: VehicleType): number {
        const perKmRate = rideConfig.feePerKm[vehicleType] || rideConfig.feePerKm.regular;
        return rideConfig.baseFare + (distanceKm * perKmRate);
    }

    private async updateDriverRating(driverId: string): Promise<void> {
        const rides = await Ride.find({
            driverId,
            driverRating: { $exists: true, $ne: null }
        });

        if (rides.length > 0) {
            const totalRating = rides.reduce((sum, ride) => sum + (ride.driverRating || 0), 0);
            const averageRating = totalRating / rides.length;

            await Driver.findByIdAndUpdate(driverId, { rating: averageRating });
        }
    }
}

export default new RideService();