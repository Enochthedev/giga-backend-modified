import { pool } from '../database/connection';
import { Room, CreateRoomRequest, UpdateRoomRequest } from '../types/hotel.types';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';

export class RoomService {
    async createRoom(propertyId: string, ownerId: string, data: CreateRoomRequest): Promise<Room> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Verify property ownership
            const ownerCheck = await client.query(
                `SELECT p.id FROM properties p 
         JOIN property_owners po ON p.owner_id = po.id 
         WHERE p.id = $1 AND po.user_id = $2`,
                [propertyId, ownerId]
            );

            if (ownerCheck.rows.length === 0) {
                throw new NotFoundError('Property', propertyId);
            }

            const result = await client.query(
                `INSERT INTO rooms (
          property_id, room_type, name, description, max_occupancy,
          bed_type, bed_count, room_size, room_size_unit, base_price,
          currency, amenities, images
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
                [
                    propertyId, data.roomType, data.name, data.description,
                    data.maxOccupancy, data.bedType, data.bedCount || 1,
                    data.roomSize, data.roomSizeUnit || 'sqm', data.basePrice,
                    data.currency || 'USD', JSON.stringify(data.amenities || []),
                    JSON.stringify(data.images || [])
                ]
            );

            await client.query('COMMIT');

            logger.info('Room created successfully', {
                roomId: result.rows[0].id,
                propertyId,
                ownerId
            });

            return this.mapRowToRoom(result.rows[0]);
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error creating room:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async getRoomById(id: string): Promise<Room> {
        const result = await pool.query(
            'SELECT * FROM rooms WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Room', id);
        }

        return this.mapRowToRoom(result.rows[0]);
    }

    async getRoomsByProperty(propertyId: string): Promise<Room[]> {
        const result = await pool.query(
            'SELECT * FROM rooms WHERE property_id = $1 ORDER BY created_at DESC',
            [propertyId]
        );

        return result.rows.map(row => this.mapRowToRoom(row));
    }

    async updateRoom(id: string, ownerId: string, data: UpdateRoomRequest): Promise<Room> {
        const client = await pool.connect();

        try {
            // Verify ownership through property
            const ownerCheck = await client.query(
                `SELECT r.id FROM rooms r 
         JOIN properties p ON r.property_id = p.id
         JOIN property_owners po ON p.owner_id = po.id 
         WHERE r.id = $1 AND po.user_id = $2`,
                [id, ownerId]
            );

            if (ownerCheck.rows.length === 0) {
                throw new NotFoundError('Room', id);
            }

            const updateFields: string[] = [];
            const updateValues: any[] = [];
            let paramCount = 1;

            Object.entries(data).forEach(([key, value]) => {
                if (value !== undefined) {
                    const dbField = this.camelToSnakeCase(key);
                    if (key === 'amenities' || key === 'images') {
                        updateFields.push(`${dbField} = $${paramCount}`);
                        updateValues.push(JSON.stringify(value));
                    } else {
                        updateFields.push(`${dbField} = $${paramCount}`);
                        updateValues.push(value);
                    }
                    paramCount++;
                }
            });

            if (updateFields.length === 0) {
                return this.getRoomById(id);
            }

            updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
            updateValues.push(id);

            const result = await client.query(
                `UPDATE rooms SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
                updateValues
            );

            logger.info('Room updated successfully', { roomId: id, ownerId });

            return this.mapRowToRoom(result.rows[0]);
        } finally {
            client.release();
        }
    }

    async deleteRoom(id: string, ownerId: string): Promise<void> {
        const client = await pool.connect();

        try {
            const result = await client.query(
                `DELETE FROM rooms r 
         USING properties p, property_owners po 
         WHERE r.property_id = p.id AND p.owner_id = po.id 
         AND r.id = $1 AND po.user_id = $2`,
                [id, ownerId]
            );

            if (result.rowCount === 0) {
                throw new NotFoundError('Room', id);
            }

            logger.info('Room deleted successfully', { roomId: id, ownerId });
        } finally {
            client.release();
        }
    }

    async checkRoomAvailability(
        roomId: string,
        checkInDate: Date,
        checkOutDate: Date
    ): Promise<boolean> {
        const result = await pool.query(
            `SELECT COUNT(*) as booking_count
       FROM bookings 
       WHERE room_id = $1 
       AND booking_status NOT IN ('cancelled', 'no_show')
       AND (
         (check_in_date <= $2 AND check_out_date > $2) OR
         (check_in_date < $3 AND check_out_date >= $3) OR
         (check_in_date >= $2 AND check_out_date <= $3)
       )`,
            [roomId, checkInDate, checkOutDate]
        );

        return parseInt(result.rows[0].booking_count) === 0;
    }

    async getAvailableRooms(
        propertyId: string,
        checkInDate: Date,
        checkOutDate: Date,
        adults: number,
        children: number = 0
    ): Promise<Room[]> {
        const totalGuests = adults + children;

        const result = await pool.query(
            `SELECT r.* FROM rooms r
       WHERE r.property_id = $1 
       AND r.is_available = true
       AND r.max_occupancy >= $2
       AND r.id NOT IN (
         SELECT DISTINCT b.room_id
         FROM bookings b
         WHERE b.booking_status NOT IN ('cancelled', 'no_show')
         AND (
           (b.check_in_date <= $3 AND b.check_out_date > $3) OR
           (b.check_in_date < $4 AND b.check_out_date >= $4) OR
           (b.check_in_date >= $3 AND b.check_out_date <= $4)
         )
       )
       ORDER BY r.base_price ASC`,
            [propertyId, totalGuests, checkInDate, checkOutDate]
        );

        return result.rows.map(row => this.mapRowToRoom(row));
    }

    private mapRowToRoom(row: any): Room {
        return {
            id: row.id,
            propertyId: row.property_id,
            roomType: row.room_type,
            name: row.name,
            description: row.description,
            maxOccupancy: parseInt(row.max_occupancy),
            bedType: row.bed_type,
            bedCount: parseInt(row.bed_count) || 1,
            roomSize: row.room_size ? parseFloat(row.room_size) : undefined,
            roomSizeUnit: row.room_size_unit,
            basePrice: parseFloat(row.base_price),
            currency: row.currency,
            amenities: row.amenities || [],
            images: row.images || [],
            isAvailable: row.is_available,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        };
    }

    private camelToSnakeCase(str: string): string {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }
}