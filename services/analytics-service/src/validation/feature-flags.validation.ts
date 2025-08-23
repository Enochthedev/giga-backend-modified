/**
 * Feature flags validation schemas
 */

import Joi from 'joi';

export const evaluateFlagSchema = Joi.object({
    userId: Joi.string().optional(),
    sessionId: Joi.string().optional(),
    attributes: Joi.object().optional()
});

export const evaluateFlagsSchema = Joi.object({
    flagKeys: Joi.array().items(Joi.string()).required().min(1),
    userId: Joi.string().optional(),
    sessionId: Joi.string().optional(),
    attributes: Joi.object().optional(),
    defaultValues: Joi.object().optional()
});

export const createFeatureFlagSchema = Joi.object({
    name: Joi.string().required().min(1).max(100),
    key: Joi.string().required().min(1).max(50).pattern(/^[a-zA-Z0-9_-]+$/),
    description: Joi.string().optional().max(500),
    isEnabled: Joi.boolean().optional().default(true),
    type: Joi.string().valid('boolean', 'string', 'number', 'json', 'ab_test').required(),
    value: Joi.any().optional(),
    conditions: Joi.array().items(
        Joi.object({
            id: Joi.string().required(),
            field: Joi.string().required(),
            operator: Joi.string().valid(
                'equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'in', 'not_in', 'regex'
            ).required(),
            value: Joi.any().required(),
            logicalOperator: Joi.string().valid('and', 'or').optional()
        })
    ).optional(),
    rolloutPercentage: Joi.number().min(0).max(100).optional(),
    createdBy: Joi.string().required()
});

export const updateFeatureFlagSchema = Joi.object({
    name: Joi.string().optional().min(1).max(100),
    description: Joi.string().optional().max(500),
    isEnabled: Joi.boolean().optional(),
    value: Joi.any().optional(),
    conditions: Joi.array().items(
        Joi.object({
            id: Joi.string().required(),
            field: Joi.string().required(),
            operator: Joi.string().valid(
                'equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'in', 'not_in', 'regex'
            ).required(),
            value: Joi.any().required(),
            logicalOperator: Joi.string().valid('and', 'or').optional()
        })
    ).optional(),
    rolloutPercentage: Joi.number().min(0).max(100).optional()
});

export const createABTestSchema = Joi.object({
    name: Joi.string().required().min(1).max(100),
    description: Joi.string().optional().max(500),
    hypothesis: Joi.string().optional().max(1000),
    status: Joi.string().valid('draft', 'running', 'paused', 'completed', 'archived').required(),
    variants: Joi.array().items(
        Joi.object({
            id: Joi.string().required(),
            name: Joi.string().required(),
            description: Joi.string().optional(),
            allocation: Joi.number().min(0).max(100).required(),
            config: Joi.object().required(),
            isControl: Joi.boolean().optional()
        })
    ).required().min(2),
    trafficAllocation: Joi.number().min(0).max(100).optional().default(100),
    targetingRules: Joi.array().items(
        Joi.object({
            id: Joi.string().required(),
            field: Joi.string().required(),
            operator: Joi.string().valid(
                'equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'in', 'not_in', 'regex'
            ).required(),
            value: Joi.any().required(),
            logicalOperator: Joi.string().valid('and', 'or').optional()
        })
    ).optional(),
    metrics: Joi.array().items(
        Joi.object({
            id: Joi.string().required(),
            name: Joi.string().required(),
            type: Joi.string().valid('conversion', 'revenue', 'engagement', 'retention', 'custom').required(),
            eventName: Joi.string().optional(),
            aggregation: Joi.string().valid('count', 'sum', 'average', 'unique_count', 'rate').required(),
            isPrimary: Joi.boolean().optional()
        })
    ).required().min(1),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    createdBy: Joi.string().required()
}).custom((value, helpers) => {
    // Validate that variant allocations sum to 100
    const totalAllocation = value.variants.reduce((sum: number, variant: any) => sum + variant.allocation, 0);
    if (Math.abs(totalAllocation - 100) > 0.01) {
        return helpers.error('any.custom', { message: 'Variant allocations must sum to 100%' });
    }
    return value;
});

export const trackABTestEventSchema = Joi.object({
    testId: Joi.string().required(),
    variantId: Joi.string().required(),
    eventName: Joi.string().required(),
    userId: Joi.string().optional(),
    sessionId: Joi.string().optional(),
    attributes: Joi.object().optional(),
    properties: Joi.object().optional()
});