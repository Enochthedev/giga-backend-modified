import { v4 as uuidv4 } from 'uuid';
import { EcommerceDatabase } from '../database/connection';
import {
    ShoppingCart,
    CartItem,
    AddToCartRequest,
    UpdateCartItemRequest,
    GuestCartSession,
    CartSummary
} from '../types';
import { AppError } from '../middleware/error.middleware';

/**
 * Shopping cart service
 */
export class CartService {
    /**
     * Get or create cart for user
     */
    public static async getOrCreateCart(userId?: string, sessionId?: string): Promise<ShoppingCart> {
        if (!userId && !sessionId) {
            throw new AppError('Either userId or sessionId is required', 400);
        }

        let cart;

        if (userId) {
            // Get existing cart for user
            const cartResult = await EcommerceDatabase.query(
                'SELECT * FROM shopping_carts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
                [userId]
            );
            cart = cartResult.rows[0];
        } else if (sessionId) {
            // Get existing cart for session
            const cartResult = await EcommerceDatabase.query(
                'SELECT * FROM shopping_carts WHERE session_id = $1 AND expires_at > CURRENT_TIMESTAMP',
                [sessionId]
            );
            cart = cartResult.rows[0];
        }

        // Create new cart if none exists
        if (!cart) {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

            const newCartResult = await EcommerceDatabase.query(`
                INSERT INTO shopping_carts (user_id, session_id, expires_at)
                VALUES ($1, $2, $3)
                RETURNING *
            `, [userId || null, sessionId || null, expiresAt]);

            cart = newCartResult.rows[0];
        }

        return await this.getCartWithItems(cart.id);
    }

    /**
     * Get cart with items by cart ID
     */
    public static async getCartWithItems(cartId: string): Promise<ShoppingCart> {
        const cartResult = await EcommerceDatabase.query(
            'SELECT * FROM shopping_carts WHERE id = $1',
            [cartId]
        );

        if (cartResult.rows.length === 0) {
            throw new AppError('Cart not found', 404);
        }

        const cart = cartResult.rows[0];

        // Get cart items with product details
        const itemsResult = await EcommerceDatabase.query(`
            SELECT 
                ci.*,
                p.name as product_name,
                p.sku as product_sku,
                p.images as product_images,
                p.is_active as product_active,
                pv.name as variant_name,
                pv.sku as variant_sku,
                pv.options as variant_options,
                pv.image_url as variant_image,
                pv.is_active as variant_active
            FROM cart_items ci
            LEFT JOIN products p ON ci.product_id = p.id
            LEFT JOIN product_variants pv ON ci.variant_id = pv.id
            WHERE ci.cart_id = $1
            ORDER BY ci.created_at ASC
        `, [cartId]);

        const items: CartItem[] = itemsResult.rows.map((row: any) => ({
            id: row.id,
            cartId: row.cart_id,
            productId: row.product_id,
            variantId: row.variant_id,
            quantity: row.quantity,
            price: parseFloat(row.price),
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            product: row.product_id ? {
                id: row.product_id,
                name: row.product_name,
                sku: row.product_sku,
                images: row.product_images || [],
                isActive: row.product_active
            } : undefined,
            variant: row.variant_id ? {
                id: row.variant_id,
                name: row.variant_name,
                sku: row.variant_sku,
                options: row.variant_options || {},
                imageUrl: row.variant_image,
                isActive: row.variant_active
            } : undefined
        }));

        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

        return {
            id: cart.id,
            userId: cart.user_id,
            sessionId: cart.session_id,
            expiresAt: cart.expires_at,
            createdAt: cart.created_at,
            updatedAt: cart.updated_at,
            items,
            subtotal,
            itemCount
        };
    }

    /**
     * Add item to cart
     */
    public static async addToCart(
        cartId: string,
        itemData: AddToCartRequest
    ): Promise<ShoppingCart> {
        const { productId, variantId, quantity } = itemData;

        // Validate product/variant exists and is active
        let price: number = 0;
        let productExists = false;

        if (productId) {
            const productResult = await EcommerceDatabase.query(
                'SELECT price, is_active FROM products WHERE id = $1',
                [productId]
            );

            if (productResult.rows.length === 0) {
                throw new AppError('Product not found', 404);
            }

            if (!productResult.rows[0].is_active) {
                throw new AppError('Product is not available', 400);
            }

            price = parseFloat(productResult.rows[0].price);
            productExists = true;
        }

        if (variantId) {
            const variantResult = await EcommerceDatabase.query(`
                SELECT pv.price, pv.is_active, p.price as product_price, p.is_active as product_active
                FROM product_variants pv
                JOIN products p ON pv.product_id = p.id
                WHERE pv.id = $1
            `, [variantId]);

            if (variantResult.rows.length === 0) {
                throw new AppError('Product variant not found', 404);
            }

            if (!variantResult.rows[0].is_active || !variantResult.rows[0].product_active) {
                throw new AppError('Product variant is not available', 400);
            }

            price = parseFloat(variantResult.rows[0].price || variantResult.rows[0].product_price);
            productExists = true;
        }

        if (!productExists) {
            throw new AppError('Either productId or variantId is required', 400);
        }

        // Check if item already exists in cart
        const existingItemResult = await EcommerceDatabase.query(`
            SELECT id, quantity FROM cart_items 
            WHERE cart_id = $1 AND 
                  (product_id = $2 OR product_id IS NULL) AND 
                  (variant_id = $3 OR variant_id IS NULL)
        `, [cartId, productId || null, variantId || null]);

        if (existingItemResult.rows.length > 0) {
            // Update existing item quantity
            const existingItem = existingItemResult.rows[0];
            const newQuantity = existingItem.quantity + quantity;

            await EcommerceDatabase.query(
                'UPDATE cart_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [newQuantity, existingItem.id]
            );
        } else {
            // Add new item to cart
            await EcommerceDatabase.query(`
                INSERT INTO cart_items (cart_id, product_id, variant_id, quantity, price)
                VALUES ($1, $2, $3, $4, $5)
            `, [cartId, productId || null, variantId || null, quantity, price]);
        }

        // Update cart timestamp
        await EcommerceDatabase.query(
            'UPDATE shopping_carts SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [cartId]
        );

        return await this.getCartWithItems(cartId);
    }

    /**
     * Update cart item quantity
     */
    public static async updateCartItem(
        cartId: string,
        itemId: string,
        updateData: UpdateCartItemRequest
    ): Promise<ShoppingCart> {
        const { quantity } = updateData;

        // Check if item exists in cart
        const itemResult = await EcommerceDatabase.query(
            'SELECT id FROM cart_items WHERE id = $1 AND cart_id = $2',
            [itemId, cartId]
        );

        if (itemResult.rows.length === 0) {
            throw new AppError('Cart item not found', 404);
        }

        // Update item quantity
        await EcommerceDatabase.query(
            'UPDATE cart_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [quantity, itemId]
        );

        // Update cart timestamp
        await EcommerceDatabase.query(
            'UPDATE shopping_carts SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [cartId]
        );

        return await this.getCartWithItems(cartId);
    }

    /**
     * Remove item from cart
     */
    public static async removeCartItem(cartId: string, itemId: string): Promise<ShoppingCart> {
        // Check if item exists in cart
        const itemResult = await EcommerceDatabase.query(
            'SELECT id FROM cart_items WHERE id = $1 AND cart_id = $2',
            [itemId, cartId]
        );

        if (itemResult.rows.length === 0) {
            throw new AppError('Cart item not found', 404);
        }

        // Remove item
        await EcommerceDatabase.query('DELETE FROM cart_items WHERE id = $1', [itemId]);

        // Update cart timestamp
        await EcommerceDatabase.query(
            'UPDATE shopping_carts SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [cartId]
        );

        return await this.getCartWithItems(cartId);
    }

    /**
     * Clear cart
     */
    public static async clearCart(cartId: string): Promise<ShoppingCart> {
        await EcommerceDatabase.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);

        // Update cart timestamp
        await EcommerceDatabase.query(
            'UPDATE shopping_carts SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [cartId]
        );

        return await this.getCartWithItems(cartId);
    }

    /**
     * Get cart summary
     */
    public static async getCartSummary(cartId: string): Promise<CartSummary> {
        const cart = await this.getCartWithItems(cartId);

        // Calculate estimated tax (simplified - 10%)
        const estimatedTax = cart.subtotal * 0.1;

        // Calculate estimated shipping (simplified - free over $50, otherwise $10)
        const estimatedShipping = cart.subtotal >= 50 ? 0 : 10;

        const estimatedTotal = cart.subtotal + estimatedTax + estimatedShipping;

        return {
            itemCount: cart.itemCount,
            subtotal: cart.subtotal,
            estimatedTax,
            estimatedShipping,
            estimatedTotal
        };
    }

    /**
     * Create guest cart session
     */
    public static async createGuestSession(): Promise<GuestCartSession> {
        const sessionId = uuidv4();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

        return {
            sessionId,
            expiresAt
        };
    }

    /**
     * Merge guest cart with user cart
     */
    public static async mergeGuestCart(userId: string, guestSessionId: string): Promise<ShoppingCart> {
        const client = EcommerceDatabase.getPool();

        try {
            await client.query('BEGIN');

            // Get guest cart
            const guestCartResult = await client.query(
                'SELECT id FROM shopping_carts WHERE session_id = $1',
                [guestSessionId]
            );

            if (guestCartResult.rows.length === 0) {
                // No guest cart to merge, just create/return user cart
                await client.query('COMMIT');
                return await this.getOrCreateCart(userId);
            }

            const guestCartId = guestCartResult.rows[0].id;

            // Get or create user cart
            const userCart = await this.getOrCreateCart(userId);

            // Get guest cart items
            const guestItemsResult = await client.query(
                'SELECT * FROM cart_items WHERE cart_id = $1',
                [guestCartId]
            );

            // Merge items into user cart
            for (const guestItem of guestItemsResult.rows) {
                // Check if item already exists in user cart
                const existingItemResult = await client.query(`
                    SELECT id, quantity FROM cart_items 
                    WHERE cart_id = $1 AND 
                          (product_id = $2 OR product_id IS NULL) AND 
                          (variant_id = $3 OR variant_id IS NULL)
                `, [userCart.id, guestItem.product_id, guestItem.variant_id]);

                if (existingItemResult.rows.length > 0) {
                    // Update existing item quantity
                    const existingItem = existingItemResult.rows[0];
                    const newQuantity = existingItem.quantity + guestItem.quantity;

                    await client.query(
                        'UPDATE cart_items SET quantity = $1 WHERE id = $2',
                        [newQuantity, existingItem.id]
                    );
                } else {
                    // Add new item to user cart
                    await client.query(`
                        INSERT INTO cart_items (cart_id, product_id, variant_id, quantity, price)
                        VALUES ($1, $2, $3, $4, $5)
                    `, [
                        userCart.id,
                        guestItem.product_id,
                        guestItem.variant_id,
                        guestItem.quantity,
                        guestItem.price
                    ]);
                }
            }

            // Delete guest cart
            await client.query('DELETE FROM shopping_carts WHERE id = $1', [guestCartId]);

            await client.query('COMMIT');

            return await this.getCartWithItems(userCart.id);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
    }

    /**
     * Clean up expired carts
     */
    public static async cleanupExpiredCarts(): Promise<void> {
        await EcommerceDatabase.query(
            'DELETE FROM shopping_carts WHERE expires_at < CURRENT_TIMESTAMP'
        );
    }
}