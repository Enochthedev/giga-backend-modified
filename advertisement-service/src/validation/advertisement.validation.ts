import Joi from 'joi';

export const createCampaignSchema = Joi.object({
    name: Joi.string().min(1).max(255).required(),
    description: Joi.string().max(1000).optional(),
    budget: Joi.number().positive().required(),
    daily_budget: Joi.number().positive().optional(),
    start_date: Joi.date().iso().required(),
    end_date: Joi.date().iso().greater(Joi.ref('start_date')).optional(),
    objective: Joi.string().valid('awareness', 'traffic', 'conversions', 'engagement').required()
});

export const updateCampaignSchema = Joi.object({
    name: Joi.string().min(1).max(255).optional(),
    description: Joi.string().max(1000).optional(),
    budget: Joi.number().positive().optional(),
    daily_budget: Joi.number().positive().optional(),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().optional(),
    status: Joi.string().valid('draft', 'active', 'paused', 'completed', 'cancelled').optional(),
    objective: Joi.string().valid('awareness', 'traffic', 'conversions', 'engagement').optional()
});

export const createAdGroupSchema = Joi.object({
    campaign_id: Joi.number().integer().positive().required(),
    name: Joi.string().min(1).max(255).required(),
    bid_amount: Joi.number().positive().required()
});

export const updateAdGroupSchema = Joi.object({
    name: Joi.string().min(1).max(255).optional(),
    bid_amount: Joi.number().positive().optional(),
    status: Joi.string().valid('active', 'paused').optional()
});

export const createAdvertisementSchema = Joi.object({
    ad_group_id: Joi.number().integer().positive().required(),
    title: Joi.string().min(1).max(255).required(),
    description: Joi.string().max(1000).optional(),
    image_url: Joi.string().uri().optional(),
    video_url: Joi.string().uri().optional(),
    call_to_action: Joi.string().max(100).optional(),
    landing_url: Joi.string().uri().required(),
    ad_type: Joi.string().valid('banner', 'video', 'native', 'popup').required()
});

export const updateAdvertisementSchema = Joi.object({
    title: Joi.string().min(1).max(255).optional(),
    description: Joi.string().max(1000).optional(),
    image_url: Joi.string().uri().optional(),
    video_url: Joi.string().uri().optional(),
    call_to_action: Joi.string().max(100).optional(),
    landing_url: Joi.string().uri().optional(),
    ad_type: Joi.string().valid('banner', 'video', 'native', 'popup').optional(),
    status: Joi.string().valid('active', 'paused', 'rejected').optional()
});

export const createTargetingSchema = Joi.object({
    ad_group_id: Joi.number().integer().positive().required(),
    criteria_type: Joi.string().valid('age', 'gender', 'location', 'interests', 'device', 'platform').required(),
    criteria_value: Joi.string().min(1).max(255).required(),
    operator: Joi.string().valid('equals', 'contains', 'in', 'between').default('equals')
});

export const createAdvertiserSchema = Joi.object({
    id: Joi.string().min(1).max(255).required(),
    company_name: Joi.string().max(255).optional(),
    contact_email: Joi.string().email().required(),
    contact_phone: Joi.string().max(50).optional(),
    billing_address: Joi.string().max(500).optional()
});

export const updateAdvertiserSchema = Joi.object({
    company_name: Joi.string().max(255).optional(),
    contact_email: Joi.string().email().optional(),
    contact_phone: Joi.string().max(50).optional(),
    billing_address: Joi.string().max(500).optional(),
    status: Joi.string().valid('active', 'suspended', 'pending_approval').optional()
});

export const adServeRequestSchema = Joi.object({
    user_id: Joi.string().optional(),
    session_id: Joi.string().optional(),
    placement: Joi.string().optional(),
    user_agent: Joi.string().optional(),
    ip_address: Joi.string().ip().optional(),
    targeting_context: Joi.object({
        age: Joi.number().integer().min(13).max(120).optional(),
        gender: Joi.string().valid('male', 'female', 'other').optional(),
        location: Joi.string().optional(),
        interests: Joi.array().items(Joi.string()).optional(),
        device: Joi.string().optional(),
        platform: Joi.string().optional()
    }).optional()
});

export const analyticsRequestSchema = Joi.object({
    start_date: Joi.date().iso().required(),
    end_date: Joi.date().iso().greater(Joi.ref('start_date')).required(),
    campaign_id: Joi.number().integer().positive().optional(),
    advertiser_id: Joi.string().optional(),
    group_by: Joi.string().valid('day', 'week', 'month').default('day')
});

export const paginationSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
});

export const transactionSchema = Joi.object({
    campaign_id: Joi.number().integer().positive().required(),
    amount: Joi.number().positive().required(),
    transaction_type: Joi.string().valid('charge', 'refund', 'credit').required(),
    payment_method: Joi.string().optional(),
    payment_reference: Joi.string().optional()
});