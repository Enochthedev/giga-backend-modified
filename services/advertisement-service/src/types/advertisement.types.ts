export interface Campaign {
    id: number;
    name: string;
    description?: string;
    advertiser_id: string;
    budget: number;
    daily_budget?: number;
    start_date: Date;
    end_date?: Date;
    status: CampaignStatus;
    objective: CampaignObjective;
    created_at: Date;
    updated_at: Date;
}

export interface CreateCampaignRequest {
    name: string;
    description?: string;
    budget: number;
    daily_budget?: number;
    start_date: string;
    end_date?: string;
    objective: CampaignObjective;
}

export interface UpdateCampaignRequest {
    name?: string;
    description?: string;
    budget?: number;
    daily_budget?: number;
    start_date?: string;
    end_date?: string;
    status?: CampaignStatus;
    objective?: CampaignObjective;
}

export interface AdGroup {
    id: number;
    campaign_id: number;
    name: string;
    bid_amount: number;
    status: AdGroupStatus;
    created_at: Date;
    updated_at: Date;
}

export interface CreateAdGroupRequest {
    campaign_id: number;
    name: string;
    bid_amount: number;
}

export interface Advertisement {
    id: number;
    ad_group_id: number;
    title: string;
    description?: string;
    image_url?: string;
    video_url?: string;
    call_to_action?: string;
    landing_url: string;
    ad_type: AdType;
    status: AdStatus;
    created_at: Date;
    updated_at: Date;
}

export interface CreateAdvertisementRequest {
    ad_group_id: number;
    title: string;
    description?: string;
    image_url?: string;
    video_url?: string;
    call_to_action?: string;
    landing_url: string;
    ad_type: AdType;
}

export interface TargetingCriteria {
    id: number;
    ad_group_id: number;
    criteria_type: TargetingType;
    criteria_value: string;
    operator: TargetingOperator;
    created_at: Date;
}

export interface CreateTargetingRequest {
    ad_group_id: number;
    criteria_type: TargetingType;
    criteria_value: string;
    operator?: TargetingOperator;
}

export interface AdEvent {
    id: number;
    advertisement_id: number;
    event_type: EventType;
    user_id?: string;
    session_id?: string;
    ip_address?: string;
    user_agent?: string;
    referrer?: string;
    timestamp: Date;
    cost: number;
}

export interface CampaignSpending {
    id: number;
    campaign_id: number;
    date: Date;
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
    created_at: Date;
}

export interface AdTransaction {
    id: number;
    campaign_id: number;
    advertiser_id: string;
    amount: number;
    transaction_type: TransactionType;
    payment_method?: string;
    payment_reference?: string;
    status: TransactionStatus;
    created_at: Date;
    updated_at: Date;
}

export interface Advertiser {
    id: string;
    company_name?: string;
    contact_email: string;
    contact_phone?: string;
    billing_address?: string;
    account_balance: number;
    status: AdvertiserStatus;
    created_at: Date;
    updated_at: Date;
}

export interface CreateAdvertiserRequest {
    id: string;
    company_name?: string;
    contact_email: string;
    contact_phone?: string;
    billing_address?: string;
}

export interface AdAnalytics {
    campaign_id: number;
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
    ctr: number; // Click-through rate
    cpc: number; // Cost per click
    cpm: number; // Cost per mille (thousand impressions)
    conversion_rate: number;
    cost_per_conversion: number;
}

export interface AdServeRequest {
    user_id?: string;
    session_id?: string;
    placement?: string;
    user_agent?: string;
    ip_address?: string;
    targeting_context?: {
        age?: number;
        gender?: string;
        location?: string;
        interests?: string[];
        device?: string;
        platform?: string;
    };
}

export interface AdServeResponse {
    advertisement: Advertisement;
    tracking_id: string;
    impression_url: string;
    click_url: string;
}

// Enums
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
export type CampaignObjective = 'awareness' | 'traffic' | 'conversions' | 'engagement';
export type AdGroupStatus = 'active' | 'paused';
export type AdType = 'banner' | 'video' | 'native' | 'popup';
export type AdStatus = 'active' | 'paused' | 'rejected';
export type TargetingType = 'age' | 'gender' | 'location' | 'interests' | 'device' | 'platform';
export type TargetingOperator = 'equals' | 'contains' | 'in' | 'between';
export type EventType = 'impression' | 'click' | 'conversion';
export type TransactionType = 'charge' | 'refund' | 'credit';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';
export type AdvertiserStatus = 'active' | 'suspended' | 'pending_approval';

// API Response types
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface AnalyticsDateRange {
    start_date: string;
    end_date: string;
}

export interface CampaignAnalyticsRequest extends AnalyticsDateRange {
    campaign_id?: number;
    advertiser_id?: string;
    group_by?: 'day' | 'week' | 'month';
}