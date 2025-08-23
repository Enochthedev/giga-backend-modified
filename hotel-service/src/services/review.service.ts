import { pool } from '../database/connection';
import { PropertyReview } from '../types/hotel.types';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import { logger } from '../utils/logger';

export interface CreateReviewRequest {
    propertyId: string;
    bookingId?: string;
    rating: number;
    title?: string;
    comment?: string;
    cleanlinessRating?: number;
    locationRating?: number;
    serviceRating?: number;
    valueRating?: number;
    images?: string[];
}

export interface UpdateReviewRequest {
    rating?: number;
    title?: string;
    comment?: string;
    cleanlinessRating?: number;
    locationRating?: number;
    serviceRating?: number;
    valueRating?: number;
    images?: string[];
}

export interface ReviewFilters {
    propertyId?: string;
    rating?: number;
    minRating?: number;
    maxRating?: number;
    verified?: boolean;
    page?: number;
    limit?: number;
    sortBy?: 'newest' | 'oldest' | 'rating_high' | 'rating_low';
}

export class ReviewService {
    async createReview(
        userId: string,
        reviewerName: string,
        data: CreateReviewRequest
    ): Promise<PropertyReview> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Validate rating
            if (data.rating < 1 || data.rating > 5) {
                throw new ValidationError('Rating must be between 1 and 5');
            }

            // Check if property exists
            const propertyResult = await client.query(
                'SELECT id FROM properties WHERE id = $1',
                [data.propertyId]
            );

            if (propertyResult.rows.length === 0) {
                throw new NotFoundError('Property', data.propertyId);
            }

            let isVerified = false;

            // If booking ID is provided, verify the booking and user
            if (data.bookingId) {
                const bookingResult = await client.query(
                    `SELECT id FROM bookings 
                     WHERE id = $1 AND guest_user_id = $2 AND property_id = $3 
                     AND booking_status IN ('checked_out', 'completed')`,
                    [data.bookingId, userId, data.propertyId]
                );

                if (bookingResult.rows.length > 0) {
                    isVerified = true;

                    // Check if user already reviewed this booking
                    const existingReview = await client.query(
                        'SELECT id FROM property_reviews WHERE booking_id = $1 AND reviewer_user_id = $2',
                        [data.bookingId, userId]
                    );

                    if (existingReview.rows.length > 0) {
                        throw new ConflictError('You have already reviewed this booking');
                    }
                }
            }

            // Create the review
            const result = await client.query(
                `INSERT INTO property_reviews (
                    property_id, booking_id, reviewer_user_id, reviewer_name,
                    rating, title, comment, cleanliness_rating, location_rating,
                    service_rating, value_rating, images, is_verified
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING *`,
                [
                    data.propertyId, data.bookingId, userId, reviewerName,
                    data.rating, data.title, data.comment, data.cleanlinessRating,
                    data.locationRating, data.serviceRating, data.valueRating,
                    JSON.stringify(data.images || []), isVerified
                ]
            );

            // Update property rating and review count
            await this.updatePropertyRating(client, data.propertyId);

            await client.query('COMMIT');

            logger.info('Review created successfully', {
                reviewId: result.rows[0].id,
                propertyId: data.propertyId,
                userId,
                rating: data.rating
            });

            return this.mapRowToReview(result.rows[0]);
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error creating review:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async getReviewById(id: string): Promise<PropertyReview> {
        const result = await pool.query(
            'SELECT * FROM property_reviews WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            throw new NotFoundError('Review', id);
        }

        return this.mapRowToReview(result.rows[0]);
    }

    async getPropertyReviews(filters: ReviewFilters): Promise<{
        reviews: PropertyReview[];
        total: number;
        page: number;
        limit: number;
        averageRating: number;
        ratingBreakdown: { [key: number]: number };
    }> {
        const client = await pool.connect();

        try {
            const conditions: string[] = [];
            const values: any[] = [];
            let paramCount = 1;

            if (filters.propertyId) {
                conditions.push(`property_id = $${paramCount}`);
                values.push(filters.propertyId);
                paramCount++;
            }

            if (filters.rating) {
                conditions.push(`rating = $${paramCount}`);
                values.push(filters.rating);
                paramCount++;
            }

            if (filters.minRating) {
                conditions.push(`rating >= $${paramCount}`);
                values.push(filters.minRating);
                paramCount++;
            }

            if (filters.maxRating) {
                conditions.push(`rating <= $${paramCount}`);
                values.push(filters.maxRating);
                paramCount++;
            }

            if (filters.verified !== undefined) {
                conditions.push(`is_verified = $${paramCount}`);
                values.push(filters.verified);
                paramCount++;
            }

            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

            // Get total count and average rating
            const statsQuery = `
                SELECT 
                    COUNT(*) as total,
                    AVG(rating) as average_rating,
                    COUNT(CASE WHEN rating = 1 THEN 1 END) as rating_1,
                    COUNT(CASE WHEN rating = 2 THEN 1 END) as rating_2,
                    COUNT(CASE WHEN rating = 3 THEN 1 END) as rating_3,
                    COUNT(CASE WHEN rating = 4 THEN 1 END) as rating_4,
                    COUNT(CASE WHEN rating = 5 THEN 1 END) as rating_5
                FROM property_reviews ${whereClause}
            `;

            const statsResult = await client.query(statsQuery, values);
            const stats = statsResult.rows[0];

            const total = parseInt(stats.total);
            const averageRating = parseFloat(stats.average_rating) || 0;
            const ratingBreakdown = {
                1: parseInt(stats.rating_1),
                2: parseInt(stats.rating_2),
                3: parseInt(stats.rating_3),
                4: parseInt(stats.rating_4),
                5: parseInt(stats.rating_5)
            };

            // Get paginated reviews
            const page = Math.max(1, filters.page || 1);
            const limit = Math.min(50, Math.max(1, filters.limit || 10));
            const offset = (page - 1) * limit;

            let orderBy = 'created_at DESC';
            switch (filters.sortBy) {
                case 'oldest':
                    orderBy = 'created_at ASC';
                    break;
                case 'rating_high':
                    orderBy = 'rating DESC, created_at DESC';
                    break;
                case 'rating_low':
                    orderBy = 'rating ASC, created_at DESC';
                    break;
                default:
                    orderBy = 'created_at DESC';
            }

            const reviewsQuery = `
                SELECT * FROM property_reviews 
                ${whereClause}
                ORDER BY ${orderBy}
                LIMIT $${paramCount} OFFSET $${paramCount + 1}
            `;

            values.push(limit, offset);

            const reviewsResult = await client.query(reviewsQuery, values);
            const reviews = reviewsResult.rows.map(row => this.mapRowToReview(row));

            return {
                reviews,
                total,
                page,
                limit,
                averageRating,
                ratingBreakdown
            };
        } finally {
            client.release();
        }
    }

    async updateReview(
        id: string,
        userId: string,
        data: UpdateReviewRequest
    ): Promise<PropertyReview> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Check if review exists and belongs to user
            const existingReview = await client.query(
                'SELECT * FROM property_reviews WHERE id = $1 AND reviewer_user_id = $2',
                [id, userId]
            );

            if (existingReview.rows.length === 0) {
                throw new NotFoundError('Review', id);
            }

            const updateFields: string[] = [];
            const updateValues: any[] = [];
            let paramCount = 1;

            Object.entries(data).forEach(([key, value]) => {
                if (value !== undefined) {
                    const dbField = this.camelToSnakeCase(key);
                    if (key === 'images') {
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
                return this.mapRowToReview(existingReview.rows[0]);
            }

            updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
            updateValues.push(id);

            const result = await client.query(
                `UPDATE property_reviews SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
                updateValues
            );

            // Update property rating if rating changed
            if (data.rating !== undefined) {
                await this.updatePropertyRating(client, existingReview.rows[0].property_id);
            }

            await client.query('COMMIT');

            logger.info('Review updated successfully', { reviewId: id, userId });

            return this.mapRowToReview(result.rows[0]);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async deleteReview(id: string, userId: string): Promise<void> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const result = await client.query(
                'DELETE FROM property_reviews WHERE id = $1 AND reviewer_user_id = $2 RETURNING property_id',
                [id, userId]
            );

            if (result.rowCount === 0) {
                throw new NotFoundError('Review', id);
            }

            // Update property rating
            await this.updatePropertyRating(client, result.rows[0].property_id);

            await client.query('COMMIT');

            logger.info('Review deleted successfully', { reviewId: id, userId });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async addOwnerResponse(
        reviewId: string,
        ownerId: string,
        response: string
    ): Promise<PropertyReview> {
        const client = await pool.connect();

        try {
            // Verify ownership
            const result = await client.query(
                `UPDATE property_reviews pr
                 SET owner_response = $1, owner_response_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                 FROM properties p, property_owners po
                 WHERE pr.property_id = p.id 
                 AND p.owner_id = po.id 
                 AND po.user_id = $2 
                 AND pr.id = $3
                 RETURNING pr.*`,
                [response, ownerId, reviewId]
            );

            if (result.rows.length === 0) {
                throw new NotFoundError('Review', reviewId);
            }

            logger.info('Owner response added to review', { reviewId, ownerId });

            return this.mapRowToReview(result.rows[0]);
        } finally {
            client.release();
        }
    }

    private async updatePropertyRating(client: any, propertyId: string): Promise<void> {
        const result = await client.query(
            `SELECT AVG(rating) as avg_rating, COUNT(*) as review_count
             FROM property_reviews 
             WHERE property_id = $1`,
            [propertyId]
        );

        const avgRating = parseFloat(result.rows[0].avg_rating) || 0;
        const reviewCount = parseInt(result.rows[0].review_count) || 0;

        await client.query(
            'UPDATE properties SET rating = $1, review_count = $2 WHERE id = $3',
            [avgRating, reviewCount, propertyId]
        );
    }

    private mapRowToReview(row: any): PropertyReview {
        return {
            id: row.id,
            propertyId: row.property_id,
            bookingId: row.booking_id,
            reviewerUserId: row.reviewer_user_id,
            reviewerName: row.reviewer_name,
            rating: parseInt(row.rating),
            title: row.title,
            comment: row.comment,
            cleanlinessRating: row.cleanliness_rating ? parseInt(row.cleanliness_rating) : undefined,
            locationRating: row.location_rating ? parseInt(row.location_rating) : undefined,
            serviceRating: row.service_rating ? parseInt(row.service_rating) : undefined,
            valueRating: row.value_rating ? parseInt(row.value_rating) : undefined,
            images: row.images || [],
            isVerified: row.is_verified,
            ownerResponse: row.owner_response,
            ownerResponseDate: row.owner_response_date ? new Date(row.owner_response_date) : undefined,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        };
    }

    private camelToSnakeCase(str: string): string {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }
}