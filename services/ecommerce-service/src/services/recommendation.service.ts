import { EcommerceDatabase } from '../database/connection';
import { ProductWithVariants } from '../types/product.types';

/**
 * Product recommendation service
 */

export interface RecommendationRequest {
    userId?: string;
    productId?: string;
    categoryId?: string;
    limit?: number;
    excludeProductIds?: string[];
}

export interface UserBehavior {
    userId: string;
    productId: string;
    action: 'view' | 'cart' | 'purchase' | 'wishlist' | 'review';
    weight: number;
    timestamp: Date;
}

export class RecommendationService {
    /**
     * Get personalized recommendations for a user
     */
    public static async getPersonalizedRecommendations(
        userId: string,
        options: {
            limit?: number;
            excludeProductIds?: string[];
            includeCategories?: string[];
        } = {}
    ): Promise<ProductWithVariants[]> {
        const { limit = 10, excludeProductIds = [], includeCategories = [] } = options;

        // Get user's purchase and interaction history
        const userHistory = await this.getUserInteractionHistory(userId);

        if (userHistory.length === 0) {
            // For new users, return popular products
            return await this.getPopularProducts({ limit, excludeProductIds, includeCategories });
        }

        // Get categories user has shown interest in
        const userCategories = await this.getUserPreferredCategories(userId);
        const targetCategories = includeCategories.length > 0 ? includeCategories : userCategories;

        // Build collaborative filtering query
        const categoryFilter = targetCategories.length > 0
            ? `AND p.category_id = ANY($${excludeProductIds.length + 3})`
            : '';

        const excludeFilter = excludeProductIds.length > 0
            ? `AND p.id != ALL($${excludeProductIds.length + 2})`
            : '';

        const result = await EcommerceDatabase.query(`
            WITH user_similarities AS (
                -- Find users with similar purchase patterns
                SELECT 
                    o2.user_id,
                    COUNT(DISTINCT oi1.product_id) as common_products,
                    COUNT(DISTINCT oi2.product_id) as total_products
                FROM order_items oi1
                JOIN orders o1 ON oi1.order_id = o1.id
                JOIN order_items oi2 ON oi1.product_id = oi2.product_id
                JOIN orders o2 ON oi2.order_id = o2.id
                WHERE o1.user_id = $1 AND o2.user_id != $1
                GROUP BY o2.user_id
                HAVING COUNT(DISTINCT oi1.product_id) >= 2
            ),
            recommended_products AS (
                -- Get products purchased by similar users
                SELECT 
                    p.id,
                    p.name,
                    p.price,
                    p.category_id,
                    COUNT(DISTINCT us.user_id) as similarity_score,
                    AVG(pr.rating) as avg_rating,
                    COUNT(pr.id) as review_count
                FROM user_similarities us
                JOIN orders o ON us.user_id = o.user_id
                JOIN order_items oi ON o.id = oi.order_id
                JOIN products p ON oi.product_id = p.id
                LEFT JOIN product_reviews pr ON p.id = pr.product_id AND pr.is_approved = true
                WHERE p.is_active = true
                ${excludeFilter}
                ${categoryFilter}
                GROUP BY p.id, p.name, p.price, p.category_id
                ORDER BY similarity_score DESC, avg_rating DESC NULLS LAST
                LIMIT $${excludeProductIds.length + (targetCategories.length > 0 ? 4 : 3)}
            )
            SELECT 
                rp.*,
                c.name as category_name,
                COALESCE(i.quantity - i.reserved_quantity, 0) as available_stock
            FROM recommended_products rp
            LEFT JOIN categories c ON rp.category_id = c.id
            LEFT JOIN inventory i ON rp.id = i.product_id
        `, [
            userId,
            limit,
            ...(excludeProductIds.length > 0 ? [excludeProductIds] : []),
            ...(targetCategories.length > 0 ? [targetCategories] : [])
        ]);

        // If we don't have enough collaborative recommendations, fill with content-based
        if (result.rows.length < limit) {
            const contentBased = await this.getContentBasedRecommendations(userId, {
                limit: limit - result.rows.length,
                excludeProductIds: [...excludeProductIds, ...result.rows.map((r: any) => r.id)]
            });
            result.rows.push(...contentBased);
        }

        return this.mapRowsToProducts(result.rows);
    }

    /**
     * Get content-based recommendations
     */
    public static async getContentBasedRecommendations(
        userId: string,
        options: { limit?: number; excludeProductIds?: string[] } = {}
    ): Promise<any[]> {
        const { limit = 10, excludeProductIds = [] } = options;

        // Get user's preferred categories and brands
        const preferences = await EcommerceDatabase.query(`
            SELECT 
                p.category_id,
                p.brand,
                COUNT(*) as interaction_count
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            WHERE o.user_id = $1
            GROUP BY p.category_id, p.brand
            ORDER BY interaction_count DESC
            LIMIT 5
        `, [userId]);

        if (preferences.rows.length === 0) {
            return [];
        }

        const categoryIds = preferences.rows.map((r: any) => r.category_id).filter(Boolean);
        const brands = preferences.rows.map((r: any) => r.brand).filter(Boolean);

        const excludeFilter = excludeProductIds.length > 0
            ? `AND p.id != ALL($${categoryIds.length + brands.length + 2})`
            : '';

        const result = await EcommerceDatabase.query(`
            SELECT 
                p.*,
                c.name as category_name,
                AVG(pr.rating) as avg_rating,
                COUNT(pr.id) as review_count,
                COALESCE(i.quantity - i.reserved_quantity, 0) as available_stock,
                CASE 
                    WHEN p.category_id = ANY($1) THEN 2
                    WHEN p.brand = ANY($2) THEN 1
                    ELSE 0
                END as relevance_score
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN product_reviews pr ON p.id = pr.product_id AND pr.is_approved = true
            LEFT JOIN inventory i ON p.id = i.product_id
            WHERE p.is_active = true
            AND (p.category_id = ANY($1) OR p.brand = ANY($2))
            ${excludeFilter}
            GROUP BY p.id, c.name, i.quantity, i.reserved_quantity
            ORDER BY relevance_score DESC, avg_rating DESC NULLS LAST, p.created_at DESC
            LIMIT $${categoryIds.length + brands.length + (excludeProductIds.length > 0 ? 3 : 2)}
        `, [
            categoryIds,
            brands,
            ...(excludeProductIds.length > 0 ? [excludeProductIds] : []),
            limit
        ]);

        return result.rows;
    }

    /**
     * Get similar products based on a specific product
     */
    public static async getSimilarProducts(
        productId: string,
        options: { limit?: number; excludeProductIds?: string[] } = {}
    ): Promise<ProductWithVariants[]> {
        const { limit = 10, excludeProductIds = [] } = options;

        // Get the base product details
        const baseProduct = await EcommerceDatabase.query(
            'SELECT category_id, brand, tags FROM products WHERE id = $1',
            [productId]
        );

        if (baseProduct.rows.length === 0) {
            return [];
        }

        const { category_id, brand, tags } = baseProduct.rows[0];
        const excludeIds = [...excludeProductIds, productId];

        const result = await EcommerceDatabase.query(`
            SELECT 
                p.*,
                c.name as category_name,
                AVG(pr.rating) as avg_rating,
                COUNT(pr.id) as review_count,
                COALESCE(i.quantity - i.reserved_quantity, 0) as available_stock,
                (
                    CASE WHEN p.category_id = $2 THEN 3 ELSE 0 END +
                    CASE WHEN p.brand = $3 THEN 2 ELSE 0 END +
                    CASE WHEN p.tags && $4 THEN 1 ELSE 0 END
                ) as similarity_score
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN product_reviews pr ON p.id = pr.product_id AND pr.is_approved = true
            LEFT JOIN inventory i ON p.id = i.product_id
            WHERE p.is_active = true
            AND p.id != ALL($1)
            AND (
                p.category_id = $2 OR 
                p.brand = $3 OR 
                p.tags && $4
            )
            GROUP BY p.id, c.name, i.quantity, i.reserved_quantity
            HAVING (
                CASE WHEN p.category_id = $2 THEN 3 ELSE 0 END +
                CASE WHEN p.brand = $3 THEN 2 ELSE 0 END +
                CASE WHEN p.tags && $4 THEN 1 ELSE 0 END
            ) > 0
            ORDER BY similarity_score DESC, avg_rating DESC NULLS LAST
            LIMIT $5
        `, [excludeIds, category_id, brand, tags || [], limit]);

        return this.mapRowsToProducts(result.rows);
    }

    /**
     * Get popular products (trending/bestsellers)
     */
    public static async getPopularProducts(options: {
        limit?: number;
        excludeProductIds?: string[];
        includeCategories?: string[];
        timeframe?: 'week' | 'month' | 'quarter' | 'year';
    } = {}): Promise<ProductWithVariants[]> {
        const {
            limit = 10,
            excludeProductIds = [],
            includeCategories = [],
            timeframe = 'month'
        } = options;

        const timeframeMap = {
            week: '7 days',
            month: '30 days',
            quarter: '90 days',
            year: '365 days'
        };

        const excludeFilter = excludeProductIds.length > 0
            ? `AND p.id != ALL($${includeCategories.length + 2})`
            : '';

        const categoryFilter = includeCategories.length > 0
            ? `AND p.category_id = ANY($${includeCategories.length + (excludeProductIds.length > 0 ? 3 : 2)})`
            : '';

        const result = await EcommerceDatabase.query(`
            SELECT 
                p.*,
                c.name as category_name,
                COUNT(oi.id) as order_count,
                SUM(oi.quantity) as total_sold,
                AVG(pr.rating) as avg_rating,
                COUNT(DISTINCT pr.id) as review_count,
                COALESCE(i.quantity - i.reserved_quantity, 0) as available_stock
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN order_items oi ON p.id = oi.product_id
            LEFT JOIN orders o ON oi.order_id = o.id AND o.created_at >= NOW() - INTERVAL '${timeframeMap[timeframe]}'
            LEFT JOIN product_reviews pr ON p.id = pr.product_id AND pr.is_approved = true
            LEFT JOIN inventory i ON p.id = i.product_id
            WHERE p.is_active = true
            ${excludeFilter}
            ${categoryFilter}
            GROUP BY p.id, c.name, i.quantity, i.reserved_quantity
            ORDER BY total_sold DESC NULLS LAST, avg_rating DESC NULLS LAST, p.created_at DESC
            LIMIT $1
        `, [
            limit,
            ...(excludeProductIds.length > 0 ? [excludeProductIds] : []),
            ...(includeCategories.length > 0 ? [includeCategories] : [])
        ]);

        return this.mapRowsToProducts(result.rows);
    }

    /**
     * Get frequently bought together products
     */
    public static async getFrequentlyBoughtTogether(
        productId: string,
        options: { limit?: number } = {}
    ): Promise<ProductWithVariants[]> {
        const { limit = 5 } = options;

        const result = await EcommerceDatabase.query(`
            WITH product_pairs AS (
                SELECT 
                    oi1.product_id as base_product,
                    oi2.product_id as related_product,
                    COUNT(*) as frequency
                FROM order_items oi1
                JOIN order_items oi2 ON oi1.order_id = oi2.order_id
                WHERE oi1.product_id = $1 
                AND oi2.product_id != $1
                GROUP BY oi1.product_id, oi2.product_id
                HAVING COUNT(*) >= 2
            )
            SELECT 
                p.*,
                c.name as category_name,
                pp.frequency,
                AVG(pr.rating) as avg_rating,
                COUNT(pr.id) as review_count,
                COALESCE(i.quantity - i.reserved_quantity, 0) as available_stock
            FROM product_pairs pp
            JOIN products p ON pp.related_product = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN product_reviews pr ON p.id = pr.product_id AND pr.is_approved = true
            LEFT JOIN inventory i ON p.id = i.product_id
            WHERE p.is_active = true
            GROUP BY p.id, c.name, pp.frequency, i.quantity, i.reserved_quantity
            ORDER BY pp.frequency DESC, avg_rating DESC NULLS LAST
            LIMIT $2
        `, [productId, limit]);

        return this.mapRowsToProducts(result.rows);
    }

    /**
     * Track user behavior for recommendations
     */
    public static async trackUserBehavior(behavior: UserBehavior): Promise<void> {
        await EcommerceDatabase.query(`
            INSERT INTO user_behavior_tracking (user_id, product_id, action, weight, timestamp)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (user_id, product_id, action) 
            DO UPDATE SET weight = user_behavior_tracking.weight + $4, timestamp = $5
        `, [behavior.userId, behavior.productId, behavior.action, behavior.weight, behavior.timestamp]);
    }

    /**
     * Get user's interaction history
     */
    private static async getUserInteractionHistory(userId: string): Promise<string[]> {
        const result = await EcommerceDatabase.query(`
            SELECT DISTINCT oi.product_id
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            WHERE o.user_id = $1
            ORDER BY oi.product_id
        `, [userId]);

        return result.rows.map((row: any) => row.product_id);
    }

    /**
     * Get user's preferred categories
     */
    private static async getUserPreferredCategories(userId: string): Promise<string[]> {
        const result = await EcommerceDatabase.query(`
            SELECT p.category_id, COUNT(*) as frequency
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            WHERE o.user_id = $1 AND p.category_id IS NOT NULL
            GROUP BY p.category_id
            ORDER BY frequency DESC
            LIMIT 5
        `, [userId]);

        return result.rows.map((row: any) => row.category_id);
    }

    /**
     * Map database rows to ProductWithVariants objects
     */
    private static mapRowsToProducts(rows: any[]): ProductWithVariants[] {
        return rows.map(row => ({
            id: row.id,
            name: row.name,
            description: row.description,
            shortDescription: row.short_description,
            sku: row.sku,
            price: parseFloat(row.price),
            comparePrice: row.compare_price ? parseFloat(row.compare_price) : undefined,
            costPrice: row.cost_price ? parseFloat(row.cost_price) : undefined,
            categoryId: row.category_id,
            vendorId: row.vendor_id,
            brand: row.brand,
            weight: row.weight,
            dimensions: row.dimensions,
            images: row.images || [],
            tags: row.tags || [],
            metaTitle: row.meta_title,
            metaDescription: row.meta_description,
            isActive: row.is_active,
            isFeatured: row.is_featured,
            requiresShipping: row.requires_shipping,
            trackInventory: row.track_inventory,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            variants: [], // Would need separate query to populate
            category: row.category_name ? {
                id: row.category_id,
                name: row.category_name
            } : undefined,
            inventory: {
                quantity: row.available_stock || 0,
                reservedQuantity: 0,
                lowStockThreshold: 5
            },
            averageRating: row.avg_rating ? parseFloat(row.avg_rating) : undefined,
            reviewCount: row.review_count || 0
        }));
    }
}