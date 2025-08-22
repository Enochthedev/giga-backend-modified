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
 * /payments:
 *   post:
 *     summary: Process a payment
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/payments', authMiddleware, checkRole(['customer']), (_req, res) => {
  res.status(201).json({ message: 'Payment processed' });
});

/**
 * @openapi
 * /payments:
 *   get:
 *     summary: List payments
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/payments', authMiddleware, (_req, res) => {
  res.json([{ id: 1, amount: 100 }]);
});

export default router;
