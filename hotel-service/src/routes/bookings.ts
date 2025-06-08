import { Router } from 'express';
import { authMiddleware, checkRole } from 'common';

const router = Router();

/**
 * @openapi
 * /bookings:
 *   post:
 *     summary: Book a hotel room
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/bookings', authMiddleware, checkRole(['customer']), (_req, res) => {
  res.status(201).json({ message: 'Hotel booked' });
});

/**
 * @openapi
 * /bookings:
 *   get:
 *     summary: List bookings
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/bookings', authMiddleware, (_req, res) => {
  res.json([{ id: 1, hotel: 'Sample Hotel' }]);
});

export default router;
