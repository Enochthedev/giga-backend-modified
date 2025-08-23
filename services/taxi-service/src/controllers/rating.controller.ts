import { Request, Response } from 'express';
import ratingService from '../services/rating.service';
import catchAsync from '../utils/catch-async';
import httpStatus from 'http-status';

class RatingController {
    /**
     * Submit a rating for a ride
     */
    submitRating = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const { rideId } = req.params;
        const { rating, review, tags, ratedBy, raterId } = req.body;

        if (!rating || !ratedBy || !raterId) {
            res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Rating, ratedBy, and raterId are required'
            });
            return;
        }

        if (rating < 1 || rating > 5) {
            res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Rating must be between 1 and 5'
            });
            return;
        }

        if (!['customer', 'driver'].includes(ratedBy)) {
            res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: 'ratedBy must be either "customer" or "driver"'
            });
            return;
        }

        const ratingData = {
            rideId,
            rating: parseInt(rating),
            review,
            tags: tags || [],
            ratedBy,
            raterId
        };

        const updatedRide = await ratingService.submitRating(ratingData);

        res.json({
            success: true,
            message: 'Rating submitted successfully',
            data: {
                rideId: updatedRide._id,
                rating: ratedBy === 'customer' ? updatedRide.driverRating : updatedRide.customerRating,
                review: ratedBy === 'customer' ? updatedRide.driverReview : updatedRide.customerReview
            }
        });
    });

    /**
     * Get driver feedback analytics
     */
    getDriverFeedback = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const { driverId } = req.params;

        const analytics = await ratingService.getDriverFeedbackAnalytics(driverId);

        res.json({
            success: true,
            data: analytics
        });
    });

    /**
     * Get customer feedback analytics
     */
    getCustomerFeedback = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const { customerId } = req.params;

        const analytics = await ratingService.getCustomerFeedbackAnalytics(customerId);

        res.json({
            success: true,
            data: analytics
        });
    });

    /**
     * Get comprehensive driver performance metrics
     */
    getDriverPerformance = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const { driverId } = req.params;

        const metrics = await ratingService.getDriverPerformanceMetrics(driverId);

        res.json({
            success: true,
            data: metrics
        });
    });

    /**
     * Get rating trends over time
     */
    getRatingTrends = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const { entityId } = req.params;
        const { entityType = 'driver', period = 'month' } = req.query;

        if (!['driver', 'customer'].includes(entityType as string)) {
            res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: 'entityType must be either "driver" or "customer"'
            });
            return;
        }

        if (!['week', 'month', 'quarter'].includes(period as string)) {
            res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: 'period must be "week", "month", or "quarter"'
            });
            return;
        }

        const trends = await ratingService.getRatingTrends(
            entityId,
            entityType as 'driver' | 'customer',
            period as 'week' | 'month' | 'quarter'
        );

        res.json({
            success: true,
            data: trends
        });
    });

    /**
     * Get rating summary for entity
     */
    getRatingSummary = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const { entityId } = req.params;
        const { entityType = 'driver' } = req.query;

        if (!['driver', 'customer'].includes(entityType as string)) {
            res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: 'entityType must be either "driver" or "customer"'
            });
            return;
        }

        const analytics = entityType === 'driver'
            ? await ratingService.getDriverFeedbackAnalytics(entityId)
            : await ratingService.getCustomerFeedbackAnalytics(entityId);

        res.json({
            success: true,
            data: {
                averageRating: analytics.averageRating,
                totalRatings: analytics.totalRatings,
                ratingDistribution: analytics.ratingDistribution,
                recentReviews: analytics.recentReviews.slice(0, 3) // Last 3 reviews
            }
        });
    });
}

export default new RatingController();