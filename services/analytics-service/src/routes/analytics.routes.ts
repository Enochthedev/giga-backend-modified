/**
 * Analytics routes
 */

import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { trackEventSchema, trackEventsSchema, queryAnalyticsSchema } from '../validation/analytics.validation';

const router = Router();
const analyticsController = new AnalyticsController();

// Event tracking routes
router.post('/track', validateRequest(trackEventSchema), analyticsController.trackEvent);
router.post('/track/batch', validateRequest(trackEventsSchema), analyticsController.trackEvents);

// Analytics query routes
router.post('/query', validateRequest(queryAnalyticsSchema), analyticsController.queryAnalytics);
router.get('/metrics/realtime', analyticsController.getRealTimeMetrics);
router.get('/users/:userId/behavior', analyticsController.getUserBehavior);

// Health check
router.get('/health', analyticsController.healthCheck);

export default router;