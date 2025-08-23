import { AdminDatabase } from '../database/connection';
import { AuditLog, AuditLogQuery } from '../types/admin.types';
import { logger } from '../utils/logger';

/**
 * Audit service for logging admin actions and system events
 */
export class AuditService {
    /**
     * Log an admin action or system event
     */
    public static async logAction(logData: {
        adminId?: string;
        action: string;
        resourceType: string;
        resourceId?: string;
        oldValues?: Record<string, any>;
        newValues?: Record<string, any>;
        ipAddress?: string;
        userAgent?: string;
        success?: boolean;
        errorMessage?: string;
        metadata?: Record<string, any>;
    }): Promise<AuditLog> {
        try {
            const result = await AdminDatabase.query(`
                INSERT INTO audit_logs (
                    admin_id, action, resource_type, resource_id,
                    old_values, new_values, ip_address, user_agent,
                    success, error_message, metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING *
            `, [
                logData.adminId || null,
                logData.action,
                logData.resourceType,
                logData.resourceId || null,
                logData.oldValues ? JSON.stringify(logData.oldValues) : null,
                logData.newValues ? JSON.stringify(logData.newValues) : null,
                logData.ipAddress || null,
                logData.userAgent || null,
                logData.success !== false, // Default to true if not specified
                logData.errorMessage || null,
                JSON.stringify(logData.metadata || {})
            ]);

            return this.mapAuditLogFromDb(result.rows[0]);
        } catch (error) {
            logger.error('Failed to log audit action:', error);
            // Don't throw error to avoid breaking the main operation
            throw error;
        }
    }

    /**
     * Get audit logs with filtering and pagination
     */
    public static async getAuditLogs(query: AuditLogQuery): Promise<{
        logs: AuditLog[];
        total: number;
        page: number;
        limit: number;
    }> {
        try {
            const {
                adminId,
                action,
                resourceType,
                startDate,
                endDate,
                page = 1,
                limit = 50
            } = query;

            const offset = (page - 1) * limit;
            const whereConditions: string[] = [];
            const queryParams: any[] = [];
            let paramIndex = 1;

            // Build WHERE conditions
            if (adminId) {
                whereConditions.push(`admin_id = $${paramIndex++}`);
                queryParams.push(adminId);
            }

            if (action) {
                whereConditions.push(`action = $${paramIndex++}`);
                queryParams.push(action);
            }

            if (resourceType) {
                whereConditions.push(`resource_type = $${paramIndex++}`);
                queryParams.push(resourceType);
            }

            if (startDate) {
                whereConditions.push(`created_at >= $${paramIndex++}`);
                queryParams.push(startDate);
            }

            if (endDate) {
                whereConditions.push(`created_at <= $${paramIndex++}`);
                queryParams.push(endDate);
            }

            const whereClause = whereConditions.length > 0
                ? `WHERE ${whereConditions.join(' AND ')}`
                : '';

            // Get total count
            const countQuery = `
                SELECT COUNT(*) FROM audit_logs ${whereClause}
            `;
            const countResult = await AdminDatabase.query(countQuery, queryParams);
            const total = parseInt(countResult.rows[0].count);

            // Get logs with admin user info
            const logsQuery = `
                SELECT al.*, au.email as admin_email, au.first_name, au.last_name
                FROM audit_logs al
                LEFT JOIN admin_users au ON al.admin_id = au.id
                ${whereClause}
                ORDER BY al.created_at DESC
                LIMIT $${paramIndex++} OFFSET $${paramIndex++}
            `;

            queryParams.push(limit, offset);
            const logsResult = await AdminDatabase.query(logsQuery, queryParams);

            const logs = logsResult.rows.map(row => ({
                ...this.mapAuditLogFromDb(row),
                adminEmail: row.admin_email,
                adminName: row.first_name && row.last_name
                    ? `${row.first_name} ${row.last_name}`
                    : undefined
            }));

            return { logs, total, page, limit };
        } catch (error) {
            logger.error('Get audit logs error:', error);
            throw error;
        }
    }

    /**
     * Get audit log statistics
     */
    public static async getAuditStats(days: number = 30): Promise<{
        totalActions: number;
        successfulActions: number;
        failedActions: number;
        topActions: Array<{ action: string; count: number }>;
        topAdmins: Array<{ adminId: string; adminEmail: string; count: number }>;
        activityByDay: Array<{ date: string; count: number }>;
    }> {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            // Get total actions
            const totalResult = await AdminDatabase.query(`
                SELECT 
                    COUNT(*) as total_actions,
                    COUNT(*) FILTER (WHERE success = true) as successful_actions,
                    COUNT(*) FILTER (WHERE success = false) as failed_actions
                FROM audit_logs 
                WHERE created_at >= $1
            `, [startDate]);

            const stats = totalResult.rows[0];

            // Get top actions
            const topActionsResult = await AdminDatabase.query(`
                SELECT action, COUNT(*) as count
                FROM audit_logs 
                WHERE created_at >= $1
                GROUP BY action
                ORDER BY count DESC
                LIMIT 10
            `, [startDate]);

            // Get top admins
            const topAdminsResult = await AdminDatabase.query(`
                SELECT al.admin_id, au.email as admin_email, COUNT(*) as count
                FROM audit_logs al
                LEFT JOIN admin_users au ON al.admin_id = au.id
                WHERE al.created_at >= $1 AND al.admin_id IS NOT NULL
                GROUP BY al.admin_id, au.email
                ORDER BY count DESC
                LIMIT 10
            `, [startDate]);

            // Get activity by day
            const activityResult = await AdminDatabase.query(`
                SELECT 
                    DATE(created_at) as date,
                    COUNT(*) as count
                FROM audit_logs 
                WHERE created_at >= $1
                GROUP BY DATE(created_at)
                ORDER BY date DESC
            `, [startDate]);

            return {
                totalActions: parseInt(stats.total_actions),
                successfulActions: parseInt(stats.successful_actions),
                failedActions: parseInt(stats.failed_actions),
                topActions: topActionsResult.rows.map(row => ({
                    action: row.action,
                    count: parseInt(row.count)
                })),
                topAdmins: topAdminsResult.rows.map(row => ({
                    adminId: row.admin_id,
                    adminEmail: row.admin_email,
                    count: parseInt(row.count)
                })),
                activityByDay: activityResult.rows.map(row => ({
                    date: row.date,
                    count: parseInt(row.count)
                }))
            };
        } catch (error) {
            logger.error('Get audit stats error:', error);
            throw error;
        }
    }

    /**
     * Clean up old audit logs
     */
    public static async cleanupOldLogs(retentionDays: number = 365): Promise<number> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

            const result = await AdminDatabase.query(
                'DELETE FROM audit_logs WHERE created_at < $1',
                [cutoffDate]
            );

            const deletedCount = result.rowCount || 0;

            if (deletedCount > 0) {
                logger.info(`Cleaned up ${deletedCount} old audit logs`);

                // Log the cleanup action
                await this.logAction({
                    action: 'audit_logs_cleanup',
                    resourceType: 'audit_log',
                    success: true,
                    metadata: {
                        deletedCount,
                        retentionDays,
                        cutoffDate: cutoffDate.toISOString()
                    }
                });
            }

            return deletedCount;
        } catch (error) {
            logger.error('Cleanup old logs error:', error);
            throw error;
        }
    }

    /**
     * Export audit logs to CSV format
     */
    public static async exportAuditLogs(query: AuditLogQuery): Promise<string> {
        try {
            const { logs } = await this.getAuditLogs({ ...query, limit: 10000 });

            const headers = [
                'Timestamp',
                'Admin Email',
                'Action',
                'Resource Type',
                'Resource ID',
                'Success',
                'IP Address',
                'Error Message'
            ];

            const csvRows = [headers.join(',')];

            for (const log of logs) {
                const row = [
                    log.createdAt.toISOString(),
                    (log as any).adminEmail || 'System',
                    log.action,
                    log.resourceType,
                    log.resourceId || '',
                    log.success ? 'Yes' : 'No',
                    log.ipAddress || '',
                    log.errorMessage || ''
                ];

                // Escape CSV values
                const escapedRow = row.map(value =>
                    `"${String(value).replace(/"/g, '""')}"`
                );

                csvRows.push(escapedRow.join(','));
            }

            return csvRows.join('\n');
        } catch (error) {
            logger.error('Export audit logs error:', error);
            throw error;
        }
    }

    /**
     * Map database row to AuditLog object
     */
    private static mapAuditLogFromDb(row: any): AuditLog {
        return {
            id: row.id,
            adminId: row.admin_id,
            action: row.action,
            resourceType: row.resource_type,
            resourceId: row.resource_id,
            oldValues: row.old_values ? JSON.parse(row.old_values) : undefined,
            newValues: row.new_values ? JSON.parse(row.new_values) : undefined,
            ipAddress: row.ip_address,
            userAgent: row.user_agent,
            success: row.success,
            errorMessage: row.error_message,
            metadata: row.metadata ? JSON.parse(row.metadata) : {},
            createdAt: new Date(row.created_at)
        };
    }
}