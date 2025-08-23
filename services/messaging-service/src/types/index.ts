export interface User {
    id: string;
    email: string;
    name: string;
    role: 'user' | 'vendor' | 'admin' | 'support';
    avatar?: string;
    isOnline: boolean;
    lastSeen: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    messageType: 'text' | 'image' | 'file' | 'system';
    attachments?: MessageAttachment[];
    isRead: boolean;
    isEdited: boolean;
    editedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface MessageAttachment {
    id: string;
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    uploadedAt: Date;
}

export interface Conversation {
    id: string;
    type: 'direct' | 'support' | 'group';
    participants: string[];
    title?: string;
    lastMessage?: Message;
    lastMessageAt: Date;
    isActive: boolean;
    metadata?: ConversationMetadata;
    createdAt: Date;
    updatedAt: Date;
}

export interface ConversationMetadata {
    orderId?: string;
    productId?: string;
    vendorId?: string;
    ticketId?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    category?: string;
    tags?: string[];
}

export interface Ticket {
    id: string;
    userId: string;
    assignedTo?: string;
    subject: string;
    description: string;
    category: TicketCategory;
    priority: TicketPriority;
    status: TicketStatus;
    conversationId?: string;
    attachments?: TicketAttachment[];
    tags: string[];
    metadata?: TicketMetadata;
    createdAt: Date;
    updatedAt: Date;
    resolvedAt?: Date;
}

export type TicketCategory =
    | 'technical_support'
    | 'billing'
    | 'account'
    | 'product_inquiry'
    | 'order_issue'
    | 'refund_request'
    | 'vendor_support'
    | 'general_inquiry'
    | 'bug_report'
    | 'feature_request';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TicketStatus =
    | 'open'
    | 'in_progress'
    | 'waiting_for_customer'
    | 'waiting_for_vendor'
    | 'escalated'
    | 'resolved'
    | 'closed';

export interface TicketAttachment {
    id: string;
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
    uploadedBy: string;
    uploadedAt: Date;
}

export interface TicketMetadata {
    orderId?: string;
    productId?: string;
    vendorId?: string;
    deviceInfo?: string;
    browserInfo?: string;
    ipAddress?: string;
    userAgent?: string;
}

export interface FAQ {
    id: string;
    question: string;
    answer: string;
    category: string;
    tags: string[];
    isPublished: boolean;
    viewCount: number;
    helpfulCount: number;
    notHelpfulCount: number;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface FAQCategory {
    id: string;
    name: string;
    description: string;
    icon?: string;
    sortOrder: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface NotificationPreference {
    id: string;
    userId: string;
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    messageNotifications: boolean;
    ticketNotifications: boolean;
    marketingEmails: boolean;
    orderUpdates: boolean;
    promotionalOffers: boolean;
    securityAlerts: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface SocketUser {
    userId: string;
    socketId: string;
    conversationIds: string[];
    joinedAt: Date;
}

export interface ChatEvent {
    type: 'message' | 'typing' | 'read' | 'user_joined' | 'user_left';
    conversationId: string;
    userId: string;
    data?: any;
    timestamp: Date;
}

export interface TypingIndicator {
    conversationId: string;
    userId: string;
    isTyping: boolean;
    timestamp: Date;
}

export interface MessageReadReceipt {
    messageId: string;
    userId: string;
    readAt: Date;
}

export interface SearchFilters {
    category?: string;
    status?: TicketStatus;
    priority?: TicketPriority;
    assignedTo?: string;
    dateFrom?: Date;
    dateTo?: Date;
    tags?: string[];
}

export interface PaginationOptions {
    page: number;
    limit: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface MessageEvent {
    type: 'message_sent' | 'message_received' | 'message_read' | 'conversation_created';
    conversationId: string;
    messageId?: string;
    userId: string;
    timestamp: Date;
    data?: any;
}