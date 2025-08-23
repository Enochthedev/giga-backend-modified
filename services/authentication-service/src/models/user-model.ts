import bcrypt from 'bcryptjs';
import { DatabaseConnection } from '../database/connection';
import { ApiError } from '@giga/common';

export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    dateOfBirth?: Date;
    isActive: boolean;
    isVerified: boolean;
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateUserData {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    dateOfBirth?: Date;
}

export interface UpdateUserData {
    firstName?: string;
    lastName?: string;
    phone?: string;
    dateOfBirth?: Date;
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

            // Hash password
            const saltRounds = parseInt(process.env['BCRYPT_ROUNDS'] || '12');
            const passwordHash = await bcrypt.hash(userData.password, saltRounds);

            const query = `
                INSERT INTO users (email, password_hash, first_name, last_name, phone, date_of_birth)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id, email, first_name, last_name, phone, date_of_birth, 
                         is_active, is_verified, last_login_at, created_at, updated_at
            `;

            const values = [
                userData.email.toLowerCase(),
                passwordHash,
                userData.firstName,
                userData.lastName,
                userData.phone || null,
                userData.dateOfBirth || null
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
                SELECT id, email, first_name, last_name, phone, date_of_birth,
                       is_active, is_verified, last_login_at, created_at, updated_at
                FROM users
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
     * Map database user to User interface
     */
    private static mapDbUserToUser(dbUser: any): User {
        return {
            id: dbUser.id,
            email: dbUser.email,
            firstName: dbUser.first_name,
            lastName: dbUser.last_name,
            phone: dbUser.phone,
            dateOfBirth: dbUser.date_of_birth,
            isActive: dbUser.is_active,
            isVerified: dbUser.is_verified,
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