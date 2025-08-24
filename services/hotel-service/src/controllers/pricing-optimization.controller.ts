import { Request, Response } from 'express';
import { PricingOptimizationService, PricingRule } from '../services/pricing-optimization.service';
import { successResponse, errorResponse } from '../utils/response';
import { logger } from '../utils/logger';

export class PricingOptimizationController {
    private pricingService: PricingOptimizationService;

    constructor() {
        this.pricingService = new PricingOptimizationService();
    }

    /**
     * Get pricing suggestions for a room
     */
    getPricingSuggestions = async (req: Request, res: Response): Promise<void> => {
        try {
            const ownerId = req.user?.id;

            if (!ownerId) {
                errorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required');
                return;
            }

            const roomId = req.params.roomId;
            const startDate = new Date(req.query.startDate as string);
            const endDate = new Date(req.query.endDate as string);

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                errorResponse(res, 400, 'VALIDATION_ERROR', 'Invalid date format');
                return;
            }

            if (startDate >= endDate) {
                errorResponse(res, 400, 'VALIDATION_ERROR', 'End date must be after start date');
                return;
            }

            // Limit date range
            const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            if (daysDiff > 90) {
                errorResponse(res, 400, 'VALIDATION_ERROR', 'Date range cannot exceed 90 days');
                return;
            }

            const suggestions = await this.pricingService.getPricingSuggestions(roomId, startDate, endDate, ownerId);

            successResponse(res, { suggestions }, 'Pricing suggestions retrieved successfully');
        } catch (error) {
            logger.error('Error getting pricing suggestions:', error);
            if (error.name === 'NotFoundError') {
                errorResponse(res, 404, 'NOT_FOUND', error.message);
            } else {
                errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to get pricing suggestions');
            }
        }
    };

    /**
     * Apply dynamic pricing to a room
     */
    applyDynamicPricing = async (req: Request, res: Response): Promise<void> => {
        try {
            const ownerId = req.user?.id;

            if (!ownerId) {
                errorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required');
                return;
            }

            const roomId = req.params.roomId;
            const { startDate, endDate, options = {} } = req.body;

            if (!startDate || !endDate) {
                errorResponse(res, 400, 'VALIDATION_ERROR', 'startDate and endDate are required');
                return;
            }

            const start = new Date(startDate);
            const end = new Date(endDate);

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                errorResponse(res, 400, 'VALIDATION_ERROR', 'Invalid date format');
                return;
            }

            // Validate options
            if (options.maxIncrease && (options.maxIncrease < 0 || options.maxIncrease > 100)) {
                errorResponse(res, 400, 'VALIDATION_ERROR', 'maxIncrease must be between 0 and 100');
                return;
            }

            if (options.maxDecrease && (options.maxDecrease < 0 || options.maxDecrease > 100)) {
                errorResponse(res, 400, 'VALIDATION_ERROR', 'maxDecrease must be between 0 and 100');
                return;
            }

            const result = await this.pricingService.applyDynamicPricing(roomId, start, end, ownerId, options);

            successResponse(res, result, 'Dynamic pricing applied successfully');
        } catch (error) {
            logger.error('Error applying dynamic pricing:', error);
            if (error.name === 'NotFoundError') {
                errorResponse(res, 404, 'NOT_FOUND', error.message);
            } else if (error.name === 'ValidationError') {
                errorResponse(res, 400, 'VALIDATION_ERROR', error.message);
            } else {
                errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to apply dynamic pricing');
            }
        }
    };

    /**
     * Get demand metrics for a room
     */
    getDemandMetrics = async (req: Request, res: Response): Promise<void> => {
        try {
            const roomId = req.params.roomId;
            const startDate = new Date(req.query.startDate as string);
            const endDate = new Date(req.query.endDate as string);

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                errorResponse(res, 400, 'VALIDATION_ERROR', 'Invalid date format');
                return;
            }

            const metrics = await this.pricingService.getDemandMetrics(roomId, startDate, endDate);

            successResponse(res, { metrics }, 'Demand metrics retrieved successfully');
        } catch (error) {
            logger.error('Error getting demand metrics:', error);
            errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to get demand metrics');
        }
    };

    /**
     * Get seasonal patterns for a room
     */
    getSeasonalPatterns = async (req: Request, res: Response): Promise<void> => {
        try {
            const roomId = req.params.roomId;

            const patterns = await this.pricingService.getSeasonalPatterns(roomId);

            successResponse(res, { patterns }, 'Seasonal patterns retrieved successfully');
        } catch (error) {
            logger.error('Error getting seasonal patterns:', error);
            errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to get seasonal patterns');
        }
    };

    /**
     * Create a pricing rule
     */
    createPricingRule = async (req: Request, res: Response): Promise<void> => {
        try {
            const ownerId = req.user?.id;

            if (!ownerId) {
                errorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required');
                return;
            }

            const ruleData: Omit<PricingRule, 'id'> = {
                roomId: req.body.roomId,
                name: req.body.name,
                ruleType: req.body.ruleType,
                startDate: new Date(req.body.startDate),
                endDate: new Date(req.body.endDate),
                daysOfWeek: req.body.daysOfWeek,
                priceModifier: parseFloat(req.body.priceModifier),
                modifierType: req.body.modifierType,
                minimumStay: req.body.minimumStay,
                conditions: req.body.conditions,
                isActive: req.body.isActive !== false, // Default to true
                priority: parseInt(req.body.priority) || 0
            };

            // Validation
            if (!ruleData.roomId || !ruleData.name || !ruleData.ruleType) {
                errorResponse(res, 400, 'VALIDATION_ERROR', 'roomId, name, and ruleType are required');
                return;
            }

            if (!['seasonal', 'demand', 'event', 'day_of_week', 'advance_booking'].includes(ruleData.ruleType)) {
                errorResponse(res, 400, 'VALIDATION_ERROR', 'Invalid rule type');
                return;
            }

            if (!['percentage', 'fixed'].includes(ruleData.modifierType)) {
                errorResponse(res, 400, 'VALIDATION_ERROR', 'modifierType must be percentage or fixed');
                return;
            }

            if (isNaN(ruleData.startDate.getTime()) || isNaN(ruleData.endDate.getTime())) {
                errorResponse(res, 400, 'VALIDATION_ERROR', 'Invalid date format');
                return;
            }

            const rule = await this.pricingService.createPricingRule(ownerId, ruleData);

            successResponse(res, rule, 'Pricing rule created successfully', 201);
        } catch (error) {
            logger.error('Error creating pricing rule:', error);
            if (error.name === 'NotFoundError') {
                errorResponse(res, 404, 'NOT_FOUND', error.message);
            } else if (error.name === 'ValidationError') {
                errorResponse(res, 400, 'VALIDATION_ERROR', error.message);
            } else {
                errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to create pricing rule');
            }
        }
    };
}