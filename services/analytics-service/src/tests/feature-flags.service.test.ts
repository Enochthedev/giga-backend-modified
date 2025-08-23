/**
 * Feature flags service tests
 */

import { featureFlagsService } from '../services/feature-flags.service';
import { FeatureFlag, FlagType, UserContext, EvaluationReason, ConditionOperator } from '../types/feature-flags.types';

describe('FeatureFlagsService', () => {
    describe('evaluateFlag', () => {
        it('should return default value for non-existent flag', async () => {
            const userContext: UserContext = {
                userId: 'user123',
                sessionId: 'session123',
                attributes: {}
            };

            const evaluation = await featureFlagsService.evaluateFlag(
                'non_existent_flag',
                userContext,
                false
            );

            expect(evaluation.flagKey).toBe('non_existent_flag');
            expect(evaluation.value).toBe(false);
            expect(evaluation.reason).toBe(EvaluationReason.FLAG_DISABLED);
        });

        it('should evaluate flag conditions correctly', async () => {
            // First create a flag
            const flag: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt'> = {
                name: 'Test Flag',
                key: 'test_flag',
                isEnabled: true,
                type: FlagType.BOOLEAN,
                value: true,
                conditions: [
                    {
                        id: 'condition1',
                        field: 'country',
                        operator: ConditionOperator.EQUALS,
                        value: 'US'
                    }
                ],
                createdBy: 'test'
            };

            await featureFlagsService.createFeatureFlag(flag);

            const userContext: UserContext = {
                userId: 'user123',
                sessionId: 'session123',
                attributes: { country: 'US' }
            };

            const evaluation = await featureFlagsService.evaluateFlag(
                'test_flag',
                userContext
            );

            expect(evaluation.flagKey).toBe('test_flag');
            expect(evaluation.value).toBe(true);
        });

        it('should handle rollout percentage', async () => {
            const flag: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt'> = {
                name: 'Rollout Flag',
                key: 'rollout_flag',
                isEnabled: true,
                type: FlagType.BOOLEAN,
                value: true,
                rolloutPercentage: 50,
                createdBy: 'test'
            };

            await featureFlagsService.createFeatureFlag(flag);

            const userContext: UserContext = {
                userId: 'user123',
                sessionId: 'session123',
                attributes: {}
            };

            const evaluation = await featureFlagsService.evaluateFlag(
                'rollout_flag',
                userContext
            );

            expect(evaluation.flagKey).toBe('rollout_flag');
            expect(['boolean', 'undefined']).toContain(typeof evaluation.value);
        });
    });

    describe('evaluateFlags', () => {
        it('should evaluate multiple flags', async () => {
            const userContext: UserContext = {
                userId: 'user123',
                sessionId: 'session123',
                attributes: {}
            };

            const flagKeys = ['flag1', 'flag2', 'flag3'];
            const defaultValues = {
                flag1: false,
                flag2: 'default',
                flag3: 42
            };

            const evaluations = await featureFlagsService.evaluateFlags(
                flagKeys,
                userContext,
                defaultValues
            );

            expect(Object.keys(evaluations)).toEqual(flagKeys);
            expect(evaluations.flag1.value).toBe(false);
            expect(evaluations.flag2.value).toBe('default');
            expect(evaluations.flag3.value).toBe(42);
        });
    });

    describe('createFeatureFlag', () => {
        it('should create a feature flag successfully', async () => {
            const flagData: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt'> = {
                name: 'New Feature Flag',
                key: 'new_feature_flag',
                description: 'A test feature flag',
                isEnabled: true,
                type: FlagType.BOOLEAN,
                value: true,
                createdBy: 'test_user'
            };

            const flag = await featureFlagsService.createFeatureFlag(flagData);

            expect(flag.id).toBeDefined();
            expect(flag.name).toBe(flagData.name);
            expect(flag.key).toBe(flagData.key);
            expect(flag.isEnabled).toBe(flagData.isEnabled);
            expect(flag.type).toBe(flagData.type);
            expect(flag.value).toBe(flagData.value);
            expect(flag.createdAt).toBeInstanceOf(Date);
            expect(flag.updatedAt).toBeInstanceOf(Date);
        });
    });

    describe('updateFeatureFlag', () => {
        it('should update an existing feature flag', async () => {
            // First create a flag
            const flagData: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt'> = {
                name: 'Update Test Flag',
                key: 'update_test_flag',
                isEnabled: true,
                type: FlagType.BOOLEAN,
                value: false,
                createdBy: 'test'
            };

            await featureFlagsService.createFeatureFlag(flagData);

            // Update the flag
            const updates = {
                isEnabled: false,
                value: true,
                description: 'Updated description'
            };

            const updatedFlag = await featureFlagsService.updateFeatureFlag(
                'update_test_flag',
                updates
            );

            expect(updatedFlag).toBeDefined();
            expect(updatedFlag?.isEnabled).toBe(false);
            expect(updatedFlag?.value).toBe(true);
            expect(updatedFlag?.description).toBe('Updated description');
        });

        it('should return null for non-existent flag', async () => {
            const updates = { isEnabled: false };

            const result = await featureFlagsService.updateFeatureFlag(
                'non_existent_flag',
                updates
            );

            expect(result).toBeNull();
        });
    });

    describe('trackABTestEvent', () => {
        it('should track A/B test event successfully', async () => {
            const userContext: UserContext = {
                userId: 'user123',
                sessionId: 'session123',
                attributes: {}
            };

            await expect(
                featureFlagsService.trackABTestEvent(
                    'test_id',
                    'variant_a',
                    'conversion',
                    userContext,
                    { value: 100 }
                )
            ).resolves.not.toThrow();
        });
    });
});