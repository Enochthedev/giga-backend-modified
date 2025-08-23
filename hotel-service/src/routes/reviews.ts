import { Router } from 'express';
import { ReviewController } from '../controllers/review.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { reviewValidation } from '../validation/hotel.validation';

const router = Router();
const reviewController = new ReviewController();

/**
 * @swagger
 * components:
 *   schemas:
 *     PropertyReview:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         propertyId:
 *           type: string
 *           format: uuid
 *         bookingId:
 *           type: string
 *           format: uuid
 *         reviewerUserId:
 *           type: string
 *         reviewerName:
 *           type: string
 *         rating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         title:
 *           type: string
 *         comment:
 *           type: string
 *         cleanlinessRating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         locationRating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         serviceRating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         valueRating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         images:
 *           type: array
 *           items:
 *             type: string
 *         isVerified:
 *           type: boolean
 *         ownerResponse:
 *           type: string
 *         ownerResponseDate:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     CreateReviewRequest:
 *       type: object
 *       required:
 *         - propertyId
 *         - rating
 *       properties:
 *         propertyId:
 *           type: string
 *           format: uuid
 *         bookingId:
 *           type: string
 *           format: uuid
 *         rating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         title:
 *           type: string
 *         comment:
 *           type: string
 *         cleanlinessRating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         locationRating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         serviceRating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         valueRating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         images:
 *           type: array
 *           items:
 *             type: string
 */

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: Create a new property review
 *     tags: [Reviews]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateReviewRequest'
 *     responses:
 *       201:
 *         description: Review created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PropertyReview'
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       409:
 *         description: Review already exists for this booking
 */
router.post('/reviews', authMiddleware, validateBody(reviewValidation.createReview), reviewController.createReview);

/**
 * @swagger
 * /api/reviews:
 *   get:
 *     summary: Get all reviews with filters
 *     tags: [Reviews]
 *     parameters:
 *       - in: query
 *         name: rating
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         description: Filter by specific rating
 *       - in: query
 *         name: minRating
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         description: Filter by minimum rating
 *       - in: query
 *         name: maxRating
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         description: Filter by maximum rating
 *       - in: query
 *         name: verified
 *         schema:
 *           type: boolean
 *         description: Filter by verified reviews only
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest, rating_high, rating_low]
 *         description: Sort order
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Reviews retrieved successfully
 */
router.get('/reviews', reviewController.getAllReviews);

/**
 * @swagger
 * /api/reviews/{id}:
 *   get:
 *     summary: Get a specific review by ID
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/PropertyReview'
 *       404:
 *         description: Review not found
 */
router.get('/reviews/:id', reviewController.getReviewById);

/**
 * @swagger
 * /api/reviews/{id}:
 *   put:
 *     summary: Update a review
 *     tags: [Reviews]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Review ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               title:
 *                 type: string
 *               comment:
 *                 type: string
 *               cleanlinessRating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               locationRating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               serviceRating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               valueRating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Review updated successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Review not found
 */
router.put('/reviews/:id', authMiddleware, validateBody(reviewValidation.updateReview), reviewController.updateReview);

/**
 * @swagger
 * /api/reviews/{id}:
 *   delete:
 *     summary: Delete a review
 *     tags: [Reviews]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review deleted successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Review not found
 */
router.delete('/reviews/:id', authMiddleware, reviewController.deleteReview);

/**
 * @swagger
 * /api/properties/{propertyId}/reviews:
 *   get:
 *     summary: Get reviews for a specific property
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Property ID
 *       - in: query
 *         name: rating
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         description: Filter by specific rating
 *       - in: query
 *         name: minRating
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         description: Filter by minimum rating
 *       - in: query
 *         name: maxRating
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         description: Filter by maximum rating
 *       - in: query
 *         name: verified
 *         schema:
 *           type: boolean
 *         description: Filter by verified reviews only
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest, rating_high, rating_low]
 *         description: Sort order
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Property reviews retrieved successfully
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
 *                     reviews:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PropertyReview'
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     averageRating:
 *                       type: number
 *                     ratingBreakdown:
 *                       type: object
 *                       properties:
 *                         1:
 *                           type: integer
 *                         2:
 *                           type: integer
 *                         3:
 *                           type: integer
 *                         4:
 *                           type: integer
 *                         5:
 *                           type: integer
 */
router.get('/properties/:propertyId/reviews', reviewController.getPropertyReviews);

/**
 * @swagger
 * /api/reviews/{id}/owner-response:
 *   post:
 *     summary: Add owner response to a review
 *     tags: [Reviews]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Review ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - response
 *             properties:
 *               response:
 *                 type: string
 *                 description: Owner's response to the review
 *     responses:
 *       200:
 *         description: Owner response added successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Review not found or not authorized
 */
router.post('/reviews/:id/owner-response', authMiddleware, validateBody(reviewValidation.ownerResponse), reviewController.addOwnerResponse);

export default router;