/**
 * Feature flags and A/B testing types
 */

export interface FeatureFlag {
    id: string;
    name: string;
    key: string;
    description?: string;
    isEnabled: boolean;
    type: FlagType;
    value?: any;
    conditions?: FlagCondition[];
    rolloutPercentage?: number;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

export enum FlagType {
    BOOLEAN = 'boolean',
    STRING = 'string',
    NUMBER = 'number',
    JSON = 'json',
    AB_TEST = 'ab_test'
}

export interface FlagCondition {
    id: string;
    field: string;
    operator: ConditionOperator;
    value: any;
    logicalOperator?: LogicalOperator;
}

export enum ConditionOperator {
    EQUALS = 'equals',
    NOT_EQUALS = 'not_equals',
    GREATER_THAN = 'greater_than',
    LESS_THAN = 'less_than',
    CONTAINS = 'contains',
    IN = 'in',
    NOT_IN = 'not_in',
    REGEX = 'regex'
}

export enum LogicalOperator {
    AND = 'and',
    OR = 'or'
}

export interface ABTest {
    id: string;
    name: string;
    description?: string;
    hypothesis?: string;
    status: ABTestStatus;
    variants: ABTestVariant[];
    trafficAllocation: number;
    targetingRules?: TargetingRule[];
    metrics: ABTestMetric[];
    startDate?: Date;
    endDate?: Date;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

export enum ABTestStatus {
    DRAFT = 'draft',
    RUNNING = 'running',
    PAUSED = 'paused',
    COMPLETED = 'completed',
    ARCHIVED = 'archived'
}

export interface ABTestVariant {
    id: string;
    name: string;
    description?: string;
    allocation: number;
    config: Record<string, any>;
    isControl?: boolean;
}

export interface TargetingRule {
    id: string;
    field: string;
    operator: ConditionOperator;
    value: any;
    logicalOperator?: LogicalOperator;
}

export interface ABTestMetric {
    id: string;
    name: string;
    type: MetricType;
    eventName?: string;
    aggregation: AggregationType;
    isPrimary?: boolean;
}

export enum MetricType {
    CONVERSION = 'conversion',
    REVENUE = 'revenue',
    ENGAGEMENT = 'engagement',
    RETENTION = 'retention',
    CUSTOM = 'custom'
}

export enum AggregationType {
    COUNT = 'count',
    SUM = 'sum',
    AVERAGE = 'average',
    UNIQUE_COUNT = 'unique_count',
    RATE = 'rate'
}

export interface ABTestResult {
    testId: string;
    variant: ABTestVariant;
    metrics: ABTestMetricResult[];
    confidence: number;
    significance: number;
    sampleSize: number;
    conversionRate?: number;
    lift?: number;
}

export interface ABTestMetricResult {
    metricId: string;
    value: number;
    variance: number;
    confidenceInterval: [number, number];
    pValue?: number;
}

export interface FlagEvaluation {
    flagKey: string;
    value: any;
    variant?: string;
    reason: EvaluationReason;
    metadata?: Record<string, any>;
}

export enum EvaluationReason {
    FLAG_DISABLED = 'flag_disabled',
    CONDITION_MATCH = 'condition_match',
    ROLLOUT_MATCH = 'rollout_match',
    DEFAULT_VALUE = 'default_value',
    ERROR = 'error'
}

export interface UserContext {
    userId?: string;
    sessionId?: string;
    attributes: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
}