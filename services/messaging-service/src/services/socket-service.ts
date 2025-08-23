import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import db from '../database/connection';
import logger from '../utils/logger';
import { SocketUser, ChatEvent, TypingIndicator, MessageReadReceipt } from '../types';

/**
 * Service for handling real-time communication via Socket.IO
 * Manages WebSocket connections, real-time messaging, and presence
 */
class SocketService {
    private io: SocketIOServer;
    private connectedUsers: Map<string, SocketUser> = new Map();
    private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

    constructor() {
        // Will be initialized when server is created
    }

    /**
     * Initialize Socket.IO server
     */
    public initialize(server: HTTPServer): void {
        this.io = new SocketIOServer(server, {
            cors: {
                origin: process.env.SOCKET_CORS_ORIGIN || "http://localhost:3000",
                methods: ["GET", "POST"],
                credentials: true
            },
            pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT || '60000'),
            pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL || '25000')
        });

        this.setupMiddleware();
        this.setupEventHandlers();

        logger.info('Socket.IO server initialized');
    }

    /**
     * Setup authentication middleware
     */
    private setupMiddleware(): void {
        this.io.use(async (socket: Socket, next) => {
            try {
                const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

                if (!token) {
                    return next(new Error('Authentication token required'));
                }

                const jwtSecret = process.env.JWT_SECRET;
                if (!jwtSecret) {
                    return next(new Error('Server configuration error'));
                }

                const decoded = jwt.verify(token, jwtSecret) as any;

                // Get user information from database
                const userResult = await db.query(
                    'SELECT id, email, name, role FROM users WHERE id = $1',
                    [decoded.userId || decoded.id]
                );

                if (userResult.rows.length === 0) {
                    return next(new Error('Invalid token - user not found'));
                }

                socket.data.user = userResult.rows[0];
                next();
            } catch (error) {
                logger.error('Socket authentication error:', error);
                next(new Error('Authentication failed'));
            }
        });
    }

    /**
     * Setup event handlers
     */
    private setupEventHandlers(): void {
        this.io.on('connection', (socket: Socket) => {
            this.handleConnection(socket);
        });
    }

    /**
     * Handle new socket connection
     */
    private handleConnection(socket: Socket): void {
        const user = socket.data.user;

        logger.info('User connected:', {
            userId: user.id,
            socketId: socket.id,
            userAgent: socket.handshake.headers['user-agent']
        });

        // Add user to connected users
        this.addConnectedUser(user.id, socket.id);

        // Update user online status
        this.updateUserOnlineStatus(user.id, true);

        // Join user to their personal room
        socket.join(`user:${user.id}`);

        // Setup event handlers for this socket
        this.setupSocketEventHandlers(socket);

        // Handle disconnection
        socket.on('disconnect', () => {
            this.handleDisconnection(socket);
        });
    }

    /**
     * Setup event handlers for individual socket
     */
    private setupSocketEventHandlers(socket: Socket): void {
        const user = socket.data.user;

        // Join conversation room
        socket.on('join_conversation', async (conversationId: string) => {
            try {
                // Verify user is participant in conversation
                const participantCheck = await db.query(
                    `SELECT 1 FROM conversation_participants 
           WHERE conversation_id = $1 AND user_id = $2 AND is_active = true`,
                    [conversationId, user.id]
                );

                if (participantCheck.rows.length > 0) {
                    socket.join(`conversation:${conversationId}`);

                    // Update connected user's conversation list
                    const connectedUser = this.connectedUsers.get(socket.id);
                    if (connectedUser) {
                        connectedUser.conversationIds.push(conversationId);
                    }

                    // Notify other participants that user joined
                    socket.to(`conversation:${conversationId}`).emit('user_joined', {
                        userId: user.id,
                        userName: user.name,
                        conversationId
                    });

                    logger.info('User joined conversation:', {
                        userId: user.id,
                        conversationId
                    });
                } else {
                    socket.emit('error', { message: 'Access denied to conversation' });
                }
            } catch (error) {
                logger.error('Error joining conversation:', error);
                socket.emit('error', { message: 'Failed to join conversation' });
            }
        });

        // Leave conversation room
        socket.on('leave_conversation', (conversationId: string) => {
            socket.leave(`conversation:${conversationId}`);

            // Update connected user's conversation list
            const connectedUser = this.connectedUsers.get(socket.id);
            if (connectedUser) {
                connectedUser.conversationIds = connectedUser.conversationIds.filter(
                    id => id !== conversationId
                );
            }

            // Notify other participants that user left
            socket.to(`conversation:${conversationId}`).emit('user_left', {
                userId: user.id,
                userName: user.name,
                conversationId
            });

            logger.info('User left conversation:', {
                userId: user.id,
                conversationId
            });
        });

        // Handle typing indicators
        socket.on('typing_start', (data: { conversationId: string }) => {
            const typingIndicator: TypingIndicator = {
                conversationId: data.conversationId,
                userId: user.id,
                isTyping: true,
                timestamp: new Date()
            };

            socket.to(`conversation:${data.conversationId}`).emit('typing_indicator', typingIndicator);
        });

        socket.on('typing_stop', (data: { conversationId: string }) => {
            const typingIndicator: TypingIndicator = {
                conversationId: data.conversationId,
                userId: user.id,
                isTyping: false,
                timestamp: new Date()
            };

            socket.to(`conversation:${data.conversationId}`).emit('typing_indicator', typingIndicator);
        });

        // Handle message read receipts
        socket.on('message_read', (data: { messageId: string; conversationId: string }) => {
            const readReceipt: MessageReadReceipt = {
                messageId: data.messageId,
                userId: user.id,
                readAt: new Date()
            };

            socket.to(`conversation:${data.conversationId}`).emit('message_read_receipt', readReceipt);
        });

        // Handle presence updates
        socket.on('update_presence', (data: { status: 'online' | 'away' | 'busy' }) => {
            // Update user presence in database if needed
            this.updateUserPresence(user.id, data.status);

            // Broadcast presence update to user's conversations
            const connectedUser = this.connectedUsers.get(socket.id);
            if (connectedUser) {
                connectedUser.conversationIds.forEach(conversationId => {
                    socket.to(`conversation:${conversationId}`).emit('presence_update', {
                        userId: user.id,
                        status: data.status,
                        timestamp: new Date()
                    });
                });
            }
        });

        // Handle custom events
        socket.on('custom_event', (data: any) => {
            // Handle custom application-specific events
            logger.info('Custom event received:', {
                userId: user.id,
                event: data
            });
        });
    }

    /**
     * Handle socket disconnection
     */
    private handleDisconnection(socket: Socket): void {
        const user = socket.data.user;

        logger.info('User disconnected:', {
            userId: user.id,
            socketId: socket.id
        });

        // Remove from connected users
        this.removeConnectedUser(user.id, socket.id);

        // Update online status if no more connections
        if (!this.userSockets.has(user.id) || this.userSockets.get(user.id)!.size === 0) {
            this.updateUserOnlineStatus(user.id, false);
        }
    }

    /**
     * Add connected user
     */
    private addConnectedUser(userId: string, socketId: string): void {
        const connectedUser: SocketUser = {
            userId,
            socketId,
            conversationIds: [],
            joinedAt: new Date()
        };

        this.connectedUsers.set(socketId, connectedUser);

        // Track user sockets
        if (!this.userSockets.has(userId)) {
            this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId)!.add(socketId);
    }

    /**
     * Remove connected user
     */
    private removeConnectedUser(userId: string, socketId: string): void {
        this.connectedUsers.delete(socketId);

        const userSocketSet = this.userSockets.get(userId);
        if (userSocketSet) {
            userSocketSet.delete(socketId);
            if (userSocketSet.size === 0) {
                this.userSockets.delete(userId);
            }
        }
    }

    /**
     * Update user online status in database
     */
    private async updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
        try {
            await db.query(
                'UPDATE users SET is_online = $1, last_seen = CURRENT_TIMESTAMP WHERE id = $2',
                [isOnline, userId]
            );
        } catch (error) {
            logger.error('Failed to update user online status:', error);
        }
    }

    /**
     * Update user presence
     */
    private async updateUserPresence(userId: string, status: string): Promise<void> {
        try {
            // Store presence in Redis for real-time access
            const redisClient = db.getRedisClient();
            await redisClient.setEx(`presence:${userId}`, 300, status); // 5 minutes TTL
        } catch (error) {
            logger.error('Failed to update user presence:', error);
        }
    }

    /**
     * Emit event to specific user
     */
    public emitToUser(userId: string, event: string, data: any): void {
        this.io.to(`user:${userId}`).emit(event, data);
    }

    /**
     * Emit event to conversation participants
     */
    public emitToConversation(conversationId: string, event: string, data: any): void {
        this.io.to(`conversation:${conversationId}`).emit(event, data);
    }

    /**
     * Emit new message to conversation
     */
    public emitNewMessage(conversationId: string, message: any): void {
        this.emitToConversation(conversationId, 'new_message', message);
    }

    /**
     * Emit message update to conversation
     */
    public emitMessageUpdate(conversationId: string, message: any): void {
        this.emitToConversation(conversationId, 'message_updated', message);
    }

    /**
     * Emit conversation update to participants
     */
    public emitConversationUpdate(conversationId: string, update: any): void {
        this.emitToConversation(conversationId, 'conversation_updated', update);
    }

    /**
     * Get connected users count
     */
    public getConnectedUsersCount(): number {
        return this.connectedUsers.size;
    }

    /**
     * Get user connection status
     */
    public isUserConnected(userId: string): boolean {
        return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
    }

    /**
     * Get connected users in conversation
     */
    public getConnectedUsersInConversation(conversationId: string): string[] {
        const connectedUserIds: string[] = [];

        this.connectedUsers.forEach(user => {
            if (user.conversationIds.includes(conversationId)) {
                connectedUserIds.push(user.userId);
            }
        });

        return [...new Set(connectedUserIds)]; // Remove duplicates
    }

    /**
     * Broadcast system notification
     */
    public broadcastSystemNotification(notification: any): void {
        this.io.emit('system_notification', notification);
    }

    /**
     * Send notification to specific users
     */
    public sendNotificationToUsers(userIds: string[], notification: any): void {
        userIds.forEach(userId => {
            this.emitToUser(userId, 'notification', notification);
        });
    }

    /**
     * Get Socket.IO server instance
     */
    public getIO(): SocketIOServer {
        return this.io;
    }
}

export default new SocketService();