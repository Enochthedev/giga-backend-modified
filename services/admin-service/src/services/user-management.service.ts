import axios from 'axios';
import { AdminDatabase } from '../database/connection';
import { AuditService } from './audit.service';
import { UserManagementCache, UserSearchQuery, DashboardStats } from '../types/admin.types';
import { logger } from '../utils/logger';

/**
 * User management service for cross-service user operations
 */
export class UserManagementService {
    private static readonly SERVICE_URLS = {
        'auth-service': process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
        'ecommerce-service': process.env.ECOMMERCE_SERVICE_URL || 'http://localhost:3002',
        'taxi-service': process.env.TAXI_SERVICE_URL || 'http://localhost:3003',
        'hotel-service': process.env.HOTEL_SERVICE_URL || 'http://localhost:3004'
    };

    private static readonly REQUEST_TIMEOUT = 10000; // 10 seconds

    /**
     * Search users across all services
     */
    public static async searchUsers(query: UserSearchQuery): Promise<{
        users: Array<{
            id: string;
            email: string;
            name: string;
            service: string;
            status: string;
            createdAt: Date;
            lastActive?: Date;
            metadata: Record<string, any>;
        }>;
        total: number;
        page: number;
        limit: number;
    }> {
        try {
            const {
                query: searchQuery,
                service,
                status,
                page = 1,
                limit = 20,
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = query;

            const users: any[] = [];
            let totalCount = 0;

            // Determine which services to query
            const servicesToQuery = service
                ? [service]
                : Object.keys(this.SERVICE_URLS);

            // Query each service
            for (const serviceName of servicesToQuery) {
                try {
                    const serviceUsers = await this.getUsersFromService(
                        serviceName,
                        searchQuery,
                        status,
                        page,
                        limit,
                        sortBy,
                        sortOrder
                    );

                    users.push(...serviceUsers.users);
                    totalCount += serviceUsers.total;
                } catch (error) {
                    logger.error(`Failed to get users from ${serviceName}:`, error);
                    // Continue with other services
                }
            }

            // Sort and paginate combined results
            const sortedUsers = this.sortUsers(users, sortBy, sortOrder);
            const startIndex = (page - 1) * limit;
            const paginatedUsers = sortedUsers.slice(startIndex, startIndex + limit);

            return {
                users: paginatedUsers,
                total: totalCount,
                page,
                limit
            };
        } catch (error) {
            logger.error('Search users error:', error);
            throw error;
        }
    }

    /**
     * Get user details from specific service
     */
    public static async getUserFromService(
        serviceName: string,
        userId: string
    ): Promise<any> {
        try {
            const serviceUrl = this.SERVICE_URLS[serviceName as keyof typeof this.SERVICE_URLS];

            if (!serviceUrl) {
                throw new Error(`Unknown service: ${serviceName}`);
            }

            const response = await axios.get(`${serviceUrl}/admin/users/${userId}`, {
                timeout: this.REQUEST_TIMEOUT,
                headers: {
                    'Authorization': `Bearer ${this.getServiceToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            // Cache user data
            await this.cacheUserData(userId, serviceName, response.data);

            return response.data;
        } catch (error) {
            logger.error(`Get user from ${serviceName} error:`, error);

            // Try to get from cache if service is unavailable
            const cachedUser = await this.getCachedUserData(userId, serviceName);
            if (cachedUser) {
                logger.info(`Returning cached user data for ${userId} from ${serviceName}`);
                return cachedUser.userData;
            }

            throw error;
        }
    }

    /**
     * Update user status across services
     */
    public static async updateUserStatus(
        userId: string,
        status: 'active' | 'inactive' | 'suspended' | 'banned',
        reason?: string,
        updatedBy?: string
    ): Promise<{ success: boolean; services: Record<string, boolean> }> {
        try {
            const results: Record<string, boolean> = {};
            let overallSuccess = true;

            // Update status in all services
            for (const [serviceName, serviceUrl] of Object.entries(this.SERVICE_URLS)) {
                try {
                    await axios.patch(`${serviceUrl}/admin/users/${userId}/status`, {
                        status,
                        reason
                    }, {
                        timeout: this.REQUEST_TIMEOUT,
                        headers: {
                            'Authorization': `Bearer ${this.getServiceToken()}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    results[serviceName] = true;
                } catch (error) {
                    logger.error(`Failed to update user status in ${serviceName}:`, error);
                    results[serviceName] = false;
                    overallSuccess = false;
                }
            }

            // Log user status update
            await AuditService.logAction({
                adminId: updatedBy,
                action: 'user_status_updated',
                resourceType: 'user',
                resourceId: userId,
                newValues: { status, reason },
                success: overallSuccess,
                metadata: {
                    serviceResults: results
                }
            });

            return {
                success: overallSuccess,
                services: results
            };
        } catch (error) {
            logger.error('Update user status error:', error);
            throw error;
        }
    }

    /**
     * Get dashboard statistics
     */
    public static async getDashboardStats(): Promise<DashboardStats> {
        try {
            const stats: Partial<DashboardStats> = {
                totalUsers: 0,
                activeUsers: 0,
                totalAdmins: 0,
                activeAdmins: 0,
                totalVendors: 0,
                pendingVendors: 0,
                totalOrders: 0,
                todayOrders: 0,
                totalRevenue: 0,
                todayRevenue: 0,
                systemHealth: 'healthy',
                recentAlerts: []
            };

            // Get admin stats
            const adminStatsResult = await AdminDatabase.query(`
                SELECT 
                    COUNT(*) as total_admins,
                    COUNT(*) FILTER (WHERE status = 'active') as active_admins
                FROM admin_users
            `);

            const adminStats = adminStatsResult.rows[0];
            stats.totalAdmins = parseInt(adminStats.total_admins);
            stats.activeAdmins = parseInt(adminStats.active_admins);

            // Get recent alerts
            const alertsResult = await AdminDatabase.query(`
                SELECT * FROM system_alerts 
                WHERE resolved = false 
                ORDER BY created_at DESC 
                LIMIT 5
            `);

            stats.recentAlerts = alertsResult.rows.map(row => ({
                id: row.id,
                alertType: row.alert_type,
                severity: row.severity,
                title: row.title,
                message: row.message,
                sourceService: row.source_service,
                metadata: row.metadata ? JSON.parse(row.metadata) : {},
                acknowledged: row.acknowledged,
                acknowledgedBy: row.acknowledged_by,
                acknowledgedAt: row.acknowledged_at ? new Date(row.acknowledged_at) : undefined,
                resolved: row.resolved,
                resolvedBy: row.resolved_by,
                resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
                createdAt: new Date(row.created_at)
            }));

            // Get stats from other services
            const serviceStats = await Promise.allSettled([
                this.getServiceStats('ecommerce-service'),
                this.getServiceStats('taxi-service'),
                this.getServiceStats('hotel-service')
            ]);

            // Aggregate service stats
            for (const result of serviceStats) {
                if (result.status === 'fulfilled' && result.value) {
                    const serviceData = result.value;
                    stats.totalUsers = (stats.totalUsers || 0) + (serviceData.totalUsers || 0);
                    stats.activeUsers = (stats.activeUsers || 0) + (serviceData.activeUsers || 0);
                    stats.totalVendors = (stats.totalVendors || 0) + (serviceData.totalVendors || 0);
                    stats.pendingVendors = (stats.pendingVendors || 0) + (serviceData.pendingVendors || 0);
                    stats.totalOrders = (stats.totalOrders || 0) + (serviceData.totalOrders || 0);
                    stats.todayOrders = (stats.todayOrders || 0) + (serviceData.todayOrders || 0);
                    stats.totalRevenue = (stats.totalRevenue || 0) + (serviceData.totalRevenue || 0);
                    stats.todayRevenue = (stats.todayRevenue || 0) + (serviceData.todayRevenue || 0);
                }
            }

            // Determine system health based on recent alerts
            const criticalAlerts = stats.recentAlerts?.filter(alert => alert.severity === 'critical').length || 0;
            const warningAlerts = stats.recentAlerts?.filter(alert => alert.severity === 'warning').length || 0;

            if (criticalAlerts > 0) {
                stats.systemHealth = 'critical';
            } else if (warningAlerts > 2) {
                stats.systemHealth = 'warning';
            } else {
                stats.systemHealth = 'healthy';
            }

            return stats as DashboardStats;
        } catch (error) {
            logger.error('Get dashboard stats error:', error);
            throw error;
        }
    }

    /**
     * Sync user data from all services
     */
    public static async syncUserData(): Promise<{ synced: number; errors: number }> {
        try {
            let synced = 0;
            let errors = 0;

            for (const [serviceName, serviceUrl] of Object.entries(this.SERVICE_URLS)) {
                try {
                    const response = await axios.get(`${serviceUrl}/admin/users/export`, {
                        timeout: this.REQUEST_TIMEOUT * 2, // Longer timeout for export
                        headers: {
                            'Authorization': `Bearer ${this.getServiceToken()}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    const users = response.data.users || [];

                    for (const user of users) {
                        try {
                            await this.cacheUserData(user.id, serviceName, user);
                            synced++;
                        } catch (error) {
                            logger.error(`Failed to cache user ${user.id} from ${serviceName}:`, error);
                            errors++;
                        }
                    }
                } catch (error) {
                    logger.error(`Failed to sync users from ${serviceName}:`, error);
                    errors++;
                }
            }

            logger.info(`User sync completed: ${synced} synced, ${errors} errors`);
            return { synced, errors };
        } catch (error) {
            logger.error('Sync user data error:', error);
            throw error;
        }
    }

    // Private helper methods
    private static async getUsersFromService(
        serviceName: string,
        query?: string,
        status?: string,
        page: number = 1,
        limit: number = 20,
        sortBy: string = 'createdAt',
        sortOrder: string = 'desc'
    ): Promise<{ users: any[]; total: number }> {
        const serviceUrl = this.SERVICE_URLS[serviceName as keyof typeof this.SERVICE_URLS];

        if (!serviceUrl) {
            throw new Error(`Unknown service: ${serviceName}`);
        }

        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            sortBy,
            sortOrder
        });

        if (query) params.append('query', query);
        if (status) params.append('status', status);

        const response = await axios.get(`${serviceUrl}/admin/users?${params}`, {
            timeout: this.REQUEST_TIMEOUT,
            headers: {
                'Authorization': `Bearer ${this.getServiceToken()}`,
                'Content-Type': 'application/json'
            }
        });

        const users = (response.data.users || []).map((user: any) => ({
            ...user,
            service: serviceName
        }));

        return {
            users,
            total: response.data.total || 0
        };
    }

    private static async getServiceStats(serviceName: string): Promise<any> {
        const serviceUrl = this.SERVICE_URLS[serviceName as keyof typeof this.SERVICE_URLS];

        if (!serviceUrl) {
            return null;
        }

        try {
            const response = await axios.get(`${serviceUrl}/admin/stats`, {
                timeout: this.REQUEST_TIMEOUT,
                headers: {
                    'Authorization': `Bearer ${this.getServiceToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data;
        } catch (error) {
            logger.error(`Failed to get stats from ${serviceName}:`, error);
            return null;
        }
    }

    private static async cacheUserData(
        userId: string,
        serviceName: string,
        userData: any
    ): Promise<void> {
        await AdminDatabase.query(`
            INSERT INTO user_management_cache (user_id, service_name, user_data)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, service_name)
            DO UPDATE SET 
                user_data = EXCLUDED.user_data,
                last_synced_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
        `, [userId, serviceName, JSON.stringify(userData)]);
    }

    private static async getCachedUserData(
        userId: string,
        serviceName: string
    ): Promise<UserManagementCache | null> {
        const result = await AdminDatabase.query(
            'SELECT * FROM user_management_cache WHERE user_id = $1 AND service_name = $2',
            [userId, serviceName]
        );

        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];
        return {
            id: row.id,
            userId: row.user_id,
            serviceName: row.service_name,
            userData: JSON.parse(row.user_data),
            lastSyncedAt: new Date(row.last_synced_at),
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        };
    }

    private static sortUsers(users: any[], sortBy: string, sortOrder: string): any[] {
        return users.sort((a, b) => {
            let aValue = a[sortBy];
            let bValue = b[sortBy];

            // Handle date sorting
            if (sortBy.includes('At') || sortBy.includes('Date')) {
                aValue = new Date(aValue).getTime();
                bValue = new Date(bValue).getTime();
            }

            // Handle string sorting
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            if (sortOrder === 'desc') {
                return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
            } else {
                return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
            }
        });
    }

    private static getServiceToken(): string {
        // In a real implementation, this would generate or retrieve a service-to-service token
        // For now, return a placeholder
        return 'service-token';
    }
}