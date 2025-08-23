import axios from 'axios';
import ApiError from '../utils/api-error';
import httpStatus from 'http-status';

export interface Location {
    latitude: number;
    longitude: number;
    address?: string;
}

export interface RoutePoint {
    latitude: number;
    longitude: number;
    timestamp?: Date;
}

export interface OptimizedRoute {
    distance: number; // in meters
    duration: number; // in seconds
    polyline: string; // encoded polyline
    coordinates: RoutePoint[];
    instructions: RouteInstruction[];
    trafficInfo?: TrafficInfo;
    alternativeRoutes?: AlternativeRoute[];
}

export interface RouteInstruction {
    instruction: string;
    distance: number;
    duration: number;
    maneuver: string;
    location: Location;
}

export interface TrafficInfo {
    currentTrafficMultiplier: number;
    historicalTrafficMultiplier: number;
    incidents: TrafficIncident[];
    congestionLevel: 'low' | 'moderate' | 'high' | 'severe';
}

export interface TrafficIncident {
    type: 'accident' | 'construction' | 'closure' | 'congestion';
    description: string;
    location: Location;
    severity: 'minor' | 'moderate' | 'major';
    estimatedDelay: number; // in seconds
}

export interface AlternativeRoute {
    name: string;
    distance: number;
    duration: number;
    trafficDuration: number;
    polyline: string;
    description: string;
}

export interface MultiStopRoute {
    totalDistance: number;
    totalDuration: number;
    stops: {
        location: Location;
        arrivalTime: Date;
        departureTime: Date;
        distanceFromPrevious: number;
        durationFromPrevious: number;
    }[];
    optimizedOrder: number[];
    route: OptimizedRoute;
}

class RouteOptimizationService {
    private readonly mapboxApiKey: string;
    private readonly googleMapsApiKey: string;
    private readonly tomtomApiKey: string;

    constructor() {
        this.mapboxApiKey = process.env.MAPBOX_API_KEY || '';
        this.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || '';
        this.tomtomApiKey = process.env.TOMTOM_API_KEY || '';
    }

    /**
     * Get optimized route between two points
     */
    async getOptimizedRoute(
        origin: Location,
        destination: Location,
        options: {
            avoidTolls?: boolean;
            avoidHighways?: boolean;
            vehicleType?: 'car' | 'motorcycle' | 'bicycle';
            departureTime?: Date;
            includeAlternatives?: boolean;
            includeTraffic?: boolean;
        } = {}
    ): Promise<OptimizedRoute> {
        try {
            // Primary: Use Google Maps for best accuracy
            if (this.googleMapsApiKey) {
                return await this.getGoogleMapsRoute(origin, destination, options);
            }

            // Fallback: Use Mapbox
            if (this.mapboxApiKey) {
                return await this.getMapboxRoute(origin, destination, options);
            }

            // Fallback: Use TomTom
            if (this.tomtomApiKey) {
                return await this.getTomTomRoute(origin, destination, options);
            }

            throw new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'No mapping service available');
        } catch (error) {
            console.error('Route optimization error:', error);

            // Fallback to simple calculation
            return this.getFallbackRoute(origin, destination);
        }
    }

    /**
     * Optimize route for multiple stops (traveling salesman problem)
     */
    async optimizeMultiStopRoute(
        origin: Location,
        destinations: Location[],
        returnToOrigin: boolean = false,
        options: {
            vehicleType?: 'car' | 'motorcycle' | 'bicycle';
            departureTime?: Date;
            maxStops?: number;
        } = {}
    ): Promise<MultiStopRoute> {
        if (destinations.length === 0) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'At least one destination is required');
        }

        if (destinations.length > (options.maxStops || 10)) {
            throw new ApiError(httpStatus.BAD_REQUEST, `Maximum ${options.maxStops || 10} stops allowed`);
        }

        try {
            // For small number of destinations, use brute force optimization
            if (destinations.length <= 8) {
                return await this.bruteForceOptimization(origin, destinations, returnToOrigin, options);
            }

            // For larger sets, use nearest neighbor heuristic
            return await this.nearestNeighborOptimization(origin, destinations, returnToOrigin, options);
        } catch (error) {
            console.error('Multi-stop optimization error:', error);
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to optimize multi-stop route');
        }
    }

    /**
     * Get real-time traffic information for a route
     */
    async getTrafficInfo(route: OptimizedRoute): Promise<TrafficInfo> {
        try {
            // Use Google Maps Traffic API or similar
            const incidents = await this.getTrafficIncidents(route.coordinates);

            // Calculate traffic multipliers based on current conditions
            const currentTrafficMultiplier = await this.calculateTrafficMultiplier(route, 'current');
            const historicalTrafficMultiplier = await this.calculateTrafficMultiplier(route, 'historical');

            // Determine congestion level
            const congestionLevel = this.determineCongestionLevel(currentTrafficMultiplier);

            return {
                currentTrafficMultiplier,
                historicalTrafficMultiplier,
                incidents,
                congestionLevel
            };
        } catch (error) {
            console.error('Traffic info error:', error);

            // Return default traffic info
            return {
                currentTrafficMultiplier: 1.0,
                historicalTrafficMultiplier: 1.0,
                incidents: [],
                congestionLevel: 'low'
            };
        }
    }

    /**
     * Calculate ETA with real-time traffic
     */
    async calculateETAWithTraffic(
        origin: Location,
        destination: Location,
        departureTime: Date = new Date()
    ): Promise<{
        estimatedDuration: number;
        estimatedDurationInTraffic: number;
        trafficDelay: number;
        confidence: 'low' | 'medium' | 'high';
    }> {
        try {
            const route = await this.getOptimizedRoute(origin, destination, {
                departureTime,
                includeTraffic: true
            });

            const trafficInfo = await this.getTrafficInfo(route);

            const estimatedDuration = route.duration;
            const estimatedDurationInTraffic = Math.round(route.duration * trafficInfo.currentTrafficMultiplier);
            const trafficDelay = estimatedDurationInTraffic - estimatedDuration;

            // Calculate confidence based on data availability and route complexity
            const confidence = this.calculateETAConfidence(route, trafficInfo);

            return {
                estimatedDuration,
                estimatedDurationInTraffic,
                trafficDelay,
                confidence
            };
        } catch (error) {
            console.error('ETA calculation error:', error);

            // Fallback calculation
            const distance = this.calculateDistance(origin.latitude, origin.longitude, destination.latitude, destination.longitude);
            const estimatedDuration = Math.round((distance / 30) * 3600); // 30 km/h average

            return {
                estimatedDuration,
                estimatedDurationInTraffic: estimatedDuration,
                trafficDelay: 0,
                confidence: 'low'
            };
        }
    }

    /**
     * Find optimal pickup point for driver
     */
    async findOptimalPickupPoint(
        driverLocation: Location,
        passengerLocation: Location,
        destination: Location
    ): Promise<{
        pickupPoint: Location;
        driverToPickupRoute: OptimizedRoute;
        pickupToDestinationRoute: OptimizedRoute;
        totalTime: number;
        timeSaved: number;
    }> {
        // Generate potential pickup points around passenger location
        const pickupCandidates = this.generatePickupCandidates(passengerLocation);

        let bestOption = {
            pickupPoint: passengerLocation,
            driverToPickupRoute: await this.getOptimizedRoute(driverLocation, passengerLocation),
            pickupToDestinationRoute: await this.getOptimizedRoute(passengerLocation, destination),
            totalTime: 0,
            timeSaved: 0
        };

        // Calculate baseline (direct pickup)
        const baselineTime = bestOption.driverToPickupRoute.duration + bestOption.pickupToDestinationRoute.duration;
        bestOption.totalTime = baselineTime;

        // Test each pickup candidate
        for (const candidate of pickupCandidates) {
            try {
                const driverToPickup = await this.getOptimizedRoute(driverLocation, candidate);
                const pickupToDestination = await this.getOptimizedRoute(candidate, destination);
                const totalTime = driverToPickup.duration + pickupToDestination.duration;

                if (totalTime < bestOption.totalTime) {
                    bestOption = {
                        pickupPoint: candidate,
                        driverToPickupRoute: driverToPickup,
                        pickupToDestinationRoute: pickupToDestination,
                        totalTime,
                        timeSaved: baselineTime - totalTime
                    };
                }
            } catch (error) {
                // Skip this candidate if route calculation fails
                continue;
            }
        }

        return bestOption;
    }

    // Private helper methods

    private async getGoogleMapsRoute(
        origin: Location,
        destination: Location,
        options: any
    ): Promise<OptimizedRoute> {
        const params = new URLSearchParams({
            origin: `${origin.latitude},${origin.longitude}`,
            destination: `${destination.latitude},${destination.longitude}`,
            key: this.googleMapsApiKey,
            mode: options.vehicleType === 'motorcycle' ? 'driving' : 'driving',
            departure_time: options.departureTime ? Math.floor(options.departureTime.getTime() / 1000).toString() : 'now',
            traffic_model: 'best_guess',
            alternatives: options.includeAlternatives ? 'true' : 'false'
        });

        if (options.avoidTolls) params.append('avoid', 'tolls');
        if (options.avoidHighways) params.append('avoid', 'highways');

        const response = await axios.get(`https://maps.googleapis.com/maps/api/directions/json?${params}`);

        if (response.data.status !== 'OK') {
            throw new Error(`Google Maps API error: ${response.data.status}`);
        }

        const route = response.data.routes[0];
        const leg = route.legs[0];

        return {
            distance: leg.distance.value,
            duration: leg.duration.value,
            polyline: route.overview_polyline.points,
            coordinates: this.decodePolyline(route.overview_polyline.points),
            instructions: leg.steps.map((step: any) => ({
                instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
                distance: step.distance.value,
                duration: step.duration.value,
                maneuver: step.maneuver || 'straight',
                location: {
                    latitude: step.start_location.lat,
                    longitude: step.start_location.lng
                }
            })),
            alternativeRoutes: options.includeAlternatives ? this.parseAlternativeRoutes(response.data.routes.slice(1)) : []
        };
    }

    private async getMapboxRoute(
        origin: Location,
        destination: Location,
        options: any
    ): Promise<OptimizedRoute> {
        const profile = options.vehicleType === 'motorcycle' ? 'driving' : 'driving-traffic';
        const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;

        const params = new URLSearchParams({
            access_token: this.mapboxApiKey,
            geometries: 'geojson',
            steps: 'true',
            alternatives: options.includeAlternatives ? 'true' : 'false'
        });

        const response = await axios.get(`https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}?${params}`);

        if (response.data.code !== 'Ok') {
            throw new Error(`Mapbox API error: ${response.data.code}`);
        }

        const route = response.data.routes[0];

        return {
            distance: route.distance,
            duration: route.duration,
            polyline: this.encodePolyline(route.geometry.coordinates),
            coordinates: route.geometry.coordinates.map((coord: number[]) => ({
                latitude: coord[1],
                longitude: coord[0]
            })),
            instructions: route.legs[0].steps.map((step: any) => ({
                instruction: step.maneuver.instruction,
                distance: step.distance,
                duration: step.duration,
                maneuver: step.maneuver.type,
                location: {
                    latitude: step.maneuver.location[1],
                    longitude: step.maneuver.location[0]
                }
            })),
            alternativeRoutes: options.includeAlternatives ? this.parseMapboxAlternatives(response.data.routes.slice(1)) : []
        };
    }

    private async getTomTomRoute(
        origin: Location,
        destination: Location,
        options: any
    ): Promise<OptimizedRoute> {
        const params = new URLSearchParams({
            key: this.tomtomApiKey,
            routeType: 'fastest',
            traffic: 'true',
            instructionsType: 'text'
        });

        const coordinates = `${origin.latitude},${origin.longitude}:${destination.latitude},${destination.longitude}`;

        const response = await axios.get(`https://api.tomtom.com/routing/1/calculateRoute/${coordinates}/json?${params}`);

        if (!response.data.routes || response.data.routes.length === 0) {
            throw new Error('TomTom API: No routes found');
        }

        const route = response.data.routes[0];
        const summary = route.summary;

        return {
            distance: summary.lengthInMeters,
            duration: summary.travelTimeInSeconds,
            polyline: this.encodePolyline(route.legs[0].points.map((p: any) => [p.longitude, p.latitude])),
            coordinates: route.legs[0].points.map((point: any) => ({
                latitude: point.latitude,
                longitude: point.longitude
            })),
            instructions: route.guidance?.instructions?.map((instruction: any) => ({
                instruction: instruction.message,
                distance: instruction.routeOffsetInMeters || 0,
                duration: instruction.travelTimeInSeconds || 0,
                maneuver: instruction.maneuver || 'straight',
                location: {
                    latitude: instruction.point?.latitude || 0,
                    longitude: instruction.point?.longitude || 0
                }
            })) || [],
            alternativeRoutes: []
        };
    }

    private getFallbackRoute(origin: Location, destination: Location): OptimizedRoute {
        const distance = this.calculateDistance(origin.latitude, origin.longitude, destination.latitude, destination.longitude);
        const duration = Math.round((distance / 30) * 3600); // 30 km/h average speed

        return {
            distance: Math.round(distance * 1000), // Convert to meters
            duration,
            polyline: '',
            coordinates: [
                { latitude: origin.latitude, longitude: origin.longitude },
                { latitude: destination.latitude, longitude: destination.longitude }
            ],
            instructions: [{
                instruction: `Head to ${destination.address || 'destination'}`,
                distance: Math.round(distance * 1000),
                duration,
                maneuver: 'straight',
                location: origin
            }],
            alternativeRoutes: []
        };
    }

    private async bruteForceOptimization(
        origin: Location,
        destinations: Location[],
        returnToOrigin: boolean,
        options: any
    ): Promise<MultiStopRoute> {
        // Generate all possible permutations
        const permutations = this.generatePermutations(destinations);
        let bestRoute: MultiStopRoute | null = null;
        let bestDistance = Infinity;

        for (const permutation of permutations) {
            try {
                const route = await this.calculateMultiStopRoute(origin, permutation, returnToOrigin, options);

                if (route.totalDistance < bestDistance) {
                    bestDistance = route.totalDistance;
                    bestRoute = route;
                }
            } catch (error) {
                // Skip this permutation if calculation fails
                continue;
            }
        }

        if (!bestRoute) {
            throw new Error('Failed to calculate any valid route');
        }

        return bestRoute;
    }

    private async nearestNeighborOptimization(
        origin: Location,
        destinations: Location[],
        returnToOrigin: boolean,
        options: any
    ): Promise<MultiStopRoute> {
        const unvisited = [...destinations];
        const optimizedOrder: number[] = [];
        let currentLocation = origin;

        // Nearest neighbor algorithm
        while (unvisited.length > 0) {
            let nearestIndex = 0;
            let nearestDistance = Infinity;

            for (let i = 0; i < unvisited.length; i++) {
                const distance = this.calculateDistance(
                    currentLocation.latitude,
                    currentLocation.longitude,
                    unvisited[i].latitude,
                    unvisited[i].longitude
                );

                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestIndex = i;
                }
            }

            const nearest = unvisited.splice(nearestIndex, 1)[0];
            optimizedOrder.push(destinations.indexOf(nearest));
            currentLocation = nearest;
        }

        const optimizedDestinations = optimizedOrder.map(index => destinations[index]);
        return await this.calculateMultiStopRoute(origin, optimizedDestinations, returnToOrigin, options);
    }

    private async calculateMultiStopRoute(
        origin: Location,
        destinations: Location[],
        returnToOrigin: boolean,
        options: any
    ): Promise<MultiStopRoute> {
        const stops = [];
        let totalDistance = 0;
        let totalDuration = 0;
        let currentLocation = origin;
        let currentTime = options.departureTime || new Date();

        // Calculate route for each segment
        for (let i = 0; i < destinations.length; i++) {
            const destination = destinations[i];
            const route = await this.getOptimizedRoute(currentLocation, destination, options);

            totalDistance += route.distance;
            totalDuration += route.duration;

            currentTime = new Date(currentTime.getTime() + route.duration * 1000);

            stops.push({
                location: destination,
                arrivalTime: new Date(currentTime),
                departureTime: new Date(currentTime.getTime() + 5 * 60 * 1000), // 5 min stop
                distanceFromPrevious: route.distance,
                durationFromPrevious: route.duration
            });

            currentLocation = destination;
            currentTime = new Date(currentTime.getTime() + 5 * 60 * 1000); // Add stop time
        }

        // Return to origin if required
        if (returnToOrigin) {
            const returnRoute = await this.getOptimizedRoute(currentLocation, origin, options);
            totalDistance += returnRoute.distance;
            totalDuration += returnRoute.duration;
        }

        // Get the complete route
        const allLocations = [origin, ...destinations];
        if (returnToOrigin) allLocations.push(origin);

        const completeRoute = await this.getOptimizedRoute(allLocations[0], allLocations[allLocations.length - 1], options);

        return {
            totalDistance,
            totalDuration,
            stops,
            optimizedOrder: destinations.map((_, index) => index),
            route: completeRoute
        };
    }

    private generatePickupCandidates(passengerLocation: Location): Location[] {
        const candidates: Location[] = [];
        const radius = 0.002; // Approximately 200 meters
        const points = 8;

        for (let i = 0; i < points; i++) {
            const angle = (i * 2 * Math.PI) / points;
            const lat = passengerLocation.latitude + radius * Math.cos(angle);
            const lng = passengerLocation.longitude + radius * Math.sin(angle);

            candidates.push({
                latitude: lat,
                longitude: lng,
                address: `Pickup point ${i + 1}`
            });
        }

        return candidates;
    }

    private async getTrafficIncidents(coordinates: RoutePoint[]): Promise<TrafficIncident[]> {
        // In a real implementation, this would call traffic APIs
        // For now, return mock data
        return [];
    }

    private async calculateTrafficMultiplier(route: OptimizedRoute, type: 'current' | 'historical'): Promise<number> {
        // In a real implementation, this would analyze traffic data
        const hour = new Date().getHours();

        // Rush hour multiplier
        if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
            return type === 'current' ? 1.4 : 1.3;
        }

        return 1.0;
    }

    private determineCongestionLevel(trafficMultiplier: number): 'low' | 'moderate' | 'high' | 'severe' {
        if (trafficMultiplier >= 2.0) return 'severe';
        if (trafficMultiplier >= 1.5) return 'high';
        if (trafficMultiplier >= 1.2) return 'moderate';
        return 'low';
    }

    private calculateETAConfidence(route: OptimizedRoute, trafficInfo: TrafficInfo): 'low' | 'medium' | 'high' {
        // Simple confidence calculation based on route complexity and traffic data availability
        if (route.distance < 5000 && trafficInfo.incidents.length === 0) return 'high';
        if (route.distance < 15000 && trafficInfo.incidents.length <= 2) return 'medium';
        return 'low';
    }

    private generatePermutations<T>(array: T[]): T[][] {
        if (array.length <= 1) return [array];

        const result: T[][] = [];
        for (let i = 0; i < array.length; i++) {
            const rest = array.slice(0, i).concat(array.slice(i + 1));
            const restPermutations = this.generatePermutations(rest);

            for (const permutation of restPermutations) {
                result.push([array[i], ...permutation]);
            }
        }

        return result;
    }

    private parseAlternativeRoutes(routes: any[]): AlternativeRoute[] {
        return routes.map((route, index) => ({
            name: `Alternative ${index + 1}`,
            distance: route.legs[0].distance.value,
            duration: route.legs[0].duration.value,
            trafficDuration: route.legs[0].duration_in_traffic?.value || route.legs[0].duration.value,
            polyline: route.overview_polyline.points,
            description: `Via ${route.summary}`
        }));
    }

    private parseMapboxAlternatives(routes: any[]): AlternativeRoute[] {
        return routes.map((route, index) => ({
            name: `Alternative ${index + 1}`,
            distance: route.distance,
            duration: route.duration,
            trafficDuration: route.duration,
            polyline: this.encodePolyline(route.geometry.coordinates),
            description: `Alternative route ${index + 1}`
        }));
    }

    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRadians(lat1)) *
            Math.cos(this.toRadians(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private toRadians(degrees: number): number {
        return degrees * (Math.PI / 180);
    }

    private decodePolyline(encoded: string): RoutePoint[] {
        // Simplified polyline decoding - in production, use a proper library
        return [];
    }

    private encodePolyline(coordinates: number[][]): string {
        // Simplified polyline encoding - in production, use a proper library
        return '';
    }
}

export default new RouteOptimizationService();