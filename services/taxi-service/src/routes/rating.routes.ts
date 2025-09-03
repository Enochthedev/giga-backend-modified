import { Router } from 'express';
import ratingController from '../controllers/rating.controller';
import validationMiddleware from '../middleware/validation.middleware';

const router: Router = Router();

/**
 * @route POST /api/ratings/rides/:rideId
 * @desc Submit a rating for a ride
 * @access Private
 */
router.post('/rides/:rideId', ratingController.submitRating);

/**
 * @route GET /api/ratings/drivers/:driverId/feedback
 * @desc Get driver feedback analytics
 * @access Private
 */
router.get('/drivers/:driverId/feedback', ratingController.getDriverFeedback);

/**
 * @route GET /api/ratings/customers/:customerId/feedback
 * @desc Get customer feedback analytics
 * @access Private
 */
router.get('/customers/:customerId/feedback', ratingController.getCustomerFeedback);

/**
 * @route GET /api/ratings/drivers/:driverId/performance
 * @desc Get comprehensive driver performance metrics
 * @access Private
 */
router.get('/drivers/:driverId/performance', ratingController.getDriverPerformance);

/**
 * @route GET /api/ratings/:entityId/trends
 * @desc Get rating trends over time
 * @access Private
 */
router.get('/:entityId/trends', ratingController.getRatingTrends);

/**
 * @route GET /api/ratings/:entityId/summary
 * @desc Get rating summary for entity
 * @access Private
 */
router.get('/:entityId/summary', ratingController.getRatingSummary);

export default router;