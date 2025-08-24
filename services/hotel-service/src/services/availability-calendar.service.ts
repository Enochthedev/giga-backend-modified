import { pool } from '../database/connection';
import { RoomAvailability } from '../types/hotel.types';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import { logger } from '../utils/logger';

export interface CalendarDay {
    date: Date;
    available: boolean;
    availableCount: number;
    price: number;
    minimumStay: number;
    isBlocked: boolean;
    bookings: {
        id: string;
        guestName: string;
        status: string;
        checkIn: boolean;
        checkOut: boolean;
    }[];
}

export interface AvailabilityUpdate {
    roomId: string;
    date: string;
    availableCount?: number;
    price?: number;
    minimumStay?: number;
    isBlocked?: boolean;
}

export interface BulkAvailabilityUpdate {
    roomId: string;
    startDate: string;
    endDate: string;
    availableCount?: number;
    price?: number;
    minimumStay?: number;
    isBlocked?: boolean;
    daysOfWeek?: number[]; // 0=Sunday, 1=Monday, etc.
}

export interface PricingRule {
    id: string;
    roomId: string;
    name: string;
    startDate: Date;
    endDate: Date;
    daysOfWeek: number[];
    priceModifier: number; // Percentage or fixed amount
    modifierType: 'percentage' | 'fixed';
    minimumStay?: number;
    isActive: boolean;
}

export class AvailabilityCalendarService {
    async getCalendar(
        roomId: string,
        startDate: Date,
        endDate: Date,
        ownerId?: string
    ): Promise<CalendarDay[]> {
        const client = await pool.connect();

        try {
            // Verify room ownership if ownerId provided
            if (ownerId) {
                await this.verifyRoomOwnership(roomId, ownerId, client);
            }

            // Generate date range
            const dates = this.generateDateRange(startDate, endDate);
            const calendar: CalendarDay[] = [];

            for (const date of dates) {
                const calendarDay = await this.getCalendarDay(roomId, date, client);
                calendar.push(calendarDay);
            }

            return calendar;
        } finally {
            client.release();
        }
    }

    async updateAvailability(
        updates: AvailabilityUpdate[],
        ownerId: string
    ): Promise<RoomAvailability[]> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const results: RoomAvailability[] = [];

            for (const update of updates) {
                // Verify ownership
                await this.verifyRoomOwnership(update.roomId, ownerId, client);

                const date = new Date(update.date);

                // Check if availability record exists
                const existingResult = await client.query(
                    'SELECT * FROM room_availability WHERE room_id = $1 AND date = $2',
                    [update.roomId, date]
                );

                let result;

                if (existingResult.rows.length > 0) {
                    // Update existing record
                    const updateFields: string[] = [];
                    const updateValues: any[] = [];
                    let paramCount = 1;

                    if (update.availableCount !== undefined) {
                        updateFields.push(`available_count = $${paramCount}`);
                        updateValues.push(update.availableCount);
                        paramCount++;
                    }

                    if (update.price !== undefined) {
                        updateFields.push(`price = $${paramCount}`);
                        updateValues.push(update.price);
                        paramCount++;
                    }

                    if (update.minimumStay !== undefined) {
                        updateFields.push(`minimum_stay = $${paramCount}`);
                        updateValues.push(update.minimumStay);
                        paramCount++;
                    }

                    if (updateFields.length > 0) {
                        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
                        updateValues.push(update.roomId, date);

                        result = await client.query(
                            `UPDATE room_availability SET ${updateFields.join(', ')} 
                             WHERE room_id = $${paramCount} AND date = $${paramCount + 1} 
                             RETURNING *`,
                            updateValues
                        );
                    } else {
                        result = existingResult;
                    }
                } else {
                    // Create new record
                    result = await client.query(
                        `INSERT INTO room_availability (room_id, date, available_count, price, minimum_stay)
                         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                        [
                            update.roomId,
                            date,
                            update.availableCount || 1,
                            update.price,
                            update.minimumStay || 1
                        ]
                    );
                }

                results.push(this.mapRowToAvailability(result.rows[0]));
            }

            await client.query('COMMIT');

            logger.info('Availability updated successfully', {
                ownerId,
                updatesCount: updates.length
            });

            return results;
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error updating availability:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async bulkUpdateAvailability(
        update: BulkAvailabilityUpdate,
        ownerId: string
    ): Promise<RoomAvailability[]> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Verify ownership
            await this.verifyRoomOwnership(update.roomId, ownerId, client);

            const startDate = new Date(update.startDate);
            const endDate = new Date(update.endDate);
            const dates = this.generateDateRange(startDate, endDate);

            const updates: AvailabilityUpdate[] = [];

            for (const date of dates) {
                // Filter by days of week if specified
                if (update.daysOfWeek && update.daysOfWeek.length > 0) {
                    const dayOfWeek = date.getDay();
                    if (!update.daysOfWeek.includes(dayOfWeek)) {
                        continue;
                    }
                }

                updates.push({
                    roomId: update.roomId,
                    date: date.toISOString().split('T')[0],
                    availableCount: update.availableCount,
                    price: update.price,
                    minimumStay: update.minimumStay,
                    isBlocked: update.isBlocked
                });
            }

            const results = await this.updateAvailability(updates, ownerId);

            await client.query('COMMIT');

            logger.info('Bulk availability updated successfully', {
                ownerId,
                roomId: update.roomId,
                startDate: update.startDate,
                endDate: update.endDate,
                updatesCount: updates.length
            });

            return results;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async blockDates(
        roomId: string,
        startDate: Date,
        endDate: Date,
        ownerId: string,
        reason?: string
    ): Promise<void> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Verify ownership
            await this.verifyRoomOwnership(roomId, ownerId, client);

            // Check for existing bookings in the date range
            const conflictResult = await client.query(
                `SELECT COUNT(*) as conflict_count
                 FROM bookings 
                 WHERE room_id = $1 
                 AND booking_status NOT IN ('cancelled', 'no_show')
                 AND (
                     (check_in_date <= $2 AND check_out_date > $2) OR
                     (check_in_date < $3 AND check_out_date >= $3) OR
                     (check_in_date >= $2 AND check_out_date <= $3)
                 )`,
                [roomId, startDate, endDate]
            );

            if (parseInt(conflictResult.rows[0].conflict_count) > 0) {
                throw new ConflictError('Cannot block dates with existing bookings');
            }

            // Block the dates by setting available_count to 0
            const dates = this.generateDateRange(startDate, endDate);

            for (const date of dates) {
                await client.query(
                    `INSERT INTO room_availability (room_id, date, available_count, minimum_stay)
                     VALUES ($1, $2, 0, 1)
                     ON CONFLICT (room_id, date) 
                     DO UPDATE SET available_count = 0, updated_at = CURRENT_TIMESTAMP`,
                    [roomId, date]
                );
            }

            // Log the blocking action
            await client.query(
                `INSERT INTO room_blocks (room_id, start_date, end_date, reason, created_by, created_at)
                 VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
                [roomId, startDate, endDate, reason || 'Manual block', ownerId]
            );

            await client.query('COMMIT');

            logger.info('Dates blocked successfully', {
                roomId,
                startDate,
                endDate,
                ownerId,
                reason
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async unblockDates(
        roomId: string,
        startDate: Date,
        endDate: Date,
        ownerId: string
    ): Promise<void> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Verify ownership
            await this.verifyRoomOwnership(roomId, ownerId, client);

            // Get room's default availability count
            const roomResult = await client.query(
                'SELECT id FROM rooms WHERE id = $1 AND is_available = true',
                [roomId]
            );

            if (roomResult.rows.length === 0) {
                throw new NotFoundError('Room', roomId);
            }

            // Unblock the dates by setting available_count to 1 (or room's capacity)
            const dates = this.generateDateRange(startDate, endDate);

            for (const date of dates) {
                await client.query(
                    `UPDATE room_availability 
                     SET available_count = 1, updated_at = CURRENT_TIMESTAMP
                     WHERE room_id = $1 AND date = $2`,
                    [roomId, date]
                );
            }

            // Remove block record
            await client.query(
                `DELETE FROM room_blocks 
                 WHERE room_id = $1 AND start_date = $2 AND end_date = $3`,
                [roomId, startDate, endDate]
            );

            await client.query('COMMIT');

            logger.info('Dates unblocked successfully', {
                roomId,
                startDate,
                endDate,
                ownerId
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async getOccupancyReport(
        propertyId: string,
        startDate: Date,
        endDate: Date,
        ownerId: string
    ): Promise<{
        totalDays: number;
        occupiedDays: number;
        occupancyRate: number;
        revenue: number;
        averageDailyRate: number;
        revenuePAR: number; // Revenue Per Available Room
        dailyBreakdown: {
            date: Date;
            totalRooms: number;
            occupiedRooms: number;
            revenue: number;
            occupancyRate: number;
        }[];
    }> {
        const client = await pool.connect();

        try {
            // Verify property ownership
            await this.verifyPropertyOwnership(propertyId, ownerId, client);

            const dates = this.generateDateRange(startDate, endDate);
            const dailyBreakdown = [];
            let totalRevenue = 0;
            let totalOccupiedDays = 0;

            for (const date of dates) {
                const dayResult = await client.query(
                    `SELECT 
                        COUNT(DISTINCT r.id) as total_rooms,
                        COUNT(DISTINCT b.room_id) as occupied_rooms,
                        COALESCE(SUM(b.room_rate), 0) as daily_revenue
                     FROM rooms r
                     LEFT JOIN bookings b ON r.id = b.room_id 
                         AND b.check_in_date <= $2 
                         AND b.check_out_date > $2
                         AND b.booking_status NOT IN ('cancelled', 'no_show')
                     WHERE r.property_id = $1 AND r.is_available = true`,
                    [propertyId, date]
                );

                const dayData = dayResult.rows[0];
                const totalRooms = parseInt(dayData.total_rooms);
                const occupiedRooms = parseInt(dayData.occupied_rooms);
                const dailyRevenue = parseFloat(dayData.daily_revenue) || 0;
                const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

                dailyBreakdown.push({
                    date,
                    totalRooms,
                    occupiedRooms,
                    revenue: dailyRevenue,
                    occupancyRate
                });

                totalRevenue += dailyRevenue;
                totalOccupiedDays += occupiedRooms;
            }

            const totalDays = dates.length;
            const totalRoomNights = dailyBreakdown.reduce((sum, day) => sum + day.totalRooms, 0);
            const occupancyRate = totalRoomNights > 0 ? (totalOccupiedDays / totalRoomNights) * 100 : 0;
            const averageDailyRate = totalOccupiedDays > 0 ? totalRevenue / totalOccupiedDays : 0;
            const revenuePAR = totalRoomNights > 0 ? totalRevenue / totalRoomNights : 0;

            return {
                totalDays,
                occupiedDays: totalOccupiedDays,
                occupancyRate,
                revenue: totalRevenue,
                averageDailyRate,
                revenuePAR,
                dailyBreakdown
            };
        } finally {
            client.release();
        }
    }

    private async getCalendarDay(roomId: string, date: Date, client: any): Promise<CalendarDay> {
        // Get availability data
        const availabilityResult = await client.query(
            `SELECT * FROM room_availability WHERE room_id = $1 AND date = $2`,
            [roomId, date]
        );

        // Get bookings for this date
        const bookingsResult = await client.query(
            `SELECT id, guest_name, booking_status, check_in_date, check_out_date
             FROM bookings 
             WHERE room_id = $1 
             AND check_in_date <= $2 
             AND check_out_date > $2
             AND booking_status NOT IN ('cancelled', 'no_show')`,
            [roomId, date]
        );

        // Get room base price
        const roomResult = await client.query(
            'SELECT base_price FROM rooms WHERE id = $1',
            [roomId]
        );

        const availability = availabilityResult.rows[0];
        const basePrice = roomResult.rows[0] ? parseFloat(roomResult.rows[0].base_price) : 0;

        const bookings = bookingsResult.rows.map(row => ({
            id: row.id,
            guestName: row.guest_name,
            status: row.booking_status,
            checkIn: new Date(row.check_in_date).toDateString() === date.toDateString(),
            checkOut: new Date(row.check_out_date).toDateString() === date.toDateString()
        }));

        return {
            date,
            available: availability ? availability.available_count > 0 : true,
            availableCount: availability ? availability.available_count : 1,
            price: availability?.price || basePrice,
            minimumStay: availability?.minimum_stay || 1,
            isBlocked: availability ? availability.available_count === 0 : false,
            bookings
        };
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
            throw new NotFoundError('Room', roomId);
        }
    }

    private async verifyPropertyOwnership(propertyId: string, ownerId: string, client: any): Promise<void> {
        const result = await client.query(
            `SELECT p.id FROM properties p
             JOIN property_owners po ON p.owner_id = po.id
             WHERE p.id = $1 AND po.user_id = $2`,
            [propertyId, ownerId]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Property', propertyId);
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

    private mapRowToAvailability(row: any): RoomAvailability {
        return {
            id: row.id,
            roomId: row.room_id,
            date: new Date(row.date),
            availableCount: parseInt(row.available_count),
            price: row.price ? parseFloat(row.price) : undefined,
            minimumStay: parseInt(row.minimum_stay),
            createdAt: new Date(row.created_at)
        };
    }
}