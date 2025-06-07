import { Router } from 'express';
import { authMiddleware, checkRole } from 'common';

const router = Router();

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

export default router;
