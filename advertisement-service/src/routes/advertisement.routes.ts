import { Router } from 'express';
import { AdvertisementController } from '../controllers/advertisement.controller';
import { authenticateToken, requireRole, optionalAuth } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();
const advertisementController = new AdvertisementController();

/**
 * @openapi
 * /api/advertisements:
 *   post:
 *     summary: Create a new advertisement
 *     tags: [Advertisements]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ad_group_id
 *               - title
 *               - landing_url
 *               - ad_type
 *             properties:
 *               ad_group_id:
 *                 type: integer
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               image_url:
 *                 type: string
 *               video_url:
 *                 type: string
 *               call_to_action:
 *                 type: string
 *               landing_url:
 *                 type: string
 *               ad_type:
 *                 type: string
 *                 enum: [banner, video, native, popup]
 *     responses:
 *       201:
 *         description: Advertisement created successfully
 *       400:
 *         description: Validation error
 */
router.post('/', authenticateToken, requireRole(['advertiser', 'admin']), asyncHandler(advertisementController.createAdvertisement.bind(advertisementController)));

/**
 * @openapi
 * /api/advertisements:
 *   get:
 *     summary: Get advertisements
 *     tags: [Advertisements]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ad_group_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: advertiser_id
 *         schema:
 *           type: string
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
 *         description: Advertisements retrieved successfully
 */
router.get('/', authenticateToken, asyncHandler(advertisementController.getAdvertisements.bind(advertisementController)));

/**
 * @openapi
 * /api/advertisements/serve:
 *   post:
 *     summary: Serve an advertisement based on targeting
 *     tags: [Advertisements]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: string
 *               session_id:
 *                 type: string
 *               placement:
 *                 type: string
 *               targeting_context:
 *                 type: object
 *                 properties:
 *                   age:
 *                     type: integer
 *                   gender:
 *                     type: string
 *                   location:
 *                     type: string
 *                   interests:
 *                     type: array
 *                     items:
 *                       type: string
 *                   device:
 *                     type: string
 *                   platform:
 *                     type: string
 *     responses:
 *       200:
 *         description: Advertisement served successfully
 *       404:
 *         description: No advertisements available
 */
router.post('/serve', optionalAuth, asyncHandler(advertisementController.serveAd.bind(advertisementController)));

/**
 * @openapi
 * /api/advertisements/{id}:
 *   get:
 *     summary: Get advertisement by ID
 *     tags: [Advertisements]
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
 *         description: Advertisement retrieved successfully
 *       404:
 *         description: Advertisement not found
 */
router.get('/:id', authenticateToken, asyncHandler(advertisementController.getAdvertisement.bind(advertisementController)));

/**
 * @openapi
 * /api/advertisements/{id}:
 *   put:
 *     summary: Update advertisement
 *     tags: [Advertisements]
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
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               image_url:
 *                 type: string
 *               video_url:
 *                 type: string
 *               call_to_action:
 *                 type: string
 *               landing_url:
 *                 type: string
 *               ad_type:
 *                 type: string
 *                 enum: [banner, video, native, popup]
 *               status:
 *                 type: string
 *                 enum: [active, paused, rejected]
 *     responses:
 *       200:
 *         description: Advertisement updated successfully
 *       404:
 *         description: Advertisement not found
 */
router.put('/:id', authenticateToken, requireRole(['advertiser', 'admin']), asyncHandler(advertisementController.updateAdvertisement.bind(advertisementController)));

/**
 * @openapi
 * /api/advertisements/{id}:
 *   delete:
 *     summary: Delete advertisement
 *     tags: [Advertisements]
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
 *         description: Advertisement deleted successfully
 *       404:
 *         description: Advertisement not found
 */
router.delete('/:id', authenticateToken, requireRole(['advertiser', 'admin']), asyncHandler(advertisementController.deleteAdvertisement.bind(advertisementController)));

/**
 * @openapi
 * /api/advertisements/{id}/status:
 *   patch:
 *     summary: Update advertisement status
 *     tags: [Advertisements]
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
 *                 enum: [active, paused, rejected]
 *     responses:
 *       200:
 *         description: Advertisement status updated successfully
 */
router.patch('/:id/status', authenticateToken, requireRole(['advertiser', 'admin']), asyncHandler(advertisementController.updateAdvertisementStatus.bind(advertisementController)));

/**
 * @openapi
 * /api/advertisements/{id}/click:
 *   get:
 *     summary: Handle advertisement click and redirect
 *     tags: [Advertisements]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: tracking_id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: redirect
 *         schema:
 *           type: string
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: session_id
 *         schema:
 *           type: string
 *     responses:
 *       302:
 *         description: Redirect to landing page
 *       404:
 *         description: Advertisement not found
 */
router.get('/:id/click', asyncHandler(advertisementController.handleAdClick.bind(advertisementController)));

/**
 * @openapi
 * /api/advertisements/{id}/impression:
 *   get:
 *     summary: Record advertisement impression
 *     tags: [Advertisements]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: tracking_id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: session_id
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Impression recorded (returns 1x1 pixel)
 */
router.get('/:id/impression', asyncHandler(advertisementController.recordImpression.bind(advertisementController)));

/**
 * @openapi
 * /api/advertisements/{id}/analytics:
 *   get:
 *     summary: Get advertisement analytics
 *     tags: [Advertisements]
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
 *         description: Advertisement analytics retrieved successfully
 */
router.get('/:id/analytics', authenticateToken, asyncHandler(advertisementController.getAdvertisementAnalytics.bind(advertisementController)));

export default router;