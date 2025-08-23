import ratingService from '../services/rating.service';
import Ride from '../models/ride.model';
import Driver from '../models/driver.model';
import { RideStatus } from '../models/ride.model';

// Mock the models
jest.mock('../models/ride.model');
jest.mock('../models/driver.model');
jest.mock('../models/customer.model');

const mockRide = {
    _id: 'ride123',
    customerId: 'customer123',
    driverId: 'driver123',
    status: RideStatus.COMPLETED,
    canBeRated: jest.fn().mockReturnValue(true),
    save: jest.fn().mockResolvedValue(true)
};

const mockDriver = {
    _id: 'driver123',
    rating: 4.5,
    save: jest.fn().mockResolvedValue(true)
};

describe('RatingService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('submitRating', () => {
        it('should successfully submit a customer rating', async () => {
            (Ride.findById as jest.Mock).mockResolvedValue(mockRide);

            const ratingData = {
                rideId: 'ride123',
                rating: 5,
                review: 'Great driver!',
                tags: ['friendly', 'professional'],
                ratedBy: 'customer' as const,
                raterId: 'customer123'
            };

            const result = await ratingService.submitRating(ratingData);

            expect(Ride.findById).toHaveBeenCalledWith('ride123');
            expect(mockRide.canBeRated).toHaveBeenCalled();
            expect(mockRide.save).toHaveBeenCalled();
            expect(result).toBe(mockRide);
        });

        it('should successfully submit a driver rating', async () => {
            (Ride.findById as jest.Mock).mockResolvedValue(mockRide);

            const ratingData = {
                rideId: 'ride123',
                rating: 4,
                review: 'Good passenger',
                tags: ['punctual'],
                ratedBy: 'driver' as const,
                raterId: 'driver123'
            };

            const result = await ratingService.submitRating(ratingData);

            expect(result).toBe(mockRide);
        });

        it('should throw error for invalid rating', async () => {
            const ratingData = {
                rideId: 'ride123',
                rating: 6, // Invalid rating
                ratedBy: 'customer' as const,
                raterId: 'customer123'
            };

            await expect(ratingService.submitRating(ratingData)).rejects.toThrow('Rating must be between 1 and 5');
        });

        it('should throw error if ride not found', async () => {
            (Ride.findById as jest.Mock).mockResolvedValue(null);

            const ratingData = {
                rideId: 'nonexistent',
                rating: 5,
                ratedBy: 'customer' as const,
                raterId: 'customer123'
            };

            await expect(ratingService.submitRating(ratingData)).rejects.toThrow('Ride not found');
        });

        it('should throw error if ride cannot be rated', async () => {
            const unrateableRide = {
                ...mockRide,
                canBeRated: jest.fn().mockReturnValue(false)
            };
            (Ride.findById as jest.Mock).mockResolvedValue(unrateableRide);

            const ratingData = {
                rideId: 'ride123',
                rating: 5,
                ratedBy: 'customer' as const,
                raterId: 'customer123'
            };

            await expect(ratingService.submitRating(ratingData)).rejects.toThrow('Ride cannot be rated');
        });
    });

    describe('getDriverFeedbackAnalytics', () => {
        it('should return analytics for driver with ratings', async () => {
            const mockRides = [
                { driverRating: 5, driverReview: 'Excellent', createdAt: new Date(), completedAt: new Date() },
                { driverRating: 4, driverReview: 'Good', createdAt: new Date(), completedAt: new Date() },
                { driverRating: 5, driverReview: 'Perfect', createdAt: new Date(), completedAt: new Date() }
            ];

            (Ride.find as jest.Mock).mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockRides)
            });

            const analytics = await ratingService.getDriverFeedbackAnalytics('driver123');

            expect(analytics.averageRating).toBe(4.67);
            expect(analytics.totalRatings).toBe(3);
            expect(analytics.ratingDistribution[5]).toBe(2);
            expect(analytics.ratingDistribution[4]).toBe(1);
            expect(analytics.recentReviews).toHaveLength(3);
        });

        it('should return empty analytics for driver with no ratings', async () => {
            (Ride.find as jest.Mock).mockReturnValue({
                sort: jest.fn().mockResolvedValue([])
            });

            const analytics = await ratingService.getDriverFeedbackAnalytics('driver123');

            expect(analytics.averageRating).toBe(0);
            expect(analytics.totalRatings).toBe(0);
            expect(analytics.recentReviews).toHaveLength(0);
        });
    });

    describe('getDriverPerformanceMetrics', () => {
        it('should calculate comprehensive performance metrics', async () => {
            (Driver.findById as jest.Mock).mockResolvedValue(mockDriver);

            const mockRides = [
                {
                    status: RideStatus.COMPLETED,
                    isCompleted: () => true,
                    isCancelled: () => false,
                    acceptedAt: new Date(Date.now() - 60000),
                    createdAt: new Date(Date.now() - 120000)
                },
                {
                    status: RideStatus.COMPLETED,
                    isCompleted: () => true,
                    isCancelled: () => false,
                    acceptedAt: new Date(Date.now() - 30000),
                    createdAt: new Date(Date.now() - 90000)
                }
            ];

            (Ride.find as jest.Mock).mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockRides)
            });

            // Mock the feedback analytics call
            jest.spyOn(ratingService, 'getDriverFeedbackAnalytics').mockResolvedValue({
                averageRating: 4.5,
                totalRatings: 10,
                ratingDistribution: { 1: 0, 2: 0, 3: 1, 4: 4, 5: 5 },
                commonTags: [{ tag: 'friendly', count: 8 }],
                recentReviews: []
            });

            const metrics = await ratingService.getDriverPerformanceMetrics('driver123');

            expect(metrics.driverId).toBe('driver123');
            expect(metrics.averageRating).toBe(4.5);
            expect(metrics.completionRate).toBe(100);
            expect(metrics.performanceScore).toBeGreaterThan(0);
            expect(metrics.strengths).toBeDefined();
            expect(metrics.improvementAreas).toBeDefined();
        });
    });

    describe('getRatingTrends', () => {
        it('should return rating trends over time', async () => {
            const mockRides = [
                { driverRating: 5, createdAt: new Date('2023-01-15') },
                { driverRating: 4, createdAt: new Date('2023-01-20') }
            ];

            (Ride.find as jest.Mock).mockResolvedValue(mockRides);

            const trends = await ratingService.getRatingTrends('driver123', 'driver', 'month');

            expect(trends).toBeDefined();
            expect(Array.isArray(trends)).toBe(true);
        });
    });
});