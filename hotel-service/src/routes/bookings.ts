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

export default router;
