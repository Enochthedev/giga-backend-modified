import { pool } from '../database/connection';
import { Booking } from '../types/hotel.types';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import { logger } from '../utils/logger';
import { BookingService } from './booking.service';
import { RoomService } from './room.service';

export interface BookingModificationRequest {
    checkInDate?: string;
    checkOutDate?: string;
    adults?: number;
    children?: number;
    roomId?: string;
    specialRequests?: string;
}

export interface CancellationPolicy {
    allowedUntil: Date;
    refundPercentage: number;
    cancellationFee: number;
    reason: string;
}

export interface ModificationFee {
    baseFee: number;
    priceDifference: number;
    totalFee: number;
    newTotalAmount: number;
}

export class BookingModificationService {
    private bookingService: BookingService;
    private roomService: RoomService;

    constructor() {
        this.bookingService = new BookingService();
        this.roomService = new RoomService();
    }

    async modifyBooking(
        bookingId: string,
        userId: string,
        modifications: BookingModificationRequest
    ): Promise<{
        booking: Booking;
        modificationFee: ModificationFee;
        refundAmount?: number;
    }> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Get existing booking
            const existingBooking = await this.bookingService.getBookingById(bookingId);

            // Verify ownership
            if (existingBooking.guestUserId !== userId) {
                throw new NotFoundError('Booking', bookingId);
            }

            // Check if modification is allowed
            this.validateModificationEligibility(existingBooking);

            // Calculate modification fees
            const modificationFee = await this.calculateModificationFee(
                existingBooking,
                modifications,
                client
            );

            // Validate new dates and room availability if changed
            if (modifications.checkInDate || modifications.checkOutDate || modifications.roomId) {
                await this.validateModificationAvailability(
                    existingBooking,
                    modifications,
                    client
                );
            }

            // Update booking
            const updateFields: string[] = [];
            const updateValues: any[] = [];
            let paramCount = 1;

            if (modifications.checkInDate) {
                updateFields.push(`check_in_date = $${paramCount}`);
                updateValues.push(new Date(modifications.checkInDate));
                paramCount++;
            }

            if (modifications.checkOutDate) {
                updateFields.push(`check_out_date = $${paramCount}`);
                updateValues.push(new Date(modifications.checkOutDate));
                paramCount++;
            }

            if (modifications.adults) {
                updateFields.push(`adults = $${paramCount}`);
                updateValues.push(modifications.adults);
                paramCount++;
            }

            if (modifications.children !== undefined) {
                updateFields.push(`children = $${paramCount}`);
                updateValues.push(modifications.children);
                paramCount++;
            }

            if (modifications.roomId) {
                updateFields.push(`room_id = $${paramCount}`);
                updateValues.push(modifications.roomId);
                paramCount++;
            }

            if (modifications.specialRequests !== undefined) {
                updateFields.push(`special_requests = $${paramCount}`);
                updateValues.push(modifications.specialRequests);
                paramCount++;
            }

            // Update total amount and recalculate nights if dates changed
            if (modifications.checkInDate || modifications.checkOutDate) {
                const checkInDate = new Date(modifications.checkInDate || existingBooking.checkInDate);
                const checkOutDate = new Date(modifications.checkOutDate || existingBooking.checkOutDate);
                const totalNights = Math.ceil(
                    (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
                );

                updateFields.push(`total_nights = $${paramCount}`);
                updateValues.push(totalNights);
                paramCount++;
            }

            updateFields.push(`total_amount = $${paramCount}`);
            updateValues.push(modificationFee.newTotalAmount);
            paramCount++;

            updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
            updateValues.push(bookingId);

            const result = await client.query(
                `UPDATE bookings SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
                updateValues
            );

            // Log modification
            await client.query(
                `INSERT INTO booking_modifications (
                    booking_id, user_id, modification_type, old_values, new_values, 
                    modification_fee, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
                [
                    bookingId,
                    userId,
                    'modification',
                    JSON.stringify(this.extractBookingValues(existingBooking)),
                    JSON.stringify(modifications),
                    modificationFee.totalFee
                ]
            );

            await client.query('COMMIT');

            logger.info('Booking modified successfully', {
                bookingId,
                userId,
                modifications,
                modificationFee: modificationFee.totalFee
            });

            const updatedBooking = this.bookingService['mapRowToBooking'](result.rows[0]);

            return {
                booking: updatedBooking,
                modificationFee,
                refundAmount: modificationFee.totalFee < 0 ? Math.abs(modificationFee.totalFee) : undefined
            };
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error modifying booking:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async cancelBooking(
        bookingId: string,
        userId: string,
        reason?: string
    ): Promise<{
        booking: Booking;
        refundAmount: number;
        cancellationFee: number;
        policy: CancellationPolicy;
    }> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Get existing booking
            const existingBooking = await this.bookingService.getBookingById(bookingId);

            // Verify ownership
            if (existingBooking.guestUserId !== userId) {
                throw new NotFoundError('Booking', bookingId);
            }

            // Check cancellation policy
            const policy = await this.getCancellationPolicy(existingBooking);

            if (new Date() > policy.allowedUntil) {
                throw new ConflictError(`Cancellation not allowed. ${policy.reason}`);
            }

            // Calculate refund
            const refundAmount = (existingBooking.totalAmount * policy.refundPercentage) / 100;
            const cancellationFee = policy.cancellationFee;
            const netRefund = Math.max(0, refundAmount - cancellationFee);

            // Update booking status
            const result = await client.query(
                `UPDATE bookings 
                 SET booking_status = 'cancelled', 
                     cancellation_reason = $1,
                     updated_at = CURRENT_TIMESTAMP 
                 WHERE id = $2 
                 RETURNING *`,
                [reason || 'Guest cancellation', bookingId]
            );

            // Log cancellation
            await client.query(
                `INSERT INTO booking_modifications (
                    booking_id, user_id, modification_type, old_values, new_values, 
                    modification_fee, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
                [
                    bookingId,
                    userId,
                    'cancellation',
                    JSON.stringify({ status: existingBooking.bookingStatus }),
                    JSON.stringify({ status: 'cancelled', reason }),
                    -netRefund
                ]
            );

            await client.query('COMMIT');

            logger.info('Booking cancelled successfully', {
                bookingId,
                userId,
                refundAmount: netRefund,
                cancellationFee,
                reason
            });

            const cancelledBooking = this.bookingService['mapRowToBooking'](result.rows[0]);

            return {
                booking: cancelledBooking,
                refundAmount: netRefund,
                cancellationFee,
                policy
            };
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error cancelling booking:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async getModificationOptions(bookingId: string, userId: string): Promise<{
        canModify: boolean;
        canCancel: boolean;
        modificationDeadline: Date;
        cancellationPolicy: CancellationPolicy;
        availableRooms?: any[];
        modificationFees: {
            baseFee: number;
            dateChangeFee: number;
            roomChangeFee: number;
        };
    }> {
        const booking = await this.bookingService.getBookingById(bookingId);

        if (booking.guestUserId !== userId) {
            throw new NotFoundError('Booking', bookingId);
        }

        const now = new Date();
        const checkInDate = new Date(booking.checkInDate);
        const modificationDeadline = new Date(checkInDate.getTime() - (48 * 60 * 60 * 1000)); // 48 hours before

        const canModify = now < modificationDeadline &&
            booking.bookingStatus === 'confirmed' &&
            booking.paymentStatus === 'paid';

        const cancellationPolicy = await this.getCancellationPolicy(booking);
        const canCancel = now <= cancellationPolicy.allowedUntil &&
            booking.bookingStatus !== 'cancelled';

        let availableRooms;
        if (canModify) {
            // Get available rooms for the same dates
            availableRooms = await this.getAvailableRoomsForModification(booking);
        }

        return {
            canModify,
            canCancel,
            modificationDeadline,
            cancellationPolicy,
            availableRooms,
            modificationFees: {
                baseFee: 25, // Base modification fee
                dateChangeFee: 15, // Additional fee for date changes
                roomChangeFee: 20  // Additional fee for room changes
            }
        };
    }

    async getBookingModificationHistory(bookingId: string, userId: string): Promise<any[]> {
        const booking = await this.bookingService.getBookingById(bookingId);

        if (booking.guestUserId !== userId) {
            throw new NotFoundError('Booking', bookingId);
        }

        const result = await pool.query(
            `SELECT * FROM booking_modifications 
             WHERE booking_id = $1 
             ORDER BY created_at DESC`,
            [bookingId]
        );

        return result.rows.map(row => ({
            id: row.id,
            modificationType: row.modification_type,
            oldValues: row.old_values,
            newValues: row.new_values,
            modificationFee: parseFloat(row.modification_fee) || 0,
            createdAt: new Date(row.created_at)
        }));
    }

    private validateModificationEligibility(booking: Booking): void {
        if (booking.bookingStatus === 'cancelled') {
            throw new ConflictError('Cannot modify a cancelled booking');
        }

        if (booking.bookingStatus === 'checked_in' || booking.bookingStatus === 'checked_out') {
            throw new ConflictError('Cannot modify booking after check-in');
        }

        if (booking.paymentStatus !== 'paid') {
            throw new ConflictError('Cannot modify booking with unpaid status');
        }

        const now = new Date();
        const checkInDate = new Date(booking.checkInDate);
        const modificationDeadline = new Date(checkInDate.getTime() - (48 * 60 * 60 * 1000)); // 48 hours

        if (now >= modificationDeadline) {
            throw new ConflictError('Modification not allowed within 48 hours of check-in');
        }
    }

    private async calculateModificationFee(
        existingBooking: Booking,
        modifications: BookingModificationRequest,
        client: any
    ): Promise<ModificationFee> {
        let baseFee = 25; // Base modification fee
        let priceDifference = 0;

        // Calculate price difference for date or room changes
        if (modifications.checkInDate || modifications.checkOutDate || modifications.roomId) {
            const newCheckIn = new Date(modifications.checkInDate || existingBooking.checkInDate);
            const newCheckOut = new Date(modifications.checkOutDate || existingBooking.checkOutDate);
            const newRoomId = modifications.roomId || existingBooking.roomId;

            const newNights = Math.ceil(
                (newCheckOut.getTime() - newCheckIn.getTime()) / (1000 * 60 * 60 * 24)
            );

            // Get new room rate
            const roomResult = await client.query(
                'SELECT base_price FROM rooms WHERE id = $1',
                [newRoomId]
            );

            if (roomResult.rows.length === 0) {
                throw new NotFoundError('Room', newRoomId);
            }

            const newRoomRate = parseFloat(roomResult.rows[0].base_price);
            const newSubtotal = newRoomRate * newNights;
            const newTaxes = newSubtotal * 0.1;
            const newTotal = newSubtotal + newTaxes + existingBooking.fees;

            priceDifference = newTotal - existingBooking.totalAmount;

            // Additional fees for specific changes
            if (modifications.checkInDate || modifications.checkOutDate) {
                baseFee += 15; // Date change fee
            }

            if (modifications.roomId && modifications.roomId !== existingBooking.roomId) {
                baseFee += 20; // Room change fee
            }
        }

        const totalFee = baseFee + Math.max(0, priceDifference);
        const newTotalAmount = existingBooking.totalAmount + totalFee;

        return {
            baseFee,
            priceDifference,
            totalFee,
            newTotalAmount
        };
    }

    private async validateModificationAvailability(
        existingBooking: Booking,
        modifications: BookingModificationRequest,
        client: any
    ): Promise<void> {
        const newCheckIn = new Date(modifications.checkInDate || existingBooking.checkInDate);
        const newCheckOut = new Date(modifications.checkOutDate || existingBooking.checkOutDate);
        const newRoomId = modifications.roomId || existingBooking.roomId;

        // Validate dates
        if (newCheckIn >= newCheckOut) {
            throw new ValidationError('Check-out date must be after check-in date');
        }

        if (newCheckIn < new Date()) {
            throw new ValidationError('Check-in date cannot be in the past');
        }

        // Check room availability (excluding current booking)
        const availabilityResult = await client.query(
            `SELECT COUNT(*) as conflict_count
             FROM bookings 
             WHERE room_id = $1 
             AND id != $2
             AND booking_status NOT IN ('cancelled', 'no_show')
             AND (
                 (check_in_date <= $3 AND check_out_date > $3) OR
                 (check_in_date < $4 AND check_out_date >= $4) OR
                 (check_in_date >= $3 AND check_out_date <= $4)
             )`,
            [newRoomId, existingBooking.id, newCheckIn, newCheckOut]
        );

        if (parseInt(availabilityResult.rows[0].conflict_count) > 0) {
            throw new ConflictError('Room is not available for the selected dates');
        }

        // Validate occupancy if guest count changed
        if (modifications.adults || modifications.children !== undefined) {
            const roomResult = await client.query(
                'SELECT max_occupancy FROM rooms WHERE id = $1',
                [newRoomId]
            );

            if (roomResult.rows.length === 0) {
                throw new NotFoundError('Room', newRoomId);
            }

            const maxOccupancy = parseInt(roomResult.rows[0].max_occupancy);
            const totalGuests = (modifications.adults || existingBooking.adults) +
                (modifications.children !== undefined ? modifications.children : existingBooking.children);

            if (totalGuests > maxOccupancy) {
                throw new ValidationError(`Room can accommodate maximum ${maxOccupancy} guests`);
            }
        }
    }

    private async getCancellationPolicy(booking: Booking): Promise<CancellationPolicy> {
        const checkInDate = new Date(booking.checkInDate);
        const now = new Date();
        const hoursUntilCheckIn = (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntilCheckIn >= 48) {
            return {
                allowedUntil: new Date(checkInDate.getTime() - (48 * 60 * 60 * 1000)),
                refundPercentage: 100,
                cancellationFee: 0,
                reason: 'Free cancellation until 48 hours before check-in'
            };
        } else if (hoursUntilCheckIn >= 24) {
            return {
                allowedUntil: new Date(checkInDate.getTime() - (24 * 60 * 60 * 1000)),
                refundPercentage: 50,
                cancellationFee: 25,
                reason: '50% refund with $25 fee until 24 hours before check-in'
            };
        } else {
            return {
                allowedUntil: new Date(checkInDate.getTime() - (2 * 60 * 60 * 1000)),
                refundPercentage: 0,
                cancellationFee: booking.totalAmount,
                reason: 'No refund within 24 hours of check-in'
            };
        }
    }

    private async getAvailableRoomsForModification(booking: Booking): Promise<any[]> {
        const result = await pool.query(
            `SELECT r.* FROM rooms r
             WHERE r.property_id = $1 
             AND r.is_available = true
             AND r.id NOT IN (
                 SELECT DISTINCT room_id FROM bookings 
                 WHERE property_id = $1 
                 AND id != $2
                 AND booking_status NOT IN ('cancelled', 'no_show')
                 AND (
                     (check_in_date <= $3 AND check_out_date > $3) OR
                     (check_in_date < $4 AND check_out_date >= $4) OR
                     (check_in_date >= $3 AND check_out_date <= $4)
                 )
             )
             ORDER BY base_price ASC`,
            [booking.propertyId, booking.id, booking.checkInDate, booking.checkOutDate]
        );

        return result.rows.map(row => ({
            id: row.id,
            roomType: row.room_type,
            name: row.name,
            maxOccupancy: row.max_occupancy,
            basePrice: parseFloat(row.base_price),
            currency: row.currency,
            amenities: row.amenities || []
        }));
    }

    private extractBookingValues(booking: Booking): any {
        return {
            checkInDate: booking.checkInDate,
            checkOutDate: booking.checkOutDate,
            adults: booking.adults,
            children: booking.children,
            roomId: booking.roomId,
            totalAmount: booking.totalAmount,
            specialRequests: booking.specialRequests
        };
    }
}