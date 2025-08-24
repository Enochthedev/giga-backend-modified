import { Router } from 'express';
import { RecommendationController } from '../controllers/recommendation.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { TrackUserBehaviorSchema } from '../validation/checkout.validation';
import { UUIDSchema } from '../validation/common.validation';
import { z } from 'zod';

const router = Router();

// Public routes
router.get('/popular',
    RecommendationController.getPopularProducts
);

router.get('/products/:productId/similar',
    validate({ params: z.object({ productId: UUIDSchema }) }),
    RecommendationController.getSimilarProducts
);

router.get('/products/:productId/frequently-bought-together',
    validate({ params: z.object({ productId: UUIDSchema }) }),
    RecommendationController.getFrequentlyBoughtTogether
);

// Protected routes
router.use(authenticateToken);

router.get('/personalized',
    RecommendationController.getPersonalizedRecommendations
);

router.post('/track-behavior',
    validate({ body: TrackUserBehaviorSchema }),
    RecommendationController.trackUserBehavior
);

export default router;