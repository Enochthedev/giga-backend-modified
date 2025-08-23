import { VehicleType } from '../models/driver.model';
import { IRide } from '../models/ride.model';
import Driver from '../models/driver.model';
import Ride from '../models/ride.model';
import rideConfig from '../config/ride-config';

export interface PricingFactors {
    baseFare: number;
    distanceFare: number;
    timeFare: number;
    surgeMultiplier: number;
    demandMultiplier: number;
    weatherMultiplier: number;
    timeOfDayMultiplier: number;
    promotionalDiscount: number;
}

export interface SurgeArea {
    name: string;
    coordinates: {
        latitude: number;
        longitude: number;
        radius: number; // in meters
    };
    surgeMultiplier: number;
    activeUntil: Date;
}

export interface PromotionalOffer {
    id: string;
    name: string;
    description: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    minRideDistance?: number;
    maxDiscount?: number;
    validFrom: Date;
    validUntil: Date;
    usageLimit?: number;
    usedCount: number;
    applicableVehicleTypes: VehicleType[];
    isActive: boolean;
}

class PricingService {
    private surgeAreas: Map<string, SurgeArea> = new Map();
    private promotionalOffers: Map<string, PromotionalOffer> = new Map();

    /**
     * Calculate dynamic fare based on multiple factors
     */
    async calculateDynamicFare(
        pickupLocation: { latitude: number; longitude: number },
        dropoffLocation: { latitude: number; longitude: number },
        vehicleType: VehicleType,
        requestTime: Date = new Date(),
        customerId?: string
    ): Promise<{
        fare: number;
        breakdown: PricingFactors;
        appliedPromotions: string[];
        surgeInfo?: SurgeArea;
    }> {
        const distance = this.calculateDistance(
            pickupLocation.latitude,
            pickupLocation.longitude,
            dropoffLocation.latitude,
            dropoffLocation.longitude
        );

        // Base calculations
        const baseFare = rideConfig.baseFare;
        const perKmRate = rideConfig.feePerKm[vehicleType] || rideConfig.feePerKm.regular;
        const distanceFare = distance * perKmRate;

        // Time-based fare (for longer rides)
        const estimatedDuration = this.calculateETA(distance);
        const timeFare = estimatedDuration > 1800 ? (estimatedDuration - 1800) * 0.002 : 0; // $0.002 per second after 30 minutes

        // Dynamic multipliers
        const surgeMultiplier = await this.calculateSurgeMultiplier(pickupLocation, requestTime);
        const demandMultiplier = await this.calculateDemandMultiplier(pickupLocation, vehicleType, requestTime);
        const weatherMultiplier = await this.calculateWeatherMultiplier(pickupLocation, requestTime);
        const timeOfDayMultiplier = this.calculateTimeOfDayMultiplier(requestTime);

        // Apply promotional discounts
        const { discount, appliedPromotions } = await this.calculatePromotionalDiscount(
            distance,
            vehicleType,
            customerId,
            requestTime
        );

        const breakdown: PricingFactors = {
            baseFare,
            distanceFare,
            timeFare,
            surgeMultiplier,
            demandMultiplier,
            weatherMultiplier,
            timeOfDayMultiplier,
            promotionalDiscount: discount
        };

        // Calculate final fare
        let totalFare = baseFare + distanceFare + timeFare;
        totalFare *= surgeMultiplier * demandMultiplier * weatherMultiplier * timeOfDayMultiplier;
        totalFare -= discount;

        // Ensure minimum fare
        totalFare = Math.max(totalFare, rideConfig.baseFare);

        const surgeInfo = this.getSurgeAreaInfo(pickupLocation);

        return {
            fare: Math.round(totalFare * 100) / 100, // Round to 2 decimal places
            breakdown,
            appliedPromotions,
            surgeInfo
        };
    }

    /**
     * Calculate surge multiplier based on active surge areas
     */
    private async calculateSurgeMultiplier(
        location: { latitude: number; longitude: number },
        requestTime: Date
    ): Promise<number> {
        const surgeArea = this.getSurgeAreaInfo(location);

        if (surgeArea && surgeArea.activeUntil > requestTime) {
            return surgeArea.surgeMultiplier;
        }

        return 1.0;
    }

    /**
     * Calculate demand multiplier based on supply/demand ratio
     */
    private async calculateDemandMultiplier(
        location: { latitude: number; longitude: number },
        vehicleType: VehicleType,
        requestTime: Date
    ): Promise<number> {
        const radius = 5; // 5km radius for demand calculation

        // Count available drivers in the area
        const availableDrivers = await Driver.findAvailableDrivers(location, radius, vehicleType, 50);

        // Count recent ride requests in the area (last 30 minutes)
        const thirtyMinutesAgo = new Date(requestTime.getTime() - 30 * 60 * 1000);
        const recentRides = await Ride.countDocuments({
            'pickupLocation.coordinates': {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [location.longitude, location.latitude]
                    },
                    $maxDistance: radius * 1000
                }
            },
            vehicleType,
            createdAt: { $gte: thirtyMinutesAgo }
        });

        // Calculate demand/supply ratio
        const demandSupplyRatio = availableDrivers.length > 0 ? recentRides / availableDrivers.length : 2;

        // Apply multiplier based on ratio
        if (demandSupplyRatio > 2) return 1.5; // High demand
        if (demandSupplyRatio > 1.5) return 1.3;
        if (demandSupplyRatio > 1) return 1.2;
        if (demandSupplyRatio > 0.5) return 1.1;

        return 1.0; // Normal demand
    }

    /**
     * Calculate weather-based multiplier
     */
    private async calculateWeatherMultiplier(
        location: { latitude: number; longitude: number },
        requestTime: Date
    ): Promise<number> {
        // In a real implementation, this would call a weather API
        // For now, we'll simulate weather conditions

        const hour = requestTime.getHours();
        const isRainyHour = Math.random() < 0.2; // 20% chance of rain
        const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);

        if (isRainyHour && isRushHour) return 1.4;
        if (isRainyHour) return 1.2;

        return 1.0;
    }

    /**
     * Calculate time-of-day multiplier
     */
    private calculateTimeOfDayMultiplier(requestTime: Date): number {
        const hour = requestTime.getHours();
        const dayOfWeek = requestTime.getDay();

        // Weekend late night surge
        if ((dayOfWeek === 5 || dayOfWeek === 6) && (hour >= 22 || hour <= 4)) {
            return 1.5;
        }

        // Rush hour surge
        if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
            return 1.3;
        }

        // Late night surge
        if (hour >= 22 || hour <= 5) {
            return 1.2;
        }

        return 1.0;
    }

    /**
     * Calculate promotional discount
     */
    private async calculatePromotionalDiscount(
        distance: number,
        vehicleType: VehicleType,
        customerId?: string,
        requestTime: Date = new Date()
    ): Promise<{ discount: number; appliedPromotions: string[] }> {
        let totalDiscount = 0;
        const appliedPromotions: string[] = [];

        for (const [offerId, offer] of this.promotionalOffers) {
            if (!this.isPromotionApplicable(offer, distance, vehicleType, requestTime)) {
                continue;
            }

            // Check usage limit
            if (offer.usageLimit && offer.usedCount >= offer.usageLimit) {
                continue;
            }

            let discount = 0;
            if (offer.discountType === 'percentage') {
                const baseFare = rideConfig.baseFare + (distance * (rideConfig.feePerKm[vehicleType] || rideConfig.feePerKm.regular));
                discount = baseFare * (offer.discountValue / 100);

                if (offer.maxDiscount) {
                    discount = Math.min(discount, offer.maxDiscount);
                }
            } else {
                discount = offer.discountValue;
            }

            totalDiscount += discount;
            appliedPromotions.push(offer.name);

            // Update usage count
            offer.usedCount++;
        }

        return { discount: totalDiscount, appliedPromotions };
    }

    /**
     * Check if promotion is applicable
     */
    private isPromotionApplicable(
        offer: PromotionalOffer,
        distance: number,
        vehicleType: VehicleType,
        requestTime: Date
    ): boolean {
        if (!offer.isActive) return false;
        if (requestTime < offer.validFrom || requestTime > offer.validUntil) return false;
        if (offer.minRideDistance && distance < offer.minRideDistance) return false;
        if (!offer.applicableVehicleTypes.includes(vehicleType)) return false;

        return true;
    }

    /**
     * Add surge area
     */
    addSurgeArea(area: SurgeArea): void {
        this.surgeAreas.set(area.name, area);
    }

    /**
     * Remove surge area
     */
    removeSurgeArea(areaName: string): void {
        this.surgeAreas.delete(areaName);
    }

    /**
     * Get surge area info for location
     */
    private getSurgeAreaInfo(location: { latitude: number; longitude: number }): SurgeArea | undefined {
        for (const area of this.surgeAreas.values()) {
            const distance = this.calculateDistance(
                location.latitude,
                location.longitude,
                area.coordinates.latitude,
                area.coordinates.longitude
            );

            if (distance * 1000 <= area.coordinates.radius) {
                return area;
            }
        }

        return undefined;
    }

    /**
     * Add promotional offer
     */
    addPromotionalOffer(offer: PromotionalOffer): void {
        this.promotionalOffers.set(offer.id, offer);
    }

    /**
     * Remove promotional offer
     */
    removePromotionalOffer(offerId: string): void {
        this.promotionalOffers.delete(offerId);
    }

    /**
     * Get active promotional offers
     */
    getActivePromotionalOffers(): PromotionalOffer[] {
        const now = new Date();
        return Array.from(this.promotionalOffers.values()).filter(
            offer => offer.isActive && offer.validFrom <= now && offer.validUntil >= now
        );
    }

    /**
     * Calculate distance using Haversine formula
     */
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

    /**
     * Calculate ETA
     */
    private calculateETA(distanceKm: number): number {
        const averageSpeedKmh = 30;
        return Math.round((distanceKm / averageSpeedKmh) * 3600);
    }

    /**
     * Convert degrees to radians
     */
    private toRadians(degrees: number): number {
        return degrees * (Math.PI / 180);
    }
}

export default new PricingService();