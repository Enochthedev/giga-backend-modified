import { Router } from 'express';
import UserController from '../controllers/user.controller';
import validate from '../middleware/validate';
import { authMiddleware } from 'common';
import validations from '../validations';
import { checkRole } from 'common';

const router = Router();

// Authentication routes
router.post('/users', validate(validations.users.createUser), UserController.createUser);
router.post('/auth/login', validate(validations.users.loginUser), UserController.loginUser);
router.post('/auth/logout', authMiddleware, UserController.logoutUser);

// OTP verification routes
router.post('/auth/verify-otp', validate(validations.users.verifyOTP), UserController.verifyOTP);
router.post('/auth/resend-otp', validate(validations.users.resendOTP), UserController.resendOTP);

// Email verification
router.post('/auth/verify-email', UserController.verifyEmail);

// User management routes
router.get('/users/:id', authMiddleware, checkRole(['customer', 'driver', 'admin']), UserController.getUser);
router.put('/users/profile', authMiddleware, validate(validations.users.updateProfile), UserController.updateProfile);

// Additional user features
router.post('/users/:id/cards', authMiddleware, checkRole(['customer']), UserController.addCard);
router.post('/users/:id/ratings', authMiddleware, checkRole(['driver']), UserController.rateUser);
router.post('/users/:id/taxi-account', authMiddleware, checkRole(['customer']), UserController.createTaxiAccount);

export default router;
