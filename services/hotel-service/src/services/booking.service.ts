import { pool } from '../database/connection';
import { Booking, CreateBookingRequest } from '../types/hotel.types';
import { NotFoundError, ConflictError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';
import { RoomService } from './room.service';

export class BookingService {
    private roomService: RoomService;

    constructor() {
        this.roomService = new RoomService();
    }

    async createBooking(userId: string, data: CreateBookingRequest): Promise<Booking> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const checkInDate = new Date(data.checkInDate);
            const checkOutDate = new Date(data.checkOutDate);

            // Validate dates
            if (checkInDate >= checkOutDate) {
                throw new ValidationError('Check-out date must be after check-in date');
            }

            if (checkInDate < new Date()) {
                throw new ValidationError('Check-in date cannot be in the past');
            }

            // Check room availability
            const isAvailable = await this.roomService.checkRoomAvailability(
                data.roomId,
                checkInDate,
                checkOutDate
            );

            if (!isAvailable) {
                throw new ConflictError('Room is not available for the selected dates');
            }

            // Get room and property details
            const roomResult = await client.query(
                `SELECT r.*, p.name as property_name 
         FROM rooms r 
         JOIN properties p ON r.property_id = p.id 
         WHERE r.id = $1 AND p.id = $2`,
                [data.roomId, data.propertyId]
            );

            if (roomResult.rows.length === 0) {
                throw new NotFoundError('Room not found in the specified property');
            }

            const room = roomResult.rows[0];

            // Check occupancy
            const totalGuests = data.adults + (data.children || 0);
            if (totalGuests > room.max_occupancy) {
                throw new ValidationError(`Room can accommodate maximum ${room.max_occupancy} guests`);
            }

            // Calculate booking details
            const totalNights = Math.ceil(
                (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            const roomRate = parseFloat(room.base_price);
            const subtotal = roomRate * totalNights;
            const taxes = subtotal * 0.1; // 10% tax
            const fees = 25; // Fixed service fee
            const totalAmount = subtotal + taxes + fees;

            // Create booking
            const result = await client.query(
                `INSERT INTO bookings (
          property_id, room_id, guest_user_id, guest_name, guest_email,
          guest_phone, check_in_date, check_out_date, adults, children,
          total_nights, room_rate, taxes, fees, total_amount, currency,
          special_requests
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *`,
                [
                    data.propertyId, data.roomId, userId, data.guestName, data.guestEmail,
                    data.guestPhone, checkInDate, checkOutDate, data.adults, data.children || 0,
                    totalNights, roomRate, taxes, fees, totalAmount, room.currency,
                    data.specialRequests
                ]
            );

            await client.query('COMMIT');

            logger.info('Booking created successfully', {
                bookingId: result.rows[0].id,
                userId,
                propertyId: data.propertyId,
                roomId: data.roomId
            });

            return this.mapRowToBooking(result.rows[0]);
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error creating booking:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async getBookingById(id: string): Promise<Booking> {
        const result = await pool.query(
            'SELECT * FROM bookings WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Booking', id);
        }

        return this.mapRowToBooking(result.rows[0]);
    }

    async getUserBookings(userId: string): Promise<Booking[]> {
        const result = await pool.query(
            `SELECT b.*, p.name as property_name, r.name as room_name
       FROM bookings b
       JOIN properties p ON b.property_id = p.id
       JOIN rooms r ON b.room_id = r.id
       WHERE b.guest_user_id = $1
       ORDER BY b.created_at DESC`,
            [userId]
        );

        return result.rows.map(row => this.mapRowToBooking(row));
    }

    async getPropertyBookings(propertyId: string, ownerId: string): Promise<Booking[]> {
        const result = await pool.query(
            `SELECT b.*, r.name as room_name
       FROM bookings b
       JOIN properties p ON b.property_id = p.id
       JOIN property_owners po ON p.owner_id = po.id
       JOIN rooms r ON b.room_id = r.id
       WHERE b.property_id = $1 AND po.user_id = $2
       ORDER BY b.created_at DESC`,
            [propertyId, ownerId]
        );

        return result.rows.map(row => this.mapRowToBooking(row));
    }

    async updateBookingStatus(
        id: string,
        status: Booking['bookingStatus'],
        userId?: string
    ): Promise<Booking> {
        const client = await pool.connect();

        try {
            let query = 'UPDATE bookings SET booking_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
            let values = [status, id];

            if (userId) {
                query += ' AND guest_user_id = $3';
                values.push(userId);
            }

            query += ' RETURNING *';

            const result = await client.query(query, values);

            if (result.rows.length === 0) {
                throw new NotFoundError('Booking', id);
            }

            logger.info('Booking status updated', {
                bookingId: id,
                status,
                userId
            });

            return this.mapRowToBooking(result.rows[0]);
        } finally {
            client.release();
        }
    }

    async cancelBooking(id: string, userId: string, reason?: string): Promise<Booking> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Get booking details
            const booking = await this.getBookingById(id);

            if (booking.guestUserId !== userId) {
                throw new NotFoundError('Booking', id);
            }

            if (booking.bookingStatus === 'cancelled') {
                throw new ConflictError('Booking is already cancelled');
            }

            if (booking.bookingStatus === 'checked_in' || booking.bookingStatus === 'checked_out') {
                throw new ConflictError('Cannot cancel booking after check-in');
            }

            // Check cancellation policy (simplified - allow cancellation up to 24 hours before)
            const checkInDate = new Date(booking.checkInDate);
            const now = new Date();
            const hoursUntilCheckIn = (checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60);

            if (hoursUntilCheckIn < 24) {
                throw new ConflictError('Cancellation not allowed within 24 hours of check-in');
            }

            const result = await client.query(
                `UPDATE bookings 
         SET booking_status = 'cancelled', 
             cancellation_reason = $1,
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2 
         RETURNING *`,
                [reason, id]
            );

            await client.query('COMMIT');

            logger.info('Booking cancelled successfully', {
                bookingId: id,
                userId,
                reason
            });

            return this.mapRowToBooking(result.rows[0]);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async updatePaymentStatus(
        id: string,
        paymentStatus: Booking['paymentStatus'],
        paymentIntentId?: string
    ): Promise<Booking> {
        const updateFields = ['payment_status = $1', 'updated_at = CURRENT_TIMESTAMP'];
        const values = [paymentStatus, id];

        if (paymentIntentId) {
            updateFields.push('payment_intent_id = $3');
            values.splice(1, 0, paymentIntentId);
        }

        const result = await pool.query(
            `UPDATE bookings SET ${updateFields.join(', ')} WHERE id = $${values.length} RETURNING *`,
            values
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Booking', id);
        }

        logger.info('Booking payment status updated', {
            bookingId: id,
            paymentStatus,
            paymentIntentId
        });

        return this.mapRowToBooking(result.rows[0]);
    }

    private mapRowToBooking(row: any): Booking {
        return {
            id: row.id,
            propertyId: row.property_id,
            roomId: row.room_id,
            guestUserId: row.guest_user_id,
            guestName: row.guest_name,
            guestEmail: row.guest_email,
            guestPhone: row.guest_phone,
            checkInDate: new Date(row.check_in_date),
            checkOutDate: new Date(row.check_out_date),
            adults: parseInt(row.adults),
            children: parseInt(row.children) || 0,
            totalNights: parseInt(row.total_nights),
            roomRate: parseFloat(row.room_rate),
            taxes: parseFloat(row.taxes) || 0,
            fees: parseFloat(row.fees) || 0,
            totalAmount: parseFloat(row.total_amount),
            currency: row.currency,
            paymentStatus: row.payment_status,
            bookingStatus: row.booking_status,
            specialRequests: row.special_requests,
            cancellationReason: row.cancellation_reason,
            paymentIntentId: row.payment_intent_id,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        };
    }
}