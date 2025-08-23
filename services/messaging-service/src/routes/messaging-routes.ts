import { Router } from 'express';
import messagingController from '../controllers/messaging-controller';
import { authenticateToken } from '../middleware/auth-middleware';
import {
    validateMessage,
    validateConversation,
    validateUUID,
    validatePagination,
    validateSearch
} from '../middleware/validation-middleware';

const router = Router();

// All messaging routes require authentication
router.use(authenticateToken);

// Conversation routes
router.post('/conversations', validateConversation, messagingController.createConversation);
router.get('/conversations', validatePagination, messagingController.getUserConversations);
router.get('/conversations/:id', validateUUID, messagingController.getConversation);
router.get('/conversations/:conversationId/messages',
    validateUUID,
    validatePagination,
    messagingController.getConversationMessages
);
router.get('/conversations/:conversationId/participants',
    validateUUID,
    messagingController.getConversationParticipants
);
router.post('/conversations/:conversationId/participants',
    validateUUID,
    messagingController.addParticipant
);
router.delete('/conversations/:conversationId/participants',
    validateUUID,
    messagingController.removeParticipant
);

// Message routes
router.post('/messages', validateMessage, messagingController.sendMessage);
router.put('/messages/:messageId', validateUUID, messagingController.editMessage);
router.delete('/messages/:messageId', validateUUID, messagingController.deleteMessage);
router.post('/conversations/:conversationId/read',
    validateUUID,
    messagingController.markMessagesAsRead
);

// Search and utility routes
router.get('/search', validateSearch, validatePagination, messagingController.searchMessages);
router.get('/unread-count', messagingController.getUnreadCount);

export default router;