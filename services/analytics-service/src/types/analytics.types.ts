/**
 * Analytics event types and interfaces
 */

export interface AnalyticsEvent {
    id: string;
    userId?: string;
    sessionId: string;
    eventType: EventType;
    eventName: string;
    properties: Record<string, any>;
    timestamp: Date;
    source: EventSource;
    metadata: EventMetadata;
}

export enum EventType {
    PAGE_VIEW = 'page_view',
    USER_ACTION = 'user_action',
    TRANSACTION = 'transaction',
    SYSTEM_EVENT = 'system_event',
    CUSTOM = 'custom'
}

export enum EventSource {
    WEB = 'web',
    MOBILE = 'mobile',
    API = 'api',
    SYSTEM = 'system'
}

export interface EventMetadata {
    userAgent?: string;
    ipAddress?: string;
    referrer?: string;
    deviceType?: string;
    platform?: string;
    version?: string;
}

export interface TrackingRequest {
    eventName: string;
    properties?: Record<string, any>;
    userId?: string;
    sessionId?: string;
    source?: EventSource;
    metadata?: Partial<EventMetadata>;
}

export interface AnalyticsQuery {
    eventTypes?: EventType[];
    eventNames?: string[];
    userIds?: string[];
    dateFrom?: Date;
    dateTo?: Date;
    groupBy?: string[];
    aggregations?: AggregationType[];
    filters?: QueryFilter[];
    limit?: number;
    offset?: number;
}

export enum AggregationType {
    COUNT = 'count',
    SUM = 'sum',
    AVG = 'avg',
    MIN = 'min',
    MAX = 'max',
    UNIQUE = 'unique'
}

export interface QueryFilter {
    field: string;
    operator: FilterOperator;
    value: any;
}

export enum FilterOperator {
    EQUALS = 'eq',
    NOT_EQUALS = 'ne',
    GREATER_THAN = 'gt',
    LESS_THAN = 'lt',
    GREATER_EQUAL = 'gte',
    LESS_EQUAL = 'lte',
    IN = 'in',
    NOT_IN = 'nin',
    CONTAINS = 'contains',
    STARTS_WITH = 'starts_with'
}

export interface AnalyticsResult {
    data: any[];
    totalCount: number;
    aggregations?: Record<string, any>;
    executionTime: number;
}

export interface DashboardMetric {
    id: string;
    name: string;
    description?: string;
    value: number | string;
    change?: number;
    changeType?: 'increase' | 'decrease';
    unit?: string;
    format?: 'number' | 'percentage' | 'currency' | 'duration';
}

export interface DashboardWidget {
    id: string;
    type: WidgetType;
    title: string;
    description?: string;
    query: AnalyticsQuery;
    config: WidgetConfig;
    refreshInterval?: number;
}

export enum WidgetType {
    METRIC = 'metric',
    CHART = 'chart',
    TABLE = 'table',
    FUNNEL = 'funnel',
    HEATMAP = 'heatmap'
}

export interface WidgetConfig {
    chartType?: 'line' | 'bar' | 'pie' | 'area';
    xAxis?: string;
    yAxis?: string;
    groupBy?: string;
    colors?: string[];
    showLegend?: boolean;
    showGrid?: boolean;
    funnelSteps?: string[];
    [key: string]: any;
}

export interface Dashboard {
    id: string;
    name: string;
    description?: string;
    widgets: DashboardWidget[];
    filters?: QueryFilter[];
    refreshInterval?: number;
    isPublic?: boolean;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}