import crypto from 'crypto';
import { DatabaseConnection } from '../database/connection';
import { ApiError } from '@giga/common';

export interface RefreshToken {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    isRevoked: boolean;
    deviceInfo?: any;
    createdAt: Date;
}

export interface CreateRefreshTokenData {
    userId: string;
    token: string;
    expiresAt: Date;
    deviceInfo?: any;
}

/**
 * Refresh token model for database operations
 */
export class RefreshTokenModel {
    /**
     * Create a new refresh token
     */
    public static async create(tokenData: CreateRefreshTokenData): Promise<RefreshToken> {
        try {
            // Hash the token for security
            const tokenHash = this.hashToken(tokenData.token);

            const query = `
                INSERT INTO refresh_tokens (user_id, token_hash, expires_at, device_info)
                VALUES ($1, $2, $3, $4)
                RETURNING id, user_id, token_hash, expires_at, is_revoked, device_info, created_at
            `;

            const values = [
                tokenData.userId,
                tokenHash,
                tokenData.expiresAt,
                tokenData.deviceInfo ? JSON.stringify(tokenData.deviceInfo) : null
            ];

            const result = await DatabaseConnection.query(query, values);
            return this.mapDbTokenToToken(result.rows[0]);
        } catch (error) {
            throw ApiError.internal('Failed to create refresh token');
        }
    }

    /**
     * Find refresh token by token value
     */
    public static async findByToken(token: string): Promise<RefreshToken | null> {
        try {
            const tokenHash = this.hashToken(token);

            const query = `
                SELECT id, user_id, token_hash, expires_at, is_revoked, device_info, created_at
                FROM refresh_tokens
                WHERE token_hash = $1
            `;

            const result = await DatabaseConnection.query(query, [tokenHash]);

            if (result.rows.length === 0) {
                return null;
            }

            return this.mapDbTokenToToken(result.rows[0]);
        } catch (error) {
            throw ApiError.internal('Failed to find refresh token');
        }
    }

    /**
     * Find all refresh tokens for a user
     */
    public static async findByUserId(userId: string): Promise<RefreshToken[]> {
        try {
            const query = `
                SELECT id, user_id, token_hash, expires_at, is_revoked, device_info, created_at
                FROM refresh_tokens
                WHERE user_id = $1 AND is_revoked = false AND expires_at > NOW()
                ORDER BY created_at DESC
            `;

            const result = await DatabaseConnection.query(query, [userId]);
            return result.rows.map(this.mapDbTokenToToken);
        } catch (error) {
            throw ApiError.internal('Failed to find user refresh tokens');
        }
    }

    /**
     * Revoke a refresh token
     */
    public static async revoke(tokenId: string): Promise<void> {
        try {
            const query = `
                UPDATE refresh_tokens
                SET is_revoked = true
                WHERE id = $1
            `;

            await DatabaseConnection.query(query, [tokenId]);
        } catch (error) {
            throw ApiError.internal('Failed to revoke refresh token');
        }
    }

    /**
     * Revoke all refresh tokens for a user
     */
    public static async revokeAllForUser(userId: string): Promise<void> {
        try {
            const query = `
                UPDATE refresh_tokens
                SET is_revoked = true
                WHERE user_id = $1 AND is_revoked = false
            `;

            await DatabaseConnection.query(query, [userId]);
        } catch (error) {
            throw ApiError.internal('Failed to revoke user refresh tokens');
        }
    }

    /**
     * Clean up expired tokens
     */
    public static async cleanupExpired(): Promise<number> {
        try {
            const query = `
                DELETE FROM refresh_tokens
                WHERE expires_at < NOW() OR is_revoked = true
            `;

            const result = await DatabaseConnection.query(query);
            return result.rowCount || 0;
        } catch (error) {
            throw ApiError.internal('Failed to cleanup expired tokens');
        }
    }

    /**
     * Get token statistics for a user
     */
    public static async getUserTokenStats(userId: string): Promise<{
        activeTokens: number;
        totalTokens: number;
        lastTokenCreated?: Date;
    }> {
        try {
            const query = `
                SELECT 
                    COUNT(*) FILTER (WHERE is_revoked = false AND expires_at > NOW()) as active_tokens,
                    COUNT(*) as total_tokens,
                    MAX(created_at) as last_token_created
                FROM refresh_tokens
                WHERE user_id = $1
            `;

            const result = await DatabaseConnection.query(query, [userId]);
            const row = result.rows[0];

            return {
                activeTokens: parseInt(row.active_tokens) || 0,
                totalTokens: parseInt(row.total_tokens) || 0,
                lastTokenCreated: row.last_token_created
            };
        } catch (error) {
            throw ApiError.internal('Failed to get token statistics');
        }
    }

    /**
     * Hash token for secure storage
     */
    private static hashToken(token: string): string {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    /**
     * Map database token to RefreshToken interface
     */
    private static mapDbTokenToToken(dbToken: any): RefreshToken {
        return {
            id: dbToken.id,
            userId: dbToken.user_id,
            tokenHash: dbToken.token_hash,
            expiresAt: dbToken.expires_at,
            isRevoked: dbToken.is_revoked,
            deviceInfo: dbToken.device_info ? JSON.parse(dbToken.device_info) : undefined,
            createdAt: dbToken.created_at
        };
    }
}