import { Router } from 'express';
import RideController from '../controllers/ride.controller';
import validate from '../middleware/validate';
import validations from '../validations';
import { authMiddleware } from 'common';
import { checkRole } from 'common';

const router = Router();

/**
 * @openapi
 * /drivers/closest:
 *   get:
 *     summary: Get closest drivers
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/drivers/closest', authMiddleware, checkRole(['customer']), validate(validations.ride.getClosestDrivers), RideController.getClosestDrivers);

/**
 * @openapi
 * /rides:
 *   post:
 *     summary: Request ride
 *     responses:
 *       200:
 *         description: OK
 */
router.post('/rides', authMiddleware, checkRole(['customer']), validate(validations.ride.requestRide), RideController.requestRide);
router.post('/drivers/:driverId/ratings', authMiddleware, checkRole(['customer']), validate(validations.ride.rateDriver), RideController.rateDriver);
router.post('/customers', validate(validations.ride.createAccount), RideController.createAccount);
router.post('/rides/:rideId/pay', authMiddleware, checkRole(['customer']), validate(validations.ride.payTaxiFee), RideController.payTaxiFee);
router.post('/drivers/:driverId/end', authMiddleware, checkRole(['driver']), RideController.DriverEndTrip);
router.post('/drivers/:driverId/accept', authMiddleware, checkRole(['driver']), RideController.DriverAcceptRide);
router.post('/drivers/:driverId/reject', authMiddleware, checkRole(['driver']), RideController.DriverRejectRide);

export default router;
