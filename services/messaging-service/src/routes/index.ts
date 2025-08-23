import { Router } from 'express';
import messagingRoutes from './messaging-routes';
import ticketRoutes from './ticket-routes';
import faqRoutes from './faq-routes';
import notificationPreferenceRoutes from './notification-preference-routes';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Messaging service is healthy',
        timestamp: new Date().toISOString(),
        service: 'messaging-service',
        version: '1.0.0'
    });
});

// API routes
router.use('/messaging', messagingRoutes);
router.use('/tickets', ticketRoutes);
router.use('/faqs', faqRoutes);
router.use('/notifications', notificationPreferenceRoutes);

// API documentation endpoint
router.get('/docs', (req, res) => {
    res.json({
        success: true,
        message: 'Messaging Service API Documentation',
        endpoints: {
            messaging: {
                'POST /api/messaging/conversations': 'Create a new conversation',
                'GET /api/messaging/conversations': 'Get user conversations',
                'GET /api/messaging/conversations/:id': 'Get conversation by ID',
                'POST /api/messaging/messages': 'Send a message',
                'GET /api/messaging/conversations/:id/messages': 'Get conversation messages',
                'PUT /api/messaging/messages/:id': 'Edit a message',
                'DELETE /api/messaging/messages/:id': 'Delete a message',
                'POST /api/messaging/conversations/:id/read': 'Mark messages as read',
                'GET /api/messaging/search': 'Search messages',
                'GET /api/messaging/unread-count': 'Get unread message count'
            },
            tickets: {
                'POST /api/tickets': 'Create a support ticket',
                'GET /api/tickets': 'Get tickets (admin/support)',
                'GET /api/tickets/my-tickets': 'Get user\'s tickets',
                'GET /api/tickets/:id': 'Get ticket by ID',
                'PUT /api/tickets/:id/status': 'Update ticket status',
                'PUT /api/tickets/:id/assign': 'Assign ticket to agent',
                'POST /api/tickets/:id/comments': 'Add comment to ticket',
                'GET /api/tickets/search': 'Search tickets',
                'GET /api/tickets/stats': 'Get ticket statistics'
            },
            faqs: {
                'GET /api/faqs': 'Get FAQs',
                'GET /api/faqs/:id': 'Get FAQ by ID',
                'POST /api/faqs': 'Create FAQ (admin/support)',
                'PUT /api/faqs/:id': 'Update FAQ (admin/support)',
                'DELETE /api/faqs/:id': 'Delete FAQ (admin/support)',
                'GET /api/faqs/search': 'Search FAQs',
                'GET /api/faqs/popular': 'Get popular FAQs',
                'POST /api/faqs/:id/rate': 'Rate FAQ as helpful',
                'GET /api/faqs/categories': 'Get FAQ categories'
            },
            notifications: {
                'GET /api/notifications': 'Get notification preferences',
                'PUT /api/notifications': 'Update notification preferences',
                'POST /api/notifications/opt-out/marketing': 'Opt out from marketing',
                'POST /api/notifications/opt-out/all-non-essential': 'Opt out from non-essential',
                'GET /api/notifications/unsubscribe/:token': 'Unsubscribe via token',
                'GET /api/notifications/export': 'Export preferences (GDPR)',
                'DELETE /api/notifications': 'Delete preferences (GDPR)'
            }
        },
        websocket: {
            events: {
                'join_conversation': 'Join a conversation room',
                'leave_conversation': 'Leave a conversation room',
                'typing_start': 'Start typing indicator',
                'typing_stop': 'Stop typing indicator',
                'message_read': 'Mark message as read',
                'new_message': 'Receive new message',
                'message_updated': 'Receive message update',
                'user_joined': 'User joined conversation',
                'user_left': 'User left conversation',
                'typing_indicator': 'Typing indicator update',
                'presence_update': 'User presence update'
            }
        }
    });
});

export default router;