import { Router } from 'express';
import rideController from '../controllers/ride.controller';

const router: Router = Router();

// Public routes
router.post('/estimate', rideController.calculateEstimate);

// Ride management routes
router.post('/request', rideController.requestRide);
router.post('/accept', rideController.acceptRide);

// Ride status update routes
router.put('/:rideId/driver-arrived', rideController.driverArrived);
router.put('/:rideId/start', rideController.startRide);
router.put('/:rideId/complete', rideController.completeRide);
router.put('/:rideId/cancel', rideController.cancelRide);

// Ride rating routes
router.put('/:rideId/rate', rideController.rateRide);

// Ride information routes
router.get('/:rideId', rideController.getRide);
router.get('/customer/:customerId', rideController.getCustomerRides);
router.get('/driver/:driverId', rideController.getDriverRides);

export default router;