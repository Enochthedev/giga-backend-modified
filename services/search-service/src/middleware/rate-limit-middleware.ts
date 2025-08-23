import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { ResponseHelper } from '../utils/response';
import { logger } from '../utils/logger';

/**
 * Rate limiting configuration
 */
const rateLimitConfig = {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 100 requests per window
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers

    // Custom key generator to support user-based rate limiting
    keyGenerator: (req: Request): string => {
        const userId = req.headers['user-id'] as string;
        const ip = req.ip || req.connection.remoteAddress || 'unknown';

        // Use user ID if available, otherwise fall back to IP
        return userId || ip;
    },

    // Custom handler for rate limit exceeded
    handler: (req: Request, res: Response) => {
        logger.warn('Rate limit exceeded', {
            ip: req.ip,
            userId: req.headers['user-id'],
            path: req.path,
            method: req.method
        });

        return ResponseHelper.error(
            res,
            'Too many requests. Please try again later.',
            429,
            'RATE_LIMIT_EXCEEDED',
            {
                retryAfter: Math.round(rateLimitConfig.windowMs / 1000)
            }
        );
    },

    // Skip rate limiting for certain conditions
    skip: (req: Request): boolean => {
        // Skip rate limiting for health checks
        if (req.path === '/api/search/health') {
            return true;
        }

        // Skip for admin users (if implemented)
        const userRole = req.headers['user-role'] as string;
        if (userRole === 'admin') {
            return true;
        }

        return false;
    }
};

/**
 * General rate limiting middleware
 */
export const rateLimitMiddleware = rateLimit(rateLimitConfig);

/**
 * Strict rate limiting for expensive operations
 */
export const strictRateLimitMiddleware = rateLimit({
    ...rateLimitConfig,
    windowMs: 60000, // 1 minute
    max: 10, // 10 requests per minute
    message: 'Too many expensive requests, please try again later'
});

/**
 * Lenient rate limiting for read-only operations
 */
export const lenientRateLimitMiddleware = rateLimit({
    ...rateLimitConfig,
    max: 200, // 200 requests per window
    message: 'Too many requests, please try again later'
});