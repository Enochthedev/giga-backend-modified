/**
 * Analytics validation schemas
 */

import Joi from 'joi';

export const trackEventSchema = Joi.object({
    eventName: Joi.string().required().min(1).max(100),
    properties: Joi.object().optional(),
    userId: Joi.string().optional(),
    sessionId: Joi.string().optional(),
    source: Joi.string().valid('web', 'mobile', 'api', 'system').optional(),
    metadata: Joi.object({
        userAgent: Joi.string().optional(),
        ipAddress: Joi.string().optional(),
        referrer: Joi.string().optional(),
        deviceType: Joi.string().optional(),
        platform: Joi.string().optional(),
        version: Joi.string().optional()
    }).optional()
});

export const trackEventsSchema = Joi.object({
    events: Joi.array().items(trackEventSchema).required().min(1).max(1000)
});

export const queryAnalyticsSchema = Joi.object({
    eventTypes: Joi.array().items(
        Joi.string().valid('page_view', 'user_action', 'transaction', 'system_event', 'custom')
    ).optional(),
    eventNames: Joi.array().items(Joi.string()).optional(),
    userIds: Joi.array().items(Joi.string()).optional(),
    dateFrom: Joi.date().optional(),
    dateTo: Joi.date().optional(),
    groupBy: Joi.array().items(Joi.string()).optional(),
    aggregations: Joi.array().items(
        Joi.string().valid('count', 'sum', 'avg', 'min', 'max', 'unique')
    ).optional(),
    filters: Joi.array().items(
        Joi.object({
            field: Joi.string().required(),
            operator: Joi.string().valid(
                'eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'in', 'nin', 'contains', 'starts_with'
            ).required(),
            value: Joi.any().required()
        })
    ).optional(),
    limit: Joi.number().integer().min(1).max(10000).optional(),
    offset: Joi.number().integer().min(0).optional()
});