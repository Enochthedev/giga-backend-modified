import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth-middleware';
import ticketService from '../services/ticket-service';
import socketService from '../services/socket-service';
import logger from '../utils/logger';
import { asyncHandler } from '../middleware/error-middleware';

/**
 * Controller for helpdesk and ticketing system
 * Handles support ticket management endpoints
 */
class TicketController {
    /**
     * Create a new support ticket
     */
    public createTicket = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const {
            subject,
            description,
            category,
            priority = 'medium',
            tags = [],
            metadata,
            attachments
        } = req.body;
        const userId = req.user!.id;

        const ticket = await ticketService.createTicket(
            userId,
            subject,
            description,
            category,
            priority,
            tags,
            metadata,
            attachments
        );

        // Notify support team about new ticket
        socketService.sendNotificationToUsers(
            await this.getSupportTeamIds(),
            {
                type: 'new_ticket',
                ticket,
                user: {
                    id: userId,
                    name: req.user!.name,
                    email: req.user!.email
                }
            }
        );

        res.status(201).json({
            success: true,
            data: ticket,
            message: 'Support ticket created successfully'
        });
    });

    /**
     * Get ticket by ID
     */
    public getTicket = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { ticketId } = req.params;
        const userId = req.user!.id;

        const ticket = await ticketService.getTicketById(ticketId, userId);

        res.json({
            success: true,
            data: ticket
        });
    });

    /**
     * Get tickets with filtering and pagination
     */
    public getTickets = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const sortBy = req.query.sortBy as string;
        const sortOrder = req.query.sortOrder as 'asc' | 'desc';

        // Build filters from query parameters
        const filters: any = {};
        if (req.query.category) filters.category = req.query.category;
        if (req.query.status) filters.status = req.query.status;
        if (req.query.priority) filters.priority = req.query.priority;
        if (req.query.assignedTo) filters.assignedTo = req.query.assignedTo;
        if (req.query.dateFrom) filters.dateFrom = new Date(req.query.dateFrom as string);
        if (req.query.dateTo) filters.dateTo = new Date(req.query.dateTo as string);
        if (req.query.tags) {
            filters.tags = Array.isArray(req.query.tags)
                ? req.query.tags
                : [req.query.tags];
        }

        const pagination = { page, limit, sortBy, sortOrder };

        const result = await ticketService.getTickets(filters, pagination, userId, userRole);

        res.json({
            success: true,
            data: result.tickets,
            pagination: {
                page,
                limit,
                total: result.total,
                totalPages: Math.ceil(result.total / limit)
            }
        });
    });

    /**
     * Update ticket status
     */
    public updateTicketStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { ticketId } = req.params;
        const { status } = req.body;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const ticket = await ticketService.updateTicketStatus(ticketId, status, userId, userRole);

        // Notify ticket owner and assigned agent
        const notificationUserIds = [ticket.user_id];
        if (ticket.assigned_to && ticket.assigned_to !== userId) {
            notificationUserIds.push(ticket.assigned_to);
        }

        socketService.sendNotificationToUsers(notificationUserIds, {
            type: 'ticket_status_updated',
            ticket,
            updatedBy: {
                id: userId,
                name: req.user!.name
            },
            newStatus: status
        });

        res.json({
            success: true,
            data: ticket,
            message: 'Ticket status updated successfully'
        });
    });

    /**
     * Assign ticket to support agent
     */
    public assignTicket = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { ticketId } = req.params;
        const { assignedTo } = req.body;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const ticket = await ticketService.assignTicket(ticketId, assignedTo, userId, userRole);

        // Notify ticket owner and assigned agent
        const notificationUserIds = [ticket.user_id, assignedTo];

        socketService.sendNotificationToUsers(notificationUserIds, {
            type: 'ticket_assigned',
            ticket,
            assignedBy: {
                id: userId,
                name: req.user!.name
            }
        });

        res.json({
            success: true,
            data: ticket,
            message: 'Ticket assigned successfully'
        });
    });

    /**
     * Add comment to ticket
     */
    public addTicketComment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { ticketId } = req.params;
        const { comment, attachments } = req.body;
        const userId = req.user!.id;

        await ticketService.addTicketComment(ticketId, userId, comment, attachments);

        // Get ticket details for notifications
        const ticket = await ticketService.getTicketById(ticketId, userId);

        // Notify relevant parties
        const notificationUserIds = [ticket.user_id];
        if (ticket.assigned_to && ticket.assigned_to !== userId) {
            notificationUserIds.push(ticket.assigned_to);
        }

        socketService.sendNotificationToUsers(notificationUserIds, {
            type: 'ticket_comment_added',
            ticketId,
            comment,
            commentBy: {
                id: userId,
                name: req.user!.name
            }
        });

        res.json({
            success: true,
            message: 'Comment added successfully'
        });
    });

    /**
     * Search tickets
     */
    public searchTickets = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { q: query } = req.query;
        const userId = req.user!.id;
        const userRole = req.user!.role;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        const result = await ticketService.searchTickets(
            query as string,
            userId,
            userRole,
            page,
            limit
        );

        res.json({
            success: true,
            data: result.tickets,
            pagination: {
                page,
                limit,
                total: result.total,
                totalPages: Math.ceil(result.total / limit)
            }
        });
    });

    /**
     * Get ticket statistics
     */
    public getTicketStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const stats = await ticketService.getTicketStats(userId, userRole);

        res.json({
            success: true,
            data: stats
        });
    });

    /**
     * Close ticket
     */
    public closeTicket = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { ticketId } = req.params;
        const { reason } = req.body;
        const userId = req.user!.id;
        const userRole = req.user!.role;

        const ticket = await ticketService.closeTicket(ticketId, userId, userRole, reason);

        // Notify ticket owner and assigned agent
        const notificationUserIds = [ticket.user_id];
        if (ticket.assigned_to && ticket.assigned_to !== userId) {
            notificationUserIds.push(ticket.assigned_to);
        }

        socketService.sendNotificationToUsers(notificationUserIds, {
            type: 'ticket_closed',
            ticket,
            closedBy: {
                id: userId,
                name: req.user!.name
            },
            reason
        });

        res.json({
            success: true,
            data: ticket,
            message: 'Ticket closed successfully'
        });
    });

    /**
     * Get my tickets (for current user)
     */
    public getMyTickets = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const userId = req.user!.id;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const status = req.query.status as string;

        const filters: any = {};
        if (status) filters.status = status;

        const pagination = { page, limit };

        const result = await ticketService.getTickets(filters, pagination, userId, 'user');

        res.json({
            success: true,
            data: result.tickets,
            pagination: {
                page,
                limit,
                total: result.total,
                totalPages: Math.ceil(result.total / limit)
            }
        });
    });

    /**
     * Get assigned tickets (for support agents)
     */
    public getAssignedTickets = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const userId = req.user!.id;
        const userRole = req.user!.role;

        if (userRole !== 'admin' && userRole !== 'support') {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const status = req.query.status as string;

        const filters: any = { assignedTo: userId };
        if (status) filters.status = status;

        const pagination = { page, limit };

        const result = await ticketService.getTickets(filters, pagination, userId, userRole);

        res.json({
            success: true,
            data: result.tickets,
            pagination: {
                page,
                limit,
                total: result.total,
                totalPages: Math.ceil(result.total / limit)
            }
        });
    });

    /**
     * Get available support agents for ticket assignment
     */
    public getSupportAgents = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const userRole = req.user!.role;

        if (userRole !== 'admin' && userRole !== 'support') {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        const result = await require('../database/connection').default.query(
            `SELECT id, name, email, role 
       FROM users 
       WHERE role IN ('admin', 'support') AND id != $1
       ORDER BY name`,
            [req.user!.id]
        );

        res.json({
            success: true,
            data: result.rows
        });
    });

    /**
     * Helper method to get support team user IDs
     */
    private async getSupportTeamIds(): Promise<string[]> {
        try {
            const result = await require('../database/connection').default.query(
                `SELECT id FROM users WHERE role IN ('admin', 'support')`
            );
            return result.rows.map((row: any) => row.id);
        } catch (error) {
            logger.error('Failed to get support team IDs:', error);
            return [];
        }
    }
}

export default new TicketController();