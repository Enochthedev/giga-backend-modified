import { Router } from 'express';
import pricingController from '../controllers/pricing.controller';
import validationMiddleware from '../middleware/validation.middleware';

const router: Router = Router();

/**
 * @route POST /api/pricing/calculate
 * @desc Calculate dynamic fare estimate
 * @access Public
 */
router.post('/calculate', pricingController.calculateFare);

/**
 * @route GET /api/pricing/promotions
 * @desc Get active promotional offers
 * @access Public
 */
router.get('/promotions', pricingController.getActivePromotions);

/**
 * @route POST /api/pricing/surge-areas
 * @desc Add surge area (admin only)
 * @access Private/Admin
 */
router.post('/surge-areas', pricingController.addSurgeArea);

/**
 * @route DELETE /api/pricing/surge-areas/:areaName
 * @desc Remove surge area (admin only)
 * @access Private/Admin
 */
router.delete('/surge-areas/:areaName', pricingController.removeSurgeArea);

/**
 * @route POST /api/pricing/promotions
 * @desc Add promotional offer (admin only)
 * @access Private/Admin
 */
router.post('/promotions', pricingController.addPromotionalOffer);

/**
 * @route DELETE /api/pricing/promotions/:offerId
 * @desc Remove promotional offer (admin only)
 * @access Private/Admin
 */
router.delete('/promotions/:offerId', pricingController.removePromotionalOffer);

export default router;