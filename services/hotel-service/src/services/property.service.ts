import { pool } from '../database/connection';
import {
    Property,
    CreatePropertyRequest,
    UpdatePropertyRequest,
    PropertySearchFilters,
    PropertySearchResult
} from '../types/hotel.types';
import { NotFoundError, ConflictError } from '../utils/errors';
import { logger } from '../utils/logger';

export class PropertyService {
    async createProperty(ownerId: string, data: CreatePropertyRequest): Promise<Property> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Check if owner exists
            const ownerResult = await client.query(
                'SELECT id FROM property_owners WHERE user_id = $1',
                [ownerId]
            );

            let ownerDbId: string;

            if (ownerResult.rows.length === 0) {
                // Create property owner record
                const newOwnerResult = await client.query(
                    `INSERT INTO property_owners (user_id, contact_email) 
           VALUES ($1, $2) 
           RETURNING id`,
                    [ownerId, data.name] // Using property name as placeholder email
                );
                ownerDbId = newOwnerResult.rows[0].id;
            } else {
                ownerDbId = ownerResult.rows[0].id;
            }

            const result = await client.query(
                `INSERT INTO properties (
          owner_id, name, description, property_type, address_line1, address_line2,
          city, state, country, postal_code, latitude, longitude,
          check_in_time, check_out_time, cancellation_policy, house_rules,
          amenities, images
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *`,
                [
                    ownerDbId, data.name, data.description, data.propertyType,
                    data.addressLine1, data.addressLine2, data.city, data.state,
                    data.country, data.postalCode, data.latitude, data.longitude,
                    data.checkInTime || '15:00:00', data.checkOutTime || '11:00:00',
                    data.cancellationPolicy, data.houseRules,
                    JSON.stringify(data.amenities || []), JSON.stringify(data.images || [])
                ]
            );

            await client.query('COMMIT');

            logger.info('Property created successfully', { propertyId: result.rows[0].id, ownerId });

            return this.mapRowToProperty(result.rows[0]);
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error creating property:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async getPropertyById(id: string): Promise<Property> {
        const result = await pool.query(
            'SELECT * FROM properties WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Property', id);
        }

        return this.mapRowToProperty(result.rows[0]);
    }

    async updateProperty(id: string, ownerId: string, data: UpdatePropertyRequest): Promise<Property> {
        const client = await pool.connect();

        try {
            // Verify ownership
            const ownerCheck = await client.query(
                `SELECT p.id FROM properties p 
         JOIN property_owners po ON p.owner_id = po.id 
         WHERE p.id = $1 AND po.user_id = $2`,
                [id, ownerId]
            );

            if (ownerCheck.rows.length === 0) {
                throw new NotFoundError('Property', id);
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
                return this.getPropertyById(id);
            }

            updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
            updateValues.push(id);

            const result = await client.query(
                `UPDATE properties SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
                updateValues
            );

            logger.info('Property updated successfully', { propertyId: id, ownerId });

            return this.mapRowToProperty(result.rows[0]);
        } finally {
            client.release();
        }
    }

    async deleteProperty(id: string, ownerId: string): Promise<void> {
        const client = await pool.connect();

        try {
            const result = await client.query(
                `DELETE FROM properties p 
         USING property_owners po 
         WHERE p.owner_id = po.id AND p.id = $1 AND po.user_id = $2`,
                [id, ownerId]
            );

            if (result.rowCount === 0) {
                throw new NotFoundError('Property', id);
            }

            logger.info('Property deleted successfully', { propertyId: id, ownerId });
        } finally {
            client.release();
        }
    }

    async searchProperties(filters: PropertySearchFilters): Promise<{
        properties: PropertySearchResult[];
        total: number;
        page: number;
        limit: number;
    }> {
        const client = await pool.connect();

        try {
            const conditions: string[] = ['p.status = $1'];
            const values: any[] = ['active'];
            let paramCount = 2;

            // Build WHERE conditions
            if (filters.city) {
                conditions.push(`LOWER(p.city) = LOWER($${paramCount})`);
                values.push(filters.city);
                paramCount++;
            }

            if (filters.country) {
                conditions.push(`LOWER(p.country) = LOWER($${paramCount})`);
                values.push(filters.country);
                paramCount++;
            }

            if (filters.propertyType) {
                conditions.push(`p.property_type = $${paramCount}`);
                values.push(filters.propertyType);
                paramCount++;
            }

            if (filters.rating) {
                conditions.push(`p.rating >= $${paramCount}`);
                values.push(filters.rating);
                paramCount++;
            }

            // Location-based search
            let distanceSelect = '';
            let orderBy = 'p.created_at DESC';

            if (filters.latitude && filters.longitude) {
                const radius = filters.radius || 10; // Default 10km
                distanceSelect = `, (6371 * acos(cos(radians($${paramCount})) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians($${paramCount + 1})) + sin(radians($${paramCount})) * sin(radians(p.latitude)))) AS distance`;
                conditions.push(`p.latitude IS NOT NULL AND p.longitude IS NOT NULL`);
                conditions.push(`(6371 * acos(cos(radians($${paramCount})) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians($${paramCount + 1})) + sin(radians($${paramCount})) * sin(radians(p.latitude)))) <= $${paramCount + 2}`);
                values.push(filters.latitude, filters.longitude, radius);
                paramCount += 3;
                orderBy = 'distance ASC';
            }

            const page = Math.max(1, filters.page || 1);
            const limit = Math.min(100, Math.max(1, filters.limit || 20));
            const offset = (page - 1) * limit;

            // Get total count
            const countQuery = `
        SELECT COUNT(*) as total 
        FROM properties p 
        WHERE ${conditions.join(' AND ')}
      `;

            const countResult = await client.query(countQuery, values);
            const total = parseInt(countResult.rows[0].total);

            // Get properties with rooms
            const query = `
        SELECT p.*${distanceSelect},
               COALESCE(
                 json_agg(
                   json_build_object(
                     'id', r.id,
                     'roomType', r.room_type,
                     'name', r.name,
                     'maxOccupancy', r.max_occupancy,
                     'basePrice', r.base_price,
                     'currency', r.currency,
                     'isAvailable', r.is_available
                   )
                 ) FILTER (WHERE r.id IS NOT NULL), '[]'
               ) as rooms,
               MIN(r.base_price) as min_price
        FROM properties p
        LEFT JOIN rooms r ON p.id = r.property_id AND r.is_available = true
        WHERE ${conditions.join(' AND ')}
        GROUP BY p.id${distanceSelect ? ', distance' : ''}
        ORDER BY ${orderBy}
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;

            values.push(limit, offset);

            const result = await client.query(query, values);

            const properties: PropertySearchResult[] = result.rows.map(row => ({
                ...this.mapRowToProperty(row),
                rooms: row.rooms || [],
                minPrice: row.min_price ? parseFloat(row.min_price) : undefined,
                distance: row.distance ? parseFloat(row.distance) : undefined
            }));

            return {
                properties,
                total,
                page,
                limit
            };
        } finally {
            client.release();
        }
    }

    async getPropertiesByOwner(ownerId: string): Promise<Property[]> {
        const result = await pool.query(
            `SELECT p.* FROM properties p 
       JOIN property_owners po ON p.owner_id = po.id 
       WHERE po.user_id = $1 
       ORDER BY p.created_at DESC`,
            [ownerId]
        );

        return result.rows.map(row => this.mapRowToProperty(row));
    }

    private mapRowToProperty(row: any): Property {
        return {
            id: row.id,
            ownerId: row.owner_id,
            name: row.name,
            description: row.description,
            propertyType: row.property_type,
            addressLine1: row.address_line1,
            addressLine2: row.address_line2,
            city: row.city,
            state: row.state,
            country: row.country,
            postalCode: row.postal_code,
            latitude: row.latitude ? parseFloat(row.latitude) : undefined,
            longitude: row.longitude ? parseFloat(row.longitude) : undefined,
            checkInTime: row.check_in_time,
            checkOutTime: row.check_out_time,
            cancellationPolicy: row.cancellation_policy,
            houseRules: row.house_rules,
            amenities: row.amenities || [],
            images: row.images || [],
            status: row.status,
            rating: parseFloat(row.rating) || 0,
            reviewCount: parseInt(row.review_count) || 0,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        };
    }

    private camelToSnakeCase(str: string): string {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }
}