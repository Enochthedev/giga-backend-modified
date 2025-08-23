/**
 * Feature flags and A/B testing routes
 */

import { Router } from 'express';
import { FeatureFlagsController } from '../controllers/feature-flags.controller';
import { validateRequest } from '../middleware/validation.middleware';
import {
    evaluateFlagSchema,
    evaluateFlagsSchema,
    createFeatureFlagSchema,
    updateFeatureFlagSchema,
    createABTestSchema,
    trackABTestEventSchema
} from '../validation/feature-flags.validation';

const router = Router();
const featureFlagsController = new FeatureFlagsController();

// Feature flag evaluation routes
router.post('/flags/:flagKey/evaluate', validateRequest(evaluateFlagSchema), featureFlagsController.evaluateFlag);
router.post('/flags/evaluate', validateRequest(evaluateFlagsSchema), featureFlagsController.evaluateFlags);

// Feature flag management routes
router.post('/flags', validateRequest(createFeatureFlagSchema), featureFlagsController.createFeatureFlag);
router.put('/flags/:flagKey', validateRequest(updateFeatureFlagSchema), featureFlagsController.updateFeatureFlag);

// A/B testing routes
router.post('/ab-tests', validateRequest(createABTestSchema), featureFlagsController.createABTest);
router.get('/ab-tests/:testId/results', featureFlagsController.getABTestResults);
router.post('/ab-tests/track', validateRequest(trackABTestEventSchema), featureFlagsController.trackABTestEvent);

export default router;