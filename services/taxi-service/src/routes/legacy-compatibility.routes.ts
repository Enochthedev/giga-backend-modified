import { Router } from 'express';
import rideService from '../services/ride.service';
import driverService from '../services/driver.service';
import fuelPricingService from '../services/fuel-pricing.service';
import eventService from '../services/event.service';
import { validateRequest } from '../middleware/validation.middleware';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

/**
 * Legacy compatibility routes for seamless migration
 */

// Route: POST /api/legacy/request-ride-with-driver
// Legacy: Immediate driver assignment (bypasses acceptance flow)
router.post('/request-ride-with-driver', 
    authenticateToken,
    validateRequest({
        body: {
            driverId: 'string',
            driverUserId: 'string',
            customerId: 'string',
            customerUserId: 'string',
            pickupLocation: {
                lat: 'number',
                lon: 'number'
            },
            dropOffLocation: {
                lat: 'number',
                lon: 'number'
            },
            rideType: 'string'
        }
    }),
    async (req, res) => {
        try {
            const ride = await rideService.requestRideWithDriver({
                customerId: req.body.customerId,
                driverId: req.body.driverId,
                driverUserId: req.body.driverUserId,
                pickupLocation: {
                    latitude: req.body.pickupLocation.lat,
                    longitude: req.body.pickupLocation.lon
                },
                dropoffLocation: {
                    latitude: req.body.dropOffLocation.lat,
                    longitude: req.body.dropOffLocation.lon
                },
                vehicleType: req.body.rideType
            });

            res.status(201).json({
                success: true,
                message: 'Ride created with immediate driver assignment',
                ride
            });
        } catch (error: any) {
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to create ride with driver'
            });
        }
    }
);

// Route: POST /api/legacy/create-ride-offer
// Legacy: Create ride offer for driver
router.post('/create-ride-offer',
    authenticateToken,
    validateRequest({
        body: {
            driverId: 'string',
            driverUserId: 'string',
            customerId: 'string',
            customerUserId: 'string',
            rideType: 'string',
            status: 'string',
            pickupLocation: {
                lat: 'number',
                lon: 'number'
            },
            dropOffLocation: {
                lat: 'number',
                lon: 'number'
            }
        }
    }),
    async (req, res) => {
        try {
            const result = await rideService.createRideOffer(req.body);

            res.status(201).json({
                success: true,
                message: 'Ride offer created successfully',
                data: result
            });
        } catch (error: any) {
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to create ride offer'
            });
        }
    }
);

// Route: POST /api/legacy/calculate-fuel-fare
// Legacy: Fuel-based fare calculation
router.post('/calculate-fuel-fare',
    authenticateToken,
    validateRequest({
        body: {
            distance: 'number',
            vehicleType: 'string',
            baseFare: 'number?'
        }
    }),
    async (req, res) => {
        try {
            const pricing = await fuelPricingService.calculateFuelBasedFare(
                req.body.distance,
                req.body.vehicleType,
                req.body.baseFare
            );

            res.status(200).json({
                success: true,
                message: 'Fuel-based fare calculated successfully',
                pricing
            });
        } catch (error: any) {
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to calculate fuel-based fare'
            });
        }
    }
);

// Route: GET /api/legacy/fuel-price
// Legacy: Get current fuel price
router.get('/fuel-price',
    authenticateToken,
    async (req, res) => {
        try {
            const fuelPrice = await fuelPricingService.getCurrentFuelPrice();

            res.status(200).json({
                success: true,
                message: 'Fuel price retrieved successfully',
                fuelPrice
            });
        } catch (error: any) {
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to retrieve fuel price'
            });
        }
    }
);

// Route: GET /api/legacy/fuel-stats
// Legacy: Get fuel price statistics
router.get('/fuel-stats',
    authenticateToken,
    async (req, res) => {
        try {
            const stats = await fuelPricingService.getFuelPriceStats();

            res.status(200).json({
                success: true,
                message: 'Fuel price statistics retrieved successfully',
                stats
            });
        } catch (error: any) {
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to retrieve fuel price statistics'
            });
        }
    }
);

// Route: POST /api/legacy/send-event
// Legacy: Send custom events
router.post('/send-event',
    authenticateToken,
    validateRequest({
        body: {
            name: 'string',
            service: 'string',
            payload: 'object'
        }
    }),
    async (req, res) => {
        try {
            await eventService.sendEvent(req.body);

            res.status(200).json({
                success: true,
                message: 'Event sent successfully'
            });
        } catch (error: any) {
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to send event'
            });
        }
    }
);

// Route: POST /api/legacy/rate-user
// Legacy: Rate user (driver or customer)
router.post('/rate-user',
    authenticateToken,
    validateRequest({
        body: {
            userId: 'string',
            rating: 'number'
        }
    }),
    async (req, res) => {
        try {
            await eventService.sendRatingUpdate(req.body.userId, req.body.rating);

            res.status(200).json({
                success: true,
                message: 'Rating sent successfully'
            });
        } catch (error: any) {
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to send rating'
            });
        }
    }
);

// Route: POST /api/legacy/pay-fee
// Legacy: Send payment request
router.post('/pay-fee',
    authenticateToken,
    validateRequest({
        body: {
            token: 'string',
            amount: 'number',
            narration: 'string'
        }
    }),
    async (req, res) => {
        try {
            await eventService.sendPaymentRequest(
                req.body.token,
                req.body.amount,
                req.body.narration
            );

            res.status(200).json({
                success: true,
                message: 'Payment request sent successfully'
            });
        } catch (error: any) {
            res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to send payment request'
            });
        }
    }
);

export default router;
