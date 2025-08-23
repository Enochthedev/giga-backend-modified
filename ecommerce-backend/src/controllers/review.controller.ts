import { Response } from 'express';
import { ReviewService } from '../services/review.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';

/**
 * Product review controller
 */
export class ReviewController {
    /**
     * Create product review
     */
    public static createReview = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const userId = req.user!.id;
        const review = await ReviewService.createReview(req.body, userId);

        res.status(201).json({
            success: true,
            data: review,
            message: 'Review created successfully and is pending approval'
        });
    });

    /**
     * Get review by ID
     */
    public static getReview = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        const review = await ReviewService.getReviewById(id);

        res.json({
            success: true,
            data: review
        });
    });

    /**
     * Update review
     */
    public static updateReview = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        const userId = req.user!.id;
        const review = await ReviewService.updateReview(id, req.body, userId);

        res.json({
            success: true,
            data: review,
            message: 'Review updated successfully and is pending re-approval'
        });
    });

    /**
     * Delete review
     */
    public static deleteReview = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        const userId = req.user!.id;
        await ReviewService.deleteReview(id, userId);

        res.json({
            success: true,
            message: 'Review deleted successfully'
        });
    });

    /**
     * Get product reviews
     */
    public static getProductReviews = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { productId } = req.params;
        const query = { ...req.query, productId, isApproved: true } as any;
        const result = await ReviewService.searchReviews(query);

        res.json({
            success: true,
            data: result.reviews,
            pagination: result.pagination
        });
    });

    /**
     * Get user reviews
     */
    public static getUserReviews = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const userId = req.user!.id;
        const query = { ...req.query, userId } as any;
        const result = await ReviewService.searchReviews(query);

        res.json({
            success: true,
            data: result.reviews,
            pagination: result.pagination
        });
    });

    /**
     * Search reviews (admin only)
     */
    public static searchReviews = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const result = await ReviewService.searchReviews(req.query as any);

        res.json({
            success: true,
            data: result.reviews,
            pagination: result.pagination
        });
    });

    /**
     * Get product rating statistics
     */
    public static getProductRatingStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { productId } = req.params;
        const stats = await ReviewService.getProductRatingStats(productId);

        res.json({
            success: true,
            data: stats
        });
    });

    /**
     * Mark review as helpful
     */
    public static markReviewHelpful = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        const userId = req.user!.id;
        await ReviewService.markReviewHelpful(id, userId);

        res.json({
            success: true,
            message: 'Review marked as helpful'
        });
    });

    /**
     * Approve review (admin only)
     */
    public static approveReview = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        const review = await ReviewService.approveReview(id);

        res.json({
            success: true,
            data: review,
            message: 'Review approved successfully'
        });
    });

    /**
     * Reject review (admin only)
     */
    public static rejectReview = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
        const { id } = req.params;
        await ReviewService.rejectReview(id);

        res.json({
            success: true,
            message: 'Review rejected and deleted'
        });
    });
}