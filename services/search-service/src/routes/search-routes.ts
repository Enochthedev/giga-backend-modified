import { Router } from 'express';
import { SearchController } from '../controllers/search-controller';
import { validateRequest } from '../middleware/validation-middleware';
import { rateLimitMiddleware } from '../middleware/rate-limit-middleware';
import { authMiddleware } from '../middleware/auth-middleware';
import { searchValidation, autocompleteValidation, recommendationValidation, interactionValidation, indexingValidation } from '../validation/search-validation';

export function createSearchRoutes(searchController: SearchController): Router {
    const router = Router();

    // Apply rate limiting to all routes
    router.use(rateLimitMiddleware);

    /**
     * @swagger
     * /api/search:
     *   post:
     *     summary: Search documents with filters and facets
     *     tags: [Search]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               query:
     *                 type: string
     *                 description: Search query text
     *               filters:
     *                 type: object
     *                 description: Search filters
     *               sort:
     *                 type: object
     *                 description: Sort configuration
     *               page:
     *                 type: integer
     *                 minimum: 1
     *                 default: 1
     *               size:
     *                 type: integer
     *                 minimum: 1
     *                 maximum: 100
     *                 default: 20
     *               facets:
     *                 type: array
     *                 items:
     *                   type: string
     *     responses:
     *       200:
     *         description: Search results
     *       400:
     *         description: Invalid request parameters
     *       500:
     *         description: Internal server error
     */
    router.post('/', validateRequest(searchValidation), searchController.search);

    /**
     * @swagger
     * /api/search/autocomplete:
     *   get:
     *     summary: Get autocomplete suggestions
     *     tags: [Search]
     *     parameters:
     *       - in: query
     *         name: q
     *         required: true
     *         schema:
     *           type: string
     *           minLength: 2
     *         description: Query string for autocomplete
     *       - in: query
     *         name: type
     *         schema:
     *           type: string
     *           enum: [product, hotel]
     *         description: Filter by document type
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *           minimum: 1
     *           maximum: 20
     *           default: 10
     *         description: Maximum number of suggestions
     *     responses:
     *       200:
     *         description: Autocomplete suggestions
     *       400:
     *         description: Invalid query parameters
     *       500:
     *         description: Internal server error
     */
    router.get('/autocomplete', validateRequest(autocompleteValidation), searchController.autocomplete);

    /**
     * @swagger
     * /api/search/popular-terms:
     *   get:
     *     summary: Get popular search terms
     *     tags: [Search]
     *     parameters:
     *       - in: query
     *         name: type
     *         schema:
     *           type: string
     *         description: Filter by document type
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *           minimum: 1
     *           maximum: 20
     *           default: 10
     *         description: Maximum number of terms
     *     responses:
     *       200:
     *         description: Popular search terms
     *       500:
     *         description: Internal server error
     */
    router.get('/popular-terms', searchController.getPopularTerms);

    /**
     * @swagger
     * /api/search/recommendations:
     *   post:
     *     summary: Get personalized recommendations
     *     tags: [Recommendations]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               userId:
     *                 type: string
     *                 description: User ID for personalized recommendations
     *               itemId:
     *                 type: string
     *                 description: Item ID for similar item recommendations
     *               type:
     *                 type: string
     *                 enum: [product, hotel]
     *                 description: Filter by document type
     *               limit:
     *                 type: integer
     *                 minimum: 1
     *                 maximum: 50
     *                 default: 10
     *               algorithm:
     *                 type: string
     *                 enum: [collaborative, content, hybrid]
     *                 default: hybrid
     *     responses:
     *       200:
     *         description: Personalized recommendations
     *       400:
     *         description: Invalid request parameters
     *       500:
     *         description: Internal server error
     */
    router.post('/recommendations', validateRequest(recommendationValidation), searchController.getRecommendations);

    /**
     * @swagger
     * /api/search/interactions:
     *   post:
     *     summary: Record user interaction for recommendations
     *     tags: [Recommendations]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - itemId
     *               - itemType
     *               - interactionType
     *             properties:
     *               userId:
     *                 type: string
     *                 description: User ID (can be provided in header)
     *               itemId:
     *                 type: string
     *                 description: Item ID that was interacted with
     *               itemType:
     *                 type: string
     *                 enum: [product, hotel]
     *                 description: Type of item
     *               interactionType:
     *                 type: string
     *                 enum: [view, click, purchase, like, share]
     *                 description: Type of interaction
     *               timestamp:
     *                 type: string
     *                 format: date-time
     *                 description: Interaction timestamp (defaults to now)
     *               metadata:
     *                 type: object
     *                 description: Additional interaction metadata
     *     responses:
     *       201:
     *         description: Interaction recorded successfully
     *       400:
     *         description: Invalid request parameters
     *       500:
     *         description: Internal server error
     */
    router.post('/interactions', validateRequest(interactionValidation), searchController.recordInteraction);

    /**
     * @swagger
     * /api/search/index:
     *   post:
     *     summary: Index documents (Admin only)
     *     tags: [Admin]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - documents
     *               - index
     *             properties:
     *               documents:
     *                 type: array
     *                 items:
     *                   type: object
     *                 description: Array of documents to index
     *               index:
     *                 type: string
     *                 enum: [products, hotels]
     *                 description: Target index name
     *               operation:
     *                 type: string
     *                 enum: [index, update, delete]
     *                 default: index
     *                 description: Indexing operation type
     *     responses:
     *       200:
     *         description: Documents indexed successfully
     *       400:
     *         description: Invalid request parameters
     *       401:
     *         description: Unauthorized
     *       500:
     *         description: Internal server error
     */
    router.post('/index', authMiddleware, validateRequest(indexingValidation), searchController.indexDocuments);

    /**
     * @swagger
     * /api/search/health:
     *   get:
     *     summary: Health check endpoint
     *     tags: [Health]
     *     responses:
     *       200:
     *         description: Service is healthy
     *       503:
     *         description: Service is unhealthy
     */
    router.get('/health', searchController.healthCheck);

    return router;
}