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

export default router;
