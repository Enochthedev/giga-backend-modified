import { Router } from 'express';
import { PropertyController } from '../controllers/property.controller';
import { authMiddleware, requireRole, optionalAuthMiddleware } from '../middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.middleware';
import {
    createPropertySchema,
    updatePropertySchema,
    propertySearchSchema,
    uuidSchema
} from '../validation/hotel.validation';
import Joi from 'joi';

const router = Router();
const propertyController = new PropertyController();

/**
 * @openapi
 * /api/properties/search:
 *   get:
 *     summary: Search properties
 *     tags: [Properties]
 *     parameters:
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *       - in: query
 *         name: propertyType
 *         schema:
 *           type: string
 *           enum: [hotel, apartment, house, villa, resort, hostel]
 *       - in: query
 *         name: checkInDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: checkOutDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: adults
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: children
 *         schema:
 *           type: integer
 *           minimum: 0
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: rating
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *       - in: query
 *         name: latitude
 *         schema:
 *           type: number
 *       - in: query
 *         name: longitude
 *         schema:
 *           type: number
 *       - in: query
 *         name: radius
 *         schema:
 *           type: number
 *           description: Search radius in kilometers
 *       - in: query
 *         name: amenities
 *         schema:
 *           type: string
 *           description: Comma-separated list of amenities
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: Properties retrieved successfully
 *       400:
 *         description: Validation error
 */
router.get('/properties/search',
    validateQuery(propertySearchSchema),
    propertyController.searchProperties
);

/**
 * @openapi
 * /api/properties:
 *   post:
 *     summary: Create a new property
 *     tags: [Properties]
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
 *               - propertyType
 *               - addressLine1
 *               - city
 *               - country
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               propertyType:
 *                 type: string
 *                 enum: [hotel, apartment, house, villa, resort, hostel]
 *               addressLine1:
 *                 type: string
 *               addressLine2:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               country:
 *                 type: string
 *               postalCode:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               checkInTime:
 *                 type: string
 *                 format: time
 *               checkOutTime:
 *                 type: string
 *                 format: time
 *               cancellationPolicy:
 *                 type: string
 *               houseRules:
 *                 type: string
 *               amenities:
 *                 type: array
 *                 items:
 *                   type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *     responses:
 *       201:
 *         description: Property created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/properties',
    authMiddleware,
    validateBody(createPropertySchema),
    propertyController.createProperty
);

/**
 * @openapi
 * /api/properties/my:
 *   get:
 *     summary: Get current user's properties
 *     tags: [Properties]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Owner properties retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/properties/my', authMiddleware, propertyController.getOwnerProperties);

/**
 * @openapi
 * /api/properties/{id}:
 *   get:
 *     summary: Get property by ID
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Property retrieved successfully
 *       404:
 *         description: Property not found
 */
router.get('/properties/:id',
    validateParams(Joi.object({ id: uuidSchema })),
    propertyController.getProperty
);

/**
 * @openapi
 * /api/properties/{id}:
 *   put:
 *     summary: Update property
 *     tags: [Properties]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *               propertyType:
 *                 type: string
 *                 enum: [hotel, apartment, house, villa, resort, hostel]
 *               addressLine1:
 *                 type: string
 *               addressLine2:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               country:
 *                 type: string
 *               postalCode:
 *                 type: string
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               checkInTime:
 *                 type: string
 *                 format: time
 *               checkOutTime:
 *                 type: string
 *                 format: time
 *               cancellationPolicy:
 *                 type: string
 *               houseRules:
 *                 type: string
 *               amenities:
 *                 type: array
 *                 items:
 *                   type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *     responses:
 *       200:
 *         description: Property updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Property not found
 */
router.put('/properties/:id',
    authMiddleware,
    validateParams(Joi.object({ id: uuidSchema })),
    validateBody(updatePropertySchema),
    propertyController.updateProperty
);

/**
 * @openapi
 * /api/properties/{id}:
 *   delete:
 *     summary: Delete property
 *     tags: [Properties]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Property deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Property not found
 */
router.delete('/properties/:id',
    authMiddleware,
    validateParams(Joi.object({ id: uuidSchema })),
    propertyController.deleteProperty
);

/**
 * @openapi
 * /api/properties/{id}/availability:
 *   get:
 *     summary: Check property room availability
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: checkInDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: checkOutDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: adults
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: children
 *         schema:
 *           type: integer
 *           minimum: 0
 *     responses:
 *       200:
 *         description: Room availability retrieved successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Property not found
 */
router.get('/properties/:id/availability',
    validateParams(Joi.object({ id: uuidSchema })),
    validateQuery(Joi.object({
        checkInDate: Joi.date().iso().required(),
        checkOutDate: Joi.date().iso().greater(Joi.ref('checkInDate')).required(),
        adults: Joi.number().integer().min(1).required(),
        children: Joi.number().integer().min(0).optional()
    })),
    propertyController.checkAvailability
);

/**
 * @openapi
 * /api/properties/{propertyId}/bookings:
 *   get:
 *     summary: Get property bookings (property owner only)
 *     tags: [Properties, Bookings]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Property bookings retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Property not found
 */
router.get('/properties/:propertyId/bookings',
    authMiddleware,
    validateParams(Joi.object({ propertyId: uuidSchema })),
    (req, res, next) => {
        const bookingController = new (require('../controllers/booking.controller').BookingController)();
        bookingController.getPropertyBookings(req, res, next);
    }
);

export default router;