import { pool } from '../database/connection';
import { logger } from '../utils/logger';

export interface PricingRule {
    id: string;
    roomId: string;
    name: string;
    ruleType: 'seasonal' | 'demand' | 'event' | 'day_of_week' | 'advance_booking';
    startDate: Date;
    endDate: Date;
    daysOfWeek?: number[]; // 0=Sunday, 1=Monday, etc.
    priceModifier: number;
    modifierType: 'percentage' | 'fixed';
    minimumStay?: number;
    conditions?: {
        occupancyThreshold?: number;
        advanceDays?: number;
        eventName?: string;
    };
    isActive: boolean;
    priority: number;
}

export interface DemandMetrics {
    date: Date;
    searchCount: number;
    bookingCount: number;
    occupancyRate: number;
    averagePrice: number;
    demandScore: number; // 0-100
}

export interface PricingSuggestion {
    roomId: string;
    date: Date;
    currentPrice: number;
    suggestedPrice: number;
    priceChange: number;
    priceChangePercentage: number;
    reasoning: string[];
    confidence: number; // 0-100
    demandScore: number;
    competitorPrice?: number;
}

export interface SeasonalPattern {
    month: number;
    averageOccupancy: number;
    averagePrice: number;
    demandMultiplier: number;
}

export class PricingOptimizationService {
    async createPricingRule(
        ownerId: string,
        ruleData: Omit<PricingRule, 'id'>
    ): Promise<PricingRule> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Verify room ownership
            await this.verifyRoomOwnership(ruleData.roomId, ownerId, client);

            const result = await client.query(
                `INSERT INTO pricing_rules (
                    room_id, name, rule_type, start_date, end_date, days_of_week,
                    price_modifier, modifier_type, minimum_stay, conditions,
                    is_active, priority, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING *`,
                [
                    ruleData.roomId, ruleData.name, ruleData.ruleType,
                    ruleData.startDate, ruleData.endDate, ruleData.daysOfWeek,
                    ruleData.priceModifier, ruleData.modifierType, ruleData.minimumStay,
                    JSON.stringify(ruleData.conditions || {}), ruleData.isActive,
                    ruleData.priority, ownerId
                ]
            );

            await client.query('COMMIT');

            logger.info('Pricing rule created', {
                ruleId: result.rows[0].id,
                roomId: ruleData.roomId,
                ownerId
            });

            return this.mapRowToPricingRule(result.rows[0]);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getPricingSuggestions(
        roomId: string,
        startDate: Date,
        endDate: Date,
        ownerId: string
    ): Promise<PricingSuggestion[]> {
        const client = await pool.connect();

        try {
            // Verify room ownership
            await this.verifyRoomOwnership(roomId, ownerId, client);

            const dates = this.generateDateRange(startDate, endDate);
            const suggestions: PricingSuggestion[] = [];

            for (const date of dates) {
                const suggestion = await this.calculatePricingSuggestion(roomId, date, client);
                suggestions.push(suggestion);
            }

            return suggestions;
        } finally {
            client.release();
        }
    }

    async applyDynamicPricing(
        roomId: string,
        startDate: Date,
        endDate: Date,
        ownerId: string,
        options: {
            maxIncrease?: number; // Maximum price increase percentage
            maxDecrease?: number; // Maximum price decrease percentage
            minPrice?: number;
            maxPrice?: number;
        } = {}
    ): Promise<{
        appliedCount: number;
        totalRevenueDifference: number;
        priceChanges: {
            date: Date;
            oldPrice: number;
            newPrice: number;
            change: number;
        }[];
    }> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Verify room ownership
            await this.verifyRoomOwnership(roomId, ownerId, client);

            const suggestions = await this.getPricingSuggestions(roomId, startDate, endDate, ownerId);
            const priceChanges = [];
            let appliedCount = 0;
            let totalRevenueDifference = 0;

            for (const suggestion of suggestions) {
                let newPrice = suggestion.suggestedPrice;

                // Apply constraints
                if (options.maxIncrease && suggestion.priceChangePercentage > options.maxIncrease) {
                    newPrice = suggestion.currentPrice * (1 + options.maxIncrease / 100);
                }

                if (options.maxDecrease && suggestion.priceChangePercentage < -options.maxDecrease) {
                    newPrice = suggestion.currentPrice * (1 - options.maxDecrease / 100);
                }

                if (options.minPrice && newPrice < options.minPrice) {
                    newPrice = options.minPrice;
                }

                if (options.maxPrice && newPrice > options.maxPrice) {
                    newPrice = options.maxPrice;
                }

                // Only apply if there's a meaningful change (>2%)
                const finalChangePercentage = ((newPrice - suggestion.currentPrice) / suggestion.currentPrice) * 100;

                if (Math.abs(finalChangePercentage) >= 2) {
                    // Update room availability with new price
                    await client.query(
                        `INSERT INTO room_availability (room_id, date, price, available_count, minimum_stay)
                         VALUES ($1, $2, $3, 1, 1)
                         ON CONFLICT (room_id, date)
                         DO UPDATE SET price = $3, updated_at = CURRENT_TIMESTAMP`,
                        [roomId, suggestion.date, newPrice]
                    );

                    priceChanges.push({
                        date: suggestion.date,
                        oldPrice: suggestion.currentPrice,
                        newPrice,
                        change: newPrice - suggestion.currentPrice
                    });

                    totalRevenueDifference += newPrice - suggestion.currentPrice;
                    appliedCount++;
                }
            }

            // Log pricing optimization
            await client.query(
                `INSERT INTO pricing_optimizations (
                    room_id, start_date, end_date, applied_count, revenue_difference,
                    optimization_type, created_by, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
                [roomId, startDate, endDate, appliedCount, totalRevenueDifference, 'dynamic', ownerId]
            );

            await client.query('COMMIT');

            logger.info('Dynamic pricing applied', {
                roomId,
                ownerId,
                appliedCount,
                totalRevenueDifference
            });

            return {
                appliedCount,
                totalRevenueDifference,
                priceChanges
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getDemandMetrics(
        roomId: string,
        startDate: Date,
        endDate: Date
    ): Promise<DemandMetrics[]> {
        const client = await pool.connect();

        try {
            const dates = this.generateDateRange(startDate, endDate);
            const metrics: DemandMetrics[] = [];

            for (const date of dates) {
                // Get search count (from search logs if available)
                const searchResult = await client.query(
                    `SELECT COUNT(*) as search_count
                     FROM property_searches 
                     WHERE room_id = $1 
                     AND search_date::date = $2`,
                    [roomId, date]
                );

                // Get booking count
                const bookingResult = await client.query(
                    `SELECT COUNT(*) as booking_count, AVG(room_rate) as avg_price
                     FROM bookings 
                     WHERE room_id = $1 
                     AND check_in_date <= $2 
                     AND check_out_date > $2
                     AND booking_status NOT IN ('cancelled', 'no_show')`,
                    [roomId, date]
                );

                // Calculate occupancy rate for the property
                const occupancyResult = await client.query(
                    `SELECT 
                        COUNT(DISTINCT r.id) as total_rooms,
                        COUNT(DISTINCT b.room_id) as occupied_rooms
                     FROM rooms r
                     LEFT JOIN bookings b ON r.property_id = (
                         SELECT property_id FROM rooms WHERE id = $1
                     ) AND b.check_in_date <= $2 AND b.check_out_date > $2
                     AND b.booking_status NOT IN ('cancelled', 'no_show')
                     WHERE r.is_available = true`,
                    [roomId, date]
                );

                const searchCount = parseInt(searchResult.rows[0].search_count) || 0;
                const bookingCount = parseInt(bookingResult.rows[0].booking_count) || 0;
                const averagePrice = parseFloat(bookingResult.rows[0].avg_price) || 0;
                const totalRooms = parseInt(occupancyResult.rows[0].total_rooms) || 1;
                const occupiedRooms = parseInt(occupancyResult.rows[0].occupied_rooms) || 0;
                const occupancyRate = (occupiedRooms / totalRooms) * 100;

                // Calculate demand score (0-100)
                const demandScore = this.calculateDemandScore(searchCount, bookingCount, occupancyRate);

                metrics.push({
                    date,
                    searchCount,
                    bookingCount,
                    occupancyRate,
                    averagePrice,
                    demandScore
                });
            }

            return metrics;
        } finally {
            client.release();
        }
    }

    async getSeasonalPatterns(roomId: string): Promise<SeasonalPattern[]> {
        const client = await pool.connect();

        try {
            const result = await client.query(
                `SELECT 
                    EXTRACT(MONTH FROM check_in_date) as month,
                    COUNT(*) as booking_count,
                    AVG(room_rate) as avg_price,
                    COUNT(*) * 1.0 / (
                        SELECT COUNT(DISTINCT check_in_date::date) 
                        FROM bookings 
                        WHERE room_id = $1 
                        AND EXTRACT(MONTH FROM check_in_date) = EXTRACT(MONTH FROM b.check_in_date)
                    ) as avg_occupancy
                 FROM bookings b
                 WHERE room_id = $1 
                 AND booking_status NOT IN ('cancelled', 'no_show')
                 AND check_in_date >= CURRENT_DATE - INTERVAL '2 years'
                 GROUP BY EXTRACT(MONTH FROM check_in_date)
                 ORDER BY month`,
                [roomId]
            );

            const patterns: SeasonalPattern[] = [];
            const avgOccupancy = result.rows.reduce((sum, row) => sum + parseFloat(row.avg_occupancy), 0) / result.rows.length;

            for (let month = 1; month <= 12; month++) {
                const monthData = result.rows.find(row => parseInt(row.month) === month);

                if (monthData) {
                    const monthOccupancy = parseFloat(monthData.avg_occupancy);
                    patterns.push({
                        month,
                        averageOccupancy: monthOccupancy,
                        averagePrice: parseFloat(monthData.avg_price),
                        demandMultiplier: avgOccupancy > 0 ? monthOccupancy / avgOccupancy : 1
                    });
                } else {
                    patterns.push({
                        month,
                        averageOccupancy: 0,
                        averagePrice: 0,
                        demandMultiplier: 0.5 // Low demand for months with no data
                    });
                }
            }

            return patterns;
        } finally {
            client.release();
        }
    }

    private async calculatePricingSuggestion(
        roomId: string,
        date: Date,
        client: any
    ): Promise<PricingSuggestion> {
        // Get current price
        const currentPriceResult = await client.query(
            `SELECT COALESCE(ra.price, r.base_price) as current_price
             FROM rooms r
             LEFT JOIN room_availability ra ON r.id = ra.room_id AND ra.date = $2
             WHERE r.id = $1`,
            [roomId, date]
        );

        const currentPrice = parseFloat(currentPriceResult.rows[0].current_price);

        // Get demand metrics for this date
        const demandMetrics = await this.getDemandMetrics(roomId, date, date);
        const demandScore = demandMetrics[0]?.demandScore || 50;

        // Get seasonal patterns
        const seasonalPatterns = await this.getSeasonalPatterns(roomId);
        const monthPattern = seasonalPatterns.find(p => p.month === date.getMonth() + 1);
        const seasonalMultiplier = monthPattern?.demandMultiplier || 1;

        // Get day of week pattern
        const dayOfWeek = date.getDay();
        const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.15 : 1.0; // 15% premium for weekends

        // Get advance booking factor
        const daysInAdvance = Math.ceil((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        const advanceMultiplier = this.getAdvanceBookingMultiplier(daysInAdvance);

        // Calculate suggested price
        let suggestedPrice = currentPrice;
        const reasoning: string[] = [];

        // Apply demand-based pricing
        if (demandScore > 80) {
            suggestedPrice *= 1.2;
            reasoning.push('High demand detected (+20%)');
        } else if (demandScore > 60) {
            suggestedPrice *= 1.1;
            reasoning.push('Moderate demand (+10%)');
        } else if (demandScore < 30) {
            suggestedPrice *= 0.9;
            reasoning.push('Low demand (-10%)');
        }

        // Apply seasonal adjustment
        if (seasonalMultiplier > 1.2) {
            suggestedPrice *= 1.15;
            reasoning.push('Peak season (+15%)');
        } else if (seasonalMultiplier < 0.8) {
            suggestedPrice *= 0.9;
            reasoning.push('Off-season (-10%)');
        }

        // Apply weekend premium
        if (weekendMultiplier > 1) {
            suggestedPrice *= weekendMultiplier;
            reasoning.push('Weekend premium (+15%)');
        }

        // Apply advance booking adjustment
        if (advanceMultiplier !== 1) {
            suggestedPrice *= advanceMultiplier;
            if (advanceMultiplier > 1) {
                reasoning.push(`Early booking premium (+${((advanceMultiplier - 1) * 100).toFixed(0)}%)`);
            } else {
                reasoning.push(`Last-minute discount (${((1 - advanceMultiplier) * 100).toFixed(0)}%)`);
            }
        }

        // Round to nearest dollar
        suggestedPrice = Math.round(suggestedPrice);

        const priceChange = suggestedPrice - currentPrice;
        const priceChangePercentage = (priceChange / currentPrice) * 100;

        // Calculate confidence based on data availability and consistency
        let confidence = 70; // Base confidence
        if (demandMetrics[0]?.searchCount > 10) confidence += 10;
        if (demandMetrics[0]?.bookingCount > 0) confidence += 10;
        if (monthPattern && monthPattern.averageOccupancy > 0) confidence += 10;

        return {
            roomId,
            date,
            currentPrice,
            suggestedPrice,
            priceChange,
            priceChangePercentage,
            reasoning,
            confidence: Math.min(100, confidence),
            demandScore
        };
    }

    private calculateDemandScore(searchCount: number, bookingCount: number, occupancyRate: number): number {
        // Weighted scoring: searches (30%), bookings (40%), occupancy (30%)
        const searchScore = Math.min(100, (searchCount / 50) * 100); // Normalize to 50 searches = 100%
        const bookingScore = Math.min(100, (bookingCount / 10) * 100); // Normalize to 10 bookings = 100%
        const occupancyScore = occupancyRate;

        return Math.round((searchScore * 0.3) + (bookingScore * 0.4) + (occupancyScore * 0.3));
    }

    private getAdvanceBookingMultiplier(daysInAdvance: number): number {
        if (daysInAdvance > 90) return 1.1; // Early bird premium
        if (daysInAdvance > 30) return 1.05; // Advance booking premium
        if (daysInAdvance < 7) return 0.95; // Last-minute discount
        if (daysInAdvance < 3) return 0.9; // Deeper last-minute discount
        return 1.0; // Standard pricing
    }

    private async verifyRoomOwnership(roomId: string, ownerId: string, client: any): Promise<void> {
        const result = await client.query(
            `SELECT r.id FROM rooms r
             JOIN properties p ON r.property_id = p.id
             JOIN property_owners po ON p.owner_id = po.id
             WHERE r.id = $1 AND po.user_id = $2`,
            [roomId, ownerId]
        );

        if (result.rows.length === 0) {
            throw new Error('Room not found or access denied');
        }
    }

    private generateDateRange(startDate: Date, endDate: Date): Date[] {
        const dates: Date[] = [];
        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            dates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return dates;
    }

    private mapRowToPricingRule(row: any): PricingRule {
        return {
            id: row.id,
            roomId: row.room_id,
            name: row.name,
            ruleType: row.rule_type,
            startDate: new Date(row.start_date),
            endDate: new Date(row.end_date),
            daysOfWeek: row.days_of_week,
            priceModifier: parseFloat(row.price_modifier),
            modifierType: row.modifier_type,
            minimumStay: row.minimum_stay,
            conditions: row.conditions || {},
            isActive: row.is_active,
            priority: parseInt(row.priority)
        };
    }
}