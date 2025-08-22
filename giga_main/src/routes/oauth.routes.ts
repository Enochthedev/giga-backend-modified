import { Router } from 'express';
import OAuthController from '../controllers/oauth.controller';

const router = Router();

// Google OAuth routes
router.get('/google', OAuthController.googleAuth);
router.get('/google/callback', OAuthController.googleCallback);

// Apple OAuth routes
router.get('/apple', OAuthController.appleAuth);
router.get('/apple/callback', OAuthController.appleCallback);

// OAuth status check
router.get('/status/:provider', OAuthController.getOAuthStatus);

export default router;
