import { pool } from '../database/connection';
import { PropertySearchFilters, PropertySearchResult } from '../types/hotel.types';
import { logger } from '../utils/logger';

export interface AdvancedSearchFilters extends PropertySearchFilters {
    // Location-based filters
    nearbyLandmarks?: string[];
    distanceFromCenter?: number; // km from city center

    // Advanced property filters
    propertyTypes?: string[];
    minRating?: number;
    maxRating?: number;
    reviewCount?: number;

    // Amenity filters
    requiredAmenities?: string[];
    excludedAmenities?: string[];

    // Room-specific filters
    roomTypes?: string[];
    minRoomSize?: number;
    maxRoomSize?: number;
    bedTypes?: string[];

    // Booking-specific filters
    instantBook?: boolean;
    freeCancellation?: boolean;

    // Sorting options
    sortBy?: 'price_low' | 'price_high' | 'rating' | 'distance' | 'popularity' | 'newest';

    // Advanced pagination
    cursor?: string; // For cursor-based pagination
}

export interface SearchSuggestion {
    type: 'city' | 'property' | 'landmark';
    value: string;
    count: number;
    location?: {
        latitude: number;
        longitude: number;
    };
}

export class AdvancedSearchService {
    async searchProperties(filters: AdvancedSearchFilters): Promise<{
        properties: PropertySearchResult[];
        total: number;
        page: number;
        limit: number;
        facets: {
            propertyTypes: { [key: string]: number };
            priceRanges: { [key: string]: number };
            ratings: { [key: string]: number };
            amenities: { [key: string]: number };
        };
        suggestions?: SearchSuggestion[];
    }> {
        const client = await pool.connect();

        try {
            const conditions: string[] = ['p.status = $1'];
            const values: any[] = ['active'];
            let paramCount = 2;

            // Build WHERE conditions
            if (filters.city) {
                conditions.push(`LOWER(p.city) ILIKE LOWER($${paramCount})`);
                values.push(`%${filters.city}%`);
                paramCount++;
            }

            if (filters.country) {
                conditions.push(`LOWER(p.country) = LOWER($${paramCount})`);
                values.push(filters.country);
                paramCount++;
            }

            if (filters.propertyTypes && filters.propertyTypes.length > 0) {
                conditions.push(`p.property_type = ANY($${paramCount})`);
                values.push(filters.propertyTypes);
                paramCount++;
            }

            if (filters.minRating) {
                conditions.push(`p.rating >= $${paramCount}`);
                values.push(filters.minRating);
                paramCount++;
            }

            if (filters.maxRating) {
                conditions.push(`p.rating <= $${paramCount}`);
                values.push(filters.maxRating);
                paramCount++;
            }

            if (filters.reviewCount) {
                conditions.push(`p.review_count >= $${paramCount}`);
                values.push(filters.reviewCount);
                paramCount++;
            }

            // Amenity filters
            if (filters.requiredAmenities && filters.requiredAmenities.length > 0) {
                conditions.push(`p.amenities @> $${paramCount}`);
                values.push(JSON.stringify(filters.requiredAmenities));
                paramCount++;
            }

            if (filters.excludedAmenities && filters.excludedAmenities.length > 0) {
                conditions.push(`NOT (p.amenities ?| $${paramCount})`);
                values.push(filters.excludedAmenities);
                paramCount++;
            }

            // Room-specific filters
            let roomJoin = '';
            if (filters.minPrice || filters.maxPrice || filters.roomTypes || filters.minRoomSize || filters.maxRoomSize || filters.bedTypes) {
                roomJoin = 'JOIN rooms r ON p.id = r.property_id AND r.is_available = true';

                if (filters.minPrice) {
                    conditions.push(`r.base_price >= $${paramCount}`);
                    values.push(filters.minPrice);
                    paramCount++;
                }

                if (filters.maxPrice) {
                    conditions.push(`r.base_price <= $${paramCount}`);
                    values.push(filters.maxPrice);
                    paramCount++;
                }

                if (filters.roomTypes && filters.roomTypes.length > 0) {
                    conditions.push(`r.room_type = ANY($${paramCount})`);
                    values.push(filters.roomTypes);
                    paramCount++;
                }

                if (filters.minRoomSize) {
                    conditions.push(`r.room_size >= $${paramCount}`);
                    values.push(filters.minRoomSize);
                    paramCount++;
                }

                if (filters.maxRoomSize) {
                    conditions.push(`r.room_size <= $${paramCount}`);
                    values.push(filters.maxRoomSize);
                    paramCount++;
                }

                if (filters.bedTypes && filters.bedTypes.length > 0) {
                    conditions.push(`r.bed_type = ANY($${paramCount})`);
                    values.push(filters.bedTypes);
                    paramCount++;
                }
            }

            // Date availability filter
            if (filters.checkInDate && filters.checkOutDate) {
                const availabilityJoin = `
                    LEFT JOIN bookings b ON p.id = b.property_id 
                    AND b.booking_status NOT IN ('cancelled', 'no_show')
                    AND (
                        (b.check_in_date <= $${paramCount} AND b.check_out_date > $${paramCount}) OR
                        (b.check_in_date < $${paramCount + 1} AND b.check_out_date >= $${paramCount + 1}) OR
                        (b.check_in_date >= $${paramCount} AND b.check_out_date <= $${paramCount + 1})
                    )
                `;
                roomJoin += availabilityJoin;
                conditions.push('b.id IS NULL');
                values.push(filters.checkInDate, filters.checkOutDate);
                paramCount += 2;
            }

            // Location-based search
            let distanceSelect = '';
            let orderBy = this.buildOrderBy(filters.sortBy);

            if (filters.latitude && filters.longitude) {
                const radius = filters.radius || 25; // Default 25km
                distanceSelect = `, (6371 * acos(cos(radians($${paramCount})) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians($${paramCount + 1})) + sin(radians($${paramCount})) * sin(radians(p.latitude)))) AS distance`;
                conditions.push(`p.latitude IS NOT NULL AND p.longitude IS NOT NULL`);
                conditions.push(`(6371 * acos(cos(radians($${paramCount})) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians($${paramCount + 1})) + sin(radians($${paramCount})) * sin(radians(p.latitude)))) <= $${paramCount + 2}`);
                values.push(filters.latitude, filters.longitude, radius);
                paramCount += 3;

                if (filters.sortBy === 'distance') {
                    orderBy = 'distance ASC';
                }
            }

            const page = Math.max(1, filters.page || 1);
            const limit = Math.min(100, Math.max(1, filters.limit || 20));
            const offset = (page - 1) * limit;

            // Get total count
            const countQuery = `
                SELECT COUNT(DISTINCT p.id) as total 
                FROM properties p 
                ${roomJoin}
                WHERE ${conditions.join(' AND ')}
            `;

            const countResult = await client.query(countQuery, values);
            const total = parseInt(countResult.rows[0].total);

            // Get properties with rooms and aggregated data
            const query = `
                SELECT DISTINCT p.*${distanceSelect},
                       COALESCE(
                         json_agg(
                           DISTINCT jsonb_build_object(
                             'id', room_data.id,
                             'roomType', room_data.room_type,
                             'name', room_data.name,
                             'maxOccupancy', room_data.max_occupancy,
                             'basePrice', room_data.base_price,
                             'currency', room_data.currency,
                             'isAvailable', room_data.is_available,
                             'roomSize', room_data.room_size,
                             'bedType', room_data.bed_type
                           )
                         ) FILTER (WHERE room_data.id IS NOT NULL), '[]'
                       ) as rooms,
                       MIN(room_data.base_price) as min_price,
                       MAX(room_data.base_price) as max_price
                FROM properties p
                ${roomJoin}
                LEFT JOIN rooms room_data ON p.id = room_data.property_id AND room_data.is_available = true
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

            // Get facets for filtering
            const facets = await this.getFacets(client, conditions, values.slice(0, -2));

            return {
                properties,
                total,
                page,
                limit,
                facets
            };
        } finally {
            client.release();
        }
    }

    async getSearchSuggestions(query: string, limit: number = 10): Promise<SearchSuggestion[]> {
        const client = await pool.connect();

        try {
            const suggestions: SearchSuggestion[] = [];

            // City suggestions
            const cityQuery = `
                SELECT DISTINCT city, country, COUNT(*) as count,
                       AVG(latitude) as avg_lat, AVG(longitude) as avg_lng
                FROM properties 
                WHERE status = 'active' AND LOWER(city) ILIKE LOWER($1)
                GROUP BY city, country
                ORDER BY count DESC
                LIMIT $2
            `;

            const cityResult = await client.query(cityQuery, [`%${query}%`, Math.floor(limit / 2)]);

            cityResult.rows.forEach(row => {
                suggestions.push({
                    type: 'city',
                    value: `${row.city}, ${row.country}`,
                    count: parseInt(row.count),
                    location: row.avg_lat && row.avg_lng ? {
                        latitude: parseFloat(row.avg_lat),
                        longitude: parseFloat(row.avg_lng)
                    } : undefined
                });
            });

            // Property name suggestions
            const propertyQuery = `
                SELECT name, city, country, latitude, longitude
                FROM properties 
                WHERE status = 'active' AND LOWER(name) ILIKE LOWER($1)
                ORDER BY rating DESC, review_count DESC
                LIMIT $2
            `;

            const propertyResult = await client.query(propertyQuery, [`%${query}%`, limit - suggestions.length]);

            propertyResult.rows.forEach(row => {
                suggestions.push({
                    type: 'property',
                    value: `${row.name} - ${row.city}, ${row.country}`,
                    count: 1,
                    location: row.latitude && row.longitude ? {
                        latitude: parseFloat(row.latitude),
                        longitude: parseFloat(row.longitude)
                    } : undefined
                });
            });

            return suggestions;
        } finally {
            client.release();
        }
    }

    async getPopularDestinations(limit: number = 10): Promise<{
        city: string;
        country: string;
        propertyCount: number;
        averageRating: number;
        minPrice: number;
        imageUrl?: string;
        location: {
            latitude: number;
            longitude: number;
        };
    }[]> {
        const result = await pool.query(`
            SELECT 
                city, 
                country,
                COUNT(*) as property_count,
                AVG(rating) as average_rating,
                MIN(r.base_price) as min_price,
                AVG(latitude) as avg_lat,
                AVG(longitude) as avg_lng,
                (array_agg(p.images ORDER BY p.rating DESC))[1] as sample_images
            FROM properties p
            LEFT JOIN rooms r ON p.id = r.property_id AND r.is_available = true
            WHERE p.status = 'active' AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
            GROUP BY city, country
            HAVING COUNT(*) >= 3
            ORDER BY property_count DESC, average_rating DESC
            LIMIT $1
        `, [limit]);

        return result.rows.map(row => ({
            city: row.city,
            country: row.country,
            propertyCount: parseInt(row.property_count),
            averageRating: parseFloat(row.average_rating) || 0,
            minPrice: parseFloat(row.min_price) || 0,
            imageUrl: row.sample_images && row.sample_images.length > 0 ? row.sample_images[0] : undefined,
            location: {
                latitude: parseFloat(row.avg_lat),
                longitude: parseFloat(row.avg_lng)
            }
        }));
    }

    private async getFacets(client: any, conditions: string[], values: any[]): Promise<{
        propertyTypes: { [key: string]: number };
        priceRanges: { [key: string]: number };
        ratings: { [key: string]: number };
        amenities: { [key: string]: number };
    }> {
        const whereClause = conditions.join(' AND ');

        // Property types facet
        const propertyTypesQuery = `
            SELECT property_type, COUNT(*) as count
            FROM properties p
            WHERE ${whereClause}
            GROUP BY property_type
            ORDER BY count DESC
        `;

        const propertyTypesResult = await client.query(propertyTypesQuery, values);
        const propertyTypes: { [key: string]: number } = {};
        propertyTypesResult.rows.forEach((row: any) => {
            propertyTypes[row.property_type] = parseInt(row.count);
        });

        // Price ranges facet (based on minimum room price)
        const priceRangesQuery = `
            SELECT 
                CASE 
                    WHEN min_price < 50 THEN '0-50'
                    WHEN min_price < 100 THEN '50-100'
                    WHEN min_price < 200 THEN '100-200'
                    WHEN min_price < 500 THEN '200-500'
                    ELSE '500+'
                END as price_range,
                COUNT(*) as count
            FROM (
                SELECT p.id, MIN(r.base_price) as min_price
                FROM properties p
                LEFT JOIN rooms r ON p.id = r.property_id AND r.is_available = true
                WHERE ${whereClause}
                GROUP BY p.id
            ) price_data
            GROUP BY price_range
            ORDER BY 
                CASE price_range
                    WHEN '0-50' THEN 1
                    WHEN '50-100' THEN 2
                    WHEN '100-200' THEN 3
                    WHEN '200-500' THEN 4
                    WHEN '500+' THEN 5
                END
        `;

        const priceRangesResult = await client.query(priceRangesQuery, values);
        const priceRanges: { [key: string]: number } = {};
        priceRangesResult.rows.forEach((row: any) => {
            priceRanges[row.price_range] = parseInt(row.count);
        });

        // Ratings facet
        const ratingsQuery = `
            SELECT 
                CASE 
                    WHEN rating >= 4.5 THEN '4.5+'
                    WHEN rating >= 4.0 THEN '4.0+'
                    WHEN rating >= 3.5 THEN '3.5+'
                    WHEN rating >= 3.0 THEN '3.0+'
                    ELSE 'Below 3.0'
                END as rating_range,
                COUNT(*) as count
            FROM properties p
            WHERE ${whereClause}
            GROUP BY rating_range
            ORDER BY 
                CASE rating_range
                    WHEN '4.5+' THEN 1
                    WHEN '4.0+' THEN 2
                    WHEN '3.5+' THEN 3
                    WHEN '3.0+' THEN 4
                    WHEN 'Below 3.0' THEN 5
                END
        `;

        const ratingsResult = await client.query(ratingsQuery, values);
        const ratings: { [key: string]: number } = {};
        ratingsResult.rows.forEach((row: any) => {
            ratings[row.rating_range] = parseInt(row.count);
        });

        // Amenities facet
        const amenitiesQuery = `
            SELECT amenity, COUNT(*) as count
            FROM (
                SELECT jsonb_array_elements_text(amenities) as amenity
                FROM properties p
                WHERE ${whereClause}
            ) amenity_data
            GROUP BY amenity
            ORDER BY count DESC
            LIMIT 20
        `;

        const amenitiesResult = await client.query(amenitiesQuery, values);
        const amenities: { [key: string]: number } = {};
        amenitiesResult.rows.forEach((row: any) => {
            amenities[row.amenity] = parseInt(row.count);
        });

        return {
            propertyTypes,
            priceRanges,
            ratings,
            amenities
        };
    }

    private buildOrderBy(sortBy?: string): string {
        switch (sortBy) {
            case 'price_low':
                return 'min_price ASC NULLS LAST, p.rating DESC';
            case 'price_high':
                return 'max_price DESC NULLS LAST, p.rating DESC';
            case 'rating':
                return 'p.rating DESC, p.review_count DESC';
            case 'distance':
                return 'distance ASC';
            case 'popularity':
                return 'p.review_count DESC, p.rating DESC';
            case 'newest':
                return 'p.created_at DESC';
            default:
                return 'p.rating DESC, p.review_count DESC';
        }
    }

    private mapRowToProperty(row: any): any {
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
}