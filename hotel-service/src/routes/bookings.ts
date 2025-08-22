import { Router } from 'express';

const router = Router();

// Simple middleware functions for now
const authMiddleware = (req: any, res: any, next: any) => {
  // For now, just pass through - no actual auth
  req.userData = { id: 'test-user' };
  next();
};

const checkRole = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    // For now, just pass through - no actual role checking
    next();
  };
};

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
