import { Router } from 'express';
import { RoomController } from '../controllers/room.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.middleware';
import { createRoomSchema, updateRoomSchema, uuidSchema } from '../validation/hotel.validation';
import Joi from 'joi';

const router = Router();
const roomController = new RoomController();

/**
 * @openapi
 * /api/properties/{propertyId}/rooms:
 *   post:
 *     summary: Create a new room for a property
 *     tags: [Rooms]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
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
 *             required:
 *               - roomType
 *               - name
 *               - maxOccupancy
 *               - basePrice
 *             properties:
 *               roomType:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               maxOccupancy:
 *                 type: integer
 *                 minimum: 1
 *               bedType:
 *                 type: string
 *               bedCount:
 *                 type: integer
 *                 minimum: 1
 *               roomSize:
 *                 type: number
 *               roomSizeUnit:
 *                 type: string
 *                 enum: [sqm, sqft]
 *               basePrice:
 *                 type: number
 *                 minimum: 0
 *               currency:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 3
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
 *         description: Room created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Property not found
 */
router.post('/properties/:propertyId/rooms',
    authMiddleware,
    validateParams(Joi.object({ propertyId: uuidSchema })),
    validateBody(createRoomSchema),
    roomController.createRoom
);

/**
 * @openapi
 * /api/properties/{propertyId}/rooms:
 *   get:
 *     summary: Get all rooms for a property
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Property rooms retrieved successfully
 *       404:
 *         description: Property not found
 */
router.get('/properties/:propertyId/rooms',
    validateParams(Joi.object({ propertyId: uuidSchema })),
    roomController.getPropertyRooms
);

/**
 * @openapi
 * /api/rooms/{id}:
 *   get:
 *     summary: Get room by ID
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Room retrieved successfully
 *       404:
 *         description: Room not found
 */
router.get('/rooms/:id',
    validateParams(Joi.object({ id: uuidSchema })),
    roomController.getRoom
);

/**
 * @openapi
 * /api/rooms/{id}:
 *   put:
 *     summary: Update room
 *     tags: [Rooms]
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
 *               roomType:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               maxOccupancy:
 *                 type: integer
 *                 minimum: 1
 *               bedType:
 *                 type: string
 *               bedCount:
 *                 type: integer
 *                 minimum: 1
 *               roomSize:
 *                 type: number
 *               roomSizeUnit:
 *                 type: string
 *                 enum: [sqm, sqft]
 *               basePrice:
 *                 type: number
 *                 minimum: 0
 *               currency:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 3
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
 *         description: Room updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Room not found
 */
router.put('/rooms/:id',
    authMiddleware,
    validateParams(Joi.object({ id: uuidSchema })),
    validateBody(updateRoomSchema),
    roomController.updateRoom
);

/**
 * @openapi
 * /api/rooms/{id}:
 *   delete:
 *     summary: Delete room
 *     tags: [Rooms]
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
 *         description: Room deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Room not found
 */
router.delete('/rooms/:id',
    authMiddleware,
    validateParams(Joi.object({ id: uuidSchema })),
    roomController.deleteRoom
);

/**
 * @openapi
 * /api/rooms/{id}/availability:
 *   get:
 *     summary: Check room availability for specific dates
 *     tags: [Rooms]
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
 *     responses:
 *       200:
 *         description: Room availability checked successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Room not found
 */
router.get('/rooms/:id/availability',
    validateParams(Joi.object({ id: uuidSchema })),
    validateQuery(Joi.object({
        checkInDate: Joi.date().iso().required(),
        checkOutDate: Joi.date().iso().greater(Joi.ref('checkInDate')).required()
    })),
    roomController.checkRoomAvailability
);

export default router;