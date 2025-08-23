import { beforeAll, afterAll, beforeEach } from '@jest/globals';
import db from '../database/connection';
import migrator from '../database/migrate';

/**
 * Test setup configuration for messaging service
 * Handles database setup, cleanup, and test utilities
 */

// Test database setup
beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/messaging_test';
    process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379/1';

    // Initialize test database
    try {
        await migrator.migrate();
        console.log('Test database initialized');
    } catch (error) {
        console.error('Failed to initialize test database:', error);
        throw error;
    }
});

// Clean up after each test
beforeEach(async () => {
    // Clear test data but keep schema
    const tables = [
        'message_read_receipts',
        'message_attachments',
        'messages',
        'conversation_participants',
        'conversations',
        'ticket_attachments',
        'tickets',
        'faqs',
        'notification_preferences'
    ];

    for (const table of tables) {
        await db.query(`DELETE FROM ${table}`);
    }
});

// Clean up after all tests
afterAll(async () => {
    try {
        await db.close();
        console.log('Test database connections closed');
    } catch (error) {
        console.error('Error closing test database:', error);
    }
});

// Test utilities
export const createTestUser = async (userData: any = {}) => {
    const defaultUser = {
        email: `test${Date.now()}@example.com`,
        name: 'Test User',
        role: 'user',
        ...userData
    };

    const result = await db.query(
        `INSERT INTO users (email, name, role) VALUES ($1, $2, $3) RETURNING *`,
        [defaultUser.email, defaultUser.name, defaultUser.role]
    );

    return result.rows[0];
};

export const createTestConversation = async (participants: string[], type: string = 'direct') => {
    const result = await db.query(
        `INSERT INTO conversations (type) VALUES ($1) RETURNING *`,
        [type]
    );

    const conversation = result.rows[0];

    // Add participants
    for (const participantId of participants) {
        await db.query(
            `INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2)`,
            [conversation.id, participantId]
        );
    }

    return conversation;
};

export const createTestMessage = async (conversationId: string, senderId: string, content: string = 'Test message') => {
    const result = await db.query(
        `INSERT INTO messages (conversation_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *`,
        [conversationId, senderId, content]
    );

    return result.rows[0];
};

export const createTestTicket = async (userId: string, ticketData: any = {}) => {
    const defaultTicket = {
        subject: 'Test Ticket',
        description: 'Test ticket description',
        category: 'general_inquiry',
        priority: 'medium',
        ...ticketData
    };

    const result = await db.query(
        `INSERT INTO tickets (user_id, subject, description, category, priority) 
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [userId, defaultTicket.subject, defaultTicket.description, defaultTicket.category, defaultTicket.priority]
    );

    return result.rows[0];
};

export const createTestFAQ = async (createdBy: string, faqData: any = {}) => {
    const defaultFAQ = {
        question: 'Test Question?',
        answer: 'Test Answer',
        tags: ['test'],
        isPublished: true,
        ...faqData
    };

    // Create category if not provided
    let categoryId = faqData.categoryId;
    if (!categoryId) {
        const categoryResult = await db.query(
            `INSERT INTO faq_categories (name, description) VALUES ($1, $2) RETURNING id`,
            ['Test Category', 'Test category description']
        );
        categoryId = categoryResult.rows[0].id;
    }

    const result = await db.query(
        `INSERT INTO faqs (question, answer, category_id, tags, is_published, created_by) 
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [defaultFAQ.question, defaultFAQ.answer, categoryId, defaultFAQ.tags, defaultFAQ.isPublished, createdBy]
    );

    return result.rows[0];
};

export const createTestNotificationPreferences = async (userId: string, preferences: any = {}) => {
    const defaultPreferences = {
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        messageNotifications: true,
        ticketNotifications: true,
        marketingEmails: false,
        orderUpdates: true,
        promotionalOffers: false,
        securityAlerts: true,
        ...preferences
    };

    const result = await db.query(
        `INSERT INTO notification_preferences (
      user_id, email_notifications, sms_notifications, push_notifications,
      message_notifications, ticket_notifications, marketing_emails,
      order_updates, promotional_offers, security_alerts
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [
            userId,
            defaultPreferences.emailNotifications,
            defaultPreferences.smsNotifications,
            defaultPreferences.pushNotifications,
            defaultPreferences.messageNotifications,
            defaultPreferences.ticketNotifications,
            defaultPreferences.marketingEmails,
            defaultPreferences.orderUpdates,
            defaultPreferences.promotionalOffers,
            defaultPreferences.securityAlerts
        ]
    );

    return result.rows[0];
};

// Mock JWT token for testing
export const generateTestToken = (userId: string, role: string = 'user') => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
        { userId, role },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
    );
};

// Helper to make authenticated requests in tests
export const createAuthHeaders = (token: string) => ({
    Authorization: `Bearer ${token}`
});

export default {
    createTestUser,
    createTestConversation,
    createTestMessage,
    createTestTicket,
    createTestFAQ,
    createTestNotificationPreferences,
    generateTestToken,
    createAuthHeaders
};