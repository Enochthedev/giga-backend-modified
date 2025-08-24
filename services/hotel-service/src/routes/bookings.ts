import { Router } from 'express';
import { BookingController } from '../controllers/booking.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateBody, validateParams } from '../middleware/validation.middleware';
import { createBookingSchema, uuidSchema } from '../validation/hotel.validation';
import Joi from 'joi';

const router = Router();
const bookingController = new BookingController();

/**
 * @openapi
 * /api/bookings:
 *   post:
 *     summary: Create a new booking
 *     tags: [Bookings]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - propertyId
 *               - roomId
 *               - guestName
 *               - guestEmail
 *               - checkInDate
 *               - checkOutDate
 *               - adults
 *             properties:
 *               propertyId:
 *                 type: string
 *                 format: uuid
 *               roomId:
 *                 type: string
 *                 format: uuid
 *               guestName:
 *                 type: string
 *               guestEmail:
 *                 type: string
 *                 format: email
 *               guestPhone:
 *                 type: string
 *               checkInDate:
 *                 type: string
 *                 format: date
 *               checkOutDate:
 *                 type: string
 *                 format: date
 *               adults:
 *                 type: integer
 *                 minimum: 1
 *               children:
 *                 type: integer
 *                 minimum: 0
 *               specialRequests:
 *                 type: string
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Room not available
 */
router.post('/bookings',
  authMiddleware,
  validateBody(createBookingSchema),
  bookingController.createBooking
);

/**
 * @openapi
 * /api/bookings/my:
 *   get:
 *     summary: Get current user's bookings
 *     tags: [Bookings]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User bookings retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/bookings/my', authMiddleware, bookingController.getUserBookings);

/**
 * @openapi
 * /api/bookings/{id}:
 *   get:
 *     summary: Get booking by ID
 *     tags: [Bookings]
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
 *         description: Booking retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 */
router.get('/bookings/:id',
  authMiddleware,
  validateParams(Joi.object({ id: uuidSchema })),
  bookingController.getBooking
);

/**
 * @openapi
 * /api/bookings/{id}/status:
 *   patch:
 *     summary: Update booking status
 *     tags: [Bookings]
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
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, checked_in, checked_out, cancelled, no_show]
 *     responses:
 *       200:
 *         description: Booking status updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 */
router.patch('/bookings/:id/status',
  authMiddleware,
  validateParams(Joi.object({ id: uuidSchema })),
  validateBody(Joi.object({
    status: Joi.string().valid('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show').required()
  })),
  bookingController.updateBookingStatus
);

/**
 * @openapi
 * /api/bookings/{id}/cancel:
 *   post:
 *     summary: Cancel a booking
 *     tags: [Bookings]
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Booking cancelled successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 *       409:
 *         description: Cannot cancel booking
 */
router.post('/bookings/:id/cancel',
  authMiddleware,
  validateParams(Joi.object({ id: uuidSchema })),
  validateBody(Joi.object({
    reason: Joi.string().optional()
  })),
  bookingController.cancelBooking
);

/**
 * @openapi
 * /api/bookings/{id}/payment:
 *   patch:
 *     summary: Update booking payment status (internal use)
 *     tags: [Bookings]
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
 *             required:
 *               - paymentStatus
 *             properties:
 *               paymentStatus:
 *                 type: string
 *                 enum: [pending, paid, failed, refunded, partially_refunded]
 *               paymentIntentId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment status updated successfully
 *       404:
 *         description: Booking not found
 */
router.patch('/bookings/:id/payment',
  validateParams(Joi.object({ id: uuidSchema })),
  validateBody(Joi.object({
    paymentStatus: Joi.string().valid('pending', 'paid', 'failed', 'refunded', 'partially_refunded').required(),
    paymentIntentId: Joi.string().optional()
  })),
  bookingController.updatePaymentStatus
);

export default router;
