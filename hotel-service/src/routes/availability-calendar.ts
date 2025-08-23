import { Router } from 'express';
import { AvailabilityCalendarController } from '../controllers/availability-calendar.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const calendarController = new AvailabilityCalendarController();

/**
 * @swagger
 * /api/rooms/{roomId}/calendar:
 *   get:
 *     summary: Get availability calendar for a room
 *     tags: [Availability Calendar]
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Room ID
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date
 *     responses:
 *       200:
 *         description: Calendar retrieved successfully
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
 *                     calendar:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                           available:
 *                             type: boolean
 *                           availableCount:
 *                             type: integer
 *                           price:
 *                             type: number
 *                           minimumStay:
 *                             type: integer
 *                           isBlocked:
 *                             type: boolean
 *                           bookings:
 *                             type: array
 *       400:
 *         description: Invalid date format or range
 *       404:
 *         description: Room not found
 */
router.get('/rooms/:roomId/calendar', calendarController.getCalendar);

/**
 * @swagger
 * /api/availability/update:
 *   put:
 *     summary: Update room availability
 *     tags: [Availability Calendar]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - updates
 *             properties:
 *               updates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - roomId
 *                     - date
 *                   properties:
 *                     roomId:
 *                       type: string
 *                       format: uuid
 *                     date:
 *                       type: string
 *                       format: date
 *                     availableCount:
 *                       type: integer
 *                       minimum: 0
 *                     price:
 *                       type: number
 *                       minimum: 0
 *                     minimumStay:
 *                       type: integer
 *                       minimum: 1
 *                     isBlocked:
 *                       type: boolean
 *     responses:
 *       200:
 *         description: Availability updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Room not found
 */
router.put('/availability/update', authMiddleware, calendarController.updateAvailability);

/**
 * @swagger
 * /api/availability/bulk-update:
 *   put:
 *     summary: Bulk update availability for a date range
 *     tags: [Availability Calendar]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roomId
 *               - startDate
 *               - endDate
 *             properties:
 *               roomId:
 *                 type: string
 *                 format: uuid
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               availableCount:
 *                 type: integer
 *                 minimum: 0
 *               price:
 *                 type: number
 *                 minimum: 0
 *               minimumStay:
 *                 type: integer
 *                 minimum: 1
 *               isBlocked:
 *                 type: boolean
 *               daysOfWeek:
 *                 type: array
 *                 items:
 *                   type: integer
 *                   minimum: 0
 *                   maximum: 6
 *                 description: Days of week (0=Sunday, 1=Monday, etc.)
 *     responses:
 *       200:
 *         description: Bulk availability updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Room not found
 */
router.put('/availability/bulk-update', authMiddleware, calendarController.bulkUpdateAvailability);

/**
 * @swagger
 * /api/availability/block:
 *   post:
 *     summary: Block dates for a room
 *     tags: [Availability Calendar]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roomId
 *               - startDate
 *               - endDate
 *             properties:
 *               roomId:
 *                 type: string
 *                 format: uuid
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               reason:
 *                 type: string
 *                 description: Reason for blocking
 *     responses:
 *       200:
 *         description: Dates blocked successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Room not found
 *       409:
 *         description: Conflict with existing bookings
 */
router.post('/availability/block', authMiddleware, calendarController.blockDates);

/**
 * @swagger
 * /api/availability/unblock:
 *   post:
 *     summary: Unblock dates for a room
 *     tags: [Availability Calendar]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - roomId
 *               - startDate
 *               - endDate
 *             properties:
 *               roomId:
 *                 type: string
 *                 format: uuid
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Dates unblocked successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Room not found
 */
router.post('/availability/unblock', authMiddleware, calendarController.unblockDates);

/**
 * @swagger
 * /api/properties/{propertyId}/occupancy-report:
 *   get:
 *     summary: Get occupancy report for a property
 *     tags: [Availability Calendar]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Property ID
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date
 *     responses:
 *       200:
 *         description: Occupancy report retrieved successfully
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
 *                     totalDays:
 *                       type: integer
 *                     occupiedDays:
 *                       type: integer
 *                     occupancyRate:
 *                       type: number
 *                     revenue:
 *                       type: number
 *                     averageDailyRate:
 *                       type: number
 *                     revenuePAR:
 *                       type: number
 *                     dailyBreakdown:
 *                       type: array
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Property not found
 */
router.get('/properties/:propertyId/occupancy-report', authMiddleware, calendarController.getOccupancyReport);

export default router;