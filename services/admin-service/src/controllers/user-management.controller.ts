import { Response } from 'express';
import { UserManagementService } from '../services/user-management.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { UserSearchQuery } from '../types/admin.types';
import { logger } from '../utils/logger';

/**
 * User management controller for cross-service user operations
 */
export class UserManagementController {
    /**
     * Search users across all services
     */
    public static async searchUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const query: UserSearchQuery = {
                query: req.query.query as string,
                service: req.query.service as string,
                status: req.query.status as string,
                page: parseInt(req.query.page as string) || 1,
                limit: parseInt(req.query.limit as string) || 20,
                sortBy: req.query.sortBy as string || 'createdAt',
                sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc'
            };

            const result = await UserManagementService.searchUsers(query);

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
            logger.error('Search users error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to search users'
            });
        }
    }

    /**
     * Get user details from specific service
     */
    public static async getUserFromService(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { serviceName, userId } = req.params;

            const user = await UserManagementService.getUserFromService(serviceName, userId);

            res.json({
                success: true,
                data: user
            });
        } catch (error: any) {
            logger.error('Get user from service error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get user'
            });
        }
    }

    /**
     * Update user status across services
     */
    public static async updateUserStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { userId } = req.params;
            const { status, reason } = req.body;
            const updatedBy = req.admin!.id;

            // Validate required fields
            if (!status) {
                res.status(400).json({
                    success: false,
                    message: 'Status is required'
                });
                return;
            }

            // Validate status value
            const validStatuses = ['active', 'inactive', 'suspended', 'banned'];
            if (!validStatuses.includes(status)) {
                res.status(400).json({
                    success: false,
                    message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
                });
                return;
            }

            const result = await UserManagementService.updateUserStatus(
                userId,
                status,
                reason,
                updatedBy
            );

            res.json({
                success: result.success,
                message: result.success
                    ? 'User status updated successfully'
                    : 'User status update completed with some failures',
                data: result
            });
        } catch (error: any) {
            logger.error('Update user status error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to update user status'
            });
        }
    }

    /**
     * Get dashboard statistics
     */
    public static async getDashboardStats(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const stats = await UserManagementService.getDashboardStats();

            res.json({
                success: true,
                data: stats
            });
        } catch (error: any) {
            logger.error('Get dashboard stats error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get dashboard statistics'
            });
        }
    }

    /**
     * Sync user data from all services
     */
    public static async syncUserData(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const result = await UserManagementService.syncUserData();

            res.json({
                success: true,
                message: 'User data sync completed',
                data: result
            });
        } catch (error: any) {
            logger.error('Sync user data error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to sync user data'
            });
        }
    }

    /**
     * Get user activity summary
     */
    public static async getUserActivitySummary(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const { userId } = req.params;
            const days = parseInt(req.query.days as string) || 30;

            // This would typically aggregate activity data from multiple services
            // For now, return a placeholder response
            const summary = {
                userId,
                period: `${days} days`,
                totalActions: 0,
                lastActive: null,
                serviceActivity: {
                    'ecommerce-service': { actions: 0, lastActive: null },
                    'taxi-service': { actions: 0, lastActive: null },
                    'hotel-service': { actions: 0, lastActive: null }
                }
            };

            res.json({
                success: true,
                data: summary
            });
        } catch (error: any) {
            logger.error('Get user activity summary error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get user activity summary'
            });
        }
    }

    /**
     * Export user data
     */
    public static async exportUserData(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const {
                service,
                status,
                format = 'json'
            } = req.query;

            const query: UserSearchQuery = {
                service: service as string,
                status: status as string,
                limit: 10000 // Large limit for export
            };

            const result = await UserManagementService.searchUsers(query);

            if (format === 'csv') {
                // Convert to CSV
                const headers = ['ID', 'Email', 'Name', 'Service', 'Status', 'Created At', 'Last Active'];
                const csvRows = [headers.join(',')];

                for (const user of result.users) {
                    const row = [
                        user.id,
                        user.email,
                        user.name,
                        user.service,
                        user.status,
                        user.createdAt.toISOString(),
                        user.lastActive?.toISOString() || ''
                    ];

                    // Escape CSV values
                    const escapedRow = row.map(value =>
                        `"${String(value).replace(/"/g, '""')}"`
                    );

                    csvRows.push(escapedRow.join(','));
                }

                const csvData = csvRows.join('\n');

                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', 'attachment; filename=users-export.csv');
                res.send(csvData);
            } else {
                // Return JSON
                res.json({
                    success: true,
                    data: result.users,
                    exportedAt: new Date().toISOString(),
                    totalRecords: result.users.length
                });
            }
        } catch (error: any) {
            logger.error('Export user data error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to export user data'
            });
        }
    }

    /**
     * Get user statistics by service
     */
    public static async getUserStatsByService(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            const days = parseInt(req.query.days as string) || 30;

            // This would typically query each service for user statistics
            // For now, return a placeholder response
            const stats = {
                period: `${days} days`,
                services: {
                    'ecommerce-service': {
                        totalUsers: 0,
                        activeUsers: 0,
                        newUsers: 0,
                        suspendedUsers: 0
                    },
                    'taxi-service': {
                        totalUsers: 0,
                        activeUsers: 0,
                        newUsers: 0,
                        suspendedUsers: 0
                    },
                    'hotel-service': {
                        totalUsers: 0,
                        activeUsers: 0,
                        newUsers: 0,
                        suspendedUsers: 0
                    }
                },
                totals: {
                    totalUsers: 0,
                    activeUsers: 0,
                    newUsers: 0,
                    suspendedUsers: 0
                }
            };

            res.json({
                success: true,
                data: stats
            });
        } catch (error: any) {
            logger.error('Get user stats by service error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to get user statistics'
            });
        }
    }
}