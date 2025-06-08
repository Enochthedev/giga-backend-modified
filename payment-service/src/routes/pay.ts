import { Router } from 'express';
import { authMiddleware, checkRole } from 'common';

const router = Router();

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
