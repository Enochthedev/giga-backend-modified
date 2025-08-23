/**
 * Business Intelligence and reporting types
 */

export interface BusinessReport {
    id: string;
    name: string;
    description?: string;
    type: ReportType;
    category: ReportCategory;
    query: ReportQuery;
    schedule?: ReportSchedule;
    recipients?: string[];
    format: ReportFormat;
    isActive: boolean;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

export enum ReportType {
    REVENUE = 'revenue',
    PERFORMANCE = 'performance',
    USER_BEHAVIOR = 'user_behavior',
    CONVERSION = 'conversion',
    RETENTION = 'retention',
    CUSTOM = 'custom'
}

export enum ReportCategory {
    FINANCIAL = 'financial',
    OPERATIONAL = 'operational',
    MARKETING = 'marketing',
    PRODUCT = 'product',
    EXECUTIVE = 'executive'
}

export interface ReportQuery {
    dataSource: string;
    metrics: ReportMetric[];
    dimensions: string[];
    filters?: ReportFilter[];
    dateRange: DateRange;
    groupBy?: string[];
    orderBy?: OrderBy[];
    limit?: number;
}

export interface ReportMetric {
    name: string;
    field: string;
    aggregation: string;
    format?: MetricFormat;
    calculation?: string;
}

export enum MetricFormat {
    NUMBER = 'number',
    CURRENCY = 'currency',
    PERCENTAGE = 'percentage',
    DURATION = 'duration',
    BYTES = 'bytes'
}

export interface ReportFilter {
    field: string;
    operator: FilterOperator;
    value: any;
}

export enum FilterOperator {
    EQUALS = 'equals',
    NOT_EQUALS = 'not_equals',
    GREATER_THAN = 'greater_than',
    LESS_THAN = 'less_than',
    BETWEEN = 'between',
    IN = 'in',
    NOT_IN = 'not_in',
    IS_NULL = 'is_null',
    IS_NOT_NULL = 'is_not_null'
}

export interface DateRange {
    start: Date;
    end: Date;
    period?: TimePeriod;
}

export enum TimePeriod {
    HOUR = 'hour',
    DAY = 'day',
    WEEK = 'week',
    MONTH = 'month',
    QUARTER = 'quarter',
    YEAR = 'year'
}

export interface OrderBy {
    field: string;
    direction: 'asc' | 'desc';
}

export interface ReportSchedule {
    frequency: ScheduleFrequency;
    time?: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    timezone?: string;
}

export enum ScheduleFrequency {
    DAILY = 'daily',
    WEEKLY = 'weekly',
    MONTHLY = 'monthly',
    QUARTERLY = 'quarterly'
}

export enum ReportFormat {
    JSON = 'json',
    CSV = 'csv',
    PDF = 'pdf',
    EXCEL = 'excel'
}

export interface ReportExecution {
    id: string;
    reportId: string;
    status: ExecutionStatus;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    rowCount?: number;
    fileSize?: number;
    filePath?: string;
    error?: string;
}

export enum ExecutionStatus {
    PENDING = 'pending',
    RUNNING = 'running',
    COMPLETED = 'completed',
    FAILED = 'failed',
    CANCELLED = 'cancelled'
}

export interface KPI {
    id: string;
    name: string;
    description?: string;
    category: KPICategory;
    metric: ReportMetric;
    target?: number;
    threshold?: KPIThreshold;
    trend: TrendDirection;
    currentValue: number;
    previousValue?: number;
    change?: number;
    changePercentage?: number;
    lastUpdated: Date;
}

export enum KPICategory {
    REVENUE = 'revenue',
    GROWTH = 'growth',
    EFFICIENCY = 'efficiency',
    QUALITY = 'quality',
    CUSTOMER = 'customer'
}

export interface KPIThreshold {
    warning: number;
    critical: number;
}

export enum TrendDirection {
    UP = 'up',
    DOWN = 'down',
    STABLE = 'stable'
}

export interface RevenueMetrics {
    totalRevenue: number;
    revenueGrowth: number;
    averageOrderValue: number;
    monthlyRecurringRevenue?: number;
    customerLifetimeValue?: number;
    revenuePerUser: number;
    conversionRate: number;
    churnRate?: number;
}

export interface PerformanceMetrics {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    userGrowthRate: number;
    sessionDuration: number;
    pageViews: number;
    bounceRate: number;
    retentionRate: number;
}

export interface ConversionFunnel {
    id: string;
    name: string;
    steps: FunnelStep[];
    totalUsers: number;
    conversionRate: number;
    dropOffPoints: DropOffPoint[];
}

export interface FunnelStep {
    id: string;
    name: string;
    eventName: string;
    userCount: number;
    conversionRate: number;
    dropOffRate: number;
}

export interface DropOffPoint {
    stepId: string;
    dropOffCount: number;
    dropOffRate: number;
    reasons?: string[];
}