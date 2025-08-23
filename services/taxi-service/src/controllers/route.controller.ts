import { Request, Response } from 'express';
import routeOptimizationService from '../services/route-optimization.service';
import catchAsync from '../utils/catch-async';
import httpStatus from 'http-status';

class RouteController {
    /**
     * Get optimized route between two points
     */
    getOptimizedRoute = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const {
            originLatitude,
            originLongitude,
            destinationLatitude,
            destinationLongitude,
            vehicleType = 'car',
            avoidTolls = false,
            avoidHighways = false,
            includeAlternatives = false,
            includeTraffic = true
        } = req.body;

        if (!originLatitude || !originLongitude || !destinationLatitude || !destinationLongitude) {
            res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Origin and destination coordinates are required'
            });
            return;
        }

        const origin = {
            latitude: parseFloat(originLatitude),
            longitude: parseFloat(originLongitude)
        };

        const destination = {
            latitude: parseFloat(destinationLatitude),
            longitude: parseFloat(destinationLongitude)
        };

        const options = {
            vehicleType: vehicleType as 'car' | 'motorcycle' | 'bicycle',
            avoidTolls: Boolean(avoidTolls),
            avoidHighways: Boolean(avoidHighways),
            includeAlternatives: Boolean(includeAlternatives),
            includeTraffic: Boolean(includeTraffic),
            departureTime: new Date()
        };

        const route = await routeOptimizationService.getOptimizedRoute(origin, destination, options);

        res.json({
            success: true,
            data: {
                distance: route.distance,
                duration: route.duration,
                polyline: route.polyline,
                instructions: route.instructions,
                trafficInfo: route.trafficInfo,
                alternativeRoutes: route.alternativeRoutes || []
            }
        });
    });

    /**
     * Optimize multi-stop route
     */
    optimizeMultiStopRoute = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const {
            originLatitude,
            originLongitude,
            destinations,
            returnToOrigin = false,
            vehicleType = 'car',
            maxStops = 10
        } = req.body;

        if (!originLatitude || !originLongitude || !destinations || !Array.isArray(destinations)) {
            res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Origin coordinates and destinations array are required'
            });
            return;
        }

        if (destinations.length === 0) {
            res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: 'At least one destination is required'
            });
            return;
        }

        if (destinations.length > maxStops) {
            res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: `Maximum ${maxStops} destinations allowed`
            });
            return;
        }

        const origin = {
            latitude: parseFloat(originLatitude),
            longitude: parseFloat(originLongitude)
        };

        const destinationPoints = destinations.map((dest: any) => ({
            latitude: parseFloat(dest.latitude),
            longitude: parseFloat(dest.longitude),
            address: dest.address
        }));

        const options = {
            vehicleType: vehicleType as 'car' | 'motorcycle' | 'bicycle',
            departureTime: new Date(),
            maxStops
        };

        const optimizedRoute = await routeOptimizationService.optimizeMultiStopRoute(
            origin,
            destinationPoints,
            Boolean(returnToOrigin),
            options
        );

        res.json({
            success: true,
            data: {
                totalDistance: optimizedRoute.totalDistance,
                totalDuration: optimizedRoute.totalDuration,
                optimizedOrder: optimizedRoute.optimizedOrder,
                stops: optimizedRoute.stops,
                route: {
                    polyline: optimizedRoute.route.polyline,
                    instructions: optimizedRoute.route.instructions
                }
            }
        });
    });

    /**
     * Calculate ETA with real-time traffic
     */
    calculateETAWithTraffic = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const {
            originLatitude,
            originLongitude,
            destinationLatitude,
            destinationLongitude,
            departureTime
        } = req.body;

        if (!originLatitude || !originLongitude || !destinationLatitude || !destinationLongitude) {
            res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Origin and destination coordinates are required'
            });
            return;
        }

        const origin = {
            latitude: parseFloat(originLatitude),
            longitude: parseFloat(originLongitude)
        };

        const destination = {
            latitude: parseFloat(destinationLatitude),
            longitude: parseFloat(destinationLongitude)
        };

        const departure = departureTime ? new Date(departureTime) : new Date();

        const etaResult = await routeOptimizationService.calculateETAWithTraffic(origin, destination, departure);

        res.json({
            success: true,
            data: {
                estimatedDuration: etaResult.estimatedDuration,
                estimatedDurationInTraffic: etaResult.estimatedDurationInTraffic,
                trafficDelay: etaResult.trafficDelay,
                confidence: etaResult.confidence,
                estimatedArrival: new Date(departure.getTime() + etaResult.estimatedDurationInTraffic * 1000)
            }
        });
    });

    /**
     * Find optimal pickup point
     */
    findOptimalPickupPoint = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const {
            driverLatitude,
            driverLongitude,
            passengerLatitude,
            passengerLongitude,
            destinationLatitude,
            destinationLongitude
        } = req.body;

        if (!driverLatitude || !driverLongitude || !passengerLatitude || !passengerLongitude ||
            !destinationLatitude || !destinationLongitude) {
            res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Driver, passenger, and destination coordinates are required'
            });
            return;
        }

        const driverLocation = {
            latitude: parseFloat(driverLatitude),
            longitude: parseFloat(driverLongitude)
        };

        const passengerLocation = {
            latitude: parseFloat(passengerLatitude),
            longitude: parseFloat(passengerLongitude)
        };

        const destination = {
            latitude: parseFloat(destinationLatitude),
            longitude: parseFloat(destinationLongitude)
        };

        const optimalPickup = await routeOptimizationService.findOptimalPickupPoint(
            driverLocation,
            passengerLocation,
            destination
        );

        res.json({
            success: true,
            data: {
                pickupPoint: optimalPickup.pickupPoint,
                totalTime: optimalPickup.totalTime,
                timeSaved: optimalPickup.timeSaved,
                driverToPickupRoute: {
                    distance: optimalPickup.driverToPickupRoute.distance,
                    duration: optimalPickup.driverToPickupRoute.duration,
                    polyline: optimalPickup.driverToPickupRoute.polyline
                },
                pickupToDestinationRoute: {
                    distance: optimalPickup.pickupToDestinationRoute.distance,
                    duration: optimalPickup.pickupToDestinationRoute.duration,
                    polyline: optimalPickup.pickupToDestinationRoute.polyline
                }
            }
        });
    });

    /**
     * Get traffic information for a route
     */
    getTrafficInfo = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const { coordinates } = req.body;

        if (!coordinates || !Array.isArray(coordinates)) {
            res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Route coordinates array is required'
            });
            return;
        }

        const routePoints = coordinates.map((coord: any) => ({
            latitude: parseFloat(coord.latitude),
            longitude: parseFloat(coord.longitude)
        }));

        // Create a mock route object for traffic analysis
        const mockRoute = {
            distance: 0,
            duration: 0,
            polyline: '',
            coordinates: routePoints,
            instructions: []
        };

        const trafficInfo = await routeOptimizationService.getTrafficInfo(mockRoute);

        res.json({
            success: true,
            data: trafficInfo
        });
    });

    /**
     * Get route suggestions based on historical data
     */
    getRouteSuggestions = catchAsync(async (req: Request, res: Response): Promise<void> => {
        const {
            originLatitude,
            originLongitude,
            timeOfDay,
            dayOfWeek,
            vehicleType = 'car'
        } = req.query;

        if (!originLatitude || !originLongitude) {
            res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: 'Origin coordinates are required'
            });
            return;
        }

        // In a real implementation, this would analyze historical ride data
        // to suggest popular destinations from this location at this time
        const mockSuggestions = [
            {
                destination: {
                    latitude: parseFloat(originLatitude as string) + 0.01,
                    longitude: parseFloat(originLongitude as string) + 0.01,
                    address: 'Popular destination 1'
                },
                frequency: 85,
                averageDuration: 1200,
                averageFare: 15.50
            },
            {
                destination: {
                    latitude: parseFloat(originLatitude as string) - 0.005,
                    longitude: parseFloat(originLongitude as string) + 0.015,
                    address: 'Popular destination 2'
                },
                frequency: 72,
                averageDuration: 900,
                averageFare: 12.25
            }
        ];

        res.json({
            success: true,
            data: {
                suggestions: mockSuggestions,
                basedOn: {
                    timeOfDay: timeOfDay || 'current',
                    dayOfWeek: dayOfWeek || 'current',
                    vehicleType
                }
            }
        });
    });
}

export default new RouteController();