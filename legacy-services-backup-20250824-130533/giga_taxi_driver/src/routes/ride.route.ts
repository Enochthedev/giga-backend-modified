import { Router } from 'express';
import RideController from '../controllers/ride.controller';
import validate from '../middleware/validate';
import validations from '../validations';
import { authMiddleware } from 'common';
import { checkRole } from 'common';

const router = Router();

router.post('/rides/:rideId/accept', authMiddleware, checkRole(['driver']), validate(validations.ride.acceptRide), RideController.acceptRide);
router.post('/rides/:rideId/reject', authMiddleware, checkRole(['driver']), validate(validations.ride.acceptRide), RideController.rejectRide);
router.post('/rides/:rideId/end', authMiddleware, checkRole(['driver']), validate(validations.ride.endTrip), RideController.endTrip);
router.post('/customers/:customerId/ratings', authMiddleware, checkRole(['driver']), validate(validations.ride.rateCustomer), RideController.rateCustomer);
router.post('/drivers', validate(validations.ride.createAccount), RideController.createAccount);
router.get('/drivers/closest', authMiddleware, checkRole(['driver']), RideController.getClosestDrivers);
router.get('/rides/offer', authMiddleware, checkRole(['driver']), RideController.GetRideOffer);

export default router;
