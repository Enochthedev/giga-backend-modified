import bcrypt from 'bcryptjs';
import { DatabaseConnection } from '../database/connection';
import { ApiError } from '@giga/common';

export interface UserMfa {
    id: string;
    userId: string;
    method: string;
    secret?: string;
    backupCodes?: string[];
    isEnabled: boolean;
    isVerified: boolean;
    phoneNumber?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateUserMfaData {
    userId: string;
    method: string;
    secret?: string;
    backupCodes?: string[];
    isEnabled?: boolean;
    isVerified?: boolean;
    phoneNumber?: string;
}

export interface UpdateUserMfaData {
    secret?: string | null;
    backupCodes?: string[] | null;
    isEnabled?: boolean;
    isVerified?: boolean;
    phoneNumber?: string;
}

/**
 * User MFA model for database operations
 */
export class UserMfaModel {
    /**
     * Create a new MFA record
     */
    public static async create(data: CreateUserMfaData): Promise<UserMfa> {
        try {
            const query = `
                INSERT INTO user_mfa (user_id, method, secret, backup_codes, is_enabled, is_verified, phone_number)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, user_id, method, secret, backup_codes, is_enabled, is_verified, 
                         phone_number, created_at, updated_at
            `;

            const values = [
                data.userId,
                data.method,
                data.secret || null,
                data.backupCodes ? JSON.stringify(data.backupCodes) : null,
                data.isEnabled || false,
                data.isVerified || false,
                data.phoneNumber || null
            ];

            const result = await DatabaseConnection.query(query, values);
            return this.mapDbMfaToMfa(result.rows[0]);
        } catch (error) {
            if ((error as any).code === '23505') { // Unique constraint violation
                throw ApiError.conflict('MFA method already exists for this user');
            }
            throw ApiError.internal('Failed to create MFA record');
        }
    }
    /**
         * Find MFA record by user ID and method
         */
    public static async findByUserIdAndMethod(userId: string, method: string): Promise<UserMfa | null> {
        try {
            const query = `
                SELECT id, user_id, method, secret, backup_codes, is_enabled, is_verified,
                       phone_number, created_at, updated_at
                FROM user_mfa
                WHERE user_id = $1 AND method = $2
            `;

            const result = await DatabaseConnection.query(query, [userId, method]);

            if (result.rows.length === 0) {
                return null;
            }

            return this.mapDbMfaToMfa(result.rows[0]);
        } catch (error) {
            throw ApiError.internal('Failed to find MFA record');
        }
    }

    /**
     * Find all MFA records for a user
     */
    public static async findByUserId(userId: string): Promise<UserMfa[]> {
        try {
            const query = `
                SELECT id, user_id, method, secret, backup_codes, is_enabled, is_verified,
                       phone_number, created_at, updated_at
                FROM user_mfa
                WHERE user_id = $1
                ORDER BY created_at DESC
            `;

            const result = await DatabaseConnection.query(query, [userId]);
            return result.rows.map(this.mapDbMfaToMfa);
        } catch (error) {
            throw ApiError.internal('Failed to find user MFA records');
        }
    }

    /**
     * Update MFA record
     */
    public static async update(id: string, data: UpdateUserMfaData): Promise<UserMfa> {
        try {
            const setParts: string[] = [];
            const values: any[] = [];
            let paramIndex = 1;

            if (data.secret !== undefined) {
                setParts.push(`secret = $${paramIndex++}`);
                values.push(data.secret);
            }

            if (data.backupCodes !== undefined) {
                setParts.push(`backup_codes = $${paramIndex++}`);
                values.push(data.backupCodes ? JSON.stringify(data.backupCodes) : null);
            }

            if (data.isEnabled !== undefined) {
                setParts.push(`is_enabled = $${paramIndex++}`);
                values.push(data.isEnabled);
            }

            if (data.isVerified !== undefined) {
                setParts.push(`is_verified = $${paramIndex++}`);
                values.push(data.isVerified);
            }

            if (data.phoneNumber !== undefined) {
                setParts.push(`phone_number = $${paramIndex++}`);
                values.push(data.phoneNumber);
            }

            if (setParts.length === 0) {
                throw ApiError.badRequest('No fields to update');
            }

            values.push(id);

            const query = `
                UPDATE user_mfa
                SET ${setParts.join(', ')}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $${paramIndex}
                RETURNING id, user_id, method, secret, backup_codes, is_enabled, is_verified,
                         phone_number, created_at, updated_at
            `;

            const result = await DatabaseConnection.query(query, values);

            if (result.rows.length === 0) {
                throw ApiError.notFound('MFA record not found');
            }

            return this.mapDbMfaToMfa(result.rows[0]);
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            throw ApiError.internal('Failed to update MFA record');
        }
    }

    /**
     * Delete MFA record
     */
    public static async delete(id: string): Promise<void> {
        try {
            const query = `DELETE FROM user_mfa WHERE id = $1`;
            const result = await DatabaseConnection.query(query, [id]);

            if (result.rowCount === 0) {
                throw ApiError.notFound('MFA record not found');
            }
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            throw ApiError.internal('Failed to delete MFA record');
        }
    }

    /**
     * Update user's MFA enabled status
     */
    public static async updateUserMfaStatus(userId: string, enabled: boolean): Promise<void> {
        try {
            const query = `
                UPDATE users
                SET mfa_enabled = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
            `;

            await DatabaseConnection.query(query, [enabled, userId]);
        } catch (error) {
            throw ApiError.internal('Failed to update user MFA status');
        }
    }

    /**
     * Get user with password hash (for verification)
     */
    public static async getUserWithPassword(userId: string): Promise<{ passwordHash: string } | null> {
        try {
            const query = `
                SELECT password_hash
                FROM users
                WHERE id = $1 AND is_active = true
            `;

            const result = await DatabaseConnection.query(query, [userId]);

            if (result.rows.length === 0) {
                return null;
            }

            return { passwordHash: result.rows[0].password_hash };
        } catch (error) {
            throw ApiError.internal('Failed to get user password');
        }
    }

    /**
     * Verify password
     */
    public static async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
        try {
            return await bcrypt.compare(plainPassword, hashedPassword);
        } catch (error) {
            return false;
        }
    }

    /**
     * Map database MFA to UserMfa interface
     */
    private static mapDbMfaToMfa(dbMfa: any): UserMfa {
        return {
            id: dbMfa.id,
            userId: dbMfa.user_id,
            method: dbMfa.method,
            secret: dbMfa.secret,
            backupCodes: dbMfa.backup_codes ? JSON.parse(dbMfa.backup_codes) : undefined,
            isEnabled: dbMfa.is_enabled,
            isVerified: dbMfa.is_verified,
            phoneNumber: dbMfa.phone_number,
            createdAt: dbMfa.created_at,
            updatedAt: dbMfa.updated_at
        };
    }
}