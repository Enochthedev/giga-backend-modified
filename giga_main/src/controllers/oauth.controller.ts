import { Request, Response } from 'express';
import passport from 'passport';
import { signAccessToken, signRefreshToken } from 'common';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync';

class OAuthController {
  // Google OAuth
  googleAuth = catchAsync(async (req: Request, res: Response) => {
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, () => {});
  });

  googleCallback = catchAsync(async (req: Request, res: Response) => {
    passport.authenticate('google', { session: false }, async (err: any, user: any) => {
      if (err || !user) {
        return res.status(httpStatus.UNAUTHORIZED).json({
          message: 'Google authentication failed',
          status: false
        });
      }

      try {
        const payload = { 
          id: user.id, 
          email: user.email, 
          role: user.taxiProfileType || 'customer' 
        };
        
        const token = signAccessToken(payload);
        const refreshToken = signRefreshToken(payload);

        // Redirect to frontend with tokens
        const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?` +
          `token=${token}&refreshToken=${refreshToken}&provider=google`;

        res.redirect(redirectUrl);
      } catch (error) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
          message: 'Token generation failed',
          status: false
        });
      }
    })(req, res);
  });

  // Apple OAuth
  appleAuth = catchAsync(async (req: Request, res: Response) => {
    passport.authenticate('apple', { scope: ['name', 'email'] })(req, res, () => {});
  });

  appleCallback = catchAsync(async (req: Request, res: Response) => {
    passport.authenticate('apple', { session: false }, async (err: any, user: any) => {
      if (err || !user) {
        return res.status(httpStatus.UNAUTHORIZED).json({
          message: 'Apple authentication failed',
          status: false
        });
      }

      try {
        const payload = { 
          id: user.id, 
          email: user.email, 
          role: user.taxiProfileType || 'customer' 
        };
        
        const token = signAccessToken(payload);
        const refreshToken = signRefreshToken(payload);

        // Redirect to frontend with tokens
        const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?` +
          `token=${token}&refreshToken=${refreshToken}&provider=apple`;

        res.redirect(redirectUrl);
      } catch (error) {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
          message: 'Token generation failed',
          status: false
        });
      }
    })(req, res);
  });

  // OAuth login status check
  getOAuthStatus = catchAsync(async (req: Request, res: Response) => {
    const { provider } = req.params;
    
    if (!['google', 'apple'].includes(provider)) {
      return res.status(httpStatus.BAD_REQUEST).json({
        message: 'Invalid OAuth provider',
        status: false
      });
    }

    const isConfigured = !!(
      provider === 'google' 
        ? (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
        : (process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID)
    );

    res.status(httpStatus.OK).json({
      message: `${provider} OAuth status`,
      data: { provider, isConfigured },
      status: true
    });
  });
}

export default new OAuthController();
