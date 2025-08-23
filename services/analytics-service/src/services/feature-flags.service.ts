/**
 * Feature flags and A/B testing service
 */

import { v4 as uuidv4 } from 'uuid';
import { redisConnection } from '../database/redis-connection';
import { clickHouseConnection } from '../database/clickhouse-connection';
import { logger } from '../utils/logger';
import {
    FeatureFlag,
    ABTest,
    ABTestVariant,
    FlagEvaluation,
    UserContext,
    FlagType,
    ABTestStatus,
    EvaluationReason,
    ABTestResult,
    ABTestMetricResult
} from '../types/feature-flags.types';

export class FeatureFlagsService {
    private cacheTTL: number;
    private abTestCacheTTL: number;

    constructor() {
        this.cacheTTL = parseInt(process.env.FEATURE_FLAGS_CACHE_TTL || '300');
        this.abTestCacheTTL = parseInt(process.env.AB_TEST_CACHE_TTL || '600');
    }

    /**
     * Evaluate a feature flag for a user
     */
    public async evaluateFlag(
        flagKey: string,
        userContext: UserContext,
        defaultValue?: any
    ): Promise<FlagEvaluation> {
        try {
            // Get flag from cache or database
            const flag = await this.getFeatureFlag(flagKey);

            if (!flag) {
                return {
                    flagKey,
                    value: defaultValue,
                    reason: EvaluationReason.FLAG_DISABLED
                };
            }

            if (!flag.isEnabled) {
                return {
                    flagKey,
                    value: defaultValue,
                    reason: EvaluationReason.FLAG_DISABLED
                };
            }

            // Check conditions
            if (flag.conditions && flag.conditions.length > 0) {
                const conditionsMet = this.evaluateConditions(flag.conditions, userContext);
                if (!conditionsMet) {
                    return {
                        flagKey,
                        value: defaultValue,
                        reason: EvaluationReason.DEFAULT_VALUE
                    };
                }
            }

            // Check rollout percentage
            if (flag.rolloutPercentage && flag.rolloutPercentage < 100) {
                const userHash = this.hashUser(userContext.userId || userContext.sessionId || '');
                const userPercentile = userHash % 100;

                if (userPercentile >= flag.rolloutPercentage) {
                    return {
                        flagKey,
                        value: defaultValue,
                        reason: EvaluationReason.DEFAULT_VALUE
                    };
                }
            }

            // Handle A/B test flags
            if (flag.type === FlagType.AB_TEST) {
                const abTestResult = await this.evaluateABTest(flagKey, userContext);
                if (abTestResult) {
                    return abTestResult;
                }
            }

            return {
                flagKey,
                value: flag.value || true,
                reason: EvaluationReason.CONDITION_MATCH
            };
        } catch (error) {
            logger.error(`Error evaluating flag ${flagKey}:`, error);
            return {
                flagKey,
                value: defaultValue,
                reason: EvaluationReason.ERROR
            };
        }
    }

    /**
     * Evaluate multiple flags at once
     */
    public async evaluateFlags(
        flagKeys: string[],
        userContext: UserContext,
        defaultValues?: Record<string, any>
    ): Promise<Record<string, FlagEvaluation>> {
        const results: Record<string, FlagEvaluation> = {};

        await Promise.all(
            flagKeys.map(async (flagKey) => {
                const defaultValue = defaultValues?.[flagKey];
                results[flagKey] = await this.evaluateFlag(flagKey, userContext, defaultValue);
            })
        );

        return results;
    }

    /**
     * Create a new feature flag
     */
    public async createFeatureFlag(flag: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt'>): Promise<FeatureFlag> {
        try {
            const newFlag: FeatureFlag = {
                ...flag,
                id: uuidv4(),
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Store in cache
            const cacheKey = `flag:${flag.key}`;
            await redisConnection.setJSON(cacheKey, newFlag, this.cacheTTL);

            logger.info(`Feature flag created: ${flag.key}`);
            return newFlag;
        } catch (error) {
            logger.error('Error creating feature flag:', error);
            throw error;
        }
    }

    /**
     * Update a feature flag
     */
    public async updateFeatureFlag(flagKey: string, updates: Partial<FeatureFlag>): Promise<FeatureFlag | null> {
        try {
            const flag = await this.getFeatureFlag(flagKey);
            if (!flag) return null;

            const updatedFlag: FeatureFlag = {
                ...flag,
                ...updates,
                updatedAt: new Date()
            };

            // Update cache
            const cacheKey = `flag:${flagKey}`;
            await redisConnection.setJSON(cacheKey, updatedFlag, this.cacheTTL);

            logger.info(`Feature flag updated: ${flagKey}`);
            return updatedFlag;
        } catch (error) {
            logger.error(`Error updating feature flag ${flagKey}:`, error);
            throw error;
        }
    }

    /**
     * Create A/B test
     */
    public async createABTest(test: Omit<ABTest, 'id' | 'createdAt' | 'updatedAt'>): Promise<ABTest> {
        try {
            const newTest: ABTest = {
                ...test,
                id: uuidv4(),
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Validate variant allocations sum to 100
            const totalAllocation = test.variants.reduce((sum, variant) => sum + variant.allocation, 0);
            if (Math.abs(totalAllocation - 100) > 0.01) {
                throw new Error('Variant allocations must sum to 100%');
            }

            // Store in cache
            const cacheKey = `ab_test:${test.name}`;
            await redisConnection.setJSON(cacheKey, newTest, this.abTestCacheTTL);

            logger.info(`A/B test created: ${test.name}`);
            return newTest;
        } catch (error) {
            logger.error('Error creating A/B test:', error);
            throw error;
        }
    }

    /**
     * Get A/B test results
     */
    public async getABTestResults(testId: string): Promise<ABTestResult[]> {
        try {
            const test = await this.getABTest(testId);
            if (!test) {
                throw new Error(`A/B test not found: ${testId}`);
            }

            const client = clickHouseConnection.getClient();
            const results: ABTestResult[] = [];

            for (const variant of test.variants) {
                // Get conversion metrics for this variant
                const conversionQuery = `
          SELECT 
            count() as total_users,
            countIf(event_name = 'conversion') as conversions,
            conversions / total_users as conversion_rate
          FROM ab_test_events
          WHERE test_id = '${testId}' 
          AND variant_id = '${variant.id}'
          AND timestamp >= '${test.startDate?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()}'
        `;

                const result = await client.query({ query: conversionQuery });
                const data = await result.json();
                const metrics = data.data[0];

                const metricResults: ABTestMetricResult[] = test.metrics.map(metric => ({
                    metricId: metric.id,
                    value: metrics?.conversion_rate || 0,
                    variance: 0, // Calculate actual variance
                    confidenceInterval: [0, 0], // Calculate actual CI
                    pValue: 0 // Calculate actual p-value
                }));

                results.push({
                    testId,
                    variant,
                    metrics: metricResults,
                    confidence: 95, // Calculate actual confidence
                    significance: 0.05, // Calculate actual significance
                    sampleSize: metrics?.total_users || 0,
                    conversionRate: metrics?.conversion_rate || 0,
                    lift: 0 // Calculate lift vs control
                });
            }

            return results;
        } catch (error) {
            logger.error(`Error getting A/B test results for ${testId}:`, error);
            throw error;
        }
    }

    /**
     * Track A/B test event
     */
    public async trackABTestEvent(
        testId: string,
        variantId: string,
        eventName: string,
        userContext: UserContext,
        properties?: Record<string, any>
    ): Promise<void> {
        try {
            const client = clickHouseConnection.getClient();

            await client.insert({
                table: 'ab_test_events',
                values: [{
                    id: uuidv4(),
                    test_id: testId,
                    variant_id: variantId,
                    user_id: userContext.userId,
                    session_id: userContext.sessionId,
                    event_type: 'ab_test',
                    event_name: eventName,
                    properties: JSON.stringify(properties || {}),
                    timestamp: new Date().toISOString()
                }],
                format: 'JSONEachRow'
            });

            logger.debug(`A/B test event tracked: ${eventName} for test ${testId}, variant ${variantId}`);
        } catch (error) {
            logger.error('Error tracking A/B test event:', error);
            throw error;
        }
    }

    /**
     * Get feature flag from cache or storage
     */
    private async getFeatureFlag(flagKey: string): Promise<FeatureFlag | null> {
        try {
            const cacheKey = `flag:${flagKey}`;
            const cached = await redisConnection.getJSON<FeatureFlag>(cacheKey);

            if (cached) {
                return cached;
            }

            // In a real implementation, this would fetch from a database
            // For now, return null if not in cache
            return null;
        } catch (error) {
            logger.error(`Error getting feature flag ${flagKey}:`, error);
            return null;
        }
    }

    /**
     * Get A/B test from cache or storage
     */
    private async getABTest(testId: string): Promise<ABTest | null> {
        try {
            const cacheKey = `ab_test:${testId}`;
            const cached = await redisConnection.getJSON<ABTest>(cacheKey);

            if (cached) {
                return cached;
            }

            // In a real implementation, this would fetch from a database
            return null;
        } catch (error) {
            logger.error(`Error getting A/B test ${testId}:`, error);
            return null;
        }
    }

    /**
     * Evaluate A/B test for user
     */
    private async evaluateABTest(flagKey: string, userContext: UserContext): Promise<FlagEvaluation | null> {
        try {
            // Find active A/B test for this flag
            const test = await this.getABTest(flagKey);

            if (!test || test.status !== ABTestStatus.RUNNING) {
                return null;
            }

            // Check if user is in target audience
            if (test.targetingRules && test.targetingRules.length > 0) {
                const targetingMet = this.evaluateConditions(test.targetingRules, userContext);
                if (!targetingMet) {
                    return null;
                }
            }

            // Assign user to variant
            const variant = this.assignUserToVariant(test.variants, userContext);

            if (variant) {
                // Track assignment
                await this.trackABTestEvent(
                    test.id,
                    variant.id,
                    'variant_assigned',
                    userContext,
                    { variant_name: variant.name }
                );

                return {
                    flagKey,
                    value: variant.config,
                    variant: variant.name,
                    reason: EvaluationReason.CONDITION_MATCH,
                    metadata: {
                        testId: test.id,
                        variantId: variant.id,
                        isControl: variant.isControl
                    }
                };
            }

            return null;
        } catch (error) {
            logger.error(`Error evaluating A/B test for flag ${flagKey}:`, error);
            return null;
        }
    }

    /**
     * Assign user to A/B test variant
     */
    private assignUserToVariant(variants: ABTestVariant[], userContext: UserContext): ABTestVariant | null {
        const userId = userContext.userId || userContext.sessionId || '';
        const userHash = this.hashUser(userId);
        const userPercentile = userHash % 100;

        let cumulativeAllocation = 0;
        for (const variant of variants) {
            cumulativeAllocation += variant.allocation;
            if (userPercentile < cumulativeAllocation) {
                return variant;
            }
        }

        return null;
    }

    /**
     * Evaluate conditions against user context
     */
    private evaluateConditions(conditions: any[], userContext: UserContext): boolean {
        // Simple condition evaluation - in production, this would be more sophisticated
        return conditions.every(condition => {
            const userValue = userContext.attributes[condition.field];

            switch (condition.operator) {
                case 'equals':
                    return userValue === condition.value;
                case 'not_equals':
                    return userValue !== condition.value;
                case 'in':
                    return Array.isArray(condition.value) && condition.value.includes(userValue);
                case 'contains':
                    return typeof userValue === 'string' && userValue.includes(condition.value);
                default:
                    return false;
            }
        });
    }

    /**
     * Hash user ID for consistent assignment
     */
    private hashUser(userId: string): number {
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            const char = userId.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }
}

export const featureFlagsService = new FeatureFlagsService();