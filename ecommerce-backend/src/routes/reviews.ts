import { Router } from 'express';
import { ReviewController } from '../controllers/review.controller';
import { authenticateToken, requireRoles } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
    CreateReviewSchema,
    UpdateReviewSchema,
    ReviewSearchSchema,
    ReviewParamsSchema,
    ProductReviewParamsSchema
} from '../validation/review.validation';

const router = Router();

// Public routes
router.get('/products/:productId/reviews',
    validate({ params: ProductReviewParamsSchema, query: ReviewSearchSchema }),
    ReviewController.getProductReviews
);

router.get('/products/:productId/rating-stats',
    validate({ params: ProductReviewParamsSchema }),
    ReviewController.getProductRatingStats
);

// Protected routes
router.use(authenticateToken);

router.post('/',
    validate({ body: CreateReviewSchema }),
    ReviewController.createReview
);

router.get('/my-reviews',
    validate({ query: ReviewSearchSchema }),
    ReviewController.getUserReviews
);

router.get('/:id',
    validate({ params: ReviewParamsSchema }),
    ReviewController.getReview
);

router.put('/:id',
    validate({ params: ReviewParamsSchema, body: UpdateReviewSchema }),
    ReviewController.updateReview
);

router.delete('/:id',
    validate({ params: ReviewParamsSchema }),
    ReviewController.deleteReview
);

router.post('/:id/helpful',
    validate({ params: ReviewParamsSchema }),
    ReviewController.markReviewHelpful
);

// Admin routes
router.get('/',
    requireRoles(['admin']),
    validate({ query: ReviewSearchSchema }),
    ReviewController.searchReviews
);

router.post('/:id/approve',
    requireRoles(['admin']),
    validate({ params: ReviewParamsSchema }),
    ReviewController.approveReview
);

router.delete('/:id/reject',
    requireRoles(['admin']),
    validate({ params: ReviewParamsSchema }),
    ReviewController.rejectReview
);

export default router;