import { EcommerceDatabase } from '../database/connection';
import {
    ProductWithVariants,
    CreateProductRequest,
    UpdateProductRequest,
    ProductSearchQuery,
    ProductFilters,
    PaginationInfo
} from '../types';
import { AppError } from '../middleware/error.middleware';
import { InventoryService } from './inventory.service';

/**
 * Product service for managing products and variants
 */
export class ProductService {
    private static inventoryService = new InventoryService();

    /**
     * Create a new product
     */
    public static async createProduct(productData: CreateProductRequest, vendorId: string): Promise<ProductWithVariants> {
        const client = EcommerceDatabase.getPool();

        try {
            await client.query('BEGIN');

            // Check if SKU already exists
            const existingSku = await client.query(
                'SELECT id FROM products WHERE sku = $1',
                [productData.sku]
            );

            if (existingSku.rows.length > 0) {
                throw new AppError('Product with this SKU already exists', 409);
            }

            // Insert product
            const productResult = await client.query(`
                INSERT INTO products (
                    name, description, short_description, sku, price, compare_price, cost_price,
                    category_id, vendor_id, brand, weight, dimensions, images, tags,
                    meta_title, meta_description, is_active, is_featured, requires_shipping, track_inventory
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
                RETURNING *
            `, [
                productData.name,
                productData.description,
                productData.shortDescription,
                productData.sku,
                productData.price,
                productData.comparePrice,
                productData.costPrice,
                productData.categoryId,
                vendorId,
                productData.brand,
                productData.weight,
                productData.dimensions ? JSON.stringify(productData.dimensions) : null,
                JSON.stringify(productData.images || []),
                productData.tags || [],
                productData.metaTitle,
                productData.metaDescription,
                productData.isActive ?? true,
                productData.isFeatured ?? false,
                productData.requiresShipping ?? true,
                productData.trackInventory ?? true
            ]);

            const product = productResult.rows[0];

            // Create initial inventory if tracking inventory
            if (productData.trackInventory && productData.initialInventory !== undefined) {
                await this.inventoryService.createInventory({
                    productId: product.id,
                    quantity: productData.initialInventory,
                    lowStockThreshold: 5
                });
            }

            await client.query('COMMIT');

            return await this.getProductById(product.id);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
    }

    /**
     * Get product by ID with variants and inventory
     */
    public static async getProductById(id: string): Promise<ProductWithVariants> {
        const productResult = await EcommerceDatabase.query(`
            SELECT p.*, c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = $1
        `, [id]);

        if (productResult.rows.length === 0) {
            throw new AppError('Product not found', 404);
        }

        const product = productResult.rows[0];

        // Get variants
        const variantsResult = await EcommerceDatabase.query(`
            SELECT * FROM product_variants 
            WHERE product_id = $1 
            ORDER BY created_at ASC
        `, [id]);

        // Get inventory
        const inventoryResult = await EcommerceDatabase.query(`
            SELECT * FROM inventory 
            WHERE product_id = $1
        `, [id]);

        // Get reviews summary
        const reviewsResult = await EcommerceDatabase.query(`
            SELECT 
                AVG(rating)::numeric(3,2) as average_rating,
                COUNT(*)::integer as review_count
            FROM product_reviews 
            WHERE product_id = $1 AND is_approved = true
        `, [id]);

        return {
            id: product.id,
            name: product.name,
            description: product.description,
            shortDescription: product.short_description,
            sku: product.sku,
            price: parseFloat(product.price),
            comparePrice: product.compare_price ? parseFloat(product.compare_price) : undefined,
            costPrice: product.cost_price ? parseFloat(product.cost_price) : undefined,
            categoryId: product.category_id,
            vendorId: product.vendor_id,
            brand: product.brand,
            weight: product.weight ? parseFloat(product.weight) : undefined,
            dimensions: product.dimensions,
            images: product.images || [],
            tags: product.tags || [],
            metaTitle: product.meta_title,
            metaDescription: product.meta_description,
            isActive: product.is_active,
            isFeatured: product.is_featured,
            requiresShipping: product.requires_shipping,
            trackInventory: product.track_inventory,
            createdAt: product.created_at,
            updatedAt: product.updated_at,
            variants: variantsResult.rows.map((v: any) => ({
                id: v.id,
                productId: v.product_id,
                sku: v.sku,
                name: v.name,
                price: v.price ? parseFloat(v.price) : undefined,
                comparePrice: v.compare_price ? parseFloat(v.compare_price) : undefined,
                costPrice: v.cost_price ? parseFloat(v.cost_price) : undefined,
                inventoryQuantity: v.inventory_quantity,
                weight: v.weight ? parseFloat(v.weight) : undefined,
                imageUrl: v.image_url,
                options: v.options || {},
                isActive: v.is_active,
                createdAt: v.created_at,
                updatedAt: v.updated_at
            })),
            category: product.category_name ? {
                id: product.category_id,
                name: product.category_name
            } : undefined,
            inventory: inventoryResult.rows.length > 0 ? {
                quantity: inventoryResult.rows[0].quantity,
                reservedQuantity: inventoryResult.rows[0].reserved_quantity,
                lowStockThreshold: inventoryResult.rows[0].low_stock_threshold
            } : undefined,
            averageRating: reviewsResult.rows[0]?.average_rating ? parseFloat(reviewsResult.rows[0].average_rating) : undefined,
            reviewCount: reviewsResult.rows[0]?.review_count || 0
        };
    }

    /**
     * Update product
     */
    public static async updateProduct(id: string, productData: UpdateProductRequest, vendorId: string): Promise<ProductWithVariants> {
        // Check if product exists and belongs to vendor
        const existingProduct = await EcommerceDatabase.query(
            'SELECT vendor_id FROM products WHERE id = $1',
            [id]
        );

        if (existingProduct.rows.length === 0) {
            throw new AppError('Product not found', 404);
        }

        if (existingProduct.rows[0].vendor_id !== vendorId) {
            throw new AppError('Not authorized to update this product', 403);
        }

        // Build update query dynamically
        const updateFields: string[] = [];
        const updateValues: any[] = [];
        let paramIndex = 1;

        Object.entries(productData).forEach(([key, value]) => {
            if (value !== undefined) {
                const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();

                if (key === 'dimensions' || key === 'images') {
                    updateFields.push(`${dbField} = $${paramIndex}`);
                    updateValues.push(JSON.stringify(value));
                } else {
                    updateFields.push(`${dbField} = $${paramIndex}`);
                    updateValues.push(value);
                }
                paramIndex++;
            }
        });

        if (updateFields.length === 0) {
            return await this.getProductById(id);
        }

        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        updateValues.push(id);

        await EcommerceDatabase.query(`
            UPDATE products 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex}
        `, updateValues);

        return await this.getProductById(id);
    }

    /**
     * Delete product
     */
    public static async deleteProduct(id: string, vendorId: string): Promise<void> {
        // Check if product exists and belongs to vendor
        const existingProduct = await EcommerceDatabase.query(
            'SELECT vendor_id FROM products WHERE id = $1',
            [id]
        );

        if (existingProduct.rows.length === 0) {
            throw new AppError('Product not found', 404);
        }

        if (existingProduct.rows[0].vendor_id !== vendorId) {
            throw new AppError('Not authorized to delete this product', 403);
        }

        await EcommerceDatabase.query('DELETE FROM products WHERE id = $1', [id]);
    }

    /**
     * Search products with filters and pagination
     */
    public static async searchProducts(query: ProductSearchQuery): Promise<{
        products: ProductWithVariants[];
        pagination: PaginationInfo;
        filters: ProductFilters;
    }> {
        const {
            q,
            categoryId,
            vendorId,
            brand,
            minPrice,
            maxPrice,
            tags,
            isActive = true,
            isFeatured,
            inStock,
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = query;

        // Build WHERE clause
        const whereConditions: string[] = [];
        const queryParams: any[] = [];
        let paramIndex = 1;

        if (isActive !== undefined) {
            whereConditions.push(`p.is_active = $${paramIndex}`);
            queryParams.push(isActive);
            paramIndex++;
        }

        if (q) {
            whereConditions.push(`(p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex} OR p.tags && ARRAY[$${paramIndex}])`);
            queryParams.push(`%${q}%`);
            paramIndex++;
        }

        if (categoryId) {
            whereConditions.push(`p.category_id = $${paramIndex}`);
            queryParams.push(categoryId);
            paramIndex++;
        }

        if (vendorId) {
            whereConditions.push(`p.vendor_id = $${paramIndex}`);
            queryParams.push(vendorId);
            paramIndex++;
        }

        if (brand) {
            whereConditions.push(`p.brand ILIKE $${paramIndex}`);
            queryParams.push(`%${brand}%`);
            paramIndex++;
        }

        if (minPrice !== undefined) {
            whereConditions.push(`p.price >= $${paramIndex}`);
            queryParams.push(minPrice);
            paramIndex++;
        }

        if (maxPrice !== undefined) {
            whereConditions.push(`p.price <= $${paramIndex}`);
            queryParams.push(maxPrice);
            paramIndex++;
        }

        if (tags && tags.length > 0) {
            whereConditions.push(`p.tags && $${paramIndex}`);
            queryParams.push(tags);
            paramIndex++;
        }

        if (isFeatured !== undefined) {
            whereConditions.push(`p.is_featured = $${paramIndex}`);
            queryParams.push(isFeatured);
            paramIndex++;
        }

        if (inStock) {
            whereConditions.push(`EXISTS (SELECT 1 FROM inventory i WHERE i.product_id = p.id AND i.quantity > 0)`);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Build ORDER BY clause
        const orderByMap: Record<string, string> = {
            name: 'p.name',
            price: 'p.price',
            createdAt: 'p.created_at',
            updatedAt: 'p.updated_at',
            rating: 'average_rating'
        };

        const orderBy = `ORDER BY ${orderByMap[sortBy] || 'p.created_at'} ${sortOrder.toUpperCase()}`;

        // Get total count
        const countResult = await EcommerceDatabase.query(`
            SELECT COUNT(*)::integer as total
            FROM products p
            ${whereClause}
        `, queryParams);

        const total = countResult.rows[0].total;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;

        // Get products
        const productsResult = await EcommerceDatabase.query(`
            SELECT 
                p.*,
                c.name as category_name,
                AVG(pr.rating)::numeric(3,2) as average_rating,
                COUNT(pr.id)::integer as review_count
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN product_reviews pr ON p.id = pr.product_id AND pr.is_approved = true
            ${whereClause}
            GROUP BY p.id, c.name
            ${orderBy}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `, [...queryParams, limit, offset]);

        // Get filters data
        const filtersResult = await EcommerceDatabase.query(`
            SELECT 
                c.id as category_id,
                c.name as category_name,
                COUNT(p.id)::integer as product_count,
                p.brand,
                MIN(p.price) as min_price,
                MAX(p.price) as max_price,
                UNNEST(p.tags) as tag
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.is_active = true
            GROUP BY c.id, c.name, p.brand, p.tags
        `);

        const products: ProductWithVariants[] = await Promise.all(
            productsResult.rows.map(async (row: any) => {
                const variants = await EcommerceDatabase.query(
                    'SELECT * FROM product_variants WHERE product_id = $1 ORDER BY created_at ASC',
                    [row.id]
                );

                const inventory = await EcommerceDatabase.query(
                    'SELECT * FROM inventory WHERE product_id = $1',
                    [row.id]
                );

                return {
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
                    weight: row.weight ? parseFloat(row.weight) : undefined,
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
                    variants: variants.rows.map((v: any) => ({
                        id: v.id,
                        productId: v.product_id,
                        sku: v.sku,
                        name: v.name,
                        price: v.price ? parseFloat(v.price) : undefined,
                        comparePrice: v.compare_price ? parseFloat(v.compare_price) : undefined,
                        costPrice: v.cost_price ? parseFloat(v.cost_price) : undefined,
                        inventoryQuantity: v.inventory_quantity,
                        weight: v.weight ? parseFloat(v.weight) : undefined,
                        imageUrl: v.image_url,
                        options: v.options || {},
                        isActive: v.is_active,
                        createdAt: v.created_at,
                        updatedAt: v.updated_at
                    })),
                    category: row.category_name ? {
                        id: row.category_id,
                        name: row.category_name
                    } : undefined,
                    inventory: inventory.rows.length > 0 ? {
                        quantity: inventory.rows[0].quantity,
                        reservedQuantity: inventory.rows[0].reserved_quantity,
                        lowStockThreshold: inventory.rows[0].low_stock_threshold
                    } : undefined,
                    averageRating: row.average_rating ? parseFloat(row.average_rating) : undefined,
                    reviewCount: row.review_count || 0
                };
            })
        );

        // Process filters
        const categoryMap = new Map();
        const brandMap = new Map();
        const tagMap = new Map();
        let minPriceFilter = Infinity;
        let maxPriceFilter = 0;

        filtersResult.rows.forEach((row: any) => {
            if (row.category_id) {
                const key = `${row.category_id}-${row.category_name}`;
                categoryMap.set(key, (categoryMap.get(key) || 0) + row.product_count);
            }

            if (row.brand) {
                brandMap.set(row.brand, (brandMap.get(row.brand) || 0) + 1);
            }

            if (row.tag) {
                tagMap.set(row.tag, (tagMap.get(row.tag) || 0) + 1);
            }

            if (row.min_price < minPriceFilter) minPriceFilter = row.min_price;
            if (row.max_price > maxPriceFilter) maxPriceFilter = row.max_price;
        });

        const filters: ProductFilters = {
            categories: Array.from(categoryMap.entries()).map(([key, count]) => {
                const [id, name] = key.split('-');
                return { id, name, count };
            }),
            brands: Array.from(brandMap.entries()).map(([name, count]) => ({ name, count })),
            priceRange: { min: minPriceFilter === Infinity ? 0 : minPriceFilter, max: maxPriceFilter },
            tags: Array.from(tagMap.entries()).map(([name, count]) => ({ name, count }))
        };

        const pagination: PaginationInfo = {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
        };

        return { products, pagination, filters };
    }

    /**
     * Get products by vendor
     */
    public static async getProductsByVendor(vendorId: string, query: ProductSearchQuery): Promise<{
        products: ProductWithVariants[];
        pagination: PaginationInfo;
    }> {
        const searchQuery = { ...query, vendorId };
        const result = await this.searchProducts(searchQuery);

        return {
            products: result.products,
            pagination: result.pagination
        };
    }
}