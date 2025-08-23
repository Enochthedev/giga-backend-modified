import { EcommerceDatabase } from '../database/connection';
import { AppError } from '../middleware/error.middleware';

/**
 * Product review and rating service
 */

export interface ProductReview {
    id: string;
    productId: string;
    userId: string;
    orderId?: string;
    rating: number;
    title?: string;
    content?: string;
    images: string[];
    isVerified: boolean;
    isApproved: boolean;
    helpfulCount: number;
    createdAt: Date;
    updatedAt: Date;
    user?: {
        id: string;
        name: string;
        avatar?: string;
    };
}

export interface CreateReviewRequest {
    productId: string;
    orderId?: string;
    rating: number;
    title?: string;
    content?: string;
    images?: string[];
}

export interface UpdateReviewRequest {
    rating?: number;
    title?: string;
    content?: string;
    images?: string[];
}

export interface ReviewSearchQuery {
    productId?: string;
    userId?: string;
    rating?: number;
    isApproved?: boolean;
    isVerified?: boolean;
    page?: number;
    limit?: number;
    sortBy?: 'rating' | 'createdAt' | 'helpfulCount';
    sortOrder?: 'asc' | 'desc';
}

export interface ProductRatingStats {
    averageRating: number;
    totalReviews: number;
    ratingDistribution: Record<number, number>;
}

export class ReviewService {
    /**
     * Create a product review
     */
    public static async createReview(reviewData: CreateReviewRequest, userId: string): Promise<ProductReview> {
        const client = EcommerceDatabase.getPool();

        try {
            await client.query('BEGIN');

            // Check if user has already reviewed this product for this order
            if (reviewData.orderId) {
                const existingReview = await client.query(
                    'SELECT id FROM product_reviews WHERE product_id = $1 AND user_id = $2 AND order_id = $3',
                    [reviewData.productId, userId, reviewData.orderId]
                );

                if (existingReview.rows.length > 0) {
                    throw new AppError('You have already reviewed this product for this order', 400);
                }

                // Verify that the user actually purchased this product in this order
                const orderItem = await client.query(`
                    SELECT oi.id FROM order_items oi
                    JOIN orders o ON oi.order_id = o.id
                    WHERE o.id = $1 AND o.user_id = $2 AND oi.product_id = $3
                `, [reviewData.orderId, userId, reviewData.productId]);

                if (orderItem.rows.length === 0) {
                    throw new AppError('You can only review products you have purchased', 400);
                }
            } else {
                // Check if user has already reviewed this product (without order)
                const existingReview = await client.query(
                    'SELECT id FROM product_reviews WHERE product_id = $1 AND user_id = $2 AND order_id IS NULL',
                    [reviewData.productId, userId]
                );

                if (existingReview.rows.length > 0) {
                    throw new AppError('You have already reviewed this product', 400);
                }
            }

            // Create the review
            const reviewResult = await client.query(`
                INSERT INTO product_reviews (
                    product_id, user_id, order_id, rating, title, content, images, 
                    is_verified, is_approved
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            `, [
                reviewData.productId,
                userId,
                reviewData.orderId || null,
                reviewData.rating,
                reviewData.title,
                reviewData.content,
                JSON.stringify(reviewData.images || []),
                !!reviewData.orderId, // Verified if from an order
                false // Requires approval
            ]);

            await client.query('COMMIT');

            return await this.getReviewById(reviewResult.rows[0].id);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
    }

    /**
     * Get review by ID
     */
    public static async getReviewById(id: string): Promise<ProductReview> {
        const result = await EcommerceDatabase.query(`
            SELECT 
                pr.*,
                u.name as user_name,
                u.avatar as user_avatar
            FROM product_reviews pr
            LEFT JOIN users u ON pr.user_id = u.id
            WHERE pr.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            throw new AppError('Review not found', 404);
        }

        const row = result.rows[0];
        return this.mapRowToReview(row);
    }

    /**
     * Update review
     */
    public static async updateReview(id: string, updateData: UpdateReviewRequest, userId: string): Promise<ProductReview> {
        // Check if user owns the review
        const existingReview = await EcommerceDatabase.query(
            'SELECT user_id FROM product_reviews WHERE id = $1',
            [id]
        );

        if (existingReview.rows.length === 0) {
            throw new AppError('Review not found', 404);
        }

        if (existingReview.rows[0].user_id !== userId) {
            throw new AppError('Not authorized to update this review', 403);
        }

        // Build update query
        const updateFields: string[] = [];
        const updateValues: any[] = [];
        let paramIndex = 1;

        Object.entries(updateData).forEach(([key, value]) => {
            if (value !== undefined) {
                const dbField = key === 'images' ? 'images' : key.replace(/([A-Z])/g, '_$1').toLowerCase();
                updateFields.push(`${dbField} = $${paramIndex}`);
                updateValues.push(key === 'images' ? JSON.stringify(value) : value);
                paramIndex++;
            }
        });

        if (updateFields.length === 0) {
            return await this.getReviewById(id);
        }

        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        updateFields.push(`is_approved = false`); // Requires re-approval after edit
        updateValues.push(id);

        await EcommerceDatabase.query(`
            UPDATE product_reviews 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex}
        `, updateValues);

        return await this.getReviewById(id);
    }

    /**
     * Delete review
     */
    public static async deleteReview(id: string, userId: string): Promise<void> {
        // Check if user owns the review
        const existingReview = await EcommerceDatabase.query(
            'SELECT user_id FROM product_reviews WHERE id = $1',
            [id]
        );

        if (existingReview.rows.length === 0) {
            throw new AppError('Review not found', 404);
        }

        if (existingReview.rows[0].user_id !== userId) {
            throw new AppError('Not authorized to delete this review', 403);
        }

        await EcommerceDatabase.query('DELETE FROM product_reviews WHERE id = $1', [id]);
    }

    /**
     * Search reviews
     */
    public static async searchReviews(query: ReviewSearchQuery): Promise<{
        reviews: ProductReview[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }> {
        const {
            productId,
            userId,
            rating,
            isApproved,
            isVerified,
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = query;

        // Build WHERE clause
        const whereConditions: string[] = [];
        const queryParams: any[] = [];
        let paramIndex = 1;

        if (productId) {
            whereConditions.push(`pr.product_id = $${paramIndex}`);
            queryParams.push(productId);
            paramIndex++;
        }

        if (userId) {
            whereConditions.push(`pr.user_id = $${paramIndex}`);
            queryParams.push(userId);
            paramIndex++;
        }

        if (rating !== undefined) {
            whereConditions.push(`pr.rating = $${paramIndex}`);
            queryParams.push(rating);
            paramIndex++;
        }

        if (isApproved !== undefined) {
            whereConditions.push(`pr.is_approved = $${paramIndex}`);
            queryParams.push(isApproved);
            paramIndex++;
        }

        if (isVerified !== undefined) {
            whereConditions.push(`pr.is_verified = $${paramIndex}`);
            queryParams.push(isVerified);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Build ORDER BY clause
        const orderByMap: Record<string, string> = {
            rating: 'pr.rating',
            createdAt: 'pr.created_at',
            helpfulCount: 'pr.helpful_count'
        };

        const orderBy = `ORDER BY ${orderByMap[sortBy] || 'pr.created_at'} ${sortOrder.toUpperCase()}`;

        // Get total count
        const countResult = await EcommerceDatabase.query(`
            SELECT COUNT(*)::integer as total
            FROM product_reviews pr
            ${whereClause}
        `, queryParams);

        const total = countResult.rows[0].total;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;

        // Get reviews
        const reviewsResult = await EcommerceDatabase.query(`
            SELECT 
                pr.*,
                u.name as user_name,
                u.avatar as user_avatar
            FROM product_reviews pr
            LEFT JOIN users u ON pr.user_id = u.id
            ${whereClause}
            ${orderBy}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `, [...queryParams, limit, offset]);

        const reviews = reviewsResult.rows.map(this.mapRowToReview);

        const pagination = {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
        };

        return { reviews, pagination };
    }

    /**
     * Get product rating statistics
     */
    public static async getProductRatingStats(productId: string): Promise<ProductRatingStats> {
        const result = await EcommerceDatabase.query(`
            SELECT 
                AVG(rating)::numeric as average_rating,
                COUNT(*)::integer as total_reviews,
                rating,
                COUNT(rating)::integer as rating_count
            FROM product_reviews 
            WHERE product_id = $1 AND is_approved = true
            GROUP BY rating
        `, [productId]);

        let averageRating = 0;
        let totalReviews = 0;
        const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

        if (result.rows.length > 0) {
            // Calculate total reviews and distribution
            result.rows.forEach((row: any) => {
                totalReviews += row.rating_count;
                ratingDistribution[row.rating] = row.rating_count;
            });

            // Calculate weighted average
            const totalRatingPoints = result.rows.reduce((sum: number, row: any) => {
                return sum + (row.rating * row.rating_count);
            }, 0);

            averageRating = totalReviews > 0 ? totalRatingPoints / totalReviews : 0;
        }

        return {
            averageRating: Math.round(averageRating * 100) / 100, // Round to 2 decimal places
            totalReviews,
            ratingDistribution
        };
    }

    /**
     * Mark review as helpful
     */
    public static async markReviewHelpful(reviewId: string, userId: string): Promise<void> {
        // Check if user has already marked this review as helpful
        const existing = await EcommerceDatabase.query(
            'SELECT id FROM review_helpful WHERE review_id = $1 AND user_id = $2',
            [reviewId, userId]
        );

        if (existing.rows.length > 0) {
            throw new AppError('You have already marked this review as helpful', 400);
        }

        const client = EcommerceDatabase.getPool();

        try {
            await client.query('BEGIN');

            // Add helpful record
            await client.query(
                'INSERT INTO review_helpful (review_id, user_id) VALUES ($1, $2)',
                [reviewId, userId]
            );

            // Update helpful count
            await client.query(
                'UPDATE product_reviews SET helpful_count = helpful_count + 1 WHERE id = $1',
                [reviewId]
            );

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
    }

    /**
     * Approve review (admin only)
     */
    public static async approveReview(reviewId: string): Promise<ProductReview> {
        await EcommerceDatabase.query(
            'UPDATE product_reviews SET is_approved = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [reviewId]
        );

        return await this.getReviewById(reviewId);
    }

    /**
     * Reject review (admin only)
     */
    public static async rejectReview(reviewId: string): Promise<void> {
        await EcommerceDatabase.query('DELETE FROM product_reviews WHERE id = $1', [reviewId]);
    }

    /**
     * Map database row to ProductReview object
     */
    private static mapRowToReview(row: any): ProductReview {
        return {
            id: row.id,
            productId: row.product_id,
            userId: row.user_id,
            orderId: row.order_id,
            rating: row.rating,
            title: row.title,
            content: row.content,
            images: row.images || [],
            isVerified: row.is_verified,
            isApproved: row.is_approved,
            helpfulCount: row.helpful_count,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            user: row.user_name ? {
                id: row.user_id,
                name: row.user_name,
                avatar: row.user_avatar
            } : undefined
        };
    }
}