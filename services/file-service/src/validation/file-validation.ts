import Joi from 'joi';

export const uploadFileSchema = Joi.object({
    category: Joi.string().valid('image', 'video', 'document', 'other').optional(),
    tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
    isPublic: Joi.boolean().optional().default(false)
});

export const searchFilesSchema = Joi.object({
    category: Joi.string().valid('image', 'video', 'document', 'other').optional(),
    mimeType: Joi.string().optional(),
    uploadedBy: Joi.string().uuid().optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    dateFrom: Joi.date().iso().optional(),
    dateTo: Joi.date().iso().optional(),
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0)
});

export const processImageSchema = Joi.object({
    resize: Joi.object({
        width: Joi.number().integer().min(1).max(4000).optional(),
        height: Joi.number().integer().min(1).max(4000).optional(),
        fit: Joi.string().valid('cover', 'contain', 'fill', 'inside', 'outside').default('cover')
    }).optional(),
    quality: Joi.number().integer().min(1).max(100).default(80),
    format: Joi.string().valid('jpeg', 'png', 'webp').default('jpeg'),
    watermark: Joi.object({
        text: Joi.string().max(100).optional(),
        image: Joi.string().base64().optional(),
        position: Joi.string().valid('top-left', 'top-right', 'bottom-left', 'bottom-right', 'center').default('bottom-right')
    }).optional()
});

export const getSignedUrlSchema = Joi.object({
    expiresIn: Joi.number().integer().min(60).max(86400).default(3600) // 1 minute to 24 hours
});

export const validateRequest = (schema: Joi.ObjectSchema) => {
    return (req: any, res: any, next: any) => {
        const { error, value } = schema.validate(req.body);

        if (error) {
            return res.status(400).json({
                error: 'Validation error',
                code: 'VALIDATION_ERROR',
                details: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message
                }))
            });
        }

        req.validatedBody = value;
        next();
    };
};

export const validateQuery = (schema: Joi.ObjectSchema) => {
    return (req: any, res: any, next: any) => {
        const { error, value } = schema.validate(req.query);

        if (error) {
            return res.status(400).json({
                error: 'Validation error',
                code: 'VALIDATION_ERROR',
                details: error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message
                }))
            });
        }

        req.validatedQuery = value;
        next();
    };
};