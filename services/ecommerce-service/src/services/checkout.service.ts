import { EcommerceDatabase } from '../database/connection';
import { CartService } from './cart.service';
import { InventoryService } from './inventory.service';
// import { PaymentService } from './payment.service'; // Will be used for payment processing
import { OrderService } from './order.service';
import { AppError } from '../middleware/error.middleware';
import { Order, CreateOrderRequest } from '../types/order.types';
import { Address } from '../types/common.types';

/**
 * Advanced checkout service with multiple payment options
 */

export interface CheckoutSession {
    id: string;
    userId: string;
    cartId?: string;
    items: CheckoutItem[];
    shippingAddress?: Address;
    billingAddress?: Address;
    shippingMethod?: ShippingMethod;
    paymentMethod?: PaymentMethodInfo;
    pricing: CheckoutPricing;
    availableShippingMethods: ShippingMethod[];
    availablePaymentMethods: PaymentMethodInfo[];
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface CheckoutItem {
    productId?: string;
    variantId?: string;
    productName: string;
    variantName?: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    isAvailable: boolean;
    availableQuantity: number;
    vendorId: string;
}

export interface ShippingMethod {
    id: string;
    name: string;
    description: string;
    price: number;
    estimatedDays: number;
    carrier: string;
    isAvailable: boolean;
}

export interface PaymentMethodInfo {
    id: string;
    type: 'credit_card' | 'debit_card' | 'paypal' | 'stripe' | 'bank_transfer' | 'wallet' | 'buy_now_pay_later';
    name: string;
    description: string;
    isAvailable: boolean;
    processingFee?: number;
    metadata?: any;
}

export interface CheckoutPricing {
    subtotal: number;
    shippingAmount: number;
    taxAmount: number;
    discountAmount: number;
    processingFee: number;
    totalAmount: number;
}

export interface CreateCheckoutSessionRequest {
    cartId?: string;
    items?: Array<{
        productId?: string;
        variantId?: string;
        quantity: number;
    }>;
}

export interface UpdateCheckoutSessionRequest {
    shippingAddress?: Address;
    billingAddress?: Address;
    shippingMethodId?: string;
    paymentMethodId?: string;
    promoCode?: string;
}

export class CheckoutService {
    private static inventoryService = new InventoryService();

    /**
     * Create checkout session
     */
    public static async createCheckoutSession(
        userId: string,
        request: CreateCheckoutSessionRequest
    ): Promise<CheckoutSession> {
        const client = EcommerceDatabase.getPool();

        try {
            await client.query('BEGIN');

            let items: CheckoutItem[] = [];

            // Get items from cart or direct items
            if (request.cartId) {
                const cart = await CartService.getCartWithItems(request.cartId);
                if (cart.items.length === 0) {
                    throw new AppError('Cart is empty', 400);
                }

                // Convert cart items to checkout items
                for (const cartItem of cart.items) {
                    const checkoutItem = await this.convertCartItemToCheckoutItem(cartItem);
                    items.push(checkoutItem);
                }
            } else if (request.items && request.items.length > 0) {
                // Process direct items
                for (const item of request.items) {
                    const checkoutItem = await this.createCheckoutItemFromRequest(item);
                    items.push(checkoutItem);
                }
            } else {
                throw new AppError('Either cartId or items array is required', 400);
            }

            // Validate stock availability
            const stockValidation = await this.inventoryService.validateCartStock(
                items.map(item => ({
                    productId: item.productId,
                    variantId: item.variantId,
                    quantity: item.quantity
                }))
            );

            // Update item availability
            items.forEach((item) => {
                const stockError = stockValidation.errors.find(error =>
                    error.productId === item.productId && error.variantId === item.variantId
                );
                if (stockError) {
                    item.isAvailable = false;
                    item.availableQuantity = stockError.available;
                }
            });

            // Calculate initial pricing
            const pricing = await this.calculatePricing(items);

            // Get available shipping and payment methods
            const availableShippingMethods = await this.getAvailableShippingMethods(items);
            const availablePaymentMethods = await this.getAvailablePaymentMethods();

            // Create checkout session
            const sessionId = this.generateSessionId();
            const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

            await client.query(`
                INSERT INTO checkout_sessions (
                    id, user_id, cart_id, items, pricing, 
                    available_shipping_methods, available_payment_methods, expires_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
                sessionId,
                userId,
                request.cartId || null,
                JSON.stringify(items),
                JSON.stringify(pricing),
                JSON.stringify(availableShippingMethods),
                JSON.stringify(availablePaymentMethods),
                expiresAt
            ]);

            await client.query('COMMIT');

            return {
                id: sessionId,
                userId,
                cartId: request.cartId,
                items,
                pricing,
                availableShippingMethods,
                availablePaymentMethods,
                expiresAt,
                createdAt: new Date(),
                updatedAt: new Date()
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
    }

    /**
     * Get checkout session
     */
    public static async getCheckoutSession(sessionId: string, userId: string): Promise<CheckoutSession> {
        const result = await EcommerceDatabase.query(
            'SELECT * FROM checkout_sessions WHERE id = $1 AND user_id = $2',
            [sessionId, userId]
        );

        if (result.rows.length === 0) {
            throw new AppError('Checkout session not found', 404);
        }

        const session = result.rows[0];

        // Check if session has expired
        if (new Date() > new Date(session.expires_at)) {
            throw new AppError('Checkout session has expired', 410);
        }

        return {
            id: session.id,
            userId: session.user_id,
            cartId: session.cart_id,
            items: session.items,
            shippingAddress: session.shipping_address,
            billingAddress: session.billing_address,
            shippingMethod: session.shipping_method,
            paymentMethod: session.payment_method,
            pricing: session.pricing,
            availableShippingMethods: session.available_shipping_methods,
            availablePaymentMethods: session.available_payment_methods,
            expiresAt: session.expires_at,
            createdAt: session.created_at,
            updatedAt: session.updated_at
        };
    }

    /**
     * Update checkout session
     */
    public static async updateCheckoutSession(
        sessionId: string,
        userId: string,
        updates: UpdateCheckoutSessionRequest
    ): Promise<CheckoutSession> {
        const session = await this.getCheckoutSession(sessionId, userId);
        const client = EcommerceDatabase.getPool();

        try {
            await client.query('BEGIN');

            let updatedPricing = session.pricing;
            let updatedShippingMethod = session.shippingMethod;
            let updatedPaymentMethod = session.paymentMethod;

            // Update shipping method if provided
            if (updates.shippingMethodId) {
                const shippingMethod = session.availableShippingMethods.find(
                    method => method.id === updates.shippingMethodId
                );
                if (!shippingMethod) {
                    throw new AppError('Invalid shipping method', 400);
                }
                updatedShippingMethod = shippingMethod;
                updatedPricing = await this.calculatePricing(session.items, shippingMethod);
            }

            // Update payment method if provided
            if (updates.paymentMethodId) {
                const paymentMethod = session.availablePaymentMethods.find(
                    method => method.id === updates.paymentMethodId
                );
                if (!paymentMethod) {
                    throw new AppError('Invalid payment method', 400);
                }
                updatedPaymentMethod = paymentMethod;
                updatedPricing = await this.calculatePricing(
                    session.items,
                    updatedShippingMethod,
                    paymentMethod
                );
            }

            // Apply promo code if provided
            if (updates.promoCode) {
                updatedPricing = await this.applyPromoCode(
                    updates.promoCode,
                    session.items,
                    updatedPricing
                );
            }

            // Build update query
            const updateFields: string[] = [];
            const updateValues: any[] = [];
            let paramIndex = 1;

            if (updates.shippingAddress) {
                updateFields.push(`shipping_address = $${paramIndex}`);
                updateValues.push(JSON.stringify(updates.shippingAddress));
                paramIndex++;
            }

            if (updates.billingAddress) {
                updateFields.push(`billing_address = $${paramIndex}`);
                updateValues.push(JSON.stringify(updates.billingAddress));
                paramIndex++;
            }

            if (updatedShippingMethod) {
                updateFields.push(`shipping_method = $${paramIndex}`);
                updateValues.push(JSON.stringify(updatedShippingMethod));
                paramIndex++;
            }

            if (updatedPaymentMethod) {
                updateFields.push(`payment_method = $${paramIndex}`);
                updateValues.push(JSON.stringify(updatedPaymentMethod));
                paramIndex++;
            }

            updateFields.push(`pricing = $${paramIndex}`);
            updateValues.push(JSON.stringify(updatedPricing));
            paramIndex++;

            updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
            updateValues.push(sessionId, userId);

            await client.query(`
                UPDATE checkout_sessions 
                SET ${updateFields.join(', ')}
                WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
            `, updateValues);

            await client.query('COMMIT');

            return await this.getCheckoutSession(sessionId, userId);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
    }

    /**
     * Complete checkout and create order
     */
    public static async completeCheckout(sessionId: string, userId: string): Promise<Order> {
        const session = await this.getCheckoutSession(sessionId, userId);

        // Validate session is complete
        if (!session.shippingAddress || !session.billingAddress || !session.paymentMethod) {
            throw new AppError('Checkout session is incomplete', 400);
        }

        // Check if all items are still available
        const unavailableItems = session.items.filter(item => !item.isAvailable);
        if (unavailableItems.length > 0) {
            throw new AppError('Some items are no longer available', 400);
        }

        // Create order request
        const orderRequest: CreateOrderRequest = {
            items: session.items.map(item => ({
                productId: item.productId,
                variantId: item.variantId,
                quantity: item.quantity
            })),
            billingAddress: session.billingAddress,
            shippingAddress: session.shippingAddress,
            paymentMethod: session.paymentMethod.id,
            shippingMethod: session.shippingMethod?.name
        };

        // Create order
        const order = await OrderService.createOrder(orderRequest, userId);

        // Clean up checkout session
        await EcommerceDatabase.query('DELETE FROM checkout_sessions WHERE id = $1', [sessionId]);

        return order;
    }

    /**
     * Calculate pricing for checkout
     */
    private static async calculatePricing(
        items: CheckoutItem[],
        shippingMethod?: ShippingMethod,
        paymentMethod?: PaymentMethodInfo
    ): Promise<CheckoutPricing> {
        const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
        const shippingAmount = shippingMethod?.price || 0;
        const taxAmount = subtotal * 0.1; // 10% tax (simplified)
        const processingFee = paymentMethod?.processingFee || 0;
        const discountAmount = 0; // Would be calculated based on applied promos
        const totalAmount = subtotal + shippingAmount + taxAmount + processingFee - discountAmount;

        return {
            subtotal,
            shippingAmount,
            taxAmount,
            discountAmount,
            processingFee,
            totalAmount
        };
    }

    /**
     * Get available shipping methods
     */
    private static async getAvailableShippingMethods(_items: CheckoutItem[]): Promise<ShippingMethod[]> {
        // This would typically integrate with shipping providers
        // For now, return static methods
        return [
            {
                id: 'standard',
                name: 'Standard Shipping',
                description: '5-7 business days',
                price: 9.99,
                estimatedDays: 6,
                carrier: 'USPS',
                isAvailable: true
            },
            {
                id: 'express',
                name: 'Express Shipping',
                description: '2-3 business days',
                price: 19.99,
                estimatedDays: 2,
                carrier: 'FedEx',
                isAvailable: true
            },
            {
                id: 'overnight',
                name: 'Overnight Shipping',
                description: 'Next business day',
                price: 39.99,
                estimatedDays: 1,
                carrier: 'UPS',
                isAvailable: true
            }
        ];
    }

    /**
     * Get available payment methods
     */
    private static async getAvailablePaymentMethods(): Promise<PaymentMethodInfo[]> {
        return [
            {
                id: 'stripe_card',
                type: 'credit_card',
                name: 'Credit/Debit Card',
                description: 'Visa, Mastercard, American Express',
                isAvailable: true,
                processingFee: 0
            },
            {
                id: 'paypal',
                type: 'paypal',
                name: 'PayPal',
                description: 'Pay with your PayPal account',
                isAvailable: true,
                processingFee: 0
            },
            {
                id: 'apple_pay',
                type: 'wallet',
                name: 'Apple Pay',
                description: 'Pay with Touch ID or Face ID',
                isAvailable: true,
                processingFee: 0
            },
            {
                id: 'google_pay',
                type: 'wallet',
                name: 'Google Pay',
                description: 'Pay with Google Pay',
                isAvailable: true,
                processingFee: 0
            },
            {
                id: 'klarna',
                type: 'buy_now_pay_later',
                name: 'Klarna',
                description: 'Buy now, pay in 4 installments',
                isAvailable: true,
                processingFee: 2.99
            }
        ];
    }

    /**
     * Apply promo code
     */
    private static async applyPromoCode(
        _promoCode: string,
        _items: CheckoutItem[],
        currentPricing: CheckoutPricing
    ): Promise<CheckoutPricing> {
        // This would integrate with a promo code service
        // For now, return current pricing unchanged
        return currentPricing;
    }

    /**
     * Convert cart item to checkout item
     */
    private static async convertCartItemToCheckoutItem(cartItem: any): Promise<CheckoutItem> {
        const stockLevel = await this.inventoryService.getStockLevel(
            cartItem.productId,
            cartItem.variantId
        );

        return {
            productId: cartItem.productId,
            variantId: cartItem.variantId,
            productName: cartItem.productName,
            variantName: cartItem.variantName,
            sku: cartItem.sku,
            quantity: cartItem.quantity,
            unitPrice: cartItem.price,
            totalPrice: cartItem.price * cartItem.quantity,
            isAvailable: stockLevel.available >= cartItem.quantity,
            availableQuantity: stockLevel.available,
            vendorId: cartItem.vendorId
        };
    }

    /**
     * Create checkout item from request
     */
    private static async createCheckoutItemFromRequest(item: {
        productId?: string;
        variantId?: string;
        quantity: number;
    }): Promise<CheckoutItem> {
        // Get product/variant details
        let productDetails;
        let price;

        if (item.productId) {
            const productResult = await EcommerceDatabase.query(
                'SELECT name, sku, price, vendor_id FROM products WHERE id = $1 AND is_active = true',
                [item.productId]
            );

            if (productResult.rows.length === 0) {
                throw new AppError(`Product ${item.productId} not found or inactive`, 404);
            }

            productDetails = productResult.rows[0];
            price = parseFloat(productDetails.price);
        } else if (item.variantId) {
            const variantResult = await EcommerceDatabase.query(`
                SELECT 
                    pv.name as variant_name, 
                    pv.sku, 
                    COALESCE(pv.price, p.price) as price,
                    p.name as product_name, 
                    p.vendor_id
                FROM product_variants pv
                JOIN products p ON pv.product_id = p.id
                WHERE pv.id = $1 AND pv.is_active = true AND p.is_active = true
            `, [item.variantId]);

            if (variantResult.rows.length === 0) {
                throw new AppError(`Product variant ${item.variantId} not found or inactive`, 404);
            }

            productDetails = variantResult.rows[0];
            price = parseFloat(productDetails.price);
        } else {
            throw new AppError('Either productId or variantId is required', 400);
        }

        const stockLevel = await this.inventoryService.getStockLevel(item.productId, item.variantId);

        return {
            productId: item.productId,
            variantId: item.variantId,
            productName: productDetails.product_name || productDetails.name,
            variantName: productDetails.variant_name,
            sku: productDetails.sku,
            quantity: item.quantity,
            unitPrice: price,
            totalPrice: price * item.quantity,
            isAvailable: stockLevel.available >= item.quantity,
            availableQuantity: stockLevel.available,
            vendorId: productDetails.vendor_id
        };
    }

    /**
     * Generate unique session ID
     */
    private static generateSessionId(): string {
        return `checkout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}