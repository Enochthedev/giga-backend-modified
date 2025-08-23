import Ride, { IRide } from '../models/ride.model';
import Driver, { IDriver } from '../models/driver.model';
import Customer, { ICustomer } from '../models/customer.model';
import ApiError from '../utils/api-error';
import httpStatus from 'http-status';

export interface RatingData {
    rideId: string;
    rating: number;
    review?: string;
    tags?: string[];
    ratedBy: 'customer' | 'driver';
    raterId: string;
}

export interface FeedbackAnalytics {
    averageRating: number;
    totalRatings: number;
    ratingDistribution: {
        1: number;
        2: number;
        3: number;
        4: number;
        5: number;
    };
    commonTags: { tag: string; count: number }[];
    recentReviews: {
        rating: number;
        review: string;
        date: Date;
        riderName?: string;
    }[];
}

export interface DriverPerformanceMetrics {
    driverId: string;
    averageRating: number;
    totalRatings: number;
    completionRate: number;
    acceptanceRate: number;
    cancellationRate: number;
    averageResponseTime: number;
    totalRides: number;
    totalEarnings: number;
    performanceScore: number;
    strengths: string[];
    improvementAreas: string[];
}

class RatingService {
    /**
     * Submit a rating for a ride
     */
    async submitRating(ratingData: RatingData): Promise<IRide> {
        const { rideId, rating, review, tags, ratedBy, raterId } = ratingData;

        // Validate rating
        if (rating < 1 || rating > 5) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Rating must be between 1 and 5');
        }

        const ride = await Ride.findById(rideId);
        if (!ride) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Ride not found');
        }

        if (!ride.canBeRated()) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Ride cannot be rated');
        }

        // Check if already rated by this user
        if (ratedBy === 'customer' && ride.driverRating !== undefined) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Customer has already rated this ride');
        }

        if (ratedBy === 'driver' && ride.customerRating !== undefined) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'Driver has already rated this ride');
        }

        // Verify the rater is authorized
        if (ratedBy === 'customer' && ride.customerId !== raterId) {
            throw new ApiError(httpStatus.FORBIDDEN, 'Unauthorized to rate this ride');
        }

        if (ratedBy === 'driver' && ride.driverId?.toString() !== raterId) {
            throw new ApiError(httpStatus.FORBIDDEN, 'Unauthorized to rate this ride');
        }

        // Update ride with rating
        if (ratedBy === 'customer') {
            ride.driverRating = rating;
            ride.driverReview = review;

            // Store tags in a custom field (extend the model if needed)
            if (tags && tags.length > 0) {
                (ride as any).driverRatingTags = tags;
            }
        } else {
            ride.customerRating = rating;
            ride.customerReview = review;

            if (tags && tags.length > 0) {
                (ride as any).customerRatingTags = tags;
            }
        }

        await ride.save();

        // Update driver's average rating if customer rated
        if (ratedBy === 'customer' && ride.driverId) {
            await this.updateDriverRating(ride.driverId.toString());
        }

        // Update customer's average rating if driver rated
        if (ratedBy === 'driver') {
            await this.updateCustomerRating(ride.customerId);
        }

        return ride;
    }

    /**
     * Get driver feedback analytics
     */
    async getDriverFeedbackAnalytics(driverId: string): Promise<FeedbackAnalytics> {
        const rides = await Ride.find({
            driverId,
            driverRating: { $exists: true, $ne: null }
        }).sort({ createdAt: -1 });

        if (rides.length === 0) {
            return {
                averageRating: 0,
                totalRatings: 0,
                ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                commonTags: [],
                recentReviews: []
            };
        }

        // Calculate average rating
        const totalRating = rides.reduce((sum, ride) => sum + (ride.driverRating || 0), 0);
        const averageRating = totalRating / rides.length;

        // Calculate rating distribution
        const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        rides.forEach(ride => {
            if (ride.driverRating) {
                ratingDistribution[ride.driverRating as keyof typeof ratingDistribution]++;
            }
        });

        // Collect tags and count frequency
        const tagCounts: { [key: string]: number } = {};
        rides.forEach(ride => {
            const tags = (ride as any).driverRatingTags || [];
            tags.forEach((tag: string) => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });

        const commonTags = Object.entries(tagCounts)
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        // Get recent reviews
        const recentReviews = rides
            .filter(ride => ride.driverReview)
            .slice(0, 10)
            .map(ride => ({
                rating: ride.driverRating || 0,
                review: ride.driverReview || '',
                date: ride.completedAt || ride.createdAt,
                riderName: 'Anonymous' // In real app, get customer name
            }));

        return {
            averageRating: Math.round(averageRating * 100) / 100,
            totalRatings: rides.length,
            ratingDistribution,
            commonTags,
            recentReviews
        };
    }

    /**
     * Get customer feedback analytics
     */
    async getCustomerFeedbackAnalytics(customerId: string): Promise<FeedbackAnalytics> {
        const rides = await Ride.find({
            customerId,
            customerRating: { $exists: true, $ne: null }
        }).sort({ createdAt: -1 });

        if (rides.length === 0) {
            return {
                averageRating: 0,
                totalRatings: 0,
                ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                commonTags: [],
                recentReviews: []
            };
        }

        const totalRating = rides.reduce((sum, ride) => sum + (ride.customerRating || 0), 0);
        const averageRating = totalRating / rides.length;

        const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        rides.forEach(ride => {
            if (ride.customerRating) {
                ratingDistribution[ride.customerRating as keyof typeof ratingDistribution]++;
            }
        });

        const tagCounts: { [key: string]: number } = {};
        rides.forEach(ride => {
            const tags = (ride as any).customerRatingTags || [];
            tags.forEach((tag: string) => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });

        const commonTags = Object.entries(tagCounts)
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        const recentReviews = rides
            .filter(ride => ride.customerReview)
            .slice(0, 10)
            .map(ride => ({
                rating: ride.customerRating || 0,
                review: ride.customerReview || '',
                date: ride.completedAt || ride.createdAt
            }));

        return {
            averageRating: Math.round(averageRating * 100) / 100,
            totalRatings: rides.length,
            ratingDistribution,
            commonTags,
            recentReviews
        };
    }

    /**
     * Get comprehensive driver performance metrics
     */
    async getDriverPerformanceMetrics(driverId: string): Promise<DriverPerformanceMetrics> {
        const driver = await Driver.findById(driverId);
        if (!driver) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Driver not found');
        }

        // Get all rides for this driver
        const allRides = await Ride.find({ driverId }).sort({ createdAt: -1 });
        const completedRides = allRides.filter(ride => ride.isCompleted());
        const cancelledRides = allRides.filter(ride => ride.isCancelled());

        // Calculate metrics
        const totalRides = allRides.length;
        const completionRate = totalRides > 0 ? (completedRides.length / totalRides) * 100 : 0;
        const cancellationRate = totalRides > 0 ? (cancelledRides.length / totalRides) * 100 : 0;

        // Calculate acceptance rate (would need ride offers tracking)
        const acceptanceRate = 85; // Placeholder - would calculate from actual data

        // Calculate average response time
        const ridesWithAcceptTime = allRides.filter(ride => ride.acceptedAt);
        const averageResponseTime = ridesWithAcceptTime.length > 0
            ? ridesWithAcceptTime.reduce((sum, ride) => {
                const responseTime = ride.acceptedAt!.getTime() - ride.createdAt.getTime();
                return sum + responseTime;
            }, 0) / ridesWithAcceptTime.length / 1000 // Convert to seconds
            : 0;

        // Get feedback analytics
        const feedbackAnalytics = await this.getDriverFeedbackAnalytics(driverId);

        // Calculate performance score (0-100)
        const performanceScore = this.calculatePerformanceScore({
            averageRating: feedbackAnalytics.averageRating,
            completionRate,
            acceptanceRate,
            cancellationRate,
            averageResponseTime
        });

        // Determine strengths and improvement areas
        const { strengths, improvementAreas } = this.analyzePerformance({
            averageRating: feedbackAnalytics.averageRating,
            completionRate,
            acceptanceRate,
            cancellationRate,
            averageResponseTime,
            commonTags: feedbackAnalytics.commonTags
        });

        return {
            driverId,
            averageRating: feedbackAnalytics.averageRating,
            totalRatings: feedbackAnalytics.totalRatings,
            completionRate: Math.round(completionRate * 100) / 100,
            acceptanceRate: Math.round(acceptanceRate * 100) / 100,
            cancellationRate: Math.round(cancellationRate * 100) / 100,
            averageResponseTime: Math.round(averageResponseTime),
            totalRides: driver.totalRides,
            totalEarnings: driver.totalEarnings,
            performanceScore: Math.round(performanceScore),
            strengths,
            improvementAreas
        };
    }

    /**
     * Get rating trends over time
     */
    async getRatingTrends(
        entityId: string,
        entityType: 'driver' | 'customer',
        period: 'week' | 'month' | 'quarter' = 'month'
    ): Promise<{
        period: string;
        averageRating: number;
        totalRatings: number;
        date: Date;
    }[]> {
        const now = new Date();
        const periods: Date[] = [];

        // Generate date periods
        for (let i = 0; i < 12; i++) {
            const date = new Date(now);
            if (period === 'week') {
                date.setDate(date.getDate() - (i * 7));
            } else if (period === 'month') {
                date.setMonth(date.getMonth() - i);
            } else {
                date.setMonth(date.getMonth() - (i * 3));
            }
            periods.push(date);
        }

        const trends = [];

        for (const periodStart of periods) {
            const periodEnd = new Date(periodStart);
            if (period === 'week') {
                periodEnd.setDate(periodEnd.getDate() + 7);
            } else if (period === 'month') {
                periodEnd.setMonth(periodEnd.getMonth() + 1);
            } else {
                periodEnd.setMonth(periodEnd.getMonth() + 3);
            }

            const query: any = {
                createdAt: { $gte: periodStart, $lt: periodEnd }
            };

            if (entityType === 'driver') {
                query.driverId = entityId;
                query.driverRating = { $exists: true, $ne: null };
            } else {
                query.customerId = entityId;
                query.customerRating = { $exists: true, $ne: null };
            }

            const rides = await Ride.find(query);

            if (rides.length > 0) {
                const ratingField = entityType === 'driver' ? 'driverRating' : 'customerRating';
                const totalRating = rides.reduce((sum, ride) => sum + (ride[ratingField] || 0), 0);
                const averageRating = totalRating / rides.length;

                trends.push({
                    period: this.formatPeriod(periodStart, period),
                    averageRating: Math.round(averageRating * 100) / 100,
                    totalRatings: rides.length,
                    date: periodStart
                });
            } else {
                trends.push({
                    period: this.formatPeriod(periodStart, period),
                    averageRating: 0,
                    totalRatings: 0,
                    date: periodStart
                });
            }
        }

        return trends.reverse();
    }

    /**
     * Update driver's average rating
     */
    private async updateDriverRating(driverId: string): Promise<void> {
        const rides = await Ride.find({
            driverId,
            driverRating: { $exists: true, $ne: null }
        });

        if (rides.length > 0) {
            const totalRating = rides.reduce((sum, ride) => sum + (ride.driverRating || 0), 0);
            const averageRating = totalRating / rides.length;

            await Driver.findByIdAndUpdate(driverId, {
                rating: Math.round(averageRating * 100) / 100
            });
        }
    }

    /**
     * Update customer's average rating
     */
    private async updateCustomerRating(customerId: string): Promise<void> {
        const rides = await Ride.find({
            customerId,
            customerRating: { $exists: true, $ne: null }
        });

        if (rides.length > 0) {
            const totalRating = rides.reduce((sum, ride) => sum + (ride.customerRating || 0), 0);
            const averageRating = totalRating / rides.length;

            await Customer.findOneAndUpdate(
                { userId: customerId },
                { rating: Math.round(averageRating * 100) / 100 }
            );
        }
    }

    /**
     * Calculate performance score
     */
    private calculatePerformanceScore(metrics: {
        averageRating: number;
        completionRate: number;
        acceptanceRate: number;
        cancellationRate: number;
        averageResponseTime: number;
    }): number {
        const weights = {
            rating: 0.3,
            completion: 0.25,
            acceptance: 0.2,
            cancellation: 0.15,
            responseTime: 0.1
        };

        // Normalize scores (0-100)
        const ratingScore = (metrics.averageRating / 5) * 100;
        const completionScore = metrics.completionRate;
        const acceptanceScore = metrics.acceptanceRate;
        const cancellationScore = Math.max(0, 100 - metrics.cancellationRate * 2); // Penalty for cancellations
        const responseTimeScore = Math.max(0, 100 - (metrics.averageResponseTime / 60) * 10); // Penalty for slow response

        return (
            ratingScore * weights.rating +
            completionScore * weights.completion +
            acceptanceScore * weights.acceptance +
            cancellationScore * weights.cancellation +
            responseTimeScore * weights.responseTime
        );
    }

    /**
     * Analyze performance to determine strengths and improvement areas
     */
    private analyzePerformance(metrics: {
        averageRating: number;
        completionRate: number;
        acceptanceRate: number;
        cancellationRate: number;
        averageResponseTime: number;
        commonTags: { tag: string; count: number }[];
    }): { strengths: string[]; improvementAreas: string[] } {
        const strengths: string[] = [];
        const improvementAreas: string[] = [];

        // Analyze rating
        if (metrics.averageRating >= 4.5) {
            strengths.push('Excellent customer satisfaction');
        } else if (metrics.averageRating < 3.5) {
            improvementAreas.push('Customer satisfaction needs improvement');
        }

        // Analyze completion rate
        if (metrics.completionRate >= 95) {
            strengths.push('High ride completion rate');
        } else if (metrics.completionRate < 85) {
            improvementAreas.push('Improve ride completion rate');
        }

        // Analyze acceptance rate
        if (metrics.acceptanceRate >= 90) {
            strengths.push('Excellent ride acceptance rate');
        } else if (metrics.acceptanceRate < 70) {
            improvementAreas.push('Increase ride acceptance rate');
        }

        // Analyze cancellation rate
        if (metrics.cancellationRate <= 5) {
            strengths.push('Low cancellation rate');
        } else if (metrics.cancellationRate > 15) {
            improvementAreas.push('Reduce ride cancellations');
        }

        // Analyze response time
        if (metrics.averageResponseTime <= 30) {
            strengths.push('Quick response to ride requests');
        } else if (metrics.averageResponseTime > 120) {
            improvementAreas.push('Respond faster to ride requests');
        }

        // Analyze common tags
        const positiveTagsCount = metrics.commonTags.filter(tag =>
            ['friendly', 'professional', 'clean car', 'safe driving', 'punctual'].includes(tag.tag.toLowerCase())
        ).reduce((sum, tag) => sum + tag.count, 0);

        const negativeTagsCount = metrics.commonTags.filter(tag =>
            ['rude', 'unsafe', 'dirty car', 'late', 'poor navigation'].includes(tag.tag.toLowerCase())
        ).reduce((sum, tag) => sum + tag.count, 0);

        if (positiveTagsCount > negativeTagsCount * 2) {
            strengths.push('Consistently positive customer feedback');
        } else if (negativeTagsCount > positiveTagsCount) {
            improvementAreas.push('Address customer service concerns');
        }

        return { strengths, improvementAreas };
    }

    /**
     * Format period for display
     */
    private formatPeriod(date: Date, period: 'week' | 'month' | 'quarter'): string {
        if (period === 'week') {
            return `Week of ${date.toLocaleDateString()}`;
        } else if (period === 'month') {
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        } else {
            const quarter = Math.floor(date.getMonth() / 3) + 1;
            return `Q${quarter} ${date.getFullYear()}`;
        }
    }
}

export default new RatingService();