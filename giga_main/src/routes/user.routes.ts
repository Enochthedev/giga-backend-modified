import { Router } from 'express';
import UserController from '../controllers/user.controller';
import validate from '../middleware/validate';
import { authMiddleware } from 'common';
import validations from '../validations';
import { checkRole } from 'common';

const router = Router();

router.post('/users', validate(validations.users.createUser), UserController.createUser);
router.post('/auth/login', validate(validations.users.loginUser), UserController.loginUser);
router.get('/users/:id', authMiddleware, checkRole(['customer', 'driver', 'admin']), UserController.getUser);
router.post('/users/:id/cards', authMiddleware, checkRole(['customer']), UserController.addCard);
router.post('/users/:id/ratings', authMiddleware, checkRole(['driver']), UserController.rateUser);
router.post('/users/:id/taxi-account', authMiddleware, checkRole(['customer']), UserController.createTaxiAccount);

export default router;
