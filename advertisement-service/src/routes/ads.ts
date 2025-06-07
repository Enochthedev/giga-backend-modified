import { Router } from 'express';
import { authMiddleware, checkRole } from 'common';

const router = Router();

/**
 * @openapi
 * /ads:
 *   post:
 *     summary: Create an advertisement
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/ads', authMiddleware, checkRole(['vendor']), (_req, res) => {
  res.status(201).json({ message: 'Ad created' });
});

export default router;
