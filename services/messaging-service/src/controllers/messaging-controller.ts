import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth-middleware';
import messagingService from '../services/messaging-service';
import socketService from '../services/socket-service';
import logger from '../utils/logger';
import { asyncHandler } from '../middleware/error-middleware';

/**
 * Controller for messaging functionality
 * Handles conversation and message management endpoints
 */
class MessagingController {
    /**
     * Create a new conversation
     */
    public createConversation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { type, participants, title, metadata } = req.body;
        const userId = req.user!.id;

        // Add current user to participants if not already included
        const allParticipants = participants.includes(userId) ? participants : [...participants, userId];

        const conversation = await messagingService.createConversation(
            type,
            allParticipants,
            title,
            metadata,
            userId
        );

        // Notify participants via socket
        allParticipants.forEach(participantId => {
            if (participantId !== userId) {
                socketService.emitToUser(participantId, 'conversation_created', {
                    conversation,
                    createdBy: {
                        id: userId,
                        name: req.user!.name
                    }
                });
            }
        });

        res.status(201).json({
            success: true,
            data: conversation,
            message: 'Conversation created successfully'
        });
    });

    /**
     * Get user conversations
     */
    public getUserConversations = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const userId = req.user!.id;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        const result = await messagingService.getUserConversations(userId, page, limit);

        res.json({
            success: true,
            data: result.conversations,
            pagination: {
                page,
                limit,
                total: result.total,
                totalPages: Math.ceil(result.total / limit)
            }
        });
    });

    /**
     * Get conversation by ID
     */
    public getConversation = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { conversationId } = req.params;
        const conversation = await messagingService.getConversationById(conversationId);

        res.json({
            success: true,
            data: conversation
        });
    });

    /**
     * Send a message
     */
    public sendMessage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { conversationId, content, messageType, attachments } = req.body;
        const userId = req.user!.id;

        const message = await messagingService.sendMessage(
            conversationId,
            userId,
            content,
            messageType,
            attachments
        );

        // Emit message to conversation participants via socket
        socketService.emitNewMessage(conversationId, {
            ...message,
            sender: {
                id: userId,
                name: req.user!.name
            }
        });

        res.status(201).json({
            success: true,
            data: message,
            message: 'Message sent successfully'
        });
    });

    /**
     * Get conversation messages
     */
    public getConversationMessages = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { conversationId } = req.params;
        const userId = req.user!.id;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;

        const result = await messagingService.getConversationMessages(
            conversationId,
            userId,
            page,
            limit
        );

        res.json({
            success: true,
            data: result.messages,
            pagination: {
                page,
                limit,
                total: result.total,
                totalPages: Math.ceil(result.total / limit)
            }
        });
    });

    /**
     * Mark messages as read
     */
    public markMessagesAsRead = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { conversationId } = req.params;
        const { messageIds } = req.body;
        const userId = req.user!.id;

        await messagingService.markMessagesAsRead(conversationId, userId, messageIds);

        // Emit read receipt to conversation participants
        socketService.emitToConversation(conversationId, 'messages_read', {
            userId,
            messageIds: messageIds || 'all',
            readAt: new Date()
        });

        res.json({
            success: true,
            message: 'Messages marked as read'
        });
    });

    /**
     * Get unread message count
     */
    public getUnreadCount = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const userId = req.user!.id;
        const count = await messagingService.getUnreadMessageCount(userId);

        res.json({
            success: true,
            data: { unreadCount: count }
        });
    });

    /**
     * Search messages
     */
    public searchMessages = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const userId = req.user!.id;
        const { q: query, conversationId } = req.query;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        const result = await messagingService.searchMessages(
            userId,
            query as string,
            conversationId as string,
            page,
            limit
        );

        res.json({
            success: true,
            data: result.messages,
            pagination: {
                page,
                limit,
                total: result.total,
                totalPages: Math.ceil(result.total / limit)
            }
        });
    });

    /**
     * Edit a message
     */
    public editMessage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { messageId } = req.params;
        const { content } = req.body;
        const userId = req.user!.id;

        const message = await messagingService.editMessage(messageId, userId, content);

        // Get conversation ID for socket emission
        const conversationId = message.conversation_id;

        // Emit message update to conversation participants
        socketService.emitMessageUpdate(conversationId, {
            ...message,
            sender: {
                id: userId,
                name: req.user!.name
            }
        });

        res.json({
            success: true,
            data: message,
            message: 'Message updated successfully'
        });
    });

    /**
     * Delete a message
     */
    public deleteMessage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { messageId } = req.params;
        const userId = req.user!.id;

        await messagingService.deleteMessage(messageId, userId);

        res.json({
            success: true,
            message: 'Message deleted successfully'
        });
    });

    /**
     * Get conversation participants
     */
    public getConversationParticipants = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { conversationId } = req.params;

        // Get conversation to verify access and get participants
        const conversation = await messagingService.getConversationById(conversationId);

        // Get participant details from database
        const participantDetails = await Promise.all(
            conversation.participants.map(async (participantId: string) => {
                const result = await require('../database/connection').default.query(
                    'SELECT id, name, email, avatar, is_online, last_seen FROM users WHERE id = $1',
                    [participantId]
                );
                return result.rows[0];
            })
        );

        res.json({
            success: true,
            data: participantDetails
        });
    });

    /**
     * Add participant to conversation
     */
    public addParticipant = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { conversationId } = req.params;
        const { userId: newParticipantId } = req.body;
        const currentUserId = req.user!.id;

        // Verify current user is participant and conversation allows adding participants
        const conversation = await messagingService.getConversationById(conversationId);

        if (!conversation.participants.includes(currentUserId)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        // Add participant to conversation
        await require('../database/connection').default.query(
            `INSERT INTO conversation_participants (conversation_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (conversation_id, user_id) DO UPDATE SET is_active = true`,
            [conversationId, newParticipantId]
        );

        // Send system message about new participant
        await messagingService.sendMessage(
            conversationId,
            currentUserId,
            `${req.user!.name} added a new participant to the conversation`,
            'system'
        );

        // Notify all participants
        socketService.emitConversationUpdate(conversationId, {
            type: 'participant_added',
            participantId: newParticipantId,
            addedBy: currentUserId
        });

        res.json({
            success: true,
            message: 'Participant added successfully'
        });
    });

    /**
     * Remove participant from conversation
     */
    public removeParticipant = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { conversationId } = req.params;
        const { userId: participantToRemove } = req.body;
        const currentUserId = req.user!.id;

        // Verify current user is participant
        const conversation = await messagingService.getConversationById(conversationId);

        if (!conversation.participants.includes(currentUserId)) {
            return res.status(403).json({
                success: false,
                error: 'Access denied'
            });
        }

        // Remove participant from conversation
        await require('../database/connection').default.query(
            `UPDATE conversation_participants 
       SET is_active = false, left_at = CURRENT_TIMESTAMP
       WHERE conversation_id = $1 AND user_id = $2`,
            [conversationId, participantToRemove]
        );

        // Send system message about participant removal
        await messagingService.sendMessage(
            conversationId,
            currentUserId,
            `A participant was removed from the conversation`,
            'system'
        );

        // Notify all participants
        socketService.emitConversationUpdate(conversationId, {
            type: 'participant_removed',
            participantId: participantToRemove,
            removedBy: currentUserId
        });

        res.json({
            success: true,
            message: 'Participant removed successfully'
        });
    });
}

export default new MessagingController();