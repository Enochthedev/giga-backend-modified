import { Router } from 'express';
import analyticsController from '../controllers/analytics.controller';
import validationMiddleware from '../middleware/validation.middleware';

const router: Router = Router();

/**
 * @route GET /api/analytics/:entityId/rides
 * @desc Get ride history with filters
 * @access Private
 */
router.get('/:entityId/rides', analyticsController.getRideHistory);

/**
 * @route GET /api/analytics/drivers/:driverId
 * @desc Get comprehensive driver analytics
 * @access Private
 */
router.get('/drivers/:driverId', analyticsController.getDriverAnalytics);

/**
 * @route GET /api/analytics/passengers/:customerId
 * @desc Get comprehensive passenger analytics
 * @access Private
 */
router.get('/passengers/:customerId', analyticsController.getPassengerAnalytics);

/**
 * @route GET /api/analytics/system
 * @desc Get system-wide analytics (admin only)
 * @access Private/Admin
 */
router.get('/system', analyticsController.getSystemAnalytics);

/**
 * @route GET /api/analytics/drivers/:driverId/dashboard
 * @desc Get driver dashboard summary
 * @access Private
 */
router.get('/drivers/:driverId/dashboard', analyticsController.getDriverDashboard);

/**
 * @route GET /api/analytics/passengers/:customerId/dashboard
 * @desc Get passenger dashboard summary
 * @access Private
 */
router.get('/passengers/:customerId/dashboard', analyticsController.getPassengerDashboard);

/**
 * @route GET /api/analytics/:entityId/export
 * @desc Export ride data
 * @access Private
 */
router.get('/:entityId/export', analyticsController.exportRideData);

export default router;