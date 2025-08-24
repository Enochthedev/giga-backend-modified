import { Router } from 'express';
import { AdvancedSearchController } from '../controllers/advanced-search.controller';

const router = Router();
const searchController = new AdvancedSearchController();

/**
 * @swagger
 * /api/search/properties:
 *   get:
 *     summary: Advanced property search with filters and facets
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: City name
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: Country name
 *       - in: query
 *         name: checkInDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Check-in date
 *       - in: query
 *         name: checkOutDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Check-out date
 *       - in: query
 *         name: adults
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Number of adults
 *       - in: query
 *         name: children
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Number of children
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *         description: Latitude for location-based search
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *         description: Longitude for location-based search
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *         description: Search radius in kilometers
 *       - in: query
 *         name: propertyTypes
 *         schema:
 *           type: string
 *         description: Comma-separated property types
 *       - in: query
 *         name: minRating
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *         description: Minimum rating
 *       - in: query
 *         name: maxRating
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *         description: Maximum rating
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price per night
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price per night
 *       - in: query
 *         name: requiredAmenities
 *         schema:
 *           type: string
 *         description: Comma-separated required amenities
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [price_low, price_high, rating, distance, popularity, newest]
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
 *           maximum: 100
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Properties retrieved successfully
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
 *                     properties:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PropertySearchResult'
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     facets:
 *                       type: object
 *                       properties:
 *                         propertyTypes:
 *                           type: object
 *                         priceRanges:
 *                           type: object
 *                         ratings:
 *                           type: object
 *                         amenities:
 *                           type: object
 */
router.get('/search/properties', searchController.searchProperties);

/**
 * @swagger
 * /api/search/suggestions:
 *   get:
 *     summary: Get search suggestions for autocomplete
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Search query
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *         description: Maximum number of suggestions
 *     responses:
 *       200:
 *         description: Search suggestions retrieved successfully
 *       400:
 *         description: Query too short or invalid
 */
router.get('/search/suggestions', searchController.getSearchSuggestions);

/**
 * @swagger
 * /api/search/popular-destinations:
 *   get:
 *     summary: Get popular destinations
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *         description: Maximum number of destinations
 *     responses:
 *       200:
 *         description: Popular destinations retrieved successfully
 */
router.get('/search/popular-destinations', searchController.getPopularDestinations);

export default router;