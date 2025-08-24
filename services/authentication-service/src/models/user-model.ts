import bcrypt from 'bcryptjs';
import { DatabaseConnection } from '../database/connection';
import { ApiError } from '@giga/common';

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName?: string;
    otherNames?: string;
    username: string;
    phone: string;

    // Address Information
    country: string;
    address: string;
    street: string;
    city: string;
    zipCode: string;

    // Personal Information
    gender: 'male' | 'female' | 'other' | 'prefer-not-to-say';
    weight?: number;
    maritalStatus: 'single' | 'married' | 'divorced' | 'widowed' | 'prefer-not-to-say';
    ageGroup: '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+';
    areaOfInterest: string;

    // Profile
    profilePicture?: string;

    // OAuth Integration
    oauthProvider?: 'google' | 'apple';
    oauthId?: string;
    oauthAccessToken?: string;
    oauthRefreshToken?: string;

    // Verification Status
    isActive: boolean;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;

    // OTP Management
    otpCode?: string;
    otpExpires?: Date;

    // Email Verification
    emailVerificationToken?: string;
    emailVerificationExpires?: Date;

    // Ratings & Reviews
    ratings: number[];
    averageRating: number;

    // Taxi Service Integration
    taxiProfileId?: string;
    taxiProfileType: 'TaxiDriver' | 'TaxiCustomer';

    // Payment Integration
    creditCard?: string;

    // Timestamps
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateUserData {
    email: string;
    password?: string; // Optional for OAuth users
    firstName: string;
    lastName?: string;
    otherNames?: string;
    username: string;
    phone: string;

    // Address Information
    country: string;
    address: string;
    street: string;
    city: string;
    zipCode: string;

    // Personal Information
    gender: 'male' | 'female' | 'other' | 'prefer-not-to-say';
    weight?: number;
    maritalStatus: 'single' | 'married' | 'divorced' | 'widowed' | 'prefer-not-to-say';
    ageGroup: '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+';
    areaOfInterest: string;

    // OAuth data (for OAuth users)
    oauthProvider?: 'google' | 'apple';
    oauthId?: string;
    oauthAccessToken?: string;
    oauthRefreshToken?: string;

    // Profile
    profilePicture?: string;
}

export interface UpdateUserData {
    firstName?: string;
    lastName?: string;
    otherNames?: string;
    country?: string;
    address?: string;
    street?: string;
    phone?: string
    dateOfBirth?: Date;
    city?: string;
    zipCode?: string;
    gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
    weight?: number;
    maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed' | 'prefer-not-to-say';
    ageGroup?: '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65+';
    areaOfInterest?: string;
    profilePicture?: string;
}

export interface UserWithRoles extends User {
    roles: Array<{
        id: string;
        name: string;
        permissions: Array<{
            id: string;
            name: string;
            resource: string;
            action: string;
        }>;
    }>;
}

/**
 * User model for database operations
 */
export class UserModel {
    /**
     * Create a new user
     */
    public static async create(userData: CreateUserData): Promise<User> {
        try {
            // Check if user already exists
            const existingUser = await this.findByEmail(userData.email);
            if (existingUser) {
                throw ApiError.conflict('User with this email already exists');
            }

            // Check if username is taken
            const existingUsername = await this.findByUsername(userData.username);
            if (existingUsername) {
                throw ApiError.conflict('Username already taken');
            }

            // Check if phone number is taken
            const existingPhone = await this.findByPhone(userData.phone);
            if (existingPhone) {
                throw ApiError.conflict('Phone number already taken');
            }

            // Hash password (only for email/password users)
            let passwordHash = null;
            if (userData.password) {
                const saltRounds = parseInt(process.env['BCRYPT_ROUNDS'] || '12');
                passwordHash = await bcrypt.hash(userData.password, saltRounds);
            }

            // Generate OTP for phone verification
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

            // Generate email verification token
            const emailToken = this.generateRandomString(6);
            const emailExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

            const query = `
                INSERT INTO users (
                    email, password_hash, first_name, last_name, other_names, username, phone,
                    country, address, street, city, zip_code,
                    gender, weight, marital_status, age_group, area_of_interest,
                    profile_picture, oauth_provider, oauth_id, oauth_access_token, oauth_refresh_token,
                    otp_code, otp_expires, email_verification_token, email_verification_expires,
                    is_email_verified, is_phone_verified, taxi_profile_type
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
                RETURNING *
            `;

            const values = [
                userData.email.toLowerCase(),
                passwordHash,
                userData.firstName,
                userData.lastName || null,
                userData.otherNames || null,
                userData.username.toLowerCase(),
                userData.phone,
                userData.country,
                userData.address,
                userData.street,
                userData.city,
                userData.zipCode,
                userData.gender,
                userData.weight || null,
                userData.maritalStatus,
                userData.ageGroup,
                userData.areaOfInterest,
                userData.profilePicture || null,
                userData.oauthProvider || null,
                userData.oauthId || null,
                userData.oauthAccessToken || null,
                userData.oauthRefreshToken || null,
                userData.oauthProvider ? null : otp, // Only set OTP for email/password users
                userData.oauthProvider ? null : otpExpires,
                emailToken,
                emailExpires,
                userData.oauthProvider ? true : false, // OAuth users have verified emails
                false, // Phone verification required for all users
                'TaxiCustomer' // Default taxi profile type
            ];

            const result = await DatabaseConnection.query(query, values);
            const user = result.rows[0];

            // Assign default user role
            await this.assignRole(user.id, 'user');

            return this.mapDbUserToUser(user);
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            throw ApiError.internal('Failed to create user');
        }
    }

    /**
     * Find user by ID
     */
    public static async findById(id: string): Promise<User | null> {
        try {
            const query = `
                SELECT id, email, first_name, last_name, phone, date_of_birth,
                       is_active, is_verified, last_login_at, created_at, updated_at
                FROM users
                WHERE id = $1 AND is_active = true
            `;

            const result = await DatabaseConnection.query(query, [id]);

            if (result.rows.length === 0) {
                return null;
            }

            return this.mapDbUserToUser(result.rows[0]);
        } catch (error) {
            throw ApiError.internal('Failed to find user');
        }
    }

    /**
     * Find user by email
     */
    public static async findByEmail(email: string): Promise<User | null> {
        try {
            const query = `
                SELECT * FROM users
                WHERE email = $1 AND is_active = true
            `;

            const result = await DatabaseConnection.query(query, [email.toLowerCase()]);

            if (result.rows.length === 0) {
                return null;
            }

            return this.mapDbUserToUser(result.rows[0]);
        } catch (error) {
            throw ApiError.internal('Failed to find user by email');
        }
    }

    /**
     * Find user by username
     */
    public static async findByUsername(username: string): Promise<User | null> {
        try {
            const query = `
                SELECT * FROM users
                WHERE username = $1 AND is_active = true
            `;

            const result = await DatabaseConnection.query(query, [username.toLowerCase()]);

            if (result.rows.length === 0) {
                return null;
            }

            return this.mapDbUserToUser(result.rows[0]);
        } catch (error) {
            throw ApiError.internal('Failed to find user by username');
        }
    }

    /**
     * Find user by phone number
     */
    public static async findByPhone(phone: string): Promise<User | null> {
        try {
            const query = `
                SELECT * FROM users
                WHERE phone = $1 AND is_active = true
            `;

            const result = await DatabaseConnection.query(query, [phone]);

            if (result.rows.length === 0) {
                return null;
            }

            return this.mapDbUserToUser(result.rows[0]);
        } catch (error) {
            throw ApiError.internal('Failed to find user by phone');
        }
    }

    /**
     * Find user by OAuth provider and ID
     */
    public static async findByOAuthId(provider: string, oauthId: string): Promise<User | null> {
        try {
            const query = `
                SELECT * FROM users
                WHERE oauth_provider = $1 AND oauth_id = $2 AND is_active = true
            `;

            const result = await DatabaseConnection.query(query, [provider, oauthId]);

            if (result.rows.length === 0) {
                return null;
            }

            return this.mapDbUserToUser(result.rows[0]);
        } catch (error) {
            throw ApiError.internal('Failed to find user by OAuth ID');
        }
    }

    /**
     * Find user with password hash (for authentication)
     */
    public static async findByEmailWithPassword(email: string): Promise<(User & { passwordHash: string }) | null> {
        try {
            const query = `
                SELECT id, email, password_hash, first_name, last_name, phone, date_of_birth,
                       is_active, is_verified, last_login_at, created_at, updated_at
                FROM users
                WHERE email = $1 AND is_active = true
            `;

            const result = await DatabaseConnection.query(query, [email.toLowerCase()]);

            if (result.rows.length === 0) {
                return null;
            }

            const user = result.rows[0];
            return {
                ...this.mapDbUserToUser(user),
                passwordHash: user.password_hash
            };
        } catch (error) {
            throw ApiError.internal('Failed to find user with password');
        }
    }

    /**
     * Update user
     */
    public static async update(id: string, userData: UpdateUserData): Promise<User> {
        try {
            const setParts: string[] = [];
            const values: any[] = [];
            let paramIndex = 1;

            if (userData.firstName !== undefined) {
                setParts.push(`first_name = $${paramIndex++}`);
                values.push(userData.firstName);
            }

            if (userData.lastName !== undefined) {
                setParts.push(`last_name = $${paramIndex++}`);
                values.push(userData.lastName);
            }

            if (userData.phone !== undefined) {
                setParts.push(`phone = $${paramIndex++}`);
                values.push(userData.phone);
            }

            if (userData.dateOfBirth !== undefined) {
                setParts.push(`date_of_birth = $${paramIndex++}`);
                values.push(userData.dateOfBirth);
            }

            if (setParts.length === 0) {
                throw ApiError.badRequest('No fields to update');
            }

            values.push(id);

            const query = `
                UPDATE users
                SET ${setParts.join(', ')}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $${paramIndex} AND is_active = true
                RETURNING id, email, first_name, last_name, phone, date_of_birth,
                         is_active, is_verified, last_login_at, created_at, updated_at
            `;

            const result = await DatabaseConnection.query(query, values);

            if (result.rows.length === 0) {
                throw ApiError.notFound('User not found');
            }

            return this.mapDbUserToUser(result.rows[0]);
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            throw ApiError.internal('Failed to update user');
        }
    }

    /**
     * Update user password
     */
    public static async updatePassword(id: string, newPassword: string): Promise<void> {
        try {
            const saltRounds = parseInt(process.env['BCRYPT_ROUNDS'] || '12');
            const passwordHash = await bcrypt.hash(newPassword, saltRounds);

            const query = `
                UPDATE users
                SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2 AND is_active = true
            `;

            const result = await DatabaseConnection.query(query, [passwordHash, id]);

            if (result.rowCount === 0) {
                throw ApiError.notFound('User not found');
            }
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            throw ApiError.internal('Failed to update password');
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
     * Update last login timestamp
     */
    public static async updateLastLogin(id: string): Promise<void> {
        try {
            const query = `
                UPDATE users
                SET last_login_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND is_active = true
            `;

            await DatabaseConnection.query(query, [id]);
        } catch (error) {
            // Don't throw error for login timestamp update failure
            console.error('Failed to update last login:', error);
        }
    }

    /**
     * Deactivate user (soft delete)
     */
    public static async deactivate(id: string): Promise<void> {
        try {
            const query = `
                UPDATE users
                SET is_active = false, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `;

            const result = await DatabaseConnection.query(query, [id]);

            if (result.rowCount === 0) {
                throw ApiError.notFound('User not found');
            }
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            throw ApiError.internal('Failed to deactivate user');
        }
    }

    /**
     * Verify user email
     */
    public static async verifyEmail(id: string): Promise<void> {
        try {
            const query = `
                UPDATE users
                SET is_verified = true, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND is_active = true
            `;

            const result = await DatabaseConnection.query(query, [id]);

            if (result.rowCount === 0) {
                throw ApiError.notFound('User not found');
            }
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            throw ApiError.internal('Failed to verify email');
        }
    }

    /**
     * Get user with roles and permissions
     */
    public static async findByIdWithRoles(id: string): Promise<UserWithRoles | null> {
        try {
            const query = `
                SELECT 
                    u.id, u.email, u.first_name, u.last_name, u.phone, u.date_of_birth,
                    u.is_active, u.is_verified, u.last_login_at, u.created_at, u.updated_at,
                    r.id as role_id, r.name as role_name,
                    p.id as permission_id, p.name as permission_name, 
                    p.resource as permission_resource, p.action as permission_action
                FROM users u
                LEFT JOIN user_roles ur ON u.id = ur.user_id
                LEFT JOIN roles r ON ur.role_id = r.id
                LEFT JOIN role_permissions rp ON r.id = rp.role_id
                LEFT JOIN permissions p ON rp.permission_id = p.id
                WHERE u.id = $1 AND u.is_active = true
            `;

            const result = await DatabaseConnection.query(query, [id]);

            if (result.rows.length === 0) {
                return null;
            }

            return this.mapDbUserWithRolesToUser(result.rows);
        } catch (error) {
            throw ApiError.internal('Failed to find user with roles');
        }
    }

    /**
     * Assign role to user
     */
    public static async assignRole(userId: string, roleName: string): Promise<void> {
        try {
            const query = `
                INSERT INTO user_roles (user_id, role_id)
                SELECT $1, r.id
                FROM roles r
                WHERE r.name = $2
                ON CONFLICT (user_id, role_id) DO NOTHING
            `;

            await DatabaseConnection.query(query, [userId, roleName]);
        } catch (error) {
            throw ApiError.internal('Failed to assign role');
        }
    }

    /**
     * Remove role from user
     */
    public static async removeRole(userId: string, roleName: string): Promise<void> {
        try {
            const query = `
                DELETE FROM user_roles
                WHERE user_id = $1 AND role_id = (
                    SELECT id FROM roles WHERE name = $2
                )
            `;

            await DatabaseConnection.query(query, [userId, roleName]);
        } catch (error) {
            throw ApiError.internal('Failed to remove role');
        }
    }

    /**
     * Generate and save OTP for user
     */
    public static async generateOTP(userId: string): Promise<string> {
        try {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

            const query = `
                UPDATE users
                SET otp_code = $1, otp_expires = $2, updated_at = CURRENT_TIMESTAMP
                WHERE id = $3 AND is_active = true
            `;

            const result = await DatabaseConnection.query(query, [otp, otpExpires, userId]);

            if (result.rowCount === 0) {
                throw ApiError.notFound('User not found');
            }

            return otp;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            throw ApiError.internal('Failed to generate OTP');
        }
    }

    /**
     * Verify OTP for user
     */
    public static async verifyOTP(userId: string, otp: string): Promise<boolean> {
        try {
            const query = `
                SELECT otp_code, otp_expires FROM users
                WHERE id = $1 AND is_active = true
            `;

            const result = await DatabaseConnection.query(query, [userId]);

            if (result.rows.length === 0) {
                return false;
            }

            const user = result.rows[0];

            if (!user.otp_code || !user.otp_expires) {
                return false;
            }

            if (new Date() > user.otp_expires) {
                // OTP expired, clear it
                await this.clearOTP(userId);
                return false;
            }

            if (user.otp_code === otp) {
                // OTP verified, mark phone as verified and clear OTP
                await this.verifyPhone(userId);
                await this.clearOTP(userId);
                return true;
            }

            return false;
        } catch (error) {
            throw ApiError.internal('Failed to verify OTP');
        }
    }

    /**
     * Clear OTP for user
     */
    public static async clearOTP(userId: string): Promise<void> {
        try {
            const query = `
                UPDATE users
                SET otp_code = NULL, otp_expires = NULL, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND is_active = true
            `;

            await DatabaseConnection.query(query, [userId]);
        } catch (error) {
            throw ApiError.internal('Failed to clear OTP');
        }
    }

    /**
     * Verify user phone
     */
    public static async verifyPhone(userId: string): Promise<void> {
        try {
            const query = `
                UPDATE users
                SET is_phone_verified = true, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND is_active = true
            `;

            const result = await DatabaseConnection.query(query, [userId]);

            if (result.rowCount === 0) {
                throw ApiError.notFound('User not found');
            }
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            throw ApiError.internal('Failed to verify phone');
        }
    }

    /**
     * Verify email with token
     */
    public static async verifyEmailWithToken(email: string, token: string): Promise<boolean> {
        try {
            const query = `
                UPDATE users
                SET is_email_verified = true, email_verification_token = NULL, 
                    email_verification_expires = NULL, updated_at = CURRENT_TIMESTAMP
                WHERE email = $1 AND email_verification_token = $2 
                    AND email_verification_expires > CURRENT_TIMESTAMP
                    AND is_active = true
            `;

            const result = await DatabaseConnection.query(query, [email.toLowerCase(), token]);

            return result.rowCount > 0;
        } catch (error) {
            throw ApiError.internal('Failed to verify email');
        }
    }

    /**
     * Add rating to user
     */
    public static async addRating(userId: string, rating: number): Promise<void> {
        try {
            // Get current ratings
            const query = `
                SELECT ratings FROM users
                WHERE id = $1 AND is_active = true
            `;

            const result = await DatabaseConnection.query(query, [userId]);

            if (result.rows.length === 0) {
                throw ApiError.notFound('User not found');
            }

            const currentRatings = result.rows[0].ratings || [];
            const newRatings = [...currentRatings, rating];
            const averageRating = newRatings.reduce((sum, r) => sum + r, 0) / newRatings.length;

            const updateQuery = `
                UPDATE users
                SET ratings = $1, average_rating = $2, updated_at = CURRENT_TIMESTAMP
                WHERE id = $3 AND is_active = true
            `;

            await DatabaseConnection.query(updateQuery, [JSON.stringify(newRatings), averageRating, userId]);
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            throw ApiError.internal('Failed to add rating');
        }
    }

    /**
     * Update OAuth tokens
     */
    public static async updateOAuthTokens(userId: string, accessToken: string, refreshToken?: string): Promise<void> {
        try {
            const query = `
                UPDATE users
                SET oauth_access_token = $1, oauth_refresh_token = $2, updated_at = CURRENT_TIMESTAMP
                WHERE id = $3 AND is_active = true
            `;

            const result = await DatabaseConnection.query(query, [accessToken, refreshToken || null, userId]);

            if (result.rowCount === 0) {
                throw ApiError.notFound('User not found');
            }
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            throw ApiError.internal('Failed to update OAuth tokens');
        }
    }

    /**
     * Find user by OAuth provider and ID
     */
    public static async findByOAuthProvider(provider: string, providerId: string): Promise<User | null> {
        return this.findByOAuthId(provider, providerId);
    }

    /**
     * Create OAuth user
     */
    public static async createOAuthUser(oauthData: {
        email: string;
        firstName: string;
        lastName: string;
        profilePicture?: string;
        oauthProvider: 'google' | 'apple';
        oauthId: string;
        oauthAccessToken?: string;
        oauthRefreshToken?: string;
        isVerified: boolean;
    }): Promise<User> {
        const userData: CreateUserData = {
            email: oauthData.email,
            firstName: oauthData.firstName,
            lastName: oauthData.lastName,
            username: `${oauthData.oauthProvider}_${oauthData.oauthId}`,
            phone: '0000000000', // Default phone, user can update later
            country: 'Not specified',
            address: 'Not specified',
            street: 'Not specified',
            city: 'Not specified',
            zipCode: '00000',
            gender: 'prefer-not-to-say',
            weight: 70,
            maritalStatus: 'prefer-not-to-say',
            ageGroup: '25-34',
            areaOfInterest: 'General',
            profilePicture: oauthData.profilePicture,
            oauthProvider: oauthData.oauthProvider,
            oauthId: oauthData.oauthId,
            oauthAccessToken: oauthData.oauthAccessToken,
            oauthRefreshToken: oauthData.oauthRefreshToken
        };

        return this.create(userData);
    }

    /**
     * Link OAuth account to existing user
     */
    public static async linkOAuthAccount(userId: string, oauthData: {
        provider: 'google' | 'apple';
        providerId: string;
        accessToken?: string;
        refreshToken?: string;
    }): Promise<User> {
        try {
            const query = `
                UPDATE users
                SET oauth_provider = $1, oauth_id = $2, oauth_access_token = $3, 
                    oauth_refresh_token = $4, is_email_verified = true, updated_at = CURRENT_TIMESTAMP
                WHERE id = $5 AND is_active = true
                RETURNING *
            `;

            const result = await DatabaseConnection.query(query, [
                oauthData.provider,
                oauthData.providerId,
                oauthData.accessToken || null,
                oauthData.refreshToken || null,
                userId
            ]);

            if (result.rows.length === 0) {
                throw ApiError.notFound('User not found');
            }

            return this.mapDbUserToUser(result.rows[0]);
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            throw ApiError.internal('Failed to link OAuth account');
        }
    }

    /**
     * Update OAuth tokens for user
     */
    public static async updateOAuthTokens(userId: string, tokens: {
        accessToken?: string;
        refreshToken?: string;
    }): Promise<void> {
        try {
            const query = `
                UPDATE users
                SET oauth_access_token = $1, oauth_refresh_token = $2, updated_at = CURRENT_TIMESTAMP
                WHERE id = $3 AND is_active = true
            `;

            const result = await DatabaseConnection.query(query, [
                tokens.accessToken || null,
                tokens.refreshToken || null,
                userId
            ]);

            if (result.rowCount === 0) {
                throw ApiError.notFound('User not found');
            }
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            throw ApiError.internal('Failed to update OAuth tokens');
        }
    }

    /**
     * Unlink OAuth account from user
     */
    public static async unlinkOAuthAccount(userId: string, provider: string): Promise<void> {
        try {
            const query = `
                UPDATE users
                SET oauth_provider = NULL, oauth_id = NULL, oauth_access_token = NULL, 
                    oauth_refresh_token = NULL, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND oauth_provider = $2 AND is_active = true
            `;

            const result = await DatabaseConnection.query(query, [userId, provider]);

            if (result.rowCount === 0) {
                throw ApiError.notFound('User not found or OAuth account not linked');
            }
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            throw ApiError.internal('Failed to unlink OAuth account');
        }
    }

    /**
     * Generate random string for tokens
     */
    private static generateRandomString(length: number): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Map database user to User interface
     */
    private static mapDbUserToUser(dbUser: any): User {
        return {
            id: dbUser.id,
            email: dbUser.email,
            firstName: dbUser.first_name,
            lastName: dbUser.last_name,
            otherNames: dbUser.other_names,
            username: dbUser.username,
            phone: dbUser.phone,

            // Address Information
            country: dbUser.country,
            address: dbUser.address,
            street: dbUser.street,
            city: dbUser.city,
            zipCode: dbUser.zip_code,

            // Personal Information
            gender: dbUser.gender,
            weight: dbUser.weight,
            maritalStatus: dbUser.marital_status,
            ageGroup: dbUser.age_group,
            areaOfInterest: dbUser.area_of_interest,

            // Profile
            profilePicture: dbUser.profile_picture,

            // OAuth Integration
            oauthProvider: dbUser.oauth_provider,
            oauthId: dbUser.oauth_id,
            oauthAccessToken: dbUser.oauth_access_token,
            oauthRefreshToken: dbUser.oauth_refresh_token,

            // Verification Status
            isActive: dbUser.is_active,
            isEmailVerified: dbUser.is_email_verified,
            isPhoneVerified: dbUser.is_phone_verified,

            // OTP Management
            otpCode: dbUser.otp_code,
            otpExpires: dbUser.otp_expires,

            // Email Verification
            emailVerificationToken: dbUser.email_verification_token,
            emailVerificationExpires: dbUser.email_verification_expires,

            // Ratings & Reviews
            ratings: dbUser.ratings ? JSON.parse(dbUser.ratings) : [],
            averageRating: dbUser.average_rating || 0,

            // Taxi Service Integration
            taxiProfileId: dbUser.taxi_profile_id,
            taxiProfileType: dbUser.taxi_profile_type || 'TaxiCustomer',

            // Payment Integration
            creditCard: dbUser.credit_card,

            // Timestamps
            lastLoginAt: dbUser.last_login_at,
            createdAt: dbUser.created_at,
            updatedAt: dbUser.updated_at
        };
    }

    /**
     * Map database user with roles to UserWithRoles interface
     */
    private static mapDbUserWithRolesToUser(rows: any[]): UserWithRoles {
        const firstRow = rows[0];
        const user = this.mapDbUserToUser(firstRow);

        const rolesMap = new Map();

        rows.forEach(row => {
            if (row.role_id) {
                if (!rolesMap.has(row.role_id)) {
                    rolesMap.set(row.role_id, {
                        id: row.role_id,
                        name: row.role_name,
                        permissions: []
                    });
                }

                if (row.permission_id) {
                    const role = rolesMap.get(row.role_id);
                    const existingPermission = role.permissions.find((p: any) => p.id === row.permission_id);

                    if (!existingPermission) {
                        role.permissions.push({
                            id: row.permission_id,
                            name: row.permission_name,
                            resource: row.permission_resource,
                            action: row.permission_action
                        });
                    }
                }
            }
        });

        return {
            ...user,
            roles: Array.from(rolesMap.values())
        };
    }
}