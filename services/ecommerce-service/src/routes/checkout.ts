import { Router } from 'express';
import { CheckoutController } from '../controllers/checkout.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
    CreateCheckoutSessionSchema,
    UpdateCheckoutSessionSchema,
    CheckoutSessionParamsSchema
} from '../validation/checkout.validation';

const router = Router();

// All checkout routes require authentication
router.use(authenticateToken);

router.post('/sessions',
    validate({ body: CreateCheckoutSessionSchema }),
    CheckoutController.createCheckoutSession
);

router.get('/sessions/:sessionId',
    validate({ params: CheckoutSessionParamsSchema }),
    CheckoutController.getCheckoutSession
);

router.put('/sessions/:sessionId',
    validate({ params: CheckoutSessionParamsSchema, body: UpdateCheckoutSessionSchema }),
    CheckoutController.updateCheckoutSession
);

router.post('/sessions/:sessionId/complete',
    validate({ params: CheckoutSessionParamsSchema }),
    CheckoutController.completeCheckout
);

export default router;