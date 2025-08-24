import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();
const analyticsController = new AnalyticsController();

/**
 * @openapi
 * /api/analytics/campaigns/{campaignId}:
 *   get:
 *     summary: Get campaign analytics
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: campaignId
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
 *       - in: query
 *         name: group_by
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: day
 *     responses:
 *       200:
 *         description: Campaign analytics retrieved successfully
 */
router.get('/campaigns/:campaignId', authenticateToken, asyncHandler(analyticsController.getCampaignAnalytics.bind(analyticsController)));

/**
 * @openapi
 * /api/analytics/advertisers/{advertiserId}:
 *   get:
 *     summary: Get advertiser analytics
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: advertiserId
 *         required: true
 *         schema:
 *           type: string
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
 *       - in: query
 *         name: group_by
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: day
 *     responses:
 *       200:
 *         description: Advertiser analytics retrieved successfully
 */
router.get('/advertisers/:advertiserId', authenticateToken, asyncHandler(analyticsController.getAdvertiserAnalytics.bind(analyticsController)));

/**
 * @openapi
 * /api/analytics/ad-groups/{adGroupId}:
 *   get:
 *     summary: Get ad group analytics
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: adGroupId
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
 *         description: Ad group analytics retrieved successfully
 */
router.get('/ad-groups/:adGroupId', authenticateToken, asyncHandler(analyticsController.getAdGroupAnalytics.bind(analyticsController)));

/**
 * @openapi
 * /api/analytics/top-ads/{advertiserId}:
 *   get:
 *     summary: Get top performing advertisements
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: advertiserId
 *         required: true
 *         schema:
 *           type: string
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
 *       - in: query
 *         name: metric
 *         schema:
 *           type: string
 *           enum: [impressions, clicks, ctr, spend]
 *           default: clicks
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Top performing ads retrieved successfully
 */
router.get('/top-ads/:advertiserId', authenticateToken, asyncHandler(analyticsController.getTopPerformingAds.bind(analyticsController)));

/**
 * @openapi
 * /api/analytics/dashboard/{advertiserId}:
 *   get:
 *     summary: Get dashboard metrics for advertiser
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: advertiserId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dashboard metrics retrieved successfully
 */
router.get('/dashboard/:advertiserId', authenticateToken, asyncHandler(analyticsController.getDashboardMetrics.bind(analyticsController)));

/**
 * @openapi
 * /api/analytics/realtime/{campaignId}:
 *   get:
 *     summary: Get realtime metrics for campaign
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Realtime metrics retrieved successfully
 */
router.get('/realtime/:campaignId', authenticateToken, asyncHandler(analyticsController.getRealtimeMetrics.bind(analyticsController)));

/**
 * @openapi
 * /api/analytics/hourly/{campaignId}:
 *   get:
 *     summary: Get hourly metrics for campaign
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Hourly metrics retrieved successfully
 */
router.get('/hourly/:campaignId', authenticateToken, asyncHandler(analyticsController.getHourlyMetrics.bind(analyticsController)));

/**
 * @openapi
 * /api/analytics/billing/{advertiserId}:
 *   get:
 *     summary: Get billing report for advertiser
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: advertiserId
 *         required: true
 *         schema:
 *           type: string
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
 *         description: Billing report retrieved successfully
 */
router.get('/billing/:advertiserId', authenticateToken, asyncHandler(analyticsController.getBillingReport.bind(analyticsController)));

/**
 * @openapi
 * /api/analytics/compare/{advertiserId}:
 *   get:
 *     summary: Get performance comparison between campaigns
 *     tags: [Analytics]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: advertiserId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: campaign_ids
 *         required: true
 *         schema:
 *           type: string
 *           description: Comma-separated campaign IDs
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
 *       - in: query
 *         name: group_by
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: day
 *     responses:
 *       200:
 *         description: Performance comparison retrieved successfully
 */
router.get('/compare/:advertiserId', authenticateToken, asyncHandler(analyticsController.getPerformanceComparison.bind(analyticsController)));

export default router;