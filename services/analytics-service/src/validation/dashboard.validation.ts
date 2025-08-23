/**
 * Dashboard validation schemas
 */

import Joi from 'joi';

const widgetConfigSchema = Joi.object({
    chartType: Joi.string().valid('line', 'bar', 'pie', 'area').optional(),
    xAxis: Joi.string().optional(),
    yAxis: Joi.string().optional(),
    groupBy: Joi.string().optional(),
    colors: Joi.array().items(Joi.string()).optional(),
    showLegend: Joi.boolean().optional(),
    showGrid: Joi.boolean().optional(),
    funnelSteps: Joi.array().items(Joi.string()).optional()
});

const analyticsQuerySchema = Joi.object({
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

const widgetSchema = Joi.object({
    type: Joi.string().valid('metric', 'chart', 'table', 'funnel', 'heatmap').required(),
    title: Joi.string().required().min(1).max(100),
    description: Joi.string().optional().max(500),
    query: analyticsQuerySchema.required(),
    config: widgetConfigSchema.required(),
    refreshInterval: Joi.number().integer().min(1000).optional()
});

export const createDashboardSchema = Joi.object({
    name: Joi.string().required().min(1).max(100),
    description: Joi.string().optional().max(500),
    widgets: Joi.array().items(widgetSchema).required().min(1).max(20),
    createdBy: Joi.string().required()
});

export const updateDashboardSchema = Joi.object({
    name: Joi.string().optional().min(1).max(100),
    description: Joi.string().optional().max(500),
    widgets: Joi.array().items(widgetSchema).optional().min(1).max(20),
    refreshInterval: Joi.number().integer().min(1000).optional(),
    isPublic: Joi.boolean().optional()
});

export const executeWidgetQuerySchema = Joi.object({
    id: Joi.string().required(),
    type: Joi.string().valid('metric', 'chart', 'table', 'funnel', 'heatmap').required(),
    title: Joi.string().required(),
    description: Joi.string().optional(),
    query: analyticsQuerySchema.required(),
    config: widgetConfigSchema.required(),
    refreshInterval: Joi.number().integer().min(1000).optional()
});

export const conversionFunnelSchema = Joi.object({
    steps: Joi.array().items(Joi.string()).required().min(2).max(10)
});