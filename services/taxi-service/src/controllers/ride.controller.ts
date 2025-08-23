import { Request, Response } from 'express';
import rideService, { RideRequestData } from '../services/ride.service';
import { VehicleType } from '../models/driver.model';
import catchAsync from '../utils/catch-async';
import httpStatus from 'http-status';

class RideController {
    /**
     * Request a ride
     */
    requestRide = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const {
            customerId,
            pickupLocation,
            dropoffLocation,
            vehicleType,
            customerNotes
        } = req.body;

        if (!pickupLocation?.latitude || !pickupLocation?.longitude) {
            res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Valid pickup location (latitude, longitude) is required'
            });
            return;
        }

        if (!dropoffLocation?.latitude || !dropoffLocation?.longitude) {
            res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Valid dropoff location (latitude, longitude) is required'
            });
            return;
        }

        const requestData: RideRequestData = {
            customerId,
            pickupLocation,
            dropoffLocation,
            vehicleType: vehicleType || VehicleType.REGULAR,
            customerNotes
        };

        const result = await rideService.requestRide(requestData);

        res.status(httpStatus.CREATED).json({
            success: true,
            message: 'Ride requested successfully',
            data: {
                rideId: result.ride._id,
                estimatedFare: result.ride.estimatedFare,
                estimatedDistance: result.ride.estimatedDistance,
                estimatedDuration: result.ride.estimatedDuration,
                availableDrivers: result.availableDrivers.length,
                drivers: result.availableDrivers.map(driver => ({
                    driverId: driver.driverId,
                    estimatedArrivalTime: driver.estimatedArrivalTime,
                    distance: driver.distance
                }))
            }
        });
    });

    /**
     * Accept a ride (driver)
     */
    acceptRide = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const { driverId, rideId } = req.body;

        if (!driverId || !rideId) {
            res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Driver ID and ride ID are required'
            });
            return;
        }

        const ride = await rideService.acceptRide(driverId, rideId);

        res.json({
            success: true,
            message: 'Ride accepted successfully',
            data: {
                rideId: ride._id,
                customerId: ride.customerId,
                status: ride.status,
                pickupLocation: {
                    latitude: ride.pickupLocation.coordinates[1],
                    longitude: ride.pickupLocation.coordinates[0],
                    address: ride.pickupLocation.address
                },
                dropoffLocation: {
                    latitude: ride.dropoffLocation.coordinates[1],
                    longitude: ride.dropoffLocation.coordinates[0],
                    address: ride.dropoffLocation.address
                },
                estimatedFare: ride.estimatedFare,
                driverArrivalTime: ride.driverArrivalTime,
                acceptedAt: ride.acceptedAt
            }
        });
    });

    /**
     * Mark driver as arrived
     */
    driverArrived = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const { rideId } = req.params;
        const { driverId } = req.body;

        const ride = await rideService.driverArrived(rideId, driverId);

        res.json({
            success: true,
            message: 'Driver arrival confirmed',
            data: {
                rideId: ride._id,
                status: ride.status,
                driverArrivedAt: ride.driverArrivedAt
            }
        });
    });

    /**
     * Start a ride
     */
    startRide = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const { rideId } = req.params;
        const { driverId } = req.body;

        const ride = await rideService.startRide(rideId, driverId);

        res.json({
            success: true,
            message: 'Ride started successfully',
            data: {
                rideId: ride._id,
                status: ride.status,
                startedAt: ride.startedAt
            }
        });
    });

    /**
     * Complete a ride
     */
    completeRide = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const { rideId } = req.params;
        const { driverId, finalFare, actualDistance } = req.body;

        const ride = await rideService.completeRide(
            rideId,
            driverId,
            finalFare,
            actualDistance
        );

        res.json({
            success: true,
            message: 'Ride completed successfully',
            data: {
                rideId: ride._id,
                status: ride.status,
                finalFare: ride.finalFare,
                actualDistance: ride.actualDistance,
                actualDuration: ride.actualDuration,
                completedAt: ride.completedAt
            }
        });
    });

    /**
     * Cancel a ride
     */
    cancelRide = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const { rideId } = req.params;
        const { cancelledBy, reason } = req.body;

        if (!['customer', 'driver'].includes(cancelledBy)) {
            res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: 'cancelledBy must be either "customer" or "driver"'
            });
            return;
        }

        const ride = await rideService.cancelRide(rideId, cancelledBy, reason);

        res.json({
            success: true,
            message: 'Ride cancelled successfully',
            data: {
                rideId: ride._id,
                status: ride.status,
                cancellationReason: ride.cancellationReason,
                cancelledAt: ride.cancelledAt
            }
        });
    });

    /**
     * Rate a ride
     */
    rateRide = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const { rideId } = req.params;
        const { ratedBy, rating, review } = req.body;

        if (!['customer', 'driver'].includes(ratedBy)) {
            res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: 'ratedBy must be either "customer" or "driver"'
            });
            return;
        }

        if (!rating || rating < 1 || rating > 5) {
            res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Rating must be between 1 and 5'
            });
            return;
        }

        const ride = await rideService.rateRide(rideId, ratedBy, rating, review);

        res.json({
            success: true,
            message: 'Ride rated successfully',
            data: {
                rideId: ride._id,
                customerRating: ride.customerRating,
                driverRating: ride.driverRating,
                customerReview: ride.customerReview,
                driverReview: ride.driverReview
            }
        });
    });

    /**
     * Get ride details
     */
    getRide = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const { rideId } = req.params;
        const ride = await rideService.getRideById(rideId);

        if (!ride) {
            res.status(httpStatus.NOT_FOUND).json({
                success: false,
                message: 'Ride not found'
            });
            return;
        }

        res.json({
            success: true,
            data: {
                id: ride._id,
                customerId: ride.customerId,
                driverId: ride.driverId,
                status: ride.status,
                vehicleType: ride.vehicleType,
                pickupLocation: {
                    latitude: ride.pickupLocation.coordinates[1],
                    longitude: ride.pickupLocation.coordinates[0],
                    address: ride.pickupLocation.address
                },
                dropoffLocation: {
                    latitude: ride.dropoffLocation.coordinates[1],
                    longitude: ride.dropoffLocation.coordinates[0],
                    address: ride.dropoffLocation.address
                },
                estimatedFare: ride.estimatedFare,
                finalFare: ride.finalFare,
                estimatedDistance: ride.estimatedDistance,
                actualDistance: ride.actualDistance,
                estimatedDuration: ride.estimatedDuration,
                actualDuration: ride.actualDuration,
                driverArrivalTime: ride.driverArrivalTime,
                acceptedAt: ride.acceptedAt,
                driverArrivedAt: ride.driverArrivedAt,
                startedAt: ride.startedAt,
                completedAt: ride.completedAt,
                cancelledAt: ride.cancelledAt,
                cancellationReason: ride.cancellationReason,
                customerRating: ride.customerRating,
                driverRating: ride.driverRating,
                customerReview: ride.customerReview,
                driverReview: ride.driverReview,
                createdAt: ride.createdAt,
                updatedAt: ride.updatedAt
            }
        });
    });

    /**
     * Get customer rides
     */
    getCustomerRides = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const { customerId } = req.params;
        const { limit = 20, offset = 0 } = req.query;

        const rides = await rideService.getCustomerRides(
            customerId,
            parseInt(limit as string),
            parseInt(offset as string)
        );

        res.json({
            success: true,
            data: rides.map(ride => ({
                id: ride._id,
                status: ride.status,
                vehicleType: ride.vehicleType,
                pickupLocation: ride.pickupLocation,
                dropoffLocation: ride.dropoffLocation,
                finalFare: ride.finalFare || ride.estimatedFare,
                completedAt: ride.completedAt,
                createdAt: ride.createdAt
            }))
        });
    });

    /**
     * Get driver rides
     */
    getDriverRides = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const { driverId } = req.params;
        const { limit = 20, offset = 0 } = req.query;

        const rides = await rideService.getDriverRides(
            driverId,
            parseInt(limit as string),
            parseInt(offset as string)
        );

        res.json({
            success: true,
            data: rides.map(ride => ({
                id: ride._id,
                customerId: ride.customerId,
                status: ride.status,
                vehicleType: ride.vehicleType,
                pickupLocation: ride.pickupLocation,
                dropoffLocation: ride.dropoffLocation,
                finalFare: ride.finalFare || ride.estimatedFare,
                actualDistance: ride.actualDistance || ride.estimatedDistance,
                actualDuration: ride.actualDuration || ride.estimatedDuration,
                completedAt: ride.completedAt,
                createdAt: ride.createdAt,
                customerRating: ride.customerRating,
                customerReview: ride.customerReview
            }))
        });
    });

    /**
     * Calculate ride estimate
     */
    calculateEstimate = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const { pickupLocation, dropoffLocation, vehicleType } = req.body;

        if (!pickupLocation?.latitude || !pickupLocation?.longitude) {
            res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Valid pickup location (latitude, longitude) is required'
            });
            return;
        }

        if (!dropoffLocation?.latitude || !dropoffLocation?.longitude) {
            res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Valid dropoff location (latitude, longitude) is required'
            });
            return;
        }

        const estimate = await rideService.calculateRideEstimate(
            pickupLocation,
            dropoffLocation,
            vehicleType || VehicleType.REGULAR
        );

        res.json({
            success: true,
            data: estimate
        });
    });
}

export default new RideController();