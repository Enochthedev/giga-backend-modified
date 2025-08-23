import express from 'express';
import { SecurityAuditService } from '../services/security-audit-service';
import { authMiddleware } from '../middleware/auth-middleware';
import { ApiError } from '@giga/common';

const router = express.Router();

/**
 * Get user's security audit logs
 */
router.get('/audit-logs', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.user!.userId;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        if (limit > 100) {
            throw ApiError.badRequest('Limit cannot exceed 100');
        }

        const result = await SecurityAuditService.getUserAuditLogs(userId, limit, offset);

        res.json({
            success: true,
            data: {
                logs: result.logs,
                total: result.total,
                limit,
                offset
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Get security statistics for user
 */
router.get('/stats', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.user!.userId;
        const days = parseInt(req.query.days as string) || 30;

        if (days > 365) {
            throw ApiError.badRequest('Days cannot exceed 365');
        }

        const stats = await SecurityAuditService.getSecurityStats(userId, days);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Get system audit logs (admin only)
 */
router.get('/admin/audit-logs', authMiddleware, async (req, res, next) => {
    try {
        // Check if user has admin role
        const userRoles = req.user!.roles || [];
        if (!userRoles.includes('admin') && !userRoles.includes('super_admin')) {
            throw ApiError.forbidden('Admin access required');
        }

        const filters = {
            eventType: req.query.eventType as string,
            eventCategory: req.query.eventCategory as string,
            severity: req.query.severity as string,
            userId: req.query.userId as string,
            startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
            endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
        };

        const limit = parseInt(req.query.limit as string) || 100;
        const offset = parseInt(req.query.offset as string) || 0;

        if (limit > 500) {
            throw ApiError.badRequest('Limit cannot exceed 500');
        }

        const result = await SecurityAuditService.getSystemAuditLogs(filters, limit, offset);

        res.json({
            success: true,
            data: {
                logs: result.logs,
                total: result.total,
                limit,
                offset,
                filters
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Get system security statistics (admin only)
 */
router.get('/admin/stats', authMiddleware, async (req, res, next) => {
    try {
        // Check if user has admin role
        const userRoles = req.user!.roles || [];
        if (!userRoles.includes('admin') && !userRoles.includes('super_admin')) {
            throw ApiError.forbidden('Admin access required');
        }

        const days = parseInt(req.query.days as string) || 30;

        if (days > 365) {
            throw ApiError.badRequest('Days cannot exceed 365');
        }

        const stats = await SecurityAuditService.getSecurityStats(undefined, days);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        next(error);
    }
});

export default router;