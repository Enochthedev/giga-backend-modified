import axios from 'axios';
import { logger } from '@giga/common';

export interface FuelPriceData {
    price: number;
    currency: string;
    lastUpdated: Date;
    source: string;
}

export interface FuelBasedPricing {
    baseFare: number;
    perKmRate: number;
    fuelMultiplier: number;
    totalFare: number;
    breakdown: {
        baseFare: number;
        distanceCost: number;
        fuelAdjustment: number;
        fuelPrice: number;
        fuelPricePerLiter: number;
    };
}

export class FuelPricingService {
    private readonly fuelApiKey: string;
    private readonly fuelApiUrl: string;
    private cachedFuelPrice: FuelPriceData | null = null;
    private lastCacheUpdate: Date | null = null;
    private readonly cacheValidityMinutes = 30; // Cache fuel price for 30 minutes

    constructor() {
        this.fuelApiKey = process.env.FUEL_API_KEY || '';
        this.fuelApiUrl = process.env.FUEL_API_URL || 'https://api.fuelprice.com/v1';
    }

    /**
     * Get current fuel price from API or cache
     */
    async getCurrentFuelPrice(): Promise<FuelPriceData> {
        // Check if cache is still valid
        if (this.cachedFuelPrice && this.lastCacheUpdate) {
            const cacheAge = Date.now() - this.lastCacheUpdate.getTime();
            const cacheAgeMinutes = cacheAge / (1000 * 60);
            
            if (cacheAgeMinutes < this.cacheValidityMinutes) {
                logger.info('📊 Using cached fuel price', { 
                    price: this.cachedFuelPrice.price,
                    age: `${Math.round(cacheAgeMinutes)} minutes`
                });
                return this.cachedFuelPrice;
            }
        }

        try {
            // Try to get fuel price from API
            const fuelPrice = await this.fetchFuelPriceFromAPI();
            this.cachedFuelPrice = fuelPrice;
            this.lastCacheUpdate = new Date();
            
            logger.info('📊 Fuel price updated from API', { 
                price: fuelPrice.price,
                currency: fuelPrice.currency,
                source: fuelPrice.source
            });
            
            return fuelPrice;
        } catch (error) {
            logger.warn('⚠️ Failed to fetch fuel price from API, using fallback', { error });
            
            // Return fallback fuel price
            const fallbackPrice: FuelPriceData = {
                price: 1.50, // Default fallback price
                currency: 'USD',
                lastUpdated: new Date(),
                source: 'fallback'
            };
            
            this.cachedFuelPrice = fallbackPrice;
            this.lastCacheUpdate = new Date();
            
            return fallbackPrice;
        }
    }

    /**
     * Calculate fare based on fuel price and distance
     */
    async calculateFuelBasedFare(
        distanceKm: number,
        vehicleType: string,
        baseFare: number = 2.50
    ): Promise<FuelBasedPricing> {
        const fuelPrice = await this.getCurrentFuelPrice();
        
        // Base rates per km for different vehicle types
        const baseRatesPerKm: { [key: string]: number } = {
            regular: 0.50,
            luxury: 0.80,
            suv: 0.70,
            motorcycle: 0.30
        };

        const baseRatePerKm = baseRatesPerKm[vehicleType.toLowerCase()] || baseRatesPerKm.regular;
        
        // Calculate fuel multiplier based on current fuel price
        // Assume baseline fuel price is $1.50 per liter
        const baselineFuelPrice = 1.50;
        const fuelMultiplier = fuelPrice.price / baselineFuelPrice;
        
        // Calculate distance cost with fuel adjustment
        const distanceCost = distanceKm * baseRatePerKm * fuelMultiplier;
        
        // Calculate total fare
        const totalFare = baseFare + distanceCost;
        
        const pricing: FuelBasedPricing = {
            baseFare,
            perKmRate: baseRatePerKm,
            fuelMultiplier,
            totalFare,
            breakdown: {
                baseFare,
                distanceCost,
                fuelAdjustment: distanceCost - (distanceKm * baseRatePerKm),
                fuelPrice: fuelPrice.price,
                fuelPricePerLiter: fuelPrice.price
            }
        };

        logger.info('💰 Fuel-based fare calculated', {
            distanceKm,
            vehicleType,
            baseFare,
            fuelPrice: fuelPrice.price,
            fuelMultiplier,
            totalFare
        });

        return pricing;
    }

    /**
     * Get fuel price trends for analytics
     */
    async getFuelPriceTrends(days: number = 7): Promise<FuelPriceData[]> {
        try {
            if (!this.fuelApiKey) {
                logger.warn('⚠️ No fuel API key configured, returning mock data');
                return this.generateMockFuelTrends(days);
            }

            const response = await axios.get(`${this.fuelApiUrl}/trends`, {
                params: { days, api_key: this.fuelApiKey }
            });

            return response.data.prices.map((price: any) => ({
                price: price.value,
                currency: price.currency,
                lastUpdated: new Date(price.timestamp),
                source: 'api'
            }));
        } catch (error) {
            logger.warn('⚠️ Failed to fetch fuel price trends, returning mock data', { error });
            return this.generateMockFuelTrends(days);
        }
    }

    /**
     * Get fuel price by location (if API supports it)
     */
    async getFuelPriceByLocation(latitude: number, longitude: number): Promise<FuelPriceData> {
        try {
            if (!this.fuelApiKey) {
                logger.warn('⚠️ No fuel API key configured, using default price');
                return await this.getCurrentFuelPrice();
            }

            const response = await axios.get(`${this.fuelApiUrl}/location`, {
                params: {
                    lat: latitude,
                    lng: longitude,
                    api_key: this.fuelApiKey
                }
            });

            const fuelPrice: FuelPriceData = {
                price: response.data.price,
                currency: response.data.currency,
                lastUpdated: new Date(),
                source: 'api'
            };

            // Update cache with location-specific price
            this.cachedFuelPrice = fuelPrice;
            this.lastCacheUpdate = new Date();

            return fuelPrice;
        } catch (error) {
            logger.warn('⚠️ Failed to fetch location-based fuel price, using default', { error });
            return await this.getCurrentFuelPrice();
        }
    }

    /**
     * Private method to fetch fuel price from API
     */
    private async fetchFuelPriceFromAPI(): Promise<FuelPriceData> {
        if (!this.fuelApiKey) {
            throw new Error('No fuel API key configured');
        }

        const response = await axios.get(`${this.fuelApiUrl}/current`, {
            params: { api_key: this.fuelApiKey }
        });

        return {
            price: response.data.price,
            currency: response.data.currency,
            lastUpdated: new Date(),
            source: 'api'
        };
    }

    /**
     * Generate mock fuel price trends for development/testing
     */
    private generateMockFuelTrends(days: number): FuelPriceData[] {
        const trends: FuelPriceData[] = [];
        const basePrice = 1.50;
        
        for (let i = days; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            
            // Add some realistic variation
            const variation = (Math.random() - 0.5) * 0.3; // ±15% variation
            const price = basePrice + variation;
            
            trends.push({
                price: Math.round(price * 100) / 100,
                currency: 'USD',
                lastUpdated: date,
                source: 'mock'
            });
        }
        
        return trends;
    }

    /**
     * Get fuel price statistics
     */
    async getFuelPriceStats(): Promise<{
        current: number;
        average: number;
        min: number;
        max: number;
        trend: 'rising' | 'falling' | 'stable';
    }> {
        const trends = await this.getFuelPriceTrends(7);
        const prices = trends.map(t => t.price);
        
        const current = prices[prices.length - 1];
        const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        
        // Determine trend
        let trend: 'rising' | 'falling' | 'stable' = 'stable';
        if (prices.length >= 2) {
            const recentChange = prices[prices.length - 1] - prices[prices.length - 2];
            if (Math.abs(recentChange) > 0.05) { // 5% threshold
                trend = recentChange > 0 ? 'rising' : 'falling';
            }
        }
        
        return {
            current,
            average: Math.round(average * 100) / 100,
            min: Math.round(min * 100) / 100,
            max: Math.round(max * 100) / 100,
            trend
        };
    }
}

export default new FuelPricingService();
