import { Router } from 'express';
import routeController from '../controllers/route.controller';
import validationMiddleware from '../middleware/validation.middleware';

const router = Router();

/**
 * @route POST /api/routes/optimize
 * @desc Get optimized route between two points
 * @access Public
 */
router.post('/optimize', routeController.getOptimizedRoute);

/**
 * @route POST /api/routes/multi-stop
 * @desc Optimize multi-stop route
 * @access Private
 */
router.post('/multi-stop', routeController.optimizeMultiStopRoute);

/**
 * @route POST /api/routes/eta
 * @desc Calculate ETA with real-time traffic
 * @access Public
 */
router.post('/eta', routeController.calculateETAWithTraffic);

/**
 * @route POST /api/routes/optimal-pickup
 * @desc Find optimal pickup point
 * @access Private
 */
router.post('/optimal-pickup', routeController.findOptimalPickupPoint);

/**
 * @route POST /api/routes/traffic
 * @desc Get traffic information for a route
 * @access Public
 */
router.post('/traffic', routeController.getTrafficInfo);

/**
 * @route GET /api/routes/suggestions
 * @desc Get route suggestions based on historical data
 * @access Public
 */
router.get('/suggestions', routeController.getRouteSuggestions);

export default router;