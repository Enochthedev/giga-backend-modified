import { Router } from 'express';
import { PricingOptimizationController } from '../controllers/pricing-optimization.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const pricingController = new PricingOptimizationController();

/**
 * @swagger
 * /api/rooms/{roomId}/pricing-suggestions:
 *   get:
 *     summary: Get pricing suggestions for a room
 *     tags: [Pricing Optimization]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Room ID
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date
 *     responses:
 *       200:
 *         description: Pricing suggestions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     suggestions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           roomId:
 *                             type: string
 *                           date:
 *                             type: string
 *                             format: date
 *                           currentPrice:
 *                             type: number
 *                           suggestedPrice:
 *                             type: number
 *                           priceChange:
 *                             type: number
 *                           priceChangePercentage:
 *                             type: number
 *                           reasoning:
 *                             type: array
 *                             items:
 *                               type: string
 *                           confidence:
 *                             type: number
 *                           demandScore:
 *                             type: number
 *       400:
 *         description: Invalid date format or range
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Room not found
 */
router.get('/rooms/:roomId/pricing-suggestions', authMiddleware, pricingController.getPricingSuggestions);

/**
 * @swagger
 * /api/rooms/{roomId}/apply-dynamic-pricing:
 *   post:
 *     summary: Apply dynamic pricing to a room
 *     tags: [Pricing Optimization]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Room ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - startDate
 *               - endDate
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               options:
 *                 type: object
 *                 properties:
 *                   maxIncrease:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 100
 *                     description: Maximum price increase percentage
 *                   maxDecrease:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 100
 *                     description: Maximum price decrease percentage
 *                   minPrice:
 *                     type: number
 *                     minimum: 0
 *                     description: Minimum allowed price
 *                   maxPrice:
 *                     type: number
 *                     minimum: 0
 *                     description: Maximum allowed price
 *     responses:
 *       200:
 *         description: Dynamic pricing applied successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     appliedCount:
 *                       type: integer
 *                     totalRevenueDifference:
 *                       type: number
 *                     priceChanges:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                           oldPrice:
 *                             type: number
 *                           newPrice:
 *                             type: number
 *                           change:
 *                             type: number
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Room not found
 */
router.post('/rooms/:roomId/apply-dynamic-pricing', authMiddleware, pricingController.applyDynamicPricing);

/**
 * @swagger
 * /api/rooms/{roomId}/demand-metrics:
 *   get:
 *     summary: Get demand metrics for a room
 *     tags: [Pricing Optimization]
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Room ID
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date
 *     responses:
 *       200:
 *         description: Demand metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     metrics:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                           searchCount:
 *                             type: integer
 *                           bookingCount:
 *                             type: integer
 *                           occupancyRate:
 *                             type: number
 *                           averagePrice:
 *                             type: number
 *                           demandScore:
 *                             type: number
 *       400:
 *         description: Invalid date format
 */
router.get('/rooms/:roomId/demand-metrics', pricingController.getDemandMetrics);

/**
 * @swagger
 * /api/rooms/{roomId}/seasonal-patterns:
 *   get:
 *     summary: Get seasonal patterns for a room
 *     tags: [Pricing Optimization]
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Room ID
 *     responses:
 *       200:
 *         description: Seasonal patterns retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     patterns:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           month:
 *                             type: integer
 *                           averageOccupancy:
 *                             type: number
 *                           averagePrice:
 *                             type: number
 *                           demandMultiplier:
 *                             type: number
 */
router.get('/rooms/:roomId/seasonal-patterns', pricingController.getSeasonalPatterns);

/**
 * @swagger
 * /api/pricing-rules:
 *   post:
 *     summary: Create a pricing rule
 *     tags: [Pricing Optimization]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roomId
 *               - name
 *               - ruleType
 *               - startDate
 *               - endDate
 *               - priceModifier
 *               - modifierType
 *             properties:
 *               roomId:
 *                 type: string
 *                 format: uuid
 *               name:
 *                 type: string
 *               ruleType:
 *                 type: string
 *                 enum: [seasonal, demand, event, day_of_week, advance_booking]
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               daysOfWeek:
 *                 type: array
 *                 items:
 *                   type: integer
 *                   minimum: 0
 *                   maximum: 6
 *               priceModifier:
 *                 type: number
 *               modifierType:
 *                 type: string
 *                 enum: [percentage, fixed]
 *               minimumStay:
 *                 type: integer
 *                 minimum: 1
 *               conditions:
 *                 type: object
 *               isActive:
 *                 type: boolean
 *               priority:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Pricing rule created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Room not found
 */
router.post('/pricing-rules', authMiddleware, pricingController.createPricingRule);

export default router;