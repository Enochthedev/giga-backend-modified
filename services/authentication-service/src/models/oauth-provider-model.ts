import { DatabaseConnection } from '../database/connection';
import { ApiError } from '@giga/common';

export interface OAuthProvider {
    id: string;
    userId: string;
    provider: string;
    providerUserId: string;
    providerEmail?: string;
    providerData?: any;
    isVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateOAuthProviderData {
    userId: string;
    provider: string;
    providerUserId: string;
    providerEmail?: string;
    providerData?: any;
    isVerified?: boolean;
}

export interface UpdateOAuthProviderData {
    providerEmail?: string;
    providerData?: any;
    isVerified?: boolean;
}

/**
 * OAuth provider model for database operations
 */
export class OAuthProviderModel {
    /**
     * Create a new OAuth provider record
     */
    public static async create(data: CreateOAuthProviderData): Promise<OAuthProvider> {
        try {
            const query = `
                INSERT INTO oauth_providers (user_id, provider, provider_user_id, provider_email, provider_data, is_verified)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id, user_id, provider, provider_user_id, provider_email, provider_data, 
                         is_verified, created_at, updated_at
            `;

            const values = [
                data.userId,
                data.provider,
                data.providerUserId,
                data.providerEmail || null,
                data.providerData ? JSON.stringify(data.providerData) : null,
                data.isVerified || false
            ];

            const result = await DatabaseConnection.query(query, values);
            return this.mapDbProviderToProvider(result.rows[0]);
        } catch (error) {
            if ((error as any).code === '23505') { // Unique constraint violation
                throw ApiError.conflict('OAuth provider already exists');
            }
            throw ApiError.internal('Failed to create OAuth provider');
        }
    }

    /**
     * Find OAuth provider by provider and provider user ID
     */
    public static async findByProviderUserId(
        provider: string,
        providerUserId: string
    ): Promise<OAuthProvider | null> {
        try {
            const query = `
                SELECT id, user_id, provider, provider_user_id, provider_email, provider_data,
                       is_verified, created_at, updated_at
                FROM oauth_providers
                WHERE provider = $1 AND provider_user_id = $2
            `;

            const result = await DatabaseConnection.query(query, [provider, providerUserId]);

            if (result.rows.length === 0) {
                return null;
            }

            return this.mapDbProviderToProvider(result.rows[0]);
        } catch (error) {
            throw ApiError.internal('Failed to find OAuth provider');
        }
    }

    /**
     * Find OAuth provider by user ID and provider
     */
    public static async findByUserIdAndProvider(
        userId: string,
        provider: string
    ): Promise<OAuthProvider | null> {
        try {
            const query = `
                SELECT id, user_id, provider, provider_user_id, provider_email, provider_data,
                       is_verified, created_at, updated_at
                FROM oauth_providers
                WHERE user_id = $1 AND provider = $2
            `;

            const result = await DatabaseConnection.query(query, [userId, provider]);

            if (result.rows.length === 0) {
                return null;
            }

            return this.mapDbProviderToProvider(result.rows[0]);
        } catch (error) {
            throw ApiError.internal('Failed to find OAuth provider');
        }
    }

    /**
     * Find all OAuth providers for a user
     */
    public static async findByUserId(userId: string): Promise<OAuthProvider[]> {
        try {
            const query = `
                SELECT id, user_id, provider, provider_user_id, provider_email, provider_data,
                       is_verified, created_at, updated_at
                FROM oauth_providers
                WHERE user_id = $1
                ORDER BY created_at DESC
            `;

            const result = await DatabaseConnection.query(query, [userId]);
            return result.rows.map(this.mapDbProviderToProvider);
        } catch (error) {
            throw ApiError.internal('Failed to find user OAuth providers');
        }
    }

    /**
     * Update OAuth provider
     */
    public static async update(id: string, data: UpdateOAuthProviderData): Promise<OAuthProvider> {
        try {
            const setParts: string[] = [];
            const values: any[] = [];
            let paramIndex = 1;

            if (data.providerEmail !== undefined) {
                setParts.push(`provider_email = $${paramIndex++}`);
                values.push(data.providerEmail);
            }

            if (data.providerData !== undefined) {
                setParts.push(`provider_data = $${paramIndex++}`);
                values.push(data.providerData ? JSON.stringify(data.providerData) : null);
            }

            if (data.isVerified !== undefined) {
                setParts.push(`is_verified = $${paramIndex++}`);
                values.push(data.isVerified);
            }

            if (setParts.length === 0) {
                throw ApiError.badRequest('No fields to update');
            }

            values.push(id);

            const query = `
                UPDATE oauth_providers
                SET ${setParts.join(', ')}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $${paramIndex}
                RETURNING id, user_id, provider, provider_user_id, provider_email, provider_data,
                         is_verified, created_at, updated_at
            `;

            const result = await DatabaseConnection.query(query, values);

            if (result.rows.length === 0) {
                throw ApiError.notFound('OAuth provider not found');
            }

            return this.mapDbProviderToProvider(result.rows[0]);
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            throw ApiError.internal('Failed to update OAuth provider');
        }
    }

    /**
     * Delete OAuth provider
     */
    public static async delete(id: string): Promise<void> {
        try {
            const query = `DELETE FROM oauth_providers WHERE id = $1`;
            const result = await DatabaseConnection.query(query, [id]);

            if (result.rowCount === 0) {
                throw ApiError.notFound('OAuth provider not found');
            }
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            throw ApiError.internal('Failed to delete OAuth provider');
        }
    }

    /**
     * Delete all OAuth providers for a user
     */
    public static async deleteByUserId(userId: string): Promise<void> {
        try {
            const query = `DELETE FROM oauth_providers WHERE user_id = $1`;
            await DatabaseConnection.query(query, [userId]);
        } catch (error) {
            throw ApiError.internal('Failed to delete user OAuth providers');
        }
    }

    /**
     * Map database OAuth provider to OAuthProvider interface
     */
    private static mapDbProviderToProvider(dbProvider: any): OAuthProvider {
        return {
            id: dbProvider.id,
            userId: dbProvider.user_id,
            provider: dbProvider.provider,
            providerUserId: dbProvider.provider_user_id,
            providerEmail: dbProvider.provider_email,
            providerData: dbProvider.provider_data ? JSON.parse(dbProvider.provider_data) : undefined,
            isVerified: dbProvider.is_verified,
            createdAt: dbProvider.created_at,
            updatedAt: dbProvider.updated_at
        };
    }
}