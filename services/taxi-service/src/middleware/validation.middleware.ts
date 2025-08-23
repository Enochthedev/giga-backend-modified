import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { VehicleType, DriverStatus } from '../models/driver.model';

/**
 * Generic validation middleware
 */
const validate = (schema: Joi.ObjectSchema) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const { error } = schema.validate(req.body);

        if (error) {
            res.status(400).json({
                success: false,
                message: 'Validation error',
                details: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message
                }))
            });
            return;
        }

        next();
    };
};

/**
 * Driver registration validation schema
 */
const driverRegistrationSchema = Joi.object({
    userId: Joi.string().required(),
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    phoneNumber: Joi.string().required(),
    licenseNumber: Joi.string().min(5).max(20).required(),
    licenseExpiryDate: Joi.date().greater('now').required(),
    vehicle: Joi.object({
        make: Joi.string().min(2).max(30).required(),
        model: Joi.string().min(2).max(30).required(),
        year: Joi.number().integer().min(1900).max(new Date().getFullYear() + 1).required(),
        color: Joi.string().min(3).max(20).required(),
        licensePlate: Joi.string().min(3).max(15).required(),
        vin: Joi.string().length(17).required(),
        type: Joi.string().valid(...Object.values(VehicleType)).required(),
        capacity: Joi.number().integer().min(1).max(8).required(),
        insuranceExpiryDate: Joi.date().greater('now').required(),
        registrationExpiryDate: Joi.date().greater('now').required()
    }).required()
});

/**
 * Driver status update validation schema
 */
const driverStatusUpdateSchema = Joi.object({
    status: Joi.string().valid(...Object.values(DriverStatus)).required()
});

/**
 * Location update validation schema
 */
const locationUpdateSchema = Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    heading: Joi.number().min(0).max(360).optional(),
    speed: Joi.number().min(0).optional(),
    accuracy: Joi.number().min(0).optional()
});

/**
 * Ride request validation schema
 */
const rideRequestSchema = Joi.object({
    customerId: Joi.string().required(),
    pickupLocation: Joi.object({
        latitude: Joi.number().min(-90).max(90).required(),
        longitude: Joi.number().min(-180).max(180).required(),
        address: Joi.string().optional()
    }).required(),
    dropoffLocation: Joi.object({
        latitude: Joi.number().min(-90).max(90).required(),
        longitude: Joi.number().min(-180).max(180).required(),
        address: Joi.string().optional()
    }).required(),
    vehicleType: Joi.string().valid(...Object.values(VehicleType)).optional(),
    customerNotes: Joi.string().max(500).optional()
});

/**
 * Ride acceptance validation schema
 */
const rideAcceptanceSchema = Joi.object({
    driverId: Joi.string().required(),
    rideId: Joi.string().required()
});

/**
 * Ride rating validation schema
 */
const rideRatingSchema = Joi.object({
    ratedBy: Joi.string().valid('customer', 'driver').required(),
    rating: Joi.number().integer().min(1).max(5).required(),
    review: Joi.string().max(500).optional()
});

// Export validation middleware functions
export const validateDriverRegistration = validate(driverRegistrationSchema);
export const validateDriverStatusUpdate = validate(driverStatusUpdateSchema);
export const validateLocationUpdate = validate(locationUpdateSchema);
export const validateRideRequest = validate(rideRequestSchema);
export const validateRideAcceptance = validate(rideAcceptanceSchema);
export const validateRideRating = validate(rideRatingSchema);