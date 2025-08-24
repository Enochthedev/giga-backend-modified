import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ReviewService, CreateReviewRequest, UpdateReviewRequest, ReviewFilters } from '../services/review.service';
import { successResponse, errorResponse } from '../utils/response';
import { logger } from '../utils/logger';

export class ReviewController {
    private reviewService: ReviewService;

    constructor() {
        this.reviewService = new ReviewService();
    }

    /**
     * Create a new property review
     */
    createReview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user?.id;
            const reviewerName = req.user?.name || req.body.reviewerName;

            if (!userId) {
                errorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required');
                return;
            }

            const reviewData: CreateReviewRequest = {
                propertyId: req.body.propertyId,
                bookingId: req.body.bookingId,
                rating: parseInt(req.body.rating),
                title: req.body.title,
                comment: req.body.comment,
                cleanlinessRating: req.body.cleanlinessRating ? parseInt(req.body.cleanlinessRating) : undefined,
                locationRating: req.body.locationRating ? parseInt(req.body.locationRating) : undefined,
                serviceRating: req.body.serviceRating ? parseInt(req.body.serviceRating) : undefined,
                valueRating: req.body.valueRating ? parseInt(req.body.valueRating) : undefined,
                images: req.body.images
            };

            const review = await this.reviewService.createReview(userId, reviewerName, reviewData);

            successResponse(res, review, 'Review created successfully', 201);
        } catch (error) {
            logger.error('Error creating review:', error);
            errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to create review');
        }
    };

    /**
     * Get reviews for a property
     */
    getPropertyReviews = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const filters: ReviewFilters = {
                propertyId: req.params.propertyId,
                rating: req.query.rating ? parseInt(req.query.rating as string) : undefined,
                minRating: req.query.minRating ? parseInt(req.query.minRating as string) : undefined,
                maxRating: req.query.maxRating ? parseInt(req.query.maxRating as string) : undefined,
                verified: req.query.verified === 'true' ? true : req.query.verified === 'false' ? false : undefined,
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
                sortBy: req.query.sortBy as any
            };

            const result = await this.reviewService.getPropertyReviews(filters);

            successResponse(res, result, 'Reviews retrieved successfully');
        } catch (error) {
            logger.error('Error getting property reviews:', error);
            errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to get reviews');
        }
    };

    /**
     * Get all reviews (with filters)
     */
    getAllReviews = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const filters: ReviewFilters = {
                rating: req.query.rating ? parseInt(req.query.rating as string) : undefined,
                minRating: req.query.minRating ? parseInt(req.query.minRating as string) : undefined,
                maxRating: req.query.maxRating ? parseInt(req.query.maxRating as string) : undefined,
                verified: req.query.verified === 'true' ? true : req.query.verified === 'false' ? false : undefined,
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
                sortBy: req.query.sortBy as any
            };

            const result = await this.reviewService.getPropertyReviews(filters);

            successResponse(res, result, 'Reviews retrieved successfully');
        } catch (error) {
            logger.error('Error getting reviews:', error);
            errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to get reviews');
        }
    };

    /**
     * Get a specific review by ID
     */
    getReviewById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const review = await this.reviewService.getReviewById(req.params.id);
            successResponse(res, review, 'Review retrieved successfully');
        } catch (error: any) {
            logger.error('Error getting review:', error);
            if (error.name === 'NotFoundError') {
                errorResponse(res, 404, 'NOT_FOUND', error.message);
            } else {
                errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to get review');
            }
        }
    };

    /**
     * Update a review
     */
    updateReview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user?.id;

            if (!userId) {
                errorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required');
                return;
            }

            const updateData: UpdateReviewRequest = {
                rating: req.body.rating ? parseInt(req.body.rating) : undefined,
                title: req.body.title,
                comment: req.body.comment,
                cleanlinessRating: req.body.cleanlinessRating ? parseInt(req.body.cleanlinessRating) : undefined,
                locationRating: req.body.locationRating ? parseInt(req.body.locationRating) : undefined,
                serviceRating: req.body.serviceRating ? parseInt(req.body.serviceRating) : undefined,
                valueRating: req.body.valueRating ? parseInt(req.body.valueRating) : undefined,
                images: req.body.images
            };

            const review = await this.reviewService.updateReview(req.params.id, userId, updateData);

            successResponse(res, review, 'Review updated successfully');
        } catch (error: any) {
            logger.error('Error updating review:', error);
            if (error.name === 'NotFoundError') {
                errorResponse(res, 404, 'NOT_FOUND', error.message);
            } else if (error.name === 'ValidationError') {
                errorResponse(res, 400, 'VALIDATION_ERROR', error.message);
            } else {
                errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to update review');
            }
        }
    };

    /**
     * Delete a review
     */
    deleteReview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const userId = req.user?.id;

            if (!userId) {
                errorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required');
                return;
            }

            await this.reviewService.deleteReview(req.params.id, userId);

            successResponse(res, null, 'Review deleted successfully');
        } catch (error: any) {
            logger.error('Error deleting review:', error);
            if (error.name === 'NotFoundError') {
                errorResponse(res, 404, 'NOT_FOUND', error.message);
            } else {
                errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to delete review');
            }
        }
    };

    /**
     * Add owner response to a review
     */
    addOwnerResponse = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        try {
            const ownerId = req.user?.id;

            if (!ownerId) {
                errorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required');
                return;
            }

            const { response } = req.body;

            if (!response || response.trim().length === 0) {
                errorResponse(res, 400, 'VALIDATION_ERROR', 'Response is required');
                return;
            }

            const review = await this.reviewService.addOwnerResponse(
                req.params.id,
                ownerId,
                response.trim()
            );

            successResponse(res, review, 'Owner response added successfully');
        } catch (error: any) {
            logger.error('Error adding owner response:', error);
            if (error.name === 'NotFoundError') {
                errorResponse(res, 404, 'NOT_FOUND', error.message);
            } else {
                errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to add owner response');
            }
        }
    };
}