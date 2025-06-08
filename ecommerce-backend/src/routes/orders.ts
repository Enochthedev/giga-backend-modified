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
