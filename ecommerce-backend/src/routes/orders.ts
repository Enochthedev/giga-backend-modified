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
 * /orders:
 *   post:
 *     summary: Create order
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/orders', authMiddleware, checkRole(['customer']), (_req, res) => {
  res.status(201).json({ message: 'Order created' });
});

/**
 * @openapi
 * /orders:
 *   get:
 *     summary: List orders
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/orders', authMiddleware, (_req, res) => {
  res.json([{ id: 1, item: 'Sample product' }]);
});

export default router;
