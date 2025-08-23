import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';

/**
 * Validation middleware to handle express-validator results
 */
export const handleValidationErrors = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        res.status(400).json({
            success: false,
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errors.array()
        });
        return;
    }

    next();
};

// Message validation rules
export const validateMessage = [
    body('content')
        .notEmpty()
        .withMessage('Message content is required')
        .isLength({ max: 5000 })
        .withMessage('Message content cannot exceed 5000 characters'),
    body('messageType')
        .optional()
        .isIn(['text', 'image', 'file', 'system'])
        .withMessage('Invalid message type'),
    body('conversationId')
        .isUUID()
        .withMessage('Valid conversation ID is required'),
    handleValidationErrors
];

// Conversation validation rules
export const validateConversation = [
    body('type')
        .isIn(['direct', 'support', 'group'])
        .withMessage('Invalid conversation type'),
    body('participants')
        .isArray({ min: 1 })
        .withMessage('At least one participant is required'),
    body('participants.*')
        .isUUID()
        .withMessage('All participants must have valid UUIDs'),
    body('title')
        .optional()
        .isLength({ max: 255 })
        .withMessage('Title cannot exceed 255 characters'),
    handleValidationErrors
];

// Ticket validation rules
export const validateTicket = [
    body('subject')
        .notEmpty()
        .withMessage('Subject is required')
        .isLength({ max: 500 })
        .withMessage('Subject cannot exceed 500 characters'),
    body('description')
        .notEmpty()
        .withMessage('Description is required')
        .isLength({ max: 5000 })
        .withMessage('Description cannot exceed 5000 characters'),
    body('category')
        .isIn([
            'technical_support',
            'billing',
            'account',
            'product_inquiry',
            'order_issue',
            'refund_request',
            'vendor_support',
            'general_inquiry',
            'bug_report',
            'feature_request'
        ])
        .withMessage('Invalid ticket category'),
    body('priority')
        .optional()
        .isIn(['low', 'medium', 'high', 'urgent'])
        .withMessage('Invalid priority level'),
    body('tags')
        .optional()
        .isArray()
        .withMessage('Tags must be an array'),
    body('tags.*')
        .optional()
        .isString()
        .withMessage('Each tag must be a string'),
    handleValidationErrors
];

// FAQ validation rules
export const validateFAQ = [
    body('question')
        .notEmpty()
        .withMessage('Question is required')
        .isLength({ max: 1000 })
        .withMessage('Question cannot exceed 1000 characters'),
    body('answer')
        .notEmpty()
        .withMessage('Answer is required')
        .isLength({ max: 5000 })
        .withMessage('Answer cannot exceed 5000 characters'),
    body('categoryId')
        .optional()
        .isUUID()
        .withMessage('Valid category ID is required'),
    body('tags')
        .optional()
        .isArray()
        .withMessage('Tags must be an array'),
    body('tags.*')
        .optional()
        .isString()
        .withMessage('Each tag must be a string'),
    body('isPublished')
        .optional()
        .isBoolean()
        .withMessage('isPublished must be a boolean'),
    handleValidationErrors
];

// FAQ Category validation rules
export const validateFAQCategory = [
    body('name')
        .notEmpty()
        .withMessage('Category name is required')
        .isLength({ max: 255 })
        .withMessage('Name cannot exceed 255 characters'),
    body('description')
        .optional()
        .isLength({ max: 1000 })
        .withMessage('Description cannot exceed 1000 characters'),
    body('icon')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Icon cannot exceed 100 characters'),
    body('sortOrder')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Sort order must be a non-negative integer'),
    handleValidationErrors
];

// Notification preferences validation rules
export const validateNotificationPreferences = [
    body('emailNotifications')
        .optional()
        .isBoolean()
        .withMessage('emailNotifications must be a boolean'),
    body('smsNotifications')
        .optional()
        .isBoolean()
        .withMessage('smsNotifications must be a boolean'),
    body('pushNotifications')
        .optional()
        .isBoolean()
        .withMessage('pushNotifications must be a boolean'),
    body('messageNotifications')
        .optional()
        .isBoolean()
        .withMessage('messageNotifications must be a boolean'),
    body('ticketNotifications')
        .optional()
        .isBoolean()
        .withMessage('ticketNotifications must be a boolean'),
    body('marketingEmails')
        .optional()
        .isBoolean()
        .withMessage('marketingEmails must be a boolean'),
    body('orderUpdates')
        .optional()
        .isBoolean()
        .withMessage('orderUpdates must be a boolean'),
    body('promotionalOffers')
        .optional()
        .isBoolean()
        .withMessage('promotionalOffers must be a boolean'),
    body('securityAlerts')
        .optional()
        .isBoolean()
        .withMessage('securityAlerts must be a boolean'),
    handleValidationErrors
];

// UUID parameter validation
export const validateUUID = [
    param('id')
        .isUUID()
        .withMessage('Valid UUID is required'),
    handleValidationErrors
];

// Pagination validation
export const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    query('sortBy')
        .optional()
        .isString()
        .withMessage('Sort by must be a string'),
    query('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Sort order must be asc or desc'),
    handleValidationErrors
];

// Search validation
export const validateSearch = [
    query('q')
        .notEmpty()
        .withMessage('Search query is required')
        .isLength({ min: 1, max: 255 })
        .withMessage('Search query must be between 1 and 255 characters'),
    query('category')
        .optional()
        .isString()
        .withMessage('Category must be a string'),
    handleValidationErrors
];