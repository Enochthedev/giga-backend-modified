import { v4 as uuidv4 } from 'uuid';
import db from '../database/connection';
import logger from '../utils/logger';
import { Ticket, TicketAttachment, SearchFilters, PaginationOptions } from '../types';
import { createError } from '../middleware/error-middleware';
import messagingService from './messaging-service';

/**
 * Service for handling helpdesk and ticketing system
 * Manages support tickets, assignments, and ticket lifecycle
 */
class TicketService {
    /**
     * Create a new support ticket
     */
    public async createTicket(
        userId: string,
        subject: string,
        description: string,
        category: string,
        priority: string = 'medium',
        tags: string[] = [],
        metadata?: any,
        attachments?: TicketAttachment[]
    ): Promise<Ticket> {
        try {
            return await db.transaction(async (client) => {
                // Create ticket
                const ticketResult = await client.query(
                    `INSERT INTO tickets (user_id, subject, description, category, priority, tags, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
                    [userId, subject, description, category, priority, tags, metadata]
                );

                const ticket = ticketResult.rows[0];

                // Add attachments if provided
                if (attachments && attachments.length > 0) {
                    for (const attachment of attachments) {
                        await client.query(
                            `INSERT INTO ticket_attachments (ticket_id, file_name, file_url, file_type, file_size, uploaded_by)
               VALUES ($1, $2, $3, $4, $5, $6)`,
                            [ticket.id, attachment.fileName, attachment.fileUrl, attachment.fileType, attachment.fileSize, userId]
                        );
                    }
                }

                // Create a support conversation for the ticket
                const conversation = await messagingService.createConversation(
                    'support',
                    [userId], // Will be expanded when support agent is assigned
                    `Support Ticket: ${subject}`,
                    {
                        ticketId: ticket.id,
                        category,
                        priority
                    }
                );

                // Link conversation to ticket
                await client.query(
                    `UPDATE tickets SET conversation_id = $1 WHERE id = $2`,
                    [conversation.id, ticket.id]
                );

                // Send initial system message
                await messagingService.sendMessage(
                    conversation.id,
                    userId,
                    `Support ticket created: ${subject}\n\nDescription: ${description}`,
                    'system'
                );

                logger.info('Support ticket created:', {
                    ticketId: ticket.id,
                    userId,
                    category,
                    priority
                });

                return { ...ticket, conversation_id: conversation.id };
            });
        } catch (error) {
            logger.error('Failed to create ticket:', error);
            throw createError('Failed to create support ticket', 500);
        }
    }

    /**
     * Get ticket by ID
     */
    public async getTicketById(ticketId: string, userId?: string): Promise<Ticket> {
        try {
            let query = `
        SELECT t.*, 
               u.name as user_name, u.email as user_email,
               a.name as assigned_to_name, a.email as assigned_to_email,
               COALESCE(
                 json_agg(
                   json_build_object(
                     'id', ta.id,
                     'fileName', ta.file_name,
                     'fileUrl', ta.file_url,
                     'fileType', ta.file_type,
                     'fileSize', ta.file_size,
                     'uploadedBy', ta.uploaded_by,
                     'uploadedAt', ta.uploaded_at
                   )
                 ) FILTER (WHERE ta.id IS NOT NULL), 
                 '[]'
               ) as attachments
        FROM tickets t
        INNER JOIN users u ON t.user_id = u.id
        LEFT JOIN users a ON t.assigned_to = a.id
        LEFT JOIN ticket_attachments ta ON t.id = ta.ticket_id
        WHERE t.id = $1
      `;

            const params = [ticketId];

            // If userId is provided, ensure user has access to the ticket
            if (userId) {
                query += ` AND (t.user_id = $2 OR $2 IN (
          SELECT id FROM users WHERE role IN ('admin', 'support')
        ))`;
                params.push(userId);
            }

            query += ` GROUP BY t.id, u.name, u.email, a.name, a.email`;

            const result = await db.query(query, params);

            if (result.rows.length === 0) {
                throw createError('Ticket not found or access denied', 404);
            }

            return result.rows[0];
        } catch (error) {
            if (error.statusCode) throw error;
            logger.error('Failed to get ticket:', error);
            throw createError('Failed to get ticket', 500);
        }
    }

    /**
     * Get tickets with filtering and pagination
     */
    public async getTickets(
        filters: SearchFilters = {},
        pagination: PaginationOptions = { page: 1, limit: 20 },
        userId?: string,
        userRole?: string
    ): Promise<{ tickets: Ticket[]; total: number }> {
        try {
            const { page, limit, sortBy = 'created_at', sortOrder = 'desc' } = pagination;
            const offset = (page - 1) * limit;

            let whereConditions: string[] = [];
            let params: any[] = [];
            let paramIndex = 1;

            // Apply filters
            if (filters.category) {
                whereConditions.push(`t.category = $${paramIndex}`);
                params.push(filters.category);
                paramIndex++;
            }

            if (filters.status) {
                whereConditions.push(`t.status = $${paramIndex}`);
                params.push(filters.status);
                paramIndex++;
            }

            if (filters.priority) {
                whereConditions.push(`t.priority = $${paramIndex}`);
                params.push(filters.priority);
                paramIndex++;
            }

            if (filters.assignedTo) {
                whereConditions.push(`t.assigned_to = $${paramIndex}`);
                params.push(filters.assignedTo);
                paramIndex++;
            }

            if (filters.dateFrom) {
                whereConditions.push(`t.created_at >= $${paramIndex}`);
                params.push(filters.dateFrom);
                paramIndex++;
            }

            if (filters.dateTo) {
                whereConditions.push(`t.created_at <= $${paramIndex}`);
                params.push(filters.dateTo);
                paramIndex++;
            }

            if (filters.tags && filters.tags.length > 0) {
                whereConditions.push(`t.tags && $${paramIndex}`);
                params.push(filters.tags);
                paramIndex++;
            }

            // Apply user-specific filters
            if (userId && userRole !== 'admin' && userRole !== 'support') {
                whereConditions.push(`t.user_id = $${paramIndex}`);
                params.push(userId);
                paramIndex++;
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            const query = `
        SELECT t.*, 
               u.name as user_name, u.email as user_email,
               a.name as assigned_to_name, a.email as assigned_to_email,
               COUNT(*) OVER() as total_count
        FROM tickets t
        INNER JOIN users u ON t.user_id = u.id
        LEFT JOIN users a ON t.assigned_to = a.id
        ${whereClause}
        ORDER BY t.${sortBy} ${sortOrder.toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

            params.push(limit, offset);

            const result = await db.query(query, params);
            const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

            return { tickets: result.rows, total };
        } catch (error) {
            logger.error('Failed to get tickets:', error);
            throw createError('Failed to get tickets', 500);
        }
    }

    /**
     * Update ticket status
     */
    public async updateTicketStatus(
        ticketId: string,
        status: string,
        userId: string,
        userRole: string
    ): Promise<Ticket> {
        try {
            // Verify user has permission to update ticket
            const ticket = await this.getTicketById(ticketId, userId);

            if (userRole !== 'admin' && userRole !== 'support' && ticket.user_id !== userId) {
                throw createError('Access denied', 403);
            }

            const resolvedAt = status === 'resolved' || status === 'closed' ? new Date() : null;

            const result = await db.query(
                `UPDATE tickets 
         SET status = $1, resolved_at = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
                [status, resolvedAt, ticketId]
            );

            // Send system message about status change
            if (ticket.conversation_id) {
                await messagingService.sendMessage(
                    ticket.conversation_id,
                    userId,
                    `Ticket status updated to: ${status}`,
                    'system'
                );
            }

            logger.info('Ticket status updated:', {
                ticketId,
                status,
                updatedBy: userId
            });

            return result.rows[0];
        } catch (error) {
            if (error.statusCode) throw error;
            logger.error('Failed to update ticket status:', error);
            throw createError('Failed to update ticket status', 500);
        }
    }

    /**
     * Assign ticket to support agent
     */
    public async assignTicket(
        ticketId: string,
        assignedTo: string,
        assignedBy: string,
        assignedByRole: string
    ): Promise<Ticket> {
        try {
            // Verify user has permission to assign tickets
            if (assignedByRole !== 'admin' && assignedByRole !== 'support') {
                throw createError('Access denied', 403);
            }

            // Verify assigned user exists and has appropriate role
            const assigneeResult = await db.query(
                `SELECT id, name, role FROM users WHERE id = $1 AND role IN ('admin', 'support')`,
                [assignedTo]
            );

            if (assigneeResult.rows.length === 0) {
                throw createError('Invalid assignee - user must be admin or support agent', 400);
            }

            const assignee = assigneeResult.rows[0];

            const result = await db.query(
                `UPDATE tickets 
         SET assigned_to = $1, status = CASE WHEN status = 'open' THEN 'in_progress' ELSE status END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`,
                [assignedTo, ticketId]
            );

            if (result.rows.length === 0) {
                throw createError('Ticket not found', 404);
            }

            const ticket = result.rows[0];

            // Add assignee to conversation if conversation exists
            if (ticket.conversation_id) {
                // Add assignee as participant
                await db.query(
                    `INSERT INTO conversation_participants (conversation_id, user_id)
           VALUES ($1, $2)
           ON CONFLICT (conversation_id, user_id) DO UPDATE SET is_active = true`,
                    [ticket.conversation_id, assignedTo]
                );

                // Send system message about assignment
                await messagingService.sendMessage(
                    ticket.conversation_id,
                    assignedBy,
                    `Ticket assigned to ${assignee.name}`,
                    'system'
                );
            }

            logger.info('Ticket assigned:', {
                ticketId,
                assignedTo,
                assignedBy
            });

            return ticket;
        } catch (error) {
            if (error.statusCode) throw error;
            logger.error('Failed to assign ticket:', error);
            throw createError('Failed to assign ticket', 500);
        }
    }

    /**
     * Add comment to ticket (via conversation)
     */
    public async addTicketComment(
        ticketId: string,
        userId: string,
        comment: string,
        attachments?: TicketAttachment[]
    ): Promise<void> {
        try {
            const ticket = await this.getTicketById(ticketId, userId);

            if (!ticket.conversation_id) {
                throw createError('Ticket conversation not found', 404);
            }

            // Send message to conversation
            await messagingService.sendMessage(
                ticket.conversation_id,
                userId,
                comment,
                'text',
                attachments
            );

            // Update ticket timestamp
            await db.query(
                `UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
                [ticketId]
            );

            logger.info('Comment added to ticket:', {
                ticketId,
                userId,
                hasAttachments: !!(attachments && attachments.length > 0)
            });
        } catch (error) {
            if (error.statusCode) throw error;
            logger.error('Failed to add ticket comment:', error);
            throw createError('Failed to add comment', 500);
        }
    }

    /**
     * Search tickets
     */
    public async searchTickets(
        query: string,
        userId?: string,
        userRole?: string,
        page: number = 1,
        limit: number = 20
    ): Promise<{ tickets: Ticket[]; total: number }> {
        try {
            const offset = (page - 1) * limit;
            let searchQuery: string;
            let params: any[];

            if (userId && userRole !== 'admin' && userRole !== 'support') {
                // Regular users can only search their own tickets
                searchQuery = `
          SELECT t.*, u.name as user_name, u.email as user_email,
                 a.name as assigned_to_name, a.email as assigned_to_email,
                 ts_rank(to_tsvector('english', t.subject || ' ' || t.description), plainto_tsquery('english', $2)) as rank,
                 COUNT(*) OVER() as total_count
          FROM tickets t
          INNER JOIN users u ON t.user_id = u.id
          LEFT JOIN users a ON t.assigned_to = a.id
          WHERE t.user_id = $1 
            AND to_tsvector('english', t.subject || ' ' || t.description) @@ plainto_tsquery('english', $2)
          ORDER BY rank DESC, t.created_at DESC
          LIMIT $3 OFFSET $4
        `;
                params = [userId, query, limit, offset];
            } else {
                // Admin and support can search all tickets
                searchQuery = `
          SELECT t.*, u.name as user_name, u.email as user_email,
                 a.name as assigned_to_name, a.email as assigned_to_email,
                 ts_rank(to_tsvector('english', t.subject || ' ' || t.description), plainto_tsquery('english', $1)) as rank,
                 COUNT(*) OVER() as total_count
          FROM tickets t
          INNER JOIN users u ON t.user_id = u.id
          LEFT JOIN users a ON t.assigned_to = a.id
          WHERE to_tsvector('english', t.subject || ' ' || t.description) @@ plainto_tsquery('english', $1)
          ORDER BY rank DESC, t.created_at DESC
          LIMIT $2 OFFSET $3
        `;
                params = [query, limit, offset];
            }

            const result = await db.query(searchQuery, params);
            const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

            return { tickets: result.rows, total };
        } catch (error) {
            logger.error('Failed to search tickets:', error);
            throw createError('Failed to search tickets', 500);
        }
    }

    /**
     * Get ticket statistics
     */
    public async getTicketStats(userId?: string, userRole?: string): Promise<any> {
        try {
            let whereClause = '';
            let params: any[] = [];

            if (userId && userRole !== 'admin' && userRole !== 'support') {
                whereClause = 'WHERE user_id = $1';
                params = [userId];
            }

            const result = await db.query(`
        SELECT 
          COUNT(*) as total_tickets,
          COUNT(CASE WHEN status = 'open' THEN 1 END) as open_tickets,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tickets,
          COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_tickets,
          COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_tickets,
          COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent_tickets,
          COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_tickets,
          AVG(CASE WHEN resolved_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (resolved_at - created_at))/3600 
          END) as avg_resolution_time_hours
        FROM tickets ${whereClause}
      `, params);

            return result.rows[0];
        } catch (error) {
            logger.error('Failed to get ticket statistics:', error);
            throw createError('Failed to get ticket statistics', 500);
        }
    }

    /**
     * Close ticket
     */
    public async closeTicket(
        ticketId: string,
        userId: string,
        userRole: string,
        reason?: string
    ): Promise<Ticket> {
        try {
            const ticket = await this.updateTicketStatus(ticketId, 'closed', userId, userRole);

            // Send system message about closure
            if (ticket.conversation_id && reason) {
                await messagingService.sendMessage(
                    ticket.conversation_id,
                    userId,
                    `Ticket closed. Reason: ${reason}`,
                    'system'
                );
            }

            return ticket;
        } catch (error) {
            if (error.statusCode) throw error;
            logger.error('Failed to close ticket:', error);
            throw createError('Failed to close ticket', 500);
        }
    }
}

export default new TicketService();