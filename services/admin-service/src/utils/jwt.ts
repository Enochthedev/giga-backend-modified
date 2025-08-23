import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AdminUser } from '../types/admin.types';

/**
 * JWT utility functions for admin authentication
 */
export class JWTUtils {
    private static readonly JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
    private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
    private static readonly JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

    /**
     * Generate access token for admin user
     */
    public static generateAccessToken(user: AdminUser): string {
        const payload = {
            id: user.id,
            email: user.email,
            roleId: user.roleId,
            permissions: user.role?.permissions || [],
            type: 'access'
        };

        return jwt.sign(payload, this.JWT_SECRET, {
            expiresIn: this.JWT_EXPIRES_IN,
            issuer: 'admin-service',
            audience: 'admin-dashboard'
        });
    }

    /**
     * Generate refresh token
     */
    public static generateRefreshToken(userId: string): string {
        const payload = {
            id: userId,
            type: 'refresh'
        };

        return jwt.sign(payload, this.JWT_SECRET, {
            expiresIn: this.JWT_REFRESH_EXPIRES_IN,
            issuer: 'admin-service',
            audience: 'admin-dashboard'
        });
    }

    /**
     * Verify and decode token
     */
    public static verifyToken(token: string): any {
        try {
            return jwt.verify(token, this.JWT_SECRET, {
                issuer: 'admin-service',
                audience: 'admin-dashboard'
            });
        } catch (error) {
            throw new Error('Invalid or expired token');
        }
    }

    /**
     * Generate token hash for storage
     */
    public static generateTokenHash(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    /**
     * Get token expiration date
     */
    public static getTokenExpiration(expiresIn: string = this.JWT_EXPIRES_IN): Date {
        const now = new Date();

        // Parse expiration string (e.g., '24h', '7d', '30m')
        const match = expiresIn.match(/^(\d+)([hdm])$/);
        if (!match) {
            throw new Error('Invalid expiration format');
        }

        const value = parseInt(match[1]);
        const unit = match[2];

        switch (unit) {
            case 'h':
                return new Date(now.getTime() + value * 60 * 60 * 1000);
            case 'd':
                return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
            case 'm':
                return new Date(now.getTime() + value * 60 * 1000);
            default:
                throw new Error('Invalid expiration unit');
        }
    }

    /**
     * Extract token from Authorization header
     */
    public static extractTokenFromHeader(authHeader?: string): string | null {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }
        return authHeader.substring(7);
    }
}