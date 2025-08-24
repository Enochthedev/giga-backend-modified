import { Response } from 'express';
import { RecommendationService } from '../services/recommendation.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';

/**
 * Product recommendation controller
 */
export class RecommendationController {
    /**
     * Get personalized recommendations for user
     */
    public static getPersonalizedRecommendations = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const userId = req.user!.id;
        const { limit, excludeProductIds, includeCategories } = req.query;

        const options = {
            limit: limit ? parseInt(limit as string) : undefined,
            excludeProductIds: excludeProductIds ? (excludeProductIds as string).split(',') : undefined,
            includeCategories: includeCategories ? (includeCategories as string).split(',') : undefined
        };

        const recommendations = await RecommendationService.getPersonalizedRecommendations(userId, options);

        res.json({
            success: true,
            data: recommendations,
            message: 'Personalized recommendations retrieved successfully'
        });
    });

    /**
     * Get similar products
     */
    public static getSimilarProducts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { productId } = req.params;
        const { limit, excludeProductIds } = req.query;

        const options = {
            limit: limit ? parseInt(limit as string) : undefined,
            excludeProductIds: excludeProductIds ? (excludeProductIds as string).split(',') : undefined
        };

        const similarProducts = await RecommendationService.getSimilarProducts(productId, options);

        res.json({
            success: true,
            data: similarProducts,
            message: 'Similar products retrieved successfully'
        });
    });

    /**
     * Get popular products
     */
    public static getPopularProducts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { limit, excludeProductIds, includeCategories, timeframe } = req.query;

        const options = {
            limit: limit ? parseInt(limit as string) : undefined,
            excludeProductIds: excludeProductIds ? (excludeProductIds as string).split(',') : undefined,
            includeCategories: includeCategories ? (includeCategories as string).split(',') : undefined,
            timeframe: (timeframe as 'week' | 'month' | 'quarter' | 'year') || 'month'
        };

        const popularProducts = await RecommendationService.getPopularProducts(options);

        res.json({
            success: true,
            data: popularProducts,
            message: 'Popular products retrieved successfully'
        });
    });

    /**
     * Get frequently bought together products
     */
    public static getFrequentlyBoughtTogether = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { productId } = req.params;
        const { limit } = req.query;

        const options = {
            limit: limit ? parseInt(limit as string) : undefined
        };

        const products = await RecommendationService.getFrequentlyBoughtTogether(productId, options);

        res.json({
            success: true,
            data: products,
            message: 'Frequently bought together products retrieved successfully'
        });
    });

    /**
     * Track user behavior
     */
    public static trackUserBehavior = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const userId = req.user!.id;
        const { productId, action, weight } = req.body;

        await RecommendationService.trackUserBehavior({
            userId,
            productId,
            action,
            weight: weight || 1.0,
            timestamp: new Date()
        });

        res.json({
            success: true,
            message: 'User behavior tracked successfully'
        });
    });
}