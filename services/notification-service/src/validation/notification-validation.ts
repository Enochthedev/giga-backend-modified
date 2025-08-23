import Joi from 'joi';

export const sendNotificationSchema = Joi.object({
    userId: Joi.string().required().min(1).max(255),
    type: Joi.string().valid('email', 'sms', 'push').required(),
    recipient: Joi.string().required().min(1).max(255),
    subject: Joi.string().optional().max(500),
    content: Joi.string().optional().max(10000),
    templateName: Joi.string().optional().max(255),
    templateVariables: Joi.object().optional(),
    scheduledAt: Joi.date().optional().min('now'),
    metadata: Joi.object().optional()
}).custom((value, helpers) => {
    // Either content or templateName must be provided
    if (!value.content && !value.templateName) {
        return helpers.error('any.custom', {
            message: 'Either content or templateName must be provided'
        });
    }

    // Email type requires subject
    if (value.type === 'email' && !value.subject && !value.templateName) {
        return helpers.error('any.custom', {
            message: 'Email notifications require a subject or template'
        });
    }

    // Validate recipient format based on type
    if (value.type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value.recipient)) {
            return helpers.error('any.custom', {
                message: 'Invalid email format for recipient'
            });
        }
    }

    if (value.type === 'sms') {
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        if (!phoneRegex.test(value.recipient.replace(/\s/g, ''))) {
            return helpers.error('any.custom', {
                message: 'Invalid phone number format for recipient'
            });
        }
    }

    return value;
});

export const bulkNotificationSchema = Joi.object({
    notifications: Joi.array().items(sendNotificationSchema).min(1).max(100).required()
});

export const updatePreferencesSchema = Joi.object({
    emailEnabled: Joi.boolean().optional(),
    smsEnabled: Joi.boolean().optional(),
    pushEnabled: Joi.boolean().optional(),
    marketingEmails: Joi.boolean().optional(),
    orderUpdates: Joi.boolean().optional(),
    securityAlerts: Joi.boolean().optional()
});

export const createTemplateSchema = Joi.object({
    name: Joi.string().required().min(1).max(255).pattern(/^[a-z0-9_]+$/),
    type: Joi.string().valid('email', 'sms', 'push').required(),
    subjectTemplate: Joi.string().optional().max(500),
    contentTemplate: Joi.string().required().max(10000),
    variables: Joi.array().items(Joi.string()).optional(),
    isActive: Joi.boolean().optional().default(true)
}).custom((value, helpers) => {
    // Email templates should have subject template
    if (value.type === 'email' && !value.subjectTemplate) {
        return helpers.error('any.custom', {
            message: 'Email templates require a subject template'
        });
    }

    return value;
});

export const updateTemplateSchema = Joi.object({
    subjectTemplate: Joi.string().optional().max(500),
    contentTemplate: Joi.string().optional().max(10000),
    variables: Joi.array().items(Joi.string()).optional(),
    isActive: Joi.boolean().optional()
});

export const paginationSchema = Joi.object({
    limit: Joi.number().integer().min(1).max(100).optional().default(50),
    offset: Joi.number().integer().min(0).optional().default(0)
});

export const notificationIdSchema = Joi.object({
    id: Joi.string().uuid().required()
});

export const userIdSchema = Joi.object({
    userId: Joi.string().required().min(1).max(255)
});