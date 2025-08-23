import bcrypt from 'bcryptjs';
import { AdminDatabase } from '../database/connection';
import { JWTUtils } from '../utils/jwt';
import { AuditService } from './audit.service';
import {
    AdminUser,
    AdminRole,
    AdminSession,
    LoginRequest,
    LoginResponse,
    CreateAdminUserRequest,
    UpdateAdminUserRequest,
    CreateRoleRequest,
    UpdateRoleRequest
} from '../types/admin.types';
import { logger } from '../utils/logger';

/**
 * Admin service for managing admin users, roles, and authentication
 */
export class AdminService {
    /**
     * Authenticate admin user
     */
    public static async login(
        loginData: LoginRequest,
        ipAddress?: string,
        userAgent?: string
    ): Promise<LoginResponse> {
        try {
            // Get admin user by email
            const result = await AdminDatabase.query(`
                SELECT au.*, ar.name as role_name, ar.permissions as role_permissions
                FROM admin_users au
                JOIN admin_roles ar ON au.role_id = ar.id
                WHERE au.email = $1
            `, [loginData.email]);

            if (result.rows.length === 0) {
                throw new Error('Invalid credentials');
            }

            const adminUser = result.rows[0];

            // Check if account is locked
            if (adminUser.locked_until && new Date(adminUser.locked_until) > new Date()) {
                throw new Error('Account is temporarily locked');
            }

            // Check if account is active
            if (adminUser.status !== 'active') {
                throw new Error('Account is not active');
            }

            // Verify password
            const isValidPassword = await bcrypt.compare(loginData.password, adminUser.password_hash);

            if (!isValidPassword) {
                // Increment failed login attempts
                await this.incrementFailedLoginAttempts(adminUser.id);
                throw new Error('Invalid credentials');
            }

            // Check two-factor authentication if enabled
            if (adminUser.two_factor_enabled && !loginData.twoFactorCode) {
                throw new Error('Two-factor authentication code required');
            }

            // Reset failed login attempts on successful login
            await this.resetFailedLoginAttempts(adminUser.id);

            // Generate tokens
            const user = this.mapAdminUserFromDb(adminUser);
            const accessToken = JWTUtils.generateAccessToken(user);
            const refreshToken = JWTUtils.generateRefreshToken(user.id);

            // Create session
            const session = await this.createSession(
                user.id,
                accessToken,
                refreshToken,
                ipAddress,
                userAgent
            );

            // Update last login
            await AdminDatabase.query(
                'UPDATE admin_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
                [user.id]
            );

            // Log successful login
            await AuditService.logAction({
                adminId: user.id,
                action: 'admin_login',
                resourceType: 'admin_session',
                success: true,
                ipAddress,
                userAgent,
                metadata: { sessionId: session.id }
            });

            return {
                success: true,
                token: accessToken,
                refreshToken,
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    phone: user.phone,
                    avatarUrl: user.avatarUrl,
                    roleId: user.roleId,
                    role: user.role,
                    status: user.status,
                    lastLoginAt: user.lastLoginAt,
                    twoFactorEnabled: user.twoFactorEnabled,
                    createdBy: user.createdBy,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt
                },
                expiresAt: JWTUtils.getTokenExpiration()
            };
        } catch (error) {
            // Log failed login attempt
            await AuditService.logAction({
                action: 'admin_login_failed',
                resourceType: 'admin_session',
                success: false,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
                ipAddress,
                userAgent,
                metadata: { email: loginData.email }
            });

            throw error;
        }
    }

    /**
     * Logout admin user
     */
    public static async logout(adminId: string, token: string): Promise<void> {
        try {
            const tokenHash = JWTUtils.generateTokenHash(token);

            // Delete session
            await AdminDatabase.query(
                'DELETE FROM admin_sessions WHERE admin_id = $1 AND token_hash = $2',
                [adminId, tokenHash]
            );

            // Log logout
            await AuditService.logAction({
                adminId,
                action: 'admin_logout',
                resourceType: 'admin_session',
                success: true
            });
        } catch (error) {
            logger.error('Logout error:', error);
            throw error;
        }
    }

    /**
     * Validate admin session
     */
    public static async validateSession(adminId: string, token: string): Promise<boolean> {
        try {
            const tokenHash = JWTUtils.generateTokenHash(token);

            const result = await AdminDatabase.query(`
                SELECT id FROM admin_sessions 
                WHERE admin_id = $1 AND token_hash = $2 AND expires_at > CURRENT_TIMESTAMP
            `, [adminId, tokenHash]);

            return result.rows.length > 0;
        } catch (error) {
            logger.error('Session validation error:', error);
            return false;
        }
    }

    /**
     * Get admin user by ID
     */
    public static async getAdminById(adminId: string): Promise<AdminUser | null> {
        try {
            const result = await AdminDatabase.query(`
                SELECT au.*, ar.name as role_name, ar.permissions as role_permissions,
                       ar.description as role_description, ar.is_system_role
                FROM admin_users au
                JOIN admin_roles ar ON au.role_id = ar.id
                WHERE au.id = $1
            `, [adminId]);

            if (result.rows.length === 0) {
                return null;
            }

            return this.mapAdminUserFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Get admin by ID error:', error);
            throw error;
        }
    }

    /**
     * Create new admin user
     */
    public static async createAdminUser(
        adminData: CreateAdminUserRequest,
        createdBy: string
    ): Promise<AdminUser> {
        try {
            // Check if email already exists
            const existingUser = await AdminDatabase.query(
                'SELECT id FROM admin_users WHERE email = $1',
                [adminData.email]
            );

            if (existingUser.rows.length > 0) {
                throw new Error('Email already exists');
            }

            // Verify role exists
            const roleResult = await AdminDatabase.query(
                'SELECT id FROM admin_roles WHERE id = $1',
                [adminData.roleId]
            );

            if (roleResult.rows.length === 0) {
                throw new Error('Invalid role ID');
            }

            // Hash password
            const passwordHash = await bcrypt.hash(adminData.password, 12);

            // Create admin user
            const result = await AdminDatabase.query(`
                INSERT INTO admin_users (
                    email, password_hash, first_name, last_name, phone, role_id, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `, [
                adminData.email,
                passwordHash,
                adminData.firstName,
                adminData.lastName,
                adminData.phone || null,
                adminData.roleId,
                createdBy
            ]);

            const newUser = await this.getAdminById(result.rows[0].id);

            if (!newUser) {
                throw new Error('Failed to create admin user');
            }

            // Log admin creation
            await AuditService.logAction({
                adminId: createdBy,
                action: 'admin_user_created',
                resourceType: 'admin_user',
                resourceId: newUser.id,
                newValues: {
                    email: adminData.email,
                    firstName: adminData.firstName,
                    lastName: adminData.lastName,
                    roleId: adminData.roleId
                }
            });

            return newUser;
        } catch (error) {
            logger.error('Create admin user error:', error);
            throw error;
        }
    }

    /**
     * Update admin user
     */
    public static async updateAdminUser(
        adminId: string,
        updateData: UpdateAdminUserRequest,
        updatedBy: string
    ): Promise<AdminUser> {
        try {
            // Get current user data for audit log
            const currentUser = await this.getAdminById(adminId);
            if (!currentUser) {
                throw new Error('Admin user not found');
            }

            // Build update query dynamically
            const updateFields: string[] = [];
            const updateValues: any[] = [];
            let paramIndex = 1;

            if (updateData.firstName !== undefined) {
                updateFields.push(`first_name = $${paramIndex++}`);
                updateValues.push(updateData.firstName);
            }

            if (updateData.lastName !== undefined) {
                updateFields.push(`last_name = $${paramIndex++}`);
                updateValues.push(updateData.lastName);
            }

            if (updateData.phone !== undefined) {
                updateFields.push(`phone = $${paramIndex++}`);
                updateValues.push(updateData.phone);
            }

            if (updateData.roleId !== undefined) {
                // Verify role exists
                const roleResult = await AdminDatabase.query(
                    'SELECT id FROM admin_roles WHERE id = $1',
                    [updateData.roleId]
                );

                if (roleResult.rows.length === 0) {
                    throw new Error('Invalid role ID');
                }

                updateFields.push(`role_id = $${paramIndex++}`);
                updateValues.push(updateData.roleId);
            }

            if (updateData.status !== undefined) {
                updateFields.push(`status = $${paramIndex++}`);
                updateValues.push(updateData.status);
            }

            if (updateFields.length === 0) {
                throw new Error('No fields to update');
            }

            updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
            updateValues.push(adminId);

            const query = `
                UPDATE admin_users 
                SET ${updateFields.join(', ')}
                WHERE id = $${paramIndex}
                RETURNING *
            `;

            await AdminDatabase.query(query, updateValues);

            const updatedUser = await this.getAdminById(adminId);

            if (!updatedUser) {
                throw new Error('Failed to update admin user');
            }

            // Log admin update
            await AuditService.logAction({
                adminId: updatedBy,
                action: 'admin_user_updated',
                resourceType: 'admin_user',
                resourceId: adminId,
                oldValues: {
                    firstName: currentUser.firstName,
                    lastName: currentUser.lastName,
                    phone: currentUser.phone,
                    roleId: currentUser.roleId,
                    status: currentUser.status
                },
                newValues: updateData
            });

            return updatedUser;
        } catch (error) {
            logger.error('Update admin user error:', error);
            throw error;
        }
    }

    /**
     * Get all admin users with pagination
     */
    public static async getAdminUsers(
        page: number = 1,
        limit: number = 20,
        search?: string
    ): Promise<{ users: AdminUser[]; total: number; page: number; limit: number }> {
        try {
            const offset = (page - 1) * limit;
            let whereClause = '';
            const queryParams: any[] = [limit, offset];

            if (search) {
                whereClause = `WHERE (au.email ILIKE $3 OR au.first_name ILIKE $3 OR au.last_name ILIKE $3)`;
                queryParams.push(`%${search}%`);
            }

            // Get total count
            const countQuery = `
                SELECT COUNT(*) FROM admin_users au
                ${whereClause}
            `;
            const countResult = await AdminDatabase.query(countQuery, search ? [queryParams[2]] : []);
            const total = parseInt(countResult.rows[0].count);

            // Get users
            const usersQuery = `
                SELECT au.*, ar.name as role_name, ar.permissions as role_permissions,
                       ar.description as role_description, ar.is_system_role
                FROM admin_users au
                JOIN admin_roles ar ON au.role_id = ar.id
                ${whereClause}
                ORDER BY au.created_at DESC
                LIMIT $1 OFFSET $2
            `;

            const usersResult = await AdminDatabase.query(usersQuery, queryParams);
            const users = usersResult.rows.map(row => this.mapAdminUserFromDb(row));

            return { users, total, page, limit };
        } catch (error) {
            logger.error('Get admin users error:', error);
            throw error;
        }
    }

    /**
     * Create admin role
     */
    public static async createRole(
        roleData: CreateRoleRequest,
        createdBy: string
    ): Promise<AdminRole> {
        try {
            // Check if role name already exists
            const existingRole = await AdminDatabase.query(
                'SELECT id FROM admin_roles WHERE name = $1',
                [roleData.name]
            );

            if (existingRole.rows.length > 0) {
                throw new Error('Role name already exists');
            }

            const result = await AdminDatabase.query(`
                INSERT INTO admin_roles (name, description, permissions)
                VALUES ($1, $2, $3)
                RETURNING *
            `, [
                roleData.name,
                roleData.description || null,
                JSON.stringify(roleData.permissions)
            ]);

            const newRole = this.mapAdminRoleFromDb(result.rows[0]);

            // Log role creation
            await AuditService.logAction({
                adminId: createdBy,
                action: 'admin_role_created',
                resourceType: 'admin_role',
                resourceId: newRole.id,
                newValues: roleData
            });

            return newRole;
        } catch (error) {
            logger.error('Create role error:', error);
            throw error;
        }
    }

    /**
     * Get all admin roles
     */
    public static async getRoles(): Promise<AdminRole[]> {
        try {
            const result = await AdminDatabase.query(
                'SELECT * FROM admin_roles ORDER BY name'
            );

            return result.rows.map(row => this.mapAdminRoleFromDb(row));
        } catch (error) {
            logger.error('Get roles error:', error);
            throw error;
        }
    }

    // Private helper methods
    private static async createSession(
        adminId: string,
        accessToken: string,
        refreshToken: string,
        ipAddress?: string,
        userAgent?: string
    ): Promise<AdminSession> {
        const tokenHash = JWTUtils.generateTokenHash(accessToken);
        const refreshTokenHash = JWTUtils.generateTokenHash(refreshToken);
        const expiresAt = JWTUtils.getTokenExpiration();

        const result = await AdminDatabase.query(`
            INSERT INTO admin_sessions (
                admin_id, token_hash, refresh_token_hash, ip_address, user_agent, expires_at
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [adminId, tokenHash, refreshTokenHash, ipAddress, userAgent, expiresAt]);

        return this.mapAdminSessionFromDb(result.rows[0]);
    }

    private static async incrementFailedLoginAttempts(adminId: string): Promise<void> {
        const maxAttempts = 5;
        const lockDuration = 30; // minutes

        await AdminDatabase.query(`
            UPDATE admin_users 
            SET failed_login_attempts = failed_login_attempts + 1,
                locked_until = CASE 
                    WHEN failed_login_attempts + 1 >= $2 
                    THEN CURRENT_TIMESTAMP + INTERVAL '${lockDuration} minutes'
                    ELSE locked_until
                END
            WHERE id = $1
        `, [adminId, maxAttempts]);
    }

    private static async resetFailedLoginAttempts(adminId: string): Promise<void> {
        await AdminDatabase.query(
            'UPDATE admin_users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
            [adminId]
        );
    }

    private static mapAdminUserFromDb(row: any): AdminUser {
        return {
            id: row.id,
            email: row.email,
            firstName: row.first_name,
            lastName: row.last_name,
            phone: row.phone,
            avatarUrl: row.avatar_url,
            roleId: row.role_id,
            role: row.role_name ? {
                id: row.role_id,
                name: row.role_name,
                description: row.role_description,
                permissions: row.role_permissions || [],
                isSystemRole: row.is_system_role,
                createdAt: new Date(),
                updatedAt: new Date()
            } : undefined,
            status: row.status,
            lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : undefined,
            passwordChangedAt: new Date(row.password_changed_at),
            failedLoginAttempts: row.failed_login_attempts,
            lockedUntil: row.locked_until ? new Date(row.locked_until) : undefined,
            twoFactorEnabled: row.two_factor_enabled,
            createdBy: row.created_by,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        };
    }

    private static mapAdminRoleFromDb(row: any): AdminRole {
        return {
            id: row.id,
            name: row.name,
            description: row.description,
            permissions: row.permissions || [],
            isSystemRole: row.is_system_role,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        };
    }

    private static mapAdminSessionFromDb(row: any): AdminSession {
        return {
            id: row.id,
            adminId: row.admin_id,
            tokenHash: row.token_hash,
            refreshTokenHash: row.refresh_token_hash,
            ipAddress: row.ip_address,
            userAgent: row.user_agent,
            expiresAt: new Date(row.expires_at),
            createdAt: new Date(row.created_at)
        };
    }
}