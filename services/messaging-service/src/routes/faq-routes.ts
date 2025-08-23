import { Router } from 'express';
import faqController from '../controllers/faq-controller';
import { authenticateToken, requireRole, optionalAuth } from '../middleware/auth-middleware';
import {
    validateFAQ,
    validateFAQCategory,
    validateUUID,
    validatePagination,
    validateSearch
} from '../middleware/validation-middleware';

const router = Router();

// Public FAQ routes (no authentication required)
router.get('/search', validateSearch, validatePagination, faqController.searchFAQs);
router.get('/popular', faqController.getPopularFAQs);
router.get('/suggestions', faqController.getFAQSuggestions);
router.get('/categories', faqController.getFAQCategories);
router.get('/categories/with-counts', faqController.getFAQCategoriesWithCounts);
router.get('/', validatePagination, optionalAuth, faqController.getFAQs);
router.get('/:faqId', validateUUID, optionalAuth, faqController.getFAQ);

// Authenticated routes
router.use(authenticateToken);

// FAQ rating (authenticated users only)
router.post('/:faqId/rate', validateUUID, faqController.rateFAQ);

// Admin and support routes for FAQ management
router.post('/',
    requireRole(['admin', 'support']),
    validateFAQ,
    faqController.createFAQ
);
router.put('/:faqId',
    requireRole(['admin', 'support']),
    validateUUID,
    faqController.updateFAQ
);
router.delete('/:faqId',
    requireRole(['admin', 'support']),
    validateUUID,
    faqController.deleteFAQ
);

// Admin-only routes
router.get('/analytics/overview',
    requireRole(['admin']),
    faqController.getFAQAnalytics
);

// FAQ Category management (admin only)
router.post('/categories',
    requireRole(['admin']),
    validateFAQCategory,
    faqController.createFAQCategory
);
router.put('/categories/:categoryId',
    requireRole(['admin']),
    validateUUID,
    faqController.updateFAQCategory
);
router.delete('/categories/:categoryId',
    requireRole(['admin']),
    validateUUID,
    faqController.deleteFAQCategory
);

export default router;