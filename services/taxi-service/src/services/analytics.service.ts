import Ride, { IRide, RideStatus } from '../models/ride.model';
import Driver, { IDriver, VehicleType } from '../models/driver.model';
import Customer, { ICustomer } from '../models/customer.model';
import ApiError from '../utils/api-error';
import httpStatus from 'http-status';

export interface RideHistoryFilter {
    startDate?: Date;
    endDate?: Date;
    status?: RideStatus;
    vehicleType?: VehicleType;
    minRating?: number;
    maxRating?: number;
    minFare?: number;
    maxFare?: number;
}

export interface DriverAnalytics {
    driverId: string;
    period: {
        startDate: Date;
        endDate: Date;
    };
    rides: {
        total: number;
        completed: number;
        cancelled: number;
        completionRate: number;
    };
    earnings: {
        total: number;
        average: number;
        highest: number;
        lowest: number;
    };
    performance: {
        averageRating: number;
        totalRatings: number;
        averageResponseTime: number;
        averageRideDistance: number;
        averageRideDuration: number;
    };
    timeAnalysis: {
        peakHours: { hour: number; rideCount: number }[];
        busyDays: { day: string; rideCount: number }[];
        monthlyTrends: { month: string; rides: number; earnings: number }[];
    };
    customerInsights: {
        repeatCustomers: number;
        averageCustomerRating: number;
        topPickupLocations: { address: string; count: number }[];
        topDropoffLocations: { address: string; count: number }[];
    };
}

export interface PassengerAnalytics {
    customerId: string;
    period: {
        startDate: Date;
        endDate: Date;
    };
    rides: {
        total: number;
        completed: number;
        cancelled: number;
        completionRate: number;
    };
    spending: {
        total: number;
        average: number;
        highest: number;
        lowest: number;
    };
    preferences: {
        favoriteVehicleType: VehicleType;
        averageRideDistance: number;
        averageRideDuration: number;
        preferredTimeOfDay: string;
        preferredDayOfWeek: string;
    };
    driverInsights: {
        averageDriverRating: number;
        favoriteDrivers: { driverId: string; rideCount: number }[];
        totalUniqueDrivers: number;
    };
    locationInsights: {
        topPickupLocations: { address: string; count: number }[];
        topDropoffLocations: { address: string; count: number }[];
        averageDistanceFromHome: number;
    };
}

export interface SystemAnalytics {
    period: {
        startDate: Date;
        endDate: Date;
    };
    overview: {
        totalRides: number;
        totalRevenue: number;
        activeDrivers: number;
        activeCustomers: number;
        averageRideValue: number;
        completionRate: number;
    };
    trends: {
        dailyRides: { date: string; rides: number; revenue: number }[];
        hourlyDistribution: { hour: number; rides: number }[];
        vehicleTypeDistribution: { type: VehicleType; rides: number; revenue: number }[];
    };
    performance: {
        averageWaitTime: number;
        averageRideTime: number;
        customerSatisfaction: number;
        driverSatisfaction: number;
    };
    geography: {
        popularRoutes: {
            from: string;
            to: string;
            count: number;
            averageFare: number;
        }[];
        hotspots: {
            location: string;
            pickupCount: number;
            dropoffCount: number;
        }[];
    };
}

class AnalyticsService {
    /**
     * Get ride history with filters
     */
    async getRideHistory(
        entityId: string,
        entityType: 'driver' | 'customer',
        filters: RideHistoryFilter = {},
        limit: number = 50,
        offset: number = 0
    ): Promise<{
        rides: IRide[];
        total: number;
        summary: {
            totalRides: number;
            completedRides: number;
            cancelledRides: number;
            totalEarnings: number;
            averageRating: number;
        };
    }> {
        // Build query
        const query: any = {};

        if (entityType === 'driver') {
            query.driverId = entityId;
        } else {
            query.customerId = entityId;
        }

        if (filters.startDate || filters.endDate) {
            query.createdAt = {};
            if (filters.startDate) query.createdAt.$gte = filters.startDate;
            if (filters.endDate) query.createdAt.$lte = filters.endDate;
        }

        if (filters.status) {
            query.status = filters.status;
        }

        if (filters.vehicleType) {
            query.vehicleType = filters.vehicleType;
        }

        if (filters.minFare || filters.maxFare) {
            query.finalFare = {};
            if (filters.minFare) query.finalFare.$gte = filters.minFare;
            if (filters.maxFare) query.finalFare.$lte = filters.maxFare;
        }

        // Rating filters
        if (filters.minRating || filters.maxRating) {
            const ratingField = entityType === 'driver' ? 'driverRating' : 'customerRating';
            query[ratingField] = {};
            if (filters.minRating) query[ratingField].$gte = filters.minRating;
            if (filters.maxRating) query[ratingField].$lte = filters.maxRating;
        }

        // Get rides
        const rides = await Ride.find(query)
            .populate(entityType === 'customer' ? 'driverId' : '')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(offset);

        const total = await Ride.countDocuments(query);

        // Calculate summary
        const allRides = await Ride.find(query);
        const completedRides = allRides.filter(ride => ride.status === RideStatus.COMPLETED);
        const cancelledRides = allRides.filter(ride => ride.status === RideStatus.CANCELLED);
        const totalEarnings = completedRides.reduce((sum, ride) => sum + (ride.finalFare || 0), 0);

        const ratingField = entityType === 'driver' ? 'driverRating' : 'customerRating';
        const ratedRides = allRides.filter(ride => ride[ratingField] !== undefined);
        const averageRating = ratedRides.length > 0
            ? ratedRides.reduce((sum, ride) => sum + (ride[ratingField] || 0), 0) / ratedRides.length
            : 0;

        return {
            rides,
            total,
            summary: {
                totalRides: allRides.length,
                completedRides: completedRides.length,
                cancelledRides: cancelledRides.length,
                totalEarnings: Math.round(totalEarnings * 100) / 100,
                averageRating: Math.round(averageRating * 100) / 100
            }
        };
    }

    /**
     * Get comprehensive driver analytics
     */
    async getDriverAnalytics(
        driverId: string,
        startDate: Date,
        endDate: Date
    ): Promise<DriverAnalytics> {
        const driver = await Driver.findById(driverId);
        if (!driver) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Driver not found');
        }

        // Get all rides in period
        const rides = await Ride.find({
            driverId,
            createdAt: { $gte: startDate, $lte: endDate }
        }).sort({ createdAt: -1 });

        const completedRides = rides.filter(ride => ride.status === RideStatus.COMPLETED);
        const cancelledRides = rides.filter(ride => ride.status === RideStatus.CANCELLED);

        // Basic ride statistics
        const rideStats = {
            total: rides.length,
            completed: completedRides.length,
            cancelled: cancelledRides.length,
            completionRate: rides.length > 0 ? (completedRides.length / rides.length) * 100 : 0
        };

        // Earnings analysis
        const earnings = completedRides.map(ride => ride.finalFare || 0);
        const earningsStats = {
            total: earnings.reduce((sum, fare) => sum + fare, 0),
            average: earnings.length > 0 ? earnings.reduce((sum, fare) => sum + fare, 0) / earnings.length : 0,
            highest: earnings.length > 0 ? Math.max(...earnings) : 0,
            lowest: earnings.length > 0 ? Math.min(...earnings) : 0
        };

        // Performance metrics
        const ratedRides = rides.filter(ride => ride.driverRating !== undefined);
        const averageRating = ratedRides.length > 0
            ? ratedRides.reduce((sum, ride) => sum + (ride.driverRating || 0), 0) / ratedRides.length
            : 0;

        const ridesWithResponseTime = rides.filter(ride => ride.acceptedAt);
        const averageResponseTime = ridesWithResponseTime.length > 0
            ? ridesWithResponseTime.reduce((sum, ride) => {
                return sum + (ride.acceptedAt!.getTime() - ride.createdAt.getTime());
            }, 0) / ridesWithResponseTime.length / 1000
            : 0;

        const averageRideDistance = completedRides.length > 0
            ? completedRides.reduce((sum, ride) => sum + (ride.actualDistance || ride.estimatedDistance), 0) / completedRides.length
            : 0;

        const averageRideDuration = completedRides.length > 0
            ? completedRides.reduce((sum, ride) => sum + (ride.actualDuration || ride.estimatedDuration), 0) / completedRides.length
            : 0;

        // Time analysis
        const hourlyRides: { [hour: number]: number } = {};
        const dailyRides: { [day: string]: number } = {};
        const monthlyData: { [month: string]: { rides: number; earnings: number } } = {};

        rides.forEach(ride => {
            const hour = ride.createdAt.getHours();
            const day = ride.createdAt.toLocaleDateString('en-US', { weekday: 'long' });
            const month = ride.createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

            hourlyRides[hour] = (hourlyRides[hour] || 0) + 1;
            dailyRides[day] = (dailyRides[day] || 0) + 1;

            if (!monthlyData[month]) {
                monthlyData[month] = { rides: 0, earnings: 0 };
            }
            monthlyData[month].rides++;
            if (ride.status === RideStatus.COMPLETED) {
                monthlyData[month].earnings += ride.finalFare || 0;
            }
        });

        const peakHours = Object.entries(hourlyRides)
            .map(([hour, count]) => ({ hour: parseInt(hour), rideCount: count }))
            .sort((a, b) => b.rideCount - a.rideCount)
            .slice(0, 5);

        const busyDays = Object.entries(dailyRides)
            .map(([day, count]) => ({ day, rideCount: count }))
            .sort((a, b) => b.rideCount - a.rideCount);

        const monthlyTrends = Object.entries(monthlyData)
            .map(([month, data]) => ({ month, rides: data.rides, earnings: data.earnings }));

        // Customer insights
        const customerRides: { [customerId: string]: number } = {};
        const pickupLocations: { [address: string]: number } = {};
        const dropoffLocations: { [address: string]: number } = {};

        rides.forEach(ride => {
            customerRides[ride.customerId] = (customerRides[ride.customerId] || 0) + 1;

            if (ride.pickupLocation.address) {
                pickupLocations[ride.pickupLocation.address] = (pickupLocations[ride.pickupLocation.address] || 0) + 1;
            }

            if (ride.dropoffLocation.address) {
                dropoffLocations[ride.dropoffLocation.address] = (dropoffLocations[ride.dropoffLocation.address] || 0) + 1;
            }
        });

        const repeatCustomers = Object.values(customerRides).filter(count => count > 1).length;

        const customerRatedRides = rides.filter(ride => ride.customerRating !== undefined);
        const averageCustomerRating = customerRatedRides.length > 0
            ? customerRatedRides.reduce((sum, ride) => sum + (ride.customerRating || 0), 0) / customerRatedRides.length
            : 0;

        const topPickupLocations = Object.entries(pickupLocations)
            .map(([address, count]) => ({ address, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        const topDropoffLocations = Object.entries(dropoffLocations)
            .map(([address, count]) => ({ address, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return {
            driverId,
            period: { startDate, endDate },
            rides: rideStats,
            earnings: earningsStats,
            performance: {
                averageRating: Math.round(averageRating * 100) / 100,
                totalRatings: ratedRides.length,
                averageResponseTime: Math.round(averageResponseTime),
                averageRideDistance: Math.round(averageRideDistance),
                averageRideDuration: Math.round(averageRideDuration)
            },
            timeAnalysis: {
                peakHours,
                busyDays,
                monthlyTrends
            },
            customerInsights: {
                repeatCustomers,
                averageCustomerRating: Math.round(averageCustomerRating * 100) / 100,
                topPickupLocations,
                topDropoffLocations
            }
        };
    }

    /**
     * Get comprehensive passenger analytics
     */
    async getPassengerAnalytics(
        customerId: string,
        startDate: Date,
        endDate: Date
    ): Promise<PassengerAnalytics> {
        const customer = await Customer.findOne({ userId: customerId });
        if (!customer) {
            throw new ApiError(httpStatus.NOT_FOUND, 'Customer not found');
        }

        // Get all rides in period
        const rides = await Ride.find({
            customerId,
            createdAt: { $gte: startDate, $lte: endDate }
        }).populate('driverId').sort({ createdAt: -1 });

        const completedRides = rides.filter(ride => ride.status === RideStatus.COMPLETED);
        const cancelledRides = rides.filter(ride => ride.status === RideStatus.CANCELLED);

        // Basic ride statistics
        const rideStats = {
            total: rides.length,
            completed: completedRides.length,
            cancelled: cancelledRides.length,
            completionRate: rides.length > 0 ? (completedRides.length / rides.length) * 100 : 0
        };

        // Spending analysis
        const spending = completedRides.map(ride => ride.finalFare || 0);
        const spendingStats = {
            total: spending.reduce((sum, fare) => sum + fare, 0),
            average: spending.length > 0 ? spending.reduce((sum, fare) => sum + fare, 0) / spending.length : 0,
            highest: spending.length > 0 ? Math.max(...spending) : 0,
            lowest: spending.length > 0 ? Math.min(...spending) : 0
        };

        // Preferences analysis
        const vehicleTypeCounts: { [type: string]: number } = {};
        const hourCounts: { [hour: number]: number } = {};
        const dayCounts: { [day: number]: number } = {};

        rides.forEach(ride => {
            vehicleTypeCounts[ride.vehicleType] = (vehicleTypeCounts[ride.vehicleType] || 0) + 1;
            hourCounts[ride.createdAt.getHours()] = (hourCounts[ride.createdAt.getHours()] || 0) + 1;
            dayCounts[ride.createdAt.getDay()] = (dayCounts[ride.createdAt.getDay()] || 0) + 1;
        });

        const favoriteVehicleType = Object.entries(vehicleTypeCounts)
            .sort(([, a], [, b]) => b - a)[0]?.[0] as VehicleType || VehicleType.REGULAR;

        const averageRideDistance = completedRides.length > 0
            ? completedRides.reduce((sum, ride) => sum + (ride.actualDistance || ride.estimatedDistance), 0) / completedRides.length
            : 0;

        const averageRideDuration = completedRides.length > 0
            ? completedRides.reduce((sum, ride) => sum + (ride.actualDuration || ride.estimatedDuration), 0) / completedRides.length
            : 0;

        const preferredHour = Object.entries(hourCounts)
            .sort(([, a], [, b]) => b - a)[0]?.[0];
        const preferredTimeOfDay = this.getTimeOfDayLabel(parseInt(preferredHour || '12'));

        const preferredDay = Object.entries(dayCounts)
            .sort(([, a], [, b]) => b - a)[0]?.[0];
        const preferredDayOfWeek = this.getDayOfWeekLabel(parseInt(preferredDay || '0'));

        // Driver insights
        const driverRides: { [driverId: string]: number } = {};
        const driverRatings: number[] = [];

        rides.forEach(ride => {
            if (ride.driverId) {
                const driverIdStr = ride.driverId.toString();
                driverRides[driverIdStr] = (driverRides[driverIdStr] || 0) + 1;
            }

            if (ride.driverRating) {
                driverRatings.push(ride.driverRating);
            }
        });

        const averageDriverRating = driverRatings.length > 0
            ? driverRatings.reduce((sum, rating) => sum + rating, 0) / driverRatings.length
            : 0;

        const favoriteDrivers = Object.entries(driverRides)
            .map(([driverId, rideCount]) => ({ driverId, rideCount }))
            .sort((a, b) => b.rideCount - a.rideCount)
            .slice(0, 5);

        // Location insights
        const pickupLocations: { [address: string]: number } = {};
        const dropoffLocations: { [address: string]: number } = {};

        rides.forEach(ride => {
            if (ride.pickupLocation.address) {
                pickupLocations[ride.pickupLocation.address] = (pickupLocations[ride.pickupLocation.address] || 0) + 1;
            }

            if (ride.dropoffLocation.address) {
                dropoffLocations[ride.dropoffLocation.address] = (dropoffLocations[ride.dropoffLocation.address] || 0) + 1;
            }
        });

        const topPickupLocations = Object.entries(pickupLocations)
            .map(([address, count]) => ({ address, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        const topDropoffLocations = Object.entries(dropoffLocations)
            .map(([address, count]) => ({ address, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return {
            customerId,
            period: { startDate, endDate },
            rides: rideStats,
            spending: spendingStats,
            preferences: {
                favoriteVehicleType,
                averageRideDistance: Math.round(averageRideDistance),
                averageRideDuration: Math.round(averageRideDuration),
                preferredTimeOfDay,
                preferredDayOfWeek
            },
            driverInsights: {
                averageDriverRating: Math.round(averageDriverRating * 100) / 100,
                favoriteDrivers,
                totalUniqueDrivers: Object.keys(driverRides).length
            },
            locationInsights: {
                topPickupLocations,
                topDropoffLocations,
                averageDistanceFromHome: 0 // Would calculate based on home address
            }
        };
    }

    /**
     * Get system-wide analytics
     */
    async getSystemAnalytics(startDate: Date, endDate: Date): Promise<SystemAnalytics> {
        // Get all rides in period
        const rides = await Ride.find({
            createdAt: { $gte: startDate, $lte: endDate }
        });

        const completedRides = rides.filter(ride => ride.status === RideStatus.COMPLETED);
        const totalRevenue = completedRides.reduce((sum, ride) => sum + (ride.finalFare || 0), 0);

        // Get active users
        const activeDrivers = await Driver.countDocuments({
            updatedAt: { $gte: startDate },
            isActive: true
        });

        const activeCustomers = await Customer.countDocuments({
            updatedAt: { $gte: startDate }
        });

        // Overview stats
        const overview = {
            totalRides: rides.length,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            activeDrivers,
            activeCustomers,
            averageRideValue: completedRides.length > 0 ? totalRevenue / completedRides.length : 0,
            completionRate: rides.length > 0 ? (completedRides.length / rides.length) * 100 : 0
        };

        // Daily trends
        const dailyData: { [date: string]: { rides: number; revenue: number } } = {};
        rides.forEach(ride => {
            const date = ride.createdAt.toISOString().split('T')[0];
            if (!dailyData[date]) {
                dailyData[date] = { rides: 0, revenue: 0 };
            }
            dailyData[date].rides++;
            if (ride.status === RideStatus.COMPLETED) {
                dailyData[date].revenue += ride.finalFare || 0;
            }
        });

        const dailyRides = Object.entries(dailyData)
            .map(([date, data]) => ({ date, rides: data.rides, revenue: data.revenue }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // Hourly distribution
        const hourlyData: { [hour: number]: number } = {};
        rides.forEach(ride => {
            const hour = ride.createdAt.getHours();
            hourlyData[hour] = (hourlyData[hour] || 0) + 1;
        });

        const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => ({
            hour,
            rides: hourlyData[hour] || 0
        }));

        // Vehicle type distribution
        const vehicleTypeData: { [type: string]: { rides: number; revenue: number } } = {};
        rides.forEach(ride => {
            if (!vehicleTypeData[ride.vehicleType]) {
                vehicleTypeData[ride.vehicleType] = { rides: 0, revenue: 0 };
            }
            vehicleTypeData[ride.vehicleType].rides++;
            if (ride.status === RideStatus.COMPLETED) {
                vehicleTypeData[ride.vehicleType].revenue += ride.finalFare || 0;
            }
        });

        const vehicleTypeDistribution = Object.entries(vehicleTypeData)
            .map(([type, data]) => ({ type: type as VehicleType, rides: data.rides, revenue: data.revenue }));

        // Performance metrics
        const ridesWithWaitTime = rides.filter(ride => ride.acceptedAt);
        const averageWaitTime = ridesWithWaitTime.length > 0
            ? ridesWithWaitTime.reduce((sum, ride) => {
                return sum + (ride.acceptedAt!.getTime() - ride.createdAt.getTime());
            }, 0) / ridesWithWaitTime.length / 1000
            : 0;

        const averageRideTime = completedRides.length > 0
            ? completedRides.reduce((sum, ride) => sum + (ride.actualDuration || ride.estimatedDuration), 0) / completedRides.length
            : 0;

        const customerRatedRides = rides.filter(ride => ride.driverRating !== undefined);
        const customerSatisfaction = customerRatedRides.length > 0
            ? customerRatedRides.reduce((sum, ride) => sum + (ride.driverRating || 0), 0) / customerRatedRides.length
            : 0;

        const driverRatedRides = rides.filter(ride => ride.customerRating !== undefined);
        const driverSatisfaction = driverRatedRides.length > 0
            ? driverRatedRides.reduce((sum, ride) => sum + (ride.customerRating || 0), 0) / driverRatedRides.length
            : 0;

        return {
            period: { startDate, endDate },
            overview,
            trends: {
                dailyRides,
                hourlyDistribution,
                vehicleTypeDistribution
            },
            performance: {
                averageWaitTime: Math.round(averageWaitTime),
                averageRideTime: Math.round(averageRideTime),
                customerSatisfaction: Math.round(customerSatisfaction * 100) / 100,
                driverSatisfaction: Math.round(driverSatisfaction * 100) / 100
            },
            geography: {
                popularRoutes: [], // Would implement with actual route analysis
                hotspots: [] // Would implement with location clustering
            }
        };
    }

    /**
     * Get time of day label
     */
    private getTimeOfDayLabel(hour: number): string {
        if (hour >= 5 && hour < 12) return 'Morning';
        if (hour >= 12 && hour < 17) return 'Afternoon';
        if (hour >= 17 && hour < 21) return 'Evening';
        return 'Night';
    }

    /**
     * Get day of week label
     */
    private getDayOfWeekLabel(day: number): string {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[day] || 'Unknown';
    }
}

export default new AnalyticsService();