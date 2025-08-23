import { Router } from 'express';
import ticketController from '../controllers/ticket-controller';
import { authenticateToken, requireRole } from '../middleware/auth-middleware';
import {
    validateTicket,
    validateUUID,
    validatePagination,
    validateSearch
} from '../middleware/validation-middleware';

const router = Router();

// All ticket routes require authentication
router.use(authenticateToken);

// Public ticket routes (for all authenticated users)
router.post('/', validateTicket, ticketController.createTicket);
router.get('/my-tickets', validatePagination, ticketController.getMyTickets);
router.get('/search', validateSearch, validatePagination, ticketController.searchTickets);
router.get('/stats', ticketController.getTicketStats);
router.get('/:ticketId', validateUUID, ticketController.getTicket);
router.post('/:ticketId/comments', validateUUID, ticketController.addTicketComment);

// Support agent and admin routes
router.get('/',
    requireRole(['admin', 'support']),
    validatePagination,
    ticketController.getTickets
);
router.get('/assigned/me',
    requireRole(['admin', 'support']),
    validatePagination,
    ticketController.getAssignedTickets
);
router.get('/support-agents',
    requireRole(['admin', 'support']),
    ticketController.getSupportAgents
);
router.put('/:ticketId/status',
    requireRole(['admin', 'support']),
    validateUUID,
    ticketController.updateTicketStatus
);
router.put('/:ticketId/assign',
    requireRole(['admin', 'support']),
    validateUUID,
    ticketController.assignTicket
);
router.put('/:ticketId/close',
    requireRole(['admin', 'support']),
    validateUUID,
    ticketController.closeTicket
);

export default router;