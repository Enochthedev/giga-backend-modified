/**
 * Feature flags and A/B testing controller
 */

import { Request, Response } from 'express';
import { featureFlagsService } from '../services/feature-flags.service';
import { logger } from '../utils/logger';
import { FeatureFlag, ABTest, UserContext } from '../types/feature-flags.types';

export class FeatureFlagsController {
    /**
     * Evaluate a feature flag
     */
    public async evaluateFlag(req: Request, res: Response): Promise<void> {
        try {
            const { flagKey } = req.params;
            const { defaultValue } = req.query;

            const userContext: UserContext = {
                userId: req.body.userId,
                sessionId: req.body.sessionId,
                attributes: req.body.attributes || {},
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            };

            const evaluation = await featureFlagsService.evaluateFlag(
                flagKey,
                userContext,
                defaultValue
            );

            res.status(200).json({
                success: true,
                data: evaluation
            });
        } catch (error) {
            logger.error('Error in evaluateFlag controller:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to evaluate flag',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Evaluate multiple flags
     */
    public async evaluateFlags(req: Request, res: Response): Promise<void> {
        try {
            const { flagKeys, defaultValues } = req.body;

            const userContext: UserContext = {
                userId: req.body.userId,
                sessionId: req.body.sessionId,
                attributes: req.body.attributes || {},
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            };

            const evaluations = await featureFlagsService.evaluateFlags(
                flagKeys,
                userContext,
                defaultValues
            );

            res.status(200).json({
                success: true,
                data: evaluations
            });
        } catch (error) {
            logger.error('Error in evaluateFlags controller:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to evaluate flags',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Create a feature flag
     */
    public async createFeatureFlag(req: Request, res: Response): Promise<void> {
        try {
            const flagData: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt'> = {
                name: req.body.name,
                key: req.body.key,
                description: req.body.description,
                isEnabled: req.body.isEnabled ?? true,
                type: req.body.type,
                value: req.body.value,
                conditions: req.body.conditions,
                rolloutPercentage: req.body.rolloutPercentage,
                createdBy: req.body.createdBy || 'system'
            };

            const flag = await featureFlagsService.createFeatureFlag(flagData);

            res.status(201).json({
                success: true,
                data: flag,
                message: 'Feature flag created successfully'
            });
        } catch (error) {
            logger.error('Error in createFeatureFlag controller:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create feature flag',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Update a feature flag
     */
    public async updateFeatureFlag(req: Request, res: Response): Promise<void> {
        try {
            const { flagKey } = req.params;
            const updates = req.body;

            const flag = await featureFlagsService.updateFeatureFlag(flagKey, updates);

            if (!flag) {
                res.status(404).json({
                    success: false,
                    message: 'Feature flag not found'
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: flag,
                message: 'Feature flag updated successfully'
            });
        } catch (error) {
            logger.error('Error in updateFeatureFlag controller:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update feature flag',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Create A/B test
     */
    public async createABTest(req: Request, res: Response): Promise<void> {
        try {
            const testData: Omit<ABTest, 'id' | 'createdAt' | 'updatedAt'> = {
                name: req.body.name,
                description: req.body.description,
                hypothesis: req.body.hypothesis,
                status: req.body.status,
                variants: req.body.variants,
                trafficAllocation: req.body.trafficAllocation || 100,
                targetingRules: req.body.targetingRules,
                metrics: req.body.metrics,
                startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
                endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
                createdBy: req.body.createdBy || 'system'
            };

            const test = await featureFlagsService.createABTest(testData);

            res.status(201).json({
                success: true,
                data: test,
                message: 'A/B test created successfully'
            });
        } catch (error) {
            logger.error('Error in createABTest controller:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create A/B test',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Get A/B test results
     */
    public async getABTestResults(req: Request, res: Response): Promise<void> {
        try {
            const { testId } = req.params;

            const results = await featureFlagsService.getABTestResults(testId);

            res.status(200).json({
                success: true,
                data: results
            });
        } catch (error) {
            logger.error('Error in getABTestResults controller:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get A/B test results',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Track A/B test event
     */
    public async trackABTestEvent(req: Request, res: Response): Promise<void> {
        try {
            const { testId, variantId, eventName } = req.body;

            const userContext: UserContext = {
                userId: req.body.userId,
                sessionId: req.body.sessionId,
                attributes: req.body.attributes || {},
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            };

            await featureFlagsService.trackABTestEvent(
                testId,
                variantId,
                eventName,
                userContext,
                req.body.properties
            );

            res.status(200).json({
                success: true,
                message: 'A/B test event tracked successfully'
            });
        } catch (error) {
            logger.error('Error in trackABTestEvent controller:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to track A/B test event',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}