import rateLimit from 'express-rate-limit';
import { Logger } from '@giga/common';

const logger = Logger;

/**
 * Rate limiting configuration for API Gateway
 * Implements different rate limiting strategies for different endpoints
 */
export class RateLimitConfig {
    private windowMs: number;
    private maxRequests: number;

    constructor() {
        this.windowMs = parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000'); // 15 minutes
        this.maxRequests = parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100');
    }

    /**
     * Create general rate limit middleware
     * @returns Express rate limit middleware
     */
    createRateLimit() {
        return rateLimit({
            windowMs: this.windowMs,
            max: this.maxRequests,
            message: {
                error: 'Too many requests',
                message: 'Too many requests from this IP, please try again later.',
                retryAfter: Math.ceil(this.windowMs / 1000)
            },
            standardHeaders: true,
            legacyHeaders: false,
            handler: (req, res) => {
                logger.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
                res.status(429).json({
                    error: 'Too many requests',
                    message: 'Too many requests from this IP, please try again later.',
                    retryAfter: Math.ceil(this.windowMs / 1000)
                });
            },
            skip: (req) => {
                // Skip rate limiting for health checks
                return req.path.startsWith('/health');
            }
        });
    }

    /**
     * Create strict rate limit for authentication endpoints
     * @returns Express rate limit middleware for auth endpoints
     */
    createAuthRateLimit() {
        return rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 5, // Limit each IP to 5 requests per windowMs for auth
            message: {
                error: 'Too many authentication attempts',
                message: 'Too many authentication attempts from this IP, please try again later.',
                retryAfter: 900 // 15 minutes
            },
            standardHeaders: true,
            legacyHeaders: false,
            handler: (req, res) => {
                logger.warn(`Auth rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
                res.status(429).json({
                    error: 'Too many authentication attempts',
                    message: 'Too many authentication attempts from this IP, please try again later.',
                    retryAfter: 900
                });
            }
        });
    }

    /**
     * Create rate limit for payment endpoints
     * @returns Express rate limit middleware for payment endpoints
     */
    createPaymentRateLimit() {
        return rateLimit({
            windowMs: 60 * 1000, // 1 minute
            max: 10, // Limit each IP to 10 payment requests per minute
            message: {
                error: 'Too many payment requests',
                message: 'Too many payment requests from this IP, please try again later.',
                retryAfter: 60
            },
            standardHeaders: true,
            legacyHeaders: false,
            handler: (req, res) => {
                logger.warn(`Payment rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
                res.status(429).json({
                    error: 'Too many payment requests',
                    message: 'Too many payment requests from this IP, please try again later.',
                    retryAfter: 60
                });
            }
        });
    }

    /**
     * Create lenient rate limit for file uploads
     * @returns Express rate limit middleware for file endpoints
     */
    createFileRateLimit() {
        return rateLimit({
            windowMs: 60 * 1000, // 1 minute
            max: 20, // Allow more file operations
            message: {
                error: 'Too many file requests',
                message: 'Too many file requests from this IP, please try again later.',
                retryAfter: 60
            },
            standardHeaders: true,
            legacyHeaders: false
        });
    }
}