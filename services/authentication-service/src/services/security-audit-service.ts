import geoip from 'geoip-lite';
import { UAParser } from 'ua-parser-js';
import { DatabaseConnection } from '../database/connection';
import { ApiError, Logger } from '@giga/common';

export interface SecurityAuditEvent {
    userId?: string;
    eventType: string;
    eventCategory: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    ipAddress?: string;
    userAgent?: string;
    deviceId?: string;
    location?: any;
    eventData?: any;
    success: boolean;
    errorMessage?: string;
    sessionId?: string;
}

export interface AuditLogEntry {
    id: string;
    userId?: string;
    eventType: string;
    eventCategory: string;
    severity: string;
    ipAddress?: string;
    userAgent?: string;
    deviceId?: string;
    location?: any;
    eventData?: any;
    success: boolean;
    errorMessage?: string;
    sessionId?: string;
    createdAt: Date;
}

/**
 * Security audit logging service
 */
export class SecurityAuditService {
    /**
     * Log a security event
     */
    public static async logEvent(event: SecurityAuditEvent): Promise<void> {
        try {
            // Parse location from IP if available
            let location = event.location;
            if (event.ipAddress && !location) {
                const geo = geoip.lookup(event.ipAddress);
                if (geo) {
                    location = {
                        country: geo.country,
                        region: geo.region,
                        city: geo.city,
                        timezone: geo.timezone,
                        coordinates: [geo.ll[1], geo.ll[0]] // [longitude, latitude]
                    };
                }
            }

            const query = `
                INSERT INTO security_audit_log (
                    user_id, event_type, event_category, severity, ip_address, user_agent,
                    device_id, location, event_data, success, error_message, session_id
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            `;

            const values = [
                event.userId || null,
                event.eventType,
                event.eventCategory,
                event.severity,
                event.ipAddress || null,
                event.userAgent || null,
                event.deviceId || null,
                location ? JSON.stringify(location) : null,
                event.eventData ? JSON.stringify(event.eventData) : null,
                event.success,
                event.errorMessage || null,
                event.sessionId || null
            ];

            await DatabaseConnection.query(query, values);

            // Log critical events to application logger as well
            if (event.severity === 'critical' || event.severity === 'error') {
                Logger.error(`Security Event: ${event.eventType}`, {
                    userId: event.userId,
                    eventType: event.eventType,
                    severity: event.severity,
                    success: event.success,
                    errorMessage: event.errorMessage
                });
            }
        } catch (error) {
            // Don't throw errors for audit logging failures to avoid breaking main flow
            Logger.error('Failed to log security audit event', error as Error);
        }
    }    /**

     * Get audit logs for a user
     */
    public static async getUserAuditLogs(
        userId: string,
        limit: number = 50,
        offset: number = 0
    ): Promise<{ logs: AuditLogEntry[]; total: number }> {
        try {
            // Get total count
            const countQuery = `
                SELECT COUNT(*) as total
                FROM security_audit_log
                WHERE user_id = $1
            `;
            const countResult = await DatabaseConnection.query(countQuery, [userId]);
            const total = parseInt(countResult.rows[0].total);

            // Get logs
            const query = `
                SELECT id, user_id, event_type, event_category, severity, ip_address, user_agent,
                       device_id, location, event_data, success, error_message, session_id, created_at
                FROM security_audit_log
                WHERE user_id = $1
                ORDER BY created_at DESC
                LIMIT $2 OFFSET $3
            `;

            const result = await DatabaseConnection.query(query, [userId, limit, offset]);
            const logs = result.rows.map(this.mapDbLogToAuditLog);

            return { logs, total };
        } catch (error) {
            Logger.error('Failed to get user audit logs', error as Error);
            throw ApiError.internal('Failed to get audit logs');
        }
    }

    /**
     * Get system audit logs (admin only)
     */
    public static async getSystemAuditLogs(
        filters: {
            eventType?: string;
            eventCategory?: string;
            severity?: string;
            userId?: string;
            startDate?: Date;
            endDate?: Date;
        } = {},
        limit: number = 100,
        offset: number = 0
    ): Promise<{ logs: AuditLogEntry[]; total: number }> {
        try {
            const conditions: string[] = [];
            const values: any[] = [];
            let paramIndex = 1;

            if (filters.eventType) {
                conditions.push(`event_type = $${paramIndex++}`);
                values.push(filters.eventType);
            }

            if (filters.eventCategory) {
                conditions.push(`event_category = $${paramIndex++}`);
                values.push(filters.eventCategory);
            }

            if (filters.severity) {
                conditions.push(`severity = $${paramIndex++}`);
                values.push(filters.severity);
            }

            if (filters.userId) {
                conditions.push(`user_id = $${paramIndex++}`);
                values.push(filters.userId);
            }

            if (filters.startDate) {
                conditions.push(`created_at >= $${paramIndex++}`);
                values.push(filters.startDate);
            }

            if (filters.endDate) {
                conditions.push(`created_at <= $${paramIndex++}`);
                values.push(filters.endDate);
            }

            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

            // Get total count
            const countQuery = `
                SELECT COUNT(*) as total
                FROM security_audit_log
                ${whereClause}
            `;
            const countResult = await DatabaseConnection.query(countQuery, values);
            const total = parseInt(countResult.rows[0].total);

            // Get logs
            const query = `
                SELECT id, user_id, event_type, event_category, severity, ip_address, user_agent,
                       device_id, location, event_data, success, error_message, session_id, created_at
                FROM security_audit_log
                ${whereClause}
                ORDER BY created_at DESC
                LIMIT $${paramIndex++} OFFSET $${paramIndex++}
            `;

            values.push(limit, offset);
            const result = await DatabaseConnection.query(query, values);
            const logs = result.rows.map(this.mapDbLogToAuditLog);

            return { logs, total };
        } catch (error) {
            Logger.error('Failed to get system audit logs', error as Error);
            throw ApiError.internal('Failed to get system audit logs');
        }
    }

    /**
     * Get security statistics
     */
    public static async getSecurityStats(
        userId?: string,
        days: number = 30
    ): Promise<{
        totalEvents: number;
        failedLogins: number;
        successfulLogins: number;
        mfaEvents: number;
        suspiciousActivities: number;
        eventsByType: Array<{ eventType: string; count: number }>;
        eventsBySeverity: Array<{ severity: string; count: number }>;
    }> {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const conditions = [`created_at >= $1`];
            const values: any[] = [startDate];
            let paramIndex = 2;

            if (userId) {
                conditions.push(`user_id = $${paramIndex++}`);
                values.push(userId);
            }

            const whereClause = `WHERE ${conditions.join(' AND ')}`;

            // Get overall stats
            const statsQuery = `
                SELECT 
                    COUNT(*) as total_events,
                    COUNT(*) FILTER (WHERE event_type = 'login_failed') as failed_logins,
                    COUNT(*) FILTER (WHERE event_type = 'login' AND success = true) as successful_logins,
                    COUNT(*) FILTER (WHERE event_type LIKE 'mfa_%') as mfa_events,
                    COUNT(*) FILTER (WHERE severity IN ('warning', 'error', 'critical')) as suspicious_activities
                FROM security_audit_log
                ${whereClause}
            `;

            const statsResult = await DatabaseConnection.query(statsQuery, values);
            const stats = statsResult.rows[0];

            // Get events by type
            const typeQuery = `
                SELECT event_type, COUNT(*) as count
                FROM security_audit_log
                ${whereClause}
                GROUP BY event_type
                ORDER BY count DESC
                LIMIT 10
            `;

            const typeResult = await DatabaseConnection.query(typeQuery, values);
            const eventsByType = typeResult.rows.map(row => ({
                eventType: row.event_type,
                count: parseInt(row.count)
            }));

            // Get events by severity
            const severityQuery = `
                SELECT severity, COUNT(*) as count
                FROM security_audit_log
                ${whereClause}
                GROUP BY severity
                ORDER BY 
                    CASE severity 
                        WHEN 'critical' THEN 1 
                        WHEN 'error' THEN 2 
                        WHEN 'warning' THEN 3 
                        WHEN 'info' THEN 4 
                    END
            `;

            const severityResult = await DatabaseConnection.query(severityQuery, values);
            const eventsBySeverity = severityResult.rows.map(row => ({
                severity: row.severity,
                count: parseInt(row.count)
            }));

            return {
                totalEvents: parseInt(stats.total_events),
                failedLogins: parseInt(stats.failed_logins),
                successfulLogins: parseInt(stats.successful_logins),
                mfaEvents: parseInt(stats.mfa_events),
                suspiciousActivities: parseInt(stats.suspicious_activities),
                eventsByType,
                eventsBySeverity
            };
        } catch (error) {
            Logger.error('Failed to get security statistics', error as Error);
            throw ApiError.internal('Failed to get security statistics');
        }
    }

    /**
     * Parse device information from user agent
     */
    public static parseDeviceInfo(userAgent: string): {
        browser: string;
        os: string;
        device: string;
    } {
        const parser = new UAParser(userAgent);
        const result = parser.getResult();

        return {
            browser: `${result.browser.name || 'Unknown'} ${result.browser.version || ''}`.trim(),
            os: `${result.os.name || 'Unknown'} ${result.os.version || ''}`.trim(),
            device: result.device.type || 'desktop'
        };
    }

    /**
     * Map database log to AuditLogEntry interface
     */
    private static mapDbLogToAuditLog(dbLog: any): AuditLogEntry {
        return {
            id: dbLog.id,
            userId: dbLog.user_id,
            eventType: dbLog.event_type,
            eventCategory: dbLog.event_category,
            severity: dbLog.severity,
            ipAddress: dbLog.ip_address,
            userAgent: dbLog.user_agent,
            deviceId: dbLog.device_id,
            location: dbLog.location ? JSON.parse(dbLog.location) : undefined,
            eventData: dbLog.event_data ? JSON.parse(dbLog.event_data) : undefined,
            success: dbLog.success,
            errorMessage: dbLog.error_message,
            sessionId: dbLog.session_id,
            createdAt: dbLog.created_at
        };
    }
}