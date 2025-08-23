import { Router } from 'express';
import { BookingModificationController } from '../controllers/booking-modification.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const modificationController = new BookingModificationController();

/**
 * @swagger
 * /api/bookings/{bookingId}/modify:
 *   put:
 *     summary: Modify an existing booking
 *     tags: [Booking Modifications]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
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
 *               roomId:
 *                 type: string
 *                 format: uuid
 *               specialRequests:
 *                 type: string
 *     responses:
 *       200:
 *         description: Booking modified successfully
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
 *                     booking:
 *                       $ref: '#/components/schemas/Booking'
 *                     modificationFee:
 *                       type: object
 *                       properties:
 *                         baseFee:
 *                           type: number
 *                         priceDifference:
 *                           type: number
 *                         totalFee:
 *                           type: number
 *                         newTotalAmount:
 *                           type: number
 *                     refundAmount:
 *                       type: number
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Booking not found
 *       409:
 *         description: Modification not allowed
 */
router.put('/bookings/:bookingId/modify', authMiddleware, modificationController.modifyBooking);

/**
 * @swagger
 * /api/bookings/{bookingId}/cancel:
 *   post:
 *     summary: Cancel a booking
 *     tags: [Booking Modifications]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Booking ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Cancellation reason
 *     responses:
 *       200:
 *         description: Booking cancelled successfully
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
 *                     booking:
 *                       $ref: '#/components/schemas/Booking'
 *                     refundAmount:
 *                       type: number
 *                     cancellationFee:
 *                       type: number
 *                     policy:
 *                       type: object
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Booking not found
 *       409:
 *         description: Cancellation not allowed
 */
router.post('/bookings/:bookingId/cancel', authMiddleware, modificationController.cancelBooking);

/**
 * @swagger
 * /api/bookings/{bookingId}/modification-options:
 *   get:
 *     summary: Get modification options for a booking
 *     tags: [Booking Modifications]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Modification options retrieved successfully
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
 *                     canModify:
 *                       type: boolean
 *                     canCancel:
 *                       type: boolean
 *                     modificationDeadline:
 *                       type: string
 *                       format: date-time
 *                     cancellationPolicy:
 *                       type: object
 *                     availableRooms:
 *                       type: array
 *                     modificationFees:
 *                       type: object
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Booking not found
 */
router.get('/bookings/:bookingId/modification-options', authMiddleware, modificationController.getModificationOptions);

/**
 * @swagger
 * /api/bookings/{bookingId}/modification-history:
 *   get:
 *     summary: Get booking modification history
 *     tags: [Booking Modifications]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Modification history retrieved successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Booking not found
 */
router.get('/bookings/:bookingId/modification-history', authMiddleware, modificationController.getModificationHistory);

export default router;