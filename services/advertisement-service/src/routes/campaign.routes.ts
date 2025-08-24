import { Router } from 'express';
import { CampaignController } from '../controllers/campaign.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();
const campaignController = new CampaignController();

/**
 * @openapi
 * /api/campaigns:
 *   post:
 *     summary: Create a new campaign
 *     tags: [Campaigns]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - budget
 *               - start_date
 *               - objective
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               budget:
 *                 type: number
 *               daily_budget:
 *                 type: number
 *               start_date:
 *                 type: string
 *                 format: date-time
 *               end_date:
 *                 type: string
 *                 format: date-time
 *               objective:
 *                 type: string
 *                 enum: [awareness, traffic, conversions, engagement]
 *     responses:
 *       201:
 *         description: Campaign created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticateToken, requireRole(['advertiser', 'admin']), asyncHandler(campaignController.createCampaign.bind(campaignController)));

/**
 * @openapi
 * /api/campaigns:
 *   get:
 *     summary: Get campaigns for advertiser
 *     tags: [Campaigns]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Campaigns retrieved successfully
 */
router.get('/', authenticateToken, asyncHandler(campaignController.getCampaigns.bind(campaignController)));

/**
 * @openapi
 * /api/campaigns/{id}:
 *   get:
 *     summary: Get campaign by ID
 *     tags: [Campaigns]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Campaign retrieved successfully
 *       404:
 *         description: Campaign not found
 */
router.get('/:id', authenticateToken, asyncHandler(campaignController.getCampaign.bind(campaignController)));

/**
 * @openapi
 * /api/campaigns/{id}:
 *   put:
 *     summary: Update campaign
 *     tags: [Campaigns]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               budget:
 *                 type: number
 *               daily_budget:
 *                 type: number
 *               start_date:
 *                 type: string
 *                 format: date-time
 *               end_date:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *                 enum: [draft, active, paused, completed, cancelled]
 *               objective:
 *                 type: string
 *                 enum: [awareness, traffic, conversions, engagement]
 *     responses:
 *       200:
 *         description: Campaign updated successfully
 *       404:
 *         description: Campaign not found
 */
router.put('/:id', authenticateToken, requireRole(['advertiser', 'admin']), asyncHandler(campaignController.updateCampaign.bind(campaignController)));

/**
 * @openapi
 * /api/campaigns/{id}:
 *   delete:
 *     summary: Delete campaign
 *     tags: [Campaigns]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Campaign deleted successfully
 *       404:
 *         description: Campaign not found
 */
router.delete('/:id', authenticateToken, requireRole(['advertiser', 'admin']), asyncHandler(campaignController.deleteCampaign.bind(campaignController)));

/**
 * @openapi
 * /api/campaigns/{id}/status:
 *   patch:
 *     summary: Update campaign status
 *     tags: [Campaigns]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [draft, active, paused, completed, cancelled]
 *     responses:
 *       200:
 *         description: Campaign status updated successfully
 */
router.patch('/:id/status', authenticateToken, requireRole(['advertiser', 'admin']), asyncHandler(campaignController.updateCampaignStatus.bind(campaignController)));

/**
 * @openapi
 * /api/campaigns/{id}/spending:
 *   get:
 *     summary: Get campaign spending analytics
 *     tags: [Campaigns]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: start_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: end_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Campaign spending retrieved successfully
 */
router.get('/:id/spending', authenticateToken, asyncHandler(campaignController.getCampaignSpending.bind(campaignController)));

/**
 * @openapi
 * /api/campaigns/{id}/budget:
 *   get:
 *     summary: Check campaign budget availability
 *     tags: [Campaigns]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Budget availability retrieved successfully
 */
router.get('/:id/budget', authenticateToken, asyncHandler(campaignController.checkBudgetAvailability.bind(campaignController)));

/**
 * @openapi
 * /api/campaigns/{id}/fund:
 *   post:
 *     summary: Fund campaign with payment
 *     tags: [Campaigns]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - payment_method
 *             properties:
 *               amount:
 *                 type: number
 *               payment_method:
 *                 type: string
 *               payment_details:
 *                 type: object
 *     responses:
 *       200:
 *         description: Campaign funded successfully
 *       400:
 *         description: Payment failed
 */
router.post('/:id/fund', authenticateToken, requireRole(['advertiser', 'admin']), asyncHandler(campaignController.fundCampaign.bind(campaignController)));

export default router;