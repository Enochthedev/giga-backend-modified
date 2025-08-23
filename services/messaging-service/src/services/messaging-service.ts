import { v4 as uuidv4 } from 'uuid';
import db from '../database/connection';
import logger from '../utils/logger';
import { Message, Conversation, MessageAttachment, User } from '../types';
import { createError } from '../middleware/error-middleware';

/**
 * Service for handling messaging functionality
 * Manages conversations, messages, and real-time communication
 */
class MessagingService {
    /**
     * Create a new conversation
     */
    public async createConversation(
        type: 'direct' | 'support' | 'group',
        participants: string[],
        title?: string,
        metadata?: any,
        createdBy?: string
    ): Promise<Conversation> {
        try {
            return await db.transaction(async (client) => {
                // Create conversation
                const conversationResult = await client.query(
                    `INSERT INTO conversations (type, title, metadata)
           VALUES ($1, $2, $3)
           RETURNING *`,
                    [type, title, metadata]
                );

                const conversation = conversationResult.rows[0];

                // Add participants
                for (const participantId of participants) {
                    await client.query(
                        `INSERT INTO conversation_participants (conversation_id, user_id)
             VALUES ($1, $2)`,
                        [conversation.id, participantId]
                    );
                }

                // Get conversation with participants
                const fullConversation = await this.getConversationById(conversation.id);

                logger.info('Conversation created:', {
                    conversationId: conversation.id,
                    type,
                    participantCount: participants.length
                });

                return fullConversation;
            });
        } catch (error) {
            logger.error('Failed to create conversation:', error);
            throw createError('Failed to create conversation', 500);
        }
    }

    /**
     * Get conversation by ID
     */
    public async getConversationById(conversationId: string): Promise<Conversation> {
        try {
            const result = await db.query(
                `SELECT c.*, 
                COALESCE(
                  json_agg(
                    json_build_object(
                      'userId', cp.user_id,
                      'joinedAt', cp.joined_at,
                      'isActive', cp.is_active
                    )
                  ) FILTER (WHERE cp.user_id IS NOT NULL), 
                  '[]'
                ) as participants
         FROM conversations c
         LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id AND cp.is_active = true
         WHERE c.id = $1
         GROUP BY c.id`,
                [conversationId]
            );

            if (result.rows.length === 0) {
                throw createError('Conversation not found', 404);
            }

            const conversation = result.rows[0];
            conversation.participants = conversation.participants.map((p: any) => p.userId);

            return conversation;
        } catch (error) {
            if (error.statusCode) throw error;
            logger.error('Failed to get conversation:', error);
            throw createError('Failed to get conversation', 500);
        }
    }

    /**
     * Get user conversations
     */
    public async getUserConversations(
        userId: string,
        page: number = 1,
        limit: number = 20
    ): Promise<{ conversations: Conversation[]; total: number }> {
        try {
            const offset = (page - 1) * limit;

            // Get conversations with last message
            const result = await db.query(
                `SELECT c.*, 
                m.content as last_message_content,
                m.created_at as last_message_at,
                m.sender_id as last_message_sender_id,
                u.name as last_message_sender_name,
                COUNT(*) OVER() as total_count
         FROM conversations c
         INNER JOIN conversation_participants cp ON c.id = cp.conversation_id
         LEFT JOIN messages m ON c.id = m.conversation_id 
           AND m.created_at = (
             SELECT MAX(created_at) 
             FROM messages 
             WHERE conversation_id = c.id
           )
         LEFT JOIN users u ON m.sender_id = u.id
         WHERE cp.user_id = $1 AND cp.is_active = true AND c.is_active = true
         ORDER BY COALESCE(m.created_at, c.created_at) DESC
         LIMIT $2 OFFSET $3`,
                [userId, limit, offset]
            );

            const conversations = result.rows.map(row => ({
                id: row.id,
                type: row.type,
                title: row.title,
                lastMessageAt: row.last_message_at || row.created_at,
                isActive: row.is_active,
                metadata: row.metadata,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                lastMessage: row.last_message_content ? {
                    content: row.last_message_content,
                    senderId: row.last_message_sender_id,
                    senderName: row.last_message_sender_name,
                    createdAt: row.last_message_at
                } : null
            }));

            const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

            return { conversations, total };
        } catch (error) {
            logger.error('Failed to get user conversations:', error);
            throw createError('Failed to get conversations', 500);
        }
    }

    /**
     * Send a message
     */
    public async sendMessage(
        conversationId: string,
        senderId: string,
        content: string,
        messageType: 'text' | 'image' | 'file' | 'system' = 'text',
        attachments?: MessageAttachment[]
    ): Promise<Message> {
        try {
            return await db.transaction(async (client) => {
                // Verify user is participant in conversation
                const participantCheck = await client.query(
                    `SELECT 1 FROM conversation_participants 
           WHERE conversation_id = $1 AND user_id = $2 AND is_active = true`,
                    [conversationId, senderId]
                );

                if (participantCheck.rows.length === 0) {
                    throw createError('User is not a participant in this conversation', 403);
                }

                // Create message
                const messageResult = await client.query(
                    `INSERT INTO messages (conversation_id, sender_id, content, message_type)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
                    [conversationId, senderId, content, messageType]
                );

                const message = messageResult.rows[0];

                // Add attachments if provided
                if (attachments && attachments.length > 0) {
                    for (const attachment of attachments) {
                        await client.query(
                            `INSERT INTO message_attachments (message_id, file_name, file_url, file_type, file_size)
               VALUES ($1, $2, $3, $4, $5)`,
                            [message.id, attachment.fileName, attachment.fileUrl, attachment.fileType, attachment.fileSize]
                        );
                    }
                }

                // Update conversation last message timestamp
                await client.query(
                    `UPDATE conversations 
           SET last_message_at = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
                    [message.created_at, conversationId]
                );

                logger.info('Message sent:', {
                    messageId: message.id,
                    conversationId,
                    senderId,
                    messageType
                });

                return message;
            });
        } catch (error) {
            if (error.statusCode) throw error;
            logger.error('Failed to send message:', error);
            throw createError('Failed to send message', 500);
        }
    }

    /**
     * Get conversation messages
     */
    public async getConversationMessages(
        conversationId: string,
        userId: string,
        page: number = 1,
        limit: number = 50
    ): Promise<{ messages: Message[]; total: number }> {
        try {
            // Verify user is participant
            const participantCheck = await db.query(
                `SELECT 1 FROM conversation_participants 
         WHERE conversation_id = $1 AND user_id = $2 AND is_active = true`,
                [conversationId, userId]
            );

            if (participantCheck.rows.length === 0) {
                throw createError('Access denied to this conversation', 403);
            }

            const offset = (page - 1) * limit;

            // Get messages with attachments
            const result = await db.query(
                `SELECT m.*, 
                u.name as sender_name,
                u.avatar as sender_avatar,
                COALESCE(
                  json_agg(
                    json_build_object(
                      'id', ma.id,
                      'fileName', ma.file_name,
                      'fileUrl', ma.file_url,
                      'fileType', ma.file_type,
                      'fileSize', ma.file_size,
                      'uploadedAt', ma.uploaded_at
                    )
                  ) FILTER (WHERE ma.id IS NOT NULL), 
                  '[]'
                ) as attachments,
                COUNT(*) OVER() as total_count
         FROM messages m
         INNER JOIN users u ON m.sender_id = u.id
         LEFT JOIN message_attachments ma ON m.id = ma.message_id
         WHERE m.conversation_id = $1
         GROUP BY m.id, u.name, u.avatar
         ORDER BY m.created_at DESC
         LIMIT $2 OFFSET $3`,
                [conversationId, limit, offset]
            );

            const messages = result.rows.map(row => ({
                ...row,
                attachments: row.attachments.length > 0 ? row.attachments : undefined
            }));

            const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

            return { messages, total };
        } catch (error) {
            if (error.statusCode) throw error;
            logger.error('Failed to get conversation messages:', error);
            throw createError('Failed to get messages', 500);
        }
    }

    /**
     * Mark messages as read
     */
    public async markMessagesAsRead(
        conversationId: string,
        userId: string,
        messageIds?: string[]
    ): Promise<void> {
        try {
            let query: string;
            let params: any[];

            if (messageIds && messageIds.length > 0) {
                // Mark specific messages as read
                query = `
          INSERT INTO message_read_receipts (message_id, user_id)
          SELECT m.id, $2
          FROM messages m
          WHERE m.conversation_id = $1 AND m.id = ANY($3) AND m.sender_id != $2
          ON CONFLICT (message_id, user_id) DO NOTHING
        `;
                params = [conversationId, userId, messageIds];
            } else {
                // Mark all unread messages in conversation as read
                query = `
          INSERT INTO message_read_receipts (message_id, user_id)
          SELECT m.id, $2
          FROM messages m
          LEFT JOIN message_read_receipts mrr ON m.id = mrr.message_id AND mrr.user_id = $2
          WHERE m.conversation_id = $1 AND m.sender_id != $2 AND mrr.id IS NULL
          ON CONFLICT (message_id, user_id) DO NOTHING
        `;
                params = [conversationId, userId];
            }

            await db.query(query, params);

            logger.info('Messages marked as read:', {
                conversationId,
                userId,
                messageCount: messageIds?.length || 'all'
            });
        } catch (error) {
            logger.error('Failed to mark messages as read:', error);
            throw createError('Failed to mark messages as read', 500);
        }
    }

    /**
     * Get unread message count for user
     */
    public async getUnreadMessageCount(userId: string): Promise<number> {
        try {
            const result = await db.query(
                `SELECT COUNT(DISTINCT m.id) as unread_count
         FROM messages m
         INNER JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
         LEFT JOIN message_read_receipts mrr ON m.id = mrr.message_id AND mrr.user_id = $1
         WHERE cp.user_id = $1 AND cp.is_active = true 
           AND m.sender_id != $1 AND mrr.id IS NULL`,
                [userId]
            );

            return parseInt(result.rows[0].unread_count) || 0;
        } catch (error) {
            logger.error('Failed to get unread message count:', error);
            throw createError('Failed to get unread count', 500);
        }
    }

    /**
     * Search messages
     */
    public async searchMessages(
        userId: string,
        query: string,
        conversationId?: string,
        page: number = 1,
        limit: number = 20
    ): Promise<{ messages: Message[]; total: number }> {
        try {
            const offset = (page - 1) * limit;
            let searchQuery: string;
            let params: any[];

            if (conversationId) {
                searchQuery = `
          SELECT m.*, u.name as sender_name, u.avatar as sender_avatar,
                 ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', $3)) as rank,
                 COUNT(*) OVER() as total_count
          FROM messages m
          INNER JOIN users u ON m.sender_id = u.id
          INNER JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
          WHERE cp.user_id = $1 AND cp.is_active = true 
            AND m.conversation_id = $2
            AND to_tsvector('english', m.content) @@ plainto_tsquery('english', $3)
          ORDER BY rank DESC, m.created_at DESC
          LIMIT $4 OFFSET $5
        `;
                params = [userId, conversationId, query, limit, offset];
            } else {
                searchQuery = `
          SELECT m.*, u.name as sender_name, u.avatar as sender_avatar,
                 ts_rank(to_tsvector('english', m.content), plainto_tsquery('english', $2)) as rank,
                 COUNT(*) OVER() as total_count
          FROM messages m
          INNER JOIN users u ON m.sender_id = u.id
          INNER JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
          WHERE cp.user_id = $1 AND cp.is_active = true 
            AND to_tsvector('english', m.content) @@ plainto_tsquery('english', $2)
          ORDER BY rank DESC, m.created_at DESC
          LIMIT $3 OFFSET $4
        `;
                params = [userId, query, limit, offset];
            }

            const result = await db.query(searchQuery, params);
            const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

            return { messages: result.rows, total };
        } catch (error) {
            logger.error('Failed to search messages:', error);
            throw createError('Failed to search messages', 500);
        }
    }

    /**
     * Delete a message (soft delete)
     */
    public async deleteMessage(messageId: string, userId: string): Promise<void> {
        try {
            const result = await db.query(
                `UPDATE messages 
         SET content = '[Message deleted]', is_edited = true, edited_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND sender_id = $2`,
                [messageId, userId]
            );

            if (result.rowCount === 0) {
                throw createError('Message not found or access denied', 404);
            }

            logger.info('Message deleted:', { messageId, userId });
        } catch (error) {
            if (error.statusCode) throw error;
            logger.error('Failed to delete message:', error);
            throw createError('Failed to delete message', 500);
        }
    }

    /**
     * Edit a message
     */
    public async editMessage(
        messageId: string,
        userId: string,
        newContent: string
    ): Promise<Message> {
        try {
            const result = await db.query(
                `UPDATE messages 
         SET content = $3, is_edited = true, edited_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND sender_id = $2
         RETURNING *`,
                [messageId, userId, newContent]
            );

            if (result.rows.length === 0) {
                throw createError('Message not found or access denied', 404);
            }

            logger.info('Message edited:', { messageId, userId });
            return result.rows[0];
        } catch (error) {
            if (error.statusCode) throw error;
            logger.error('Failed to edit message:', error);
            throw createError('Failed to edit message', 500);
        }
    }
}

export default new MessagingService();