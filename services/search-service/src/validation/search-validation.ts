import Joi from 'joi';

/**
 * Search request validation schema
 */
export const searchValidation = {
    body: Joi.object({
        query: Joi.string().max(500).optional(),
        filters: Joi.object({
            type: Joi.array().items(Joi.string().valid('product', 'hotel')).optional(),
            category: Joi.array().items(Joi.string().max(100)).optional(),
            priceRange: Joi.object({
                min: Joi.number().min(0).optional(),
                max: Joi.number().min(0).optional()
            }).optional(),
            location: Joi.object({
                center: Joi.object({
                    lat: Joi.number().min(-90).max(90).required(),
                    lon: Joi.number().min(-180).max(180).required()
                }).required(),
                radius: Joi.string().pattern(/^\d+(\.\d+)?(km|mi)$/).required()
            }).optional(),
            rating: Joi.object({
                min: Joi.number().min(0).max(5).optional(),
                max: Joi.number().min(0).max(5).optional()
            }).optional(),
            availability: Joi.boolean().optional(),
            tags: Joi.array().items(Joi.string().max(50)).optional(),
            attributes: Joi.object().optional()
        }).optional(),
        sort: Joi.object({
            field: Joi.string().valid('price', 'rating', 'createdAt', 'title', '_score').required(),
            order: Joi.string().valid('asc', 'desc').required()
        }).optional(),
        page: Joi.number().integer().min(1).max(1000).optional(),
        size: Joi.number().integer().min(1).max(100).optional(),
        facets: Joi.array().items(
            Joi.string().valid('category', 'type', 'price', 'rating', 'tags')
        ).optional()
    })
};

/**
 * Autocomplete request validation schema
 */
export const autocompleteValidation = {
    query: Joi.object({
        q: Joi.string().min(2).max(100).required(),
        type: Joi.string().valid('product', 'hotel').optional(),
        limit: Joi.number().integer().min(1).max(20).optional()
    })
};

/**
 * Recommendation request validation schema
 */
export const recommendationValidation = {
    body: Joi.object({
        userId: Joi.string().max(100).optional(),
        itemId: Joi.string().max(100).optional(),
        type: Joi.string().valid('product', 'hotel').optional(),
        limit: Joi.number().integer().min(1).max(50).optional(),
        algorithm: Joi.string().valid('collaborative', 'content', 'hybrid').optional()
    }).or('userId', 'itemId') // At least one of userId or itemId is required
};

/**
 * User interaction validation schema
 */
export const interactionValidation = {
    body: Joi.object({
        userId: Joi.string().max(100).optional(), // Can come from header
        itemId: Joi.string().max(100).required(),
        itemType: Joi.string().valid('product', 'hotel').required(),
        interactionType: Joi.string().valid('view', 'click', 'purchase', 'like', 'share').required(),
        timestamp: Joi.date().iso().optional(),
        metadata: Joi.object().optional()
    })
};

/**
 * Document indexing validation schema
 */
export const indexingValidation = {
    body: Joi.object({
        documents: Joi.array().items(
            Joi.object({
                id: Joi.string().required(),
                type: Joi.string().valid('product', 'hotel').required(),
                title: Joi.string().max(200).required(),
                description: Joi.string().max(2000).required(),
                category: Joi.string().max(100).required(),
                tags: Joi.array().items(Joi.string().max(50)).optional(),
                price: Joi.number().min(0).optional(),
                currency: Joi.string().length(3).optional(),
                location: Joi.object({
                    lat: Joi.number().min(-90).max(90).required(),
                    lon: Joi.number().min(-180).max(180).required(),
                    city: Joi.string().max(100).optional(),
                    country: Joi.string().max(100).optional()
                }).optional(),
                rating: Joi.number().min(0).max(5).optional(),
                reviewCount: Joi.number().integer().min(0).optional(),
                availability: Joi.boolean().optional(),
                createdAt: Joi.date().iso().optional(),
                updatedAt: Joi.date().iso().optional(),
                metadata: Joi.object().optional()
            }).unknown(true) // Allow additional fields for specific document types
        ).min(1).max(1000).required(),
        index: Joi.string().valid('products', 'hotels').required(),
        operation: Joi.string().valid('index', 'update', 'delete').optional()
    })
};