import { Request, Response } from 'express';
import analyticsService from '../services/analytics.service';
import { RideStatus, VehicleType } from '../models/driver.model';
import catchAsync from '../utils/catch-async';
import httpStatus from 'http-status';

class AnalyticsController {
    /**
     * Get ride history with filters
     */
    getRideHistory = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const { entityId } = req.params;
        const {
            entityType = 'driver',
            startDate,
            endDate,
            status,
            vehicleType,
            minRating,
            maxRating,
            minFare,
            maxFare,
            limit = 50,
            offset = 0
        } = req.query;

        if (!['driver', 'customer'].includes(entityType as string)) {
            res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: 'entityType must be either "driver" or "customer"'
            });
            return;
        }

        const filters: any = {};

        if (startDate) filters.startDate = new Date(startDate as string);
        if (endDate) filters.endDate = new Date(endDate as string);
        if (status) filters.status = status as RideStatus;
        if (vehicleType) filters.vehicleType = vehicleType as VehicleType;
        if (minRating) filters.minRating = parseFloat(minRating as string);
        if (maxRating) filters.maxRating = parseFloat(maxRating as string);
        if (minFare) filters.minFare = parseFloat(minFare as string);
        if (maxFare) filters.maxFare = parseFloat(maxFare as string);

        const result = await analyticsService.getRideHistory(
            entityId,
            entityType as 'driver' | 'customer',
            filters,
            parseInt(limit as string),
            parseInt(offset as string)
        );

        res.json({
            success: true,
            data: {
                rides: result.rides.map(ride => ({
                    id: ride._id,
                    status: ride.status,
                    vehicleType: ride.vehicleType,
                    pickupLocation: ride.pickupLocation,
                    dropoffLocation: ride.dropoffLocation,
                    estimatedFare: ride.estimatedFare,
                    finalFare: ride.finalFare,
                    distance: ride.actualDistance || ride.estimatedDistance,
                    duration: ride.actualDuration || ride.estimatedDuration,
                    rating: entityType === 'driver' ? ride.driverRating : ride.customerRating,
                    review: entityType === 'driver' ? ride.driverReview : ride.customerReview,
                    createdAt: ride.createdAt,
                    completedAt: ride.completedAt
                })),
                pagination: {
                    total: result.total,
                    limit: parseInt(limit as string),
                    offset: parseInt(offset as string),
                    hasMore: result.total > parseInt(offset as string) + parseInt(limit as string)
                },
                summary: result.summary
            }
        });
    });

    /**
     * Get comprehensive driver analytics
     */
    getDriverAnalytics = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const { driverId } = req.params;
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: 'startDate and endDate are required'
            });
            return;
        }

        const analytics = await analyticsService.getDriverAnalytics(
            driverId,
            new Date(startDate as string),
            new Date(endDate as string)
        );

        res.json({
            success: true,
            data: analytics
        });
    });

    /**
     * Get comprehensive passenger analytics
     */
    getPassengerAnalytics = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const { customerId } = req.params;
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: 'startDate and endDate are required'
            });
            return;
        }

        const analytics = await analyticsService.getPassengerAnalytics(
            customerId,
            new Date(startDate as string),
            new Date(endDate as string)
        );

        res.json({
            success: true,
            data: analytics
        });
    });

    /**
     * Get system-wide analytics (admin only)
     */
    getSystemAnalytics = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: 'startDate and endDate are required'
            });
            return;
        }

        const analytics = await analyticsService.getSystemAnalytics(
            new Date(startDate as string),
            new Date(endDate as string)
        );

        res.json({
            success: true,
            data: analytics
        });
    });

    /**
     * Get driver dashboard summary
     */
    getDriverDashboard = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const { driverId } = req.params;

        // Get analytics for the last 30 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const analytics = await analyticsService.getDriverAnalytics(driverId, startDate, endDate);

        // Get today's stats
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const todayAnalytics = await analyticsService.getDriverAnalytics(driverId, todayStart, todayEnd);

        res.json({
            success: true,
            data: {
                period: {
                    last30Days: analytics,
                    today: todayAnalytics
                },
                summary: {
                    totalRides: analytics.rides.total,
                    totalEarnings: analytics.earnings.total,
                    averageRating: analytics.performance.averageRating,
                    completionRate: analytics.rides.completionRate,
                    todayRides: todayAnalytics.rides.total,
                    todayEarnings: todayAnalytics.earnings.total
                },
                insights: {
                    peakHours: analytics.timeAnalysis.peakHours.slice(0, 3),
                    topPickupLocations: analytics.customerInsights.topPickupLocations.slice(0, 3),
                    performanceScore: analytics.performance.averageRating * 20 // Convert to 0-100 scale
                }
            }
        });
    });

    /**
     * Get passenger dashboard summary
     */
    getPassengerDashboard = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const { customerId } = req.params;

        // Get analytics for the last 30 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const analytics = await analyticsService.getPassengerAnalytics(customerId, startDate, endDate);

        res.json({
            success: true,
            data: {
                summary: {
                    totalRides: analytics.rides.total,
                    totalSpending: analytics.spending.total,
                    averageRideValue: analytics.spending.average,
                    favoriteVehicleType: analytics.preferences.favoriteVehicleType,
                    completionRate: analytics.rides.completionRate
                },
                preferences: {
                    preferredTimeOfDay: analytics.preferences.preferredTimeOfDay,
                    preferredDayOfWeek: analytics.preferences.preferredDayOfWeek,
                    averageRideDistance: analytics.preferences.averageRideDistance
                },
                insights: {
                    topPickupLocations: analytics.locationInsights.topPickupLocations.slice(0, 3),
                    topDropoffLocations: analytics.locationInsights.topDropoffLocations.slice(0, 3),
                    favoriteDrivers: analytics.driverInsights.favoriteDrivers.slice(0, 3)
                }
            }
        });
    });

    /**
     * Export ride data (CSV format)
     */
    exportRideData = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const { entityId } = req.params;
        const { entityType = 'driver', startDate, endDate, format = 'csv' } = req.query;

        if (!['driver', 'customer'].includes(entityType as string)) {
            res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: 'entityType must be either "driver" or "customer"'
            });
            return;
        }

        const filters: any = {};
        if (startDate) filters.startDate = new Date(startDate as string);
        if (endDate) filters.endDate = new Date(endDate as string);

        const result = await analyticsService.getRideHistory(
            entityId,
            entityType as 'driver' | 'customer',
            filters,
            1000, // Max 1000 records for export
            0
        );

        if (format === 'csv') {
            // Generate CSV
            const csvHeaders = [
                'Ride ID',
                'Date',
                'Status',
                'Vehicle Type',
                'Pickup Address',
                'Dropoff Address',
                'Distance (m)',
                'Duration (s)',
                'Estimated Fare',
                'Final Fare',
                'Rating',
                'Review'
            ];

            const csvRows = result.rides.map(ride => [
                ride._id,
                ride.createdAt.toISOString(),
                ride.status,
                ride.vehicleType,
                ride.pickupLocation.address || 'N/A',
                ride.dropoffLocation.address || 'N/A',
                ride.actualDistance || ride.estimatedDistance,
                ride.actualDuration || ride.estimatedDuration,
                ride.estimatedFare,
                ride.finalFare || 'N/A',
                entityType === 'driver' ? ride.driverRating || 'N/A' : ride.customerRating || 'N/A',
                entityType === 'driver' ? ride.driverReview || 'N/A' : ride.customerReview || 'N/A'
            ]);

            const csvContent = [csvHeaders, ...csvRows]
                .map(row => row.map(field => `"${field}"`).join(','))
                .join('\n');

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="rides_${entityId}_${Date.now()}.csv"`);
            res.send(csvContent);
        } else {
            res.json({
                success: true,
                data: result.rides,
                summary: result.summary
            });
        }
    });
}

export default new AnalyticsController();