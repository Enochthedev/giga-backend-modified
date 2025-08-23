import { Response } from 'express';
import { AdminService } from '../services/admin.service';
import { AuditService } from '../services/audit.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import {
    LoginRequest,
    CreateAdminUserRequest,
    UpdateAdminUserRequest,
    CreateRoleRequest
} from '../types/admin.types';
import { logger } from '../utils/logger';

/**
 * Admin controller for admin user management and authentication
 */
export class AdminController {
    /**
     * Admin login
     */
    public static async login(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const loginData: LoginRequest = req.body;
            const ipAddress = req.ip;
            const userAgent = req.get('User-Agent');

            const result = await AdminService.login(loginData, ipAddress, userAgent);

            res.json({
                success: true,
                message: 'Login successful',
                data: result
            });
        } catch (error: any) {
            logger.error('Admin login error:', error);
            res.status(401).json({
                success: false,
                message: error.message || 'Login failed'
            });
        }
    }

    /**
     * Admin logout
     */
    public static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const adminId = req.admin!.id;
            const token = req.headers.authorization?.substring(7); // Remove 'Bearer '

            if (!token) {
                res.status(400).json({
                    success: false,
                    message: 'Token required for logout'
                });
                return;
            }

            await AdminService.logout(adminId, token);

            res.json({
                success: true,
                message: 'Logout successful'
            });
        } catch (error: any) {
            logger.error('Admin logout error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Logout failed'
            });
        }
    }

    /**
     * Get current admin profile
     */
    public static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const adminId = req.admin!.id;
            const admin = await AdminService.getAdminById(adminId);

            if (!admin) {
                res.status(404).json({
                    success: false,
                    message: 'Admin not found'
                });
                return;
            }

            res.json({
                success: true,
                data: {
                    id: admin.id,
                    email: admin.email,
                    firstName: admin.firstName,
                    lastName: admin.lastName,
                    phone: admin.phone,
                    avatarUrl: admin.avatarUrl,
                    roleId: admin.roleId,
                    role: admin.role,
                    status: admin.status,
                    lastLoginAt: admin.lastLoginAt,
                    twoFactorEnabled: admin.twoFactorEnabled,
                    createdAt: admin.createdAt,
                    updatedAt: admin.updatedAt
                }
            });
        } catch (error: any) {
            logger.error('Get admin profile error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get profile'
            });
        }
    }

    /**
     * Get all admin users
     */
    public static async getAdminUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const search = req.query.search as string;

            const result = await AdminService.getAdminUsers(page, limit, search);

            res.json({
                success: true,
                data: result.users,
                pagination: {
                    page: result.page,
                    limit: result.limit,
                    total: result.total,
                    totalPages: Math.ceil(result.total / result.limit)
                }
            });
        } catch (error: any) {
            logger.error('Get admin users error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get admin users'
            });
        }
    }

    /**
     * Get admin user by ID
     */
    public static async getAdminById(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { adminId } = req.params;
            const admin = await AdminService.getAdminById(adminId);

            if (!admin) {
                res.status(404).json({
                    success: false,
                    message: 'Admin not found'
                });
                return;
            }

            res.json({
                success: true,
                data: admin
            });
        } catch (error: any) {
            logger.error('Get admin by ID error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get admin'
            });
        }
    }

    /**
     * Create new admin user
     */
    public static async createAdminUser(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const adminData: CreateAdminUserRequest = req.body;
            const createdBy = req.admin!.id;

            // Validate required fields
            if (!adminData.email || !adminData.password || !adminData.firstName ||
                !adminData.lastName || !adminData.roleId) {
                res.status(400).json({
                    success: false,
                    message: 'Missing required fields'
                });
                return;
            }

            const newAdmin = await AdminService.createAdminUser(adminData, createdBy);

            res.status(201).json({
                success: true,
                message: 'Admin user created successfully',
                data: newAdmin
            });
        } catch (error: any) {
            logger.error('Create admin user error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to create admin user'
            });
        }
    }

    /**
     * Update admin user
     */
    public static async updateAdminUser(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { adminId } = req.params;
            const updateData: UpdateAdminUserRequest = req.body;
            const updatedBy = req.admin!.id;

            const updatedAdmin = await AdminService.updateAdminUser(adminId, updateData, updatedBy);

            res.json({
                success: true,
                message: 'Admin user updated successfully',
                data: updatedAdmin
            });
        } catch (error: any) {
            logger.error('Update admin user error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to update admin user'
            });
        }
    }

    /**
     * Get all admin roles
     */
    public static async getRoles(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const roles = await AdminService.getRoles();

            res.json({
                success: true,
                data: roles
            });
        } catch (error: any) {
            logger.error('Get roles error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get roles'
            });
        }
    }

    /**
     * Create new admin role
     */
    public static async createRole(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const roleData: CreateRoleRequest = req.body;
            const createdBy = req.admin!.id;

            // Validate required fields
            if (!roleData.name || !roleData.permissions || !Array.isArray(roleData.permissions)) {
                res.status(400).json({
                    success: false,
                    message: 'Missing required fields'
                });
                return;
            }

            const newRole = await AdminService.createRole(roleData, createdBy);

            res.status(201).json({
                success: true,
                message: 'Admin role created successfully',
                data: newRole
            });
        } catch (error: any) {
            logger.error('Create role error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to create role'
            });
        }
    }

    /**
     * Get audit logs
     */
    public static async getAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const {
                adminId,
                action,
                resourceType,
                startDate,
                endDate,
                page = 1,
                limit = 50
            } = req.query;

            const query = {
                adminId: adminId as string,
                action: action as string,
                resourceType: resourceType as string,
                startDate: startDate ? new Date(startDate as string) : undefined,
                endDate: endDate ? new Date(endDate as string) : undefined,
                page: parseInt(page as string),
                limit: parseInt(limit as string)
            };

            const result = await AuditService.getAuditLogs(query);

            res.json({
                success: true,
                data: result.logs,
                pagination: {
                    page: result.page,
                    limit: result.limit,
                    total: result.total,
                    totalPages: Math.ceil(result.total / result.limit)
                }
            });
        } catch (error: any) {
            logger.error('Get audit logs error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get audit logs'
            });
        }
    }

    /**
     * Get audit statistics
     */
    public static async getAuditStats(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const days = parseInt(req.query.days as string) || 30;
            const stats = await AuditService.getAuditStats(days);

            res.json({
                success: true,
                data: stats
            });
        } catch (error: any) {
            logger.error('Get audit stats error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get audit statistics'
            });
        }
    }

    /**
     * Export audit logs
     */
    public static async exportAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const {
                adminId,
                action,
                resourceType,
                startDate,
                endDate
            } = req.query;

            const query = {
                adminId: adminId as string,
                action: action as string,
                resourceType: resourceType as string,
                startDate: startDate ? new Date(startDate as string) : undefined,
                endDate: endDate ? new Date(endDate as string) : undefined,
                limit: 10000 // Large limit for export
            };

            const csvData = await AuditService.exportAuditLogs(query);

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
            res.send(csvData);
        } catch (error: any) {
            logger.error('Export audit logs error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to export audit logs'
            });
        }
    }
}