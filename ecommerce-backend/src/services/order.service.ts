import { EcommerceDatabase } from '../database/connection';
import {
    Order,
    OrderItem,
    CreateOrderRequest,
    UpdateOrderRequest,
    OrderSearchQuery,
    OrderSummary,
    PaginationInfo,
    PaymentRequest
} from '../types';
import { AppError } from '../middleware/error.middleware';
import { CartService } from './cart.service';
import { InventoryService } from './inventory.service';
import { PaymentService } from './payment.service';

/**
 * Order management service
 */
export class OrderService {
    private static inventoryService = new InventoryService();

    /**
     * Create order from cart or direct items
     */
    public static async createOrder(orderData: CreateOrderRequest, userId: string): Promise<Order> {
        const client = EcommerceDatabase.getPool();

        let orderItems: Array<{
            productId?: string;
            variantId?: string;
            quantity: number;
            unitPrice: number;
            productName: string;
            variantName?: string;
            sku: string;
            vendorId: string;
        }> = [];

        try {
            await client.query('BEGIN');

            // Get items from cart or direct items
            if (orderData.cartId) {
                const cart = await CartService.getCartWithItems(orderData.cartId);

                if (cart.items.length === 0) {
                    throw new AppError('Cart is empty', 400);
                }

                // Convert cart items to order items
                for (const cartItem of cart.items) {
                    // Get product/variant details
                    let productDetails;
                    if (cartItem.productId) {
                        const productResult = await client.query(
                            'SELECT name, sku, vendor_id FROM products WHERE id = $1',
                            [cartItem.productId]
                        );
                        productDetails = productResult.rows[0];
                    } else if (cartItem.variantId) {
                        const variantResult = await client.query(`
                            SELECT pv.name as variant_name, pv.sku, p.name as product_name, p.vendor_id
                            FROM product_variants pv
                            JOIN products p ON pv.product_id = p.id
                            WHERE pv.id = $1
                        `, [cartItem.variantId]);
                        productDetails = variantResult.rows[0];
                    }

                    if (!productDetails) {
                        throw new AppError('Product not found', 404);
                    }

                    orderItems.push({
                        productId: cartItem.productId,
                        variantId: cartItem.variantId,
                        quantity: cartItem.quantity,
                        unitPrice: cartItem.price,
                        productName: productDetails.product_name || productDetails.name,
                        variantName: productDetails.variant_name,
                        sku: productDetails.sku,
                        vendorId: productDetails.vendor_id
                    });
                }
            } else if (orderData.items && orderData.items.length > 0) {
                // Process direct items
                for (const item of orderData.items) {
                    let productDetails;
                    let price;

                    if (item.productId) {
                        const productResult = await client.query(
                            'SELECT name, sku, price, vendor_id FROM products WHERE id = $1 AND is_active = true',
                            [item.productId]
                        );

                        if (productResult.rows.length === 0) {
                            throw new AppError(`Product ${item.productId} not found or inactive`, 404);
                        }

                        productDetails = productResult.rows[0];
                        price = parseFloat(productDetails.price);
                    } else if (item.variantId) {
                        const variantResult = await client.query(`
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
                    }

                    orderItems.push({
                        productId: item.productId,
                        variantId: item.variantId,
                        quantity: item.quantity,
                        unitPrice: price!,
                        productName: productDetails.product_name || productDetails.name,
                        variantName: productDetails.variant_name,
                        sku: productDetails.sku,
                        vendorId: productDetails.vendor_id
                    });
                }
            } else {
                throw new AppError('Either cartId or items array is required', 400);
            }

            // Reserve inventory for all items
            for (const item of orderItems) {
                const reserved = await this.inventoryService.reserveInventory(
                    item.productId,
                    item.variantId,
                    item.quantity
                );

                if (!reserved) {
                    throw new AppError(`Insufficient stock for ${item.productName}`, 400);
                }
            }

            // Calculate totals
            const subtotal = orderItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
            const taxAmount = subtotal * 0.1; // 10% tax (simplified)
            const shippingAmount = subtotal >= 50 ? 0 : 10; // Free shipping over $50
            const totalAmount = subtotal + taxAmount + shippingAmount;

            // Generate order number
            const orderNumber = await this.generateOrderNumber();

            // Create order
            const orderResult = await client.query(`
                INSERT INTO orders (
                    order_number, user_id, status, payment_status, fulfillment_status,
                    subtotal, tax_amount, shipping_amount, discount_amount, total_amount,
                    billing_address, shipping_address, payment_method, shipping_method, notes, tags
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                RETURNING *
            `, [
                orderNumber,
                userId,
                'pending',
                'pending',
                'unfulfilled',
                subtotal,
                taxAmount,
                shippingAmount,
                0, // discount amount
                totalAmount,
                JSON.stringify(orderData.billingAddress),
                orderData.shippingAddress ? JSON.stringify(orderData.shippingAddress) : null,
                orderData.paymentMethod,
                orderData.shippingMethod,
                orderData.notes,
                orderData.tags || []
            ]);

            const order = orderResult.rows[0];

            // Create order items
            for (const item of orderItems) {
                await client.query(`
                    INSERT INTO order_items (
                        order_id, product_id, variant_id, vendor_id,
                        product_name, variant_name, sku,
                        quantity, unit_price, total_price, fulfillment_status
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                `, [
                    order.id,
                    item.productId || null,
                    item.variantId || null,
                    item.vendorId,
                    item.productName,
                    item.variantName,
                    item.sku,
                    item.quantity,
                    item.unitPrice,
                    item.unitPrice * item.quantity,
                    'unfulfilled'
                ]);
            }

            // Process payment
            const paymentRequest: PaymentRequest = {
                amount: totalAmount,
                currency: 'USD',
                paymentMethod: orderData.paymentMethod,
                orderId: order.id,
                userId,
                metadata: {
                    orderNumber: order.order_number,
                    itemCount: orderItems.length
                }
            };

            const paymentResult = await PaymentService.processPayment(paymentRequest);

            // Update order with payment reference
            await client.query(
                'UPDATE orders SET payment_reference = $1, payment_status = $2 WHERE id = $3',
                [paymentResult.paymentId, paymentResult.status === 'completed' ? 'paid' : 'pending', order.id]
            );

            // Clear cart if order was created from cart
            if (orderData.cartId) {
                await CartService.clearCart(orderData.cartId);
            }

            await client.query('COMMIT');

            return await this.getOrderById(order.id);
        } catch (error) {
            await client.query('ROLLBACK');

            // Release any reserved inventory on failure
            if (orderItems && orderItems.length > 0) {
                for (const item of orderItems) {
                    try {
                        await this.inventoryService.releaseReservation(
                            item.productId,
                            item.variantId,
                            item.quantity
                        );
                    } catch (releaseError) {
                        console.error('Failed to release inventory reservation:', releaseError);
                    }
                }
            }

            throw error;
        }
    }

    /**
     * Get order by ID
     */
    public static async getOrderById(id: string): Promise<Order> {
        const orderResult = await EcommerceDatabase.query(
            'SELECT * FROM orders WHERE id = $1',
            [id]
        );

        if (orderResult.rows.length === 0) {
            throw new AppError('Order not found', 404);
        }

        const order = orderResult.rows[0];

        // Get order items
        const itemsResult = await EcommerceDatabase.query(
            'SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at ASC',
            [id]
        );

        const items: OrderItem[] = itemsResult.rows.map((item: any) => ({
            id: item.id,
            orderId: item.order_id,
            productId: item.product_id,
            variantId: item.variant_id,
            vendorId: item.vendor_id,
            productName: item.product_name,
            variantName: item.variant_name,
            sku: item.sku,
            quantity: item.quantity,
            unitPrice: parseFloat(item.unit_price),
            totalPrice: parseFloat(item.total_price),
            fulfillmentStatus: item.fulfillment_status,
            createdAt: item.created_at,
            updatedAt: item.updated_at
        }));

        return {
            id: order.id,
            orderNumber: order.order_number,
            userId: order.user_id,
            status: order.status,
            paymentStatus: order.payment_status,
            fulfillmentStatus: order.fulfillment_status,
            subtotal: parseFloat(order.subtotal),
            taxAmount: parseFloat(order.tax_amount),
            shippingAmount: parseFloat(order.shipping_amount),
            discountAmount: parseFloat(order.discount_amount),
            totalAmount: parseFloat(order.total_amount),
            billingAddress: order.billing_address,
            shippingAddress: order.shipping_address,
            paymentMethod: order.payment_method,
            paymentReference: order.payment_reference,
            shippingMethod: order.shipping_method,
            trackingNumber: order.tracking_number,
            notes: order.notes,
            tags: order.tags || [],
            createdAt: order.created_at,
            updatedAt: order.updated_at,
            items
        };
    }

    /**
     * Update order
     */
    public static async updateOrder(id: string, updateData: UpdateOrderRequest): Promise<Order> {
        // Build update query dynamically
        const updateFields: string[] = [];
        const updateValues: any[] = [];
        let paramIndex = 1;

        Object.entries(updateData).forEach(([key, value]) => {
            if (value !== undefined) {
                const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
                updateFields.push(`${dbField} = $${paramIndex}`);
                updateValues.push(value);
                paramIndex++;
            }
        });

        if (updateFields.length === 0) {
            return await this.getOrderById(id);
        }

        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        updateValues.push(id);

        await EcommerceDatabase.query(`
            UPDATE orders 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex}
        `, updateValues);

        return await this.getOrderById(id);
    }

    /**
     * Search orders
     */
    public static async searchOrders(query: OrderSearchQuery): Promise<{
        orders: Order[];
        pagination: PaginationInfo;
    }> {
        const {
            userId,
            status,
            paymentStatus,
            fulfillmentStatus,
            orderNumber,
            dateFrom,
            dateTo,
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = query;

        // Build WHERE clause
        const whereConditions: string[] = [];
        const queryParams: any[] = [];
        let paramIndex = 1;

        if (userId) {
            whereConditions.push(`user_id = $${paramIndex}`);
            queryParams.push(userId);
            paramIndex++;
        }

        if (status) {
            whereConditions.push(`status = $${paramIndex}`);
            queryParams.push(status);
            paramIndex++;
        }

        if (paymentStatus) {
            whereConditions.push(`payment_status = $${paramIndex}`);
            queryParams.push(paymentStatus);
            paramIndex++;
        }

        if (fulfillmentStatus) {
            whereConditions.push(`fulfillment_status = $${paramIndex}`);
            queryParams.push(fulfillmentStatus);
            paramIndex++;
        }

        if (orderNumber) {
            whereConditions.push(`order_number ILIKE $${paramIndex}`);
            queryParams.push(`%${orderNumber}%`);
            paramIndex++;
        }

        if (dateFrom) {
            whereConditions.push(`created_at >= $${paramIndex}`);
            queryParams.push(dateFrom);
            paramIndex++;
        }

        if (dateTo) {
            whereConditions.push(`created_at <= $${paramIndex}`);
            queryParams.push(dateTo);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Build ORDER BY clause
        const orderByMap: Record<string, string> = {
            orderNumber: 'order_number',
            createdAt: 'created_at',
            totalAmount: 'total_amount',
            status: 'status'
        };

        const orderBy = `ORDER BY ${orderByMap[sortBy] || 'created_at'} ${sortOrder.toUpperCase()}`;

        // Get total count
        const countResult = await EcommerceDatabase.query(`
            SELECT COUNT(*)::integer as total
            FROM orders
            ${whereClause}
        `, queryParams);

        const total = countResult.rows[0].total;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;

        // Get orders
        const ordersResult = await EcommerceDatabase.query(`
            SELECT * FROM orders
            ${whereClause}
            ${orderBy}
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `, [...queryParams, limit, offset]);

        const orders: Order[] = await Promise.all(
            ordersResult.rows.map(async (orderRow: any) => {
                const itemsResult = await EcommerceDatabase.query(
                    'SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at ASC',
                    [orderRow.id]
                );

                const items: OrderItem[] = itemsResult.rows.map((item: any) => ({
                    id: item.id,
                    orderId: item.order_id,
                    productId: item.product_id,
                    variantId: item.variant_id,
                    vendorId: item.vendor_id,
                    productName: item.product_name,
                    variantName: item.variant_name,
                    sku: item.sku,
                    quantity: item.quantity,
                    unitPrice: parseFloat(item.unit_price),
                    totalPrice: parseFloat(item.total_price),
                    fulfillmentStatus: item.fulfillment_status,
                    createdAt: item.created_at,
                    updatedAt: item.updated_at
                }));

                return {
                    id: orderRow.id,
                    orderNumber: orderRow.order_number,
                    userId: orderRow.user_id,
                    status: orderRow.status,
                    paymentStatus: orderRow.payment_status,
                    fulfillmentStatus: orderRow.fulfillment_status,
                    subtotal: parseFloat(orderRow.subtotal),
                    taxAmount: parseFloat(orderRow.tax_amount),
                    shippingAmount: parseFloat(orderRow.shipping_amount),
                    discountAmount: parseFloat(orderRow.discount_amount),
                    totalAmount: parseFloat(orderRow.total_amount),
                    billingAddress: orderRow.billing_address,
                    shippingAddress: orderRow.shipping_address,
                    paymentMethod: orderRow.payment_method,
                    paymentReference: orderRow.payment_reference,
                    shippingMethod: orderRow.shipping_method,
                    trackingNumber: orderRow.tracking_number,
                    notes: orderRow.notes,
                    tags: orderRow.tags || [],
                    createdAt: orderRow.created_at,
                    updatedAt: orderRow.updated_at,
                    items
                };
            })
        );

        const pagination: PaginationInfo = {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
        };

        return { orders, pagination };
    }

    /**
     * Generate unique order number
     */
    private static async generateOrderNumber(): Promise<string> {
        const prefix = 'ORD';
        const timestamp = Date.now().toString().slice(-8);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

        return `${prefix}${timestamp}${random}`;
    }

    /**
     * Get order summary statistics
     */
    public static async getOrderSummary(userId?: string): Promise<OrderSummary> {
        const whereClause = userId ? 'WHERE user_id = $1' : '';
        const params = userId ? [userId] : [];

        const summaryResult = await EcommerceDatabase.query(`
            SELECT 
                COUNT(*)::integer as total_orders,
                COALESCE(SUM(total_amount), 0)::numeric as total_revenue,
                COALESCE(AVG(total_amount), 0)::numeric as average_order_value,
                status,
                payment_status
            FROM orders
            ${whereClause}
            GROUP BY status, payment_status
        `, params);

        let totalOrders = 0;
        let totalRevenue = 0;
        const statusBreakdown: Record<string, number> = {};
        const paymentStatusBreakdown: Record<string, number> = {};

        summaryResult.rows.forEach((row: any) => {
            totalOrders += row.total_orders;
            totalRevenue += parseFloat(row.total_revenue);
            statusBreakdown[row.status] = (statusBreakdown[row.status] || 0) + row.total_orders;
            paymentStatusBreakdown[row.payment_status] = (paymentStatusBreakdown[row.payment_status] || 0) + row.total_orders;
        });

        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        return {
            totalOrders,
            totalRevenue,
            averageOrderValue,
            statusBreakdown: statusBreakdown as any,
            paymentStatusBreakdown: paymentStatusBreakdown as any
        };
    }

    /**
     * Add tracking information to order
     */
    public static async addTrackingInfo(orderId: string, trackingData: {
        trackingNumber: string;
        carrier: string;
        trackingUrl?: string;
        estimatedDelivery?: Date;
    }): Promise<Order> {
        await EcommerceDatabase.query(`
            UPDATE orders 
            SET tracking_number = $1, 
                fulfillment_status = 'shipped',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `, [trackingData.trackingNumber, orderId]);

        // Create tracking history entry
        await this.createOrderStatusHistory(orderId, {
            status: 'shipped',
            notes: `Package shipped with ${trackingData.carrier}. Tracking: ${trackingData.trackingNumber}`,
            metadata: {
                carrier: trackingData.carrier,
                trackingUrl: trackingData.trackingUrl,
                estimatedDelivery: trackingData.estimatedDelivery
            }
        });

        return await this.getOrderById(orderId);
    }

    /**
     * Update order status with history tracking
     */
    public static async updateOrderStatus(orderId: string, statusUpdate: {
        status?: string;
        paymentStatus?: string;
        fulfillmentStatus?: string;
        notes?: string;
        notifyCustomer?: boolean;
    }): Promise<Order> {
        const client = EcommerceDatabase.getPool();

        try {
            await client.query('BEGIN');

            // Update order
            const updateFields: string[] = [];
            const updateValues: any[] = [];
            let paramIndex = 1;

            if (statusUpdate.status) {
                updateFields.push(`status = $${paramIndex}`);
                updateValues.push(statusUpdate.status);
                paramIndex++;
            }

            if (statusUpdate.paymentStatus) {
                updateFields.push(`payment_status = $${paramIndex}`);
                updateValues.push(statusUpdate.paymentStatus);
                paramIndex++;
            }

            if (statusUpdate.fulfillmentStatus) {
                updateFields.push(`fulfillment_status = $${paramIndex}`);
                updateValues.push(statusUpdate.fulfillmentStatus);
                paramIndex++;
            }

            updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
            updateValues.push(orderId);

            if (updateFields.length > 1) { // More than just updated_at
                await client.query(`
                    UPDATE orders 
                    SET ${updateFields.join(', ')}
                    WHERE id = $${paramIndex}
                `, updateValues);
            }

            // Create status history entry
            await this.createOrderStatusHistory(orderId, {
                status: statusUpdate.status || statusUpdate.paymentStatus || statusUpdate.fulfillmentStatus!,
                notes: statusUpdate.notes || `Status updated to ${statusUpdate.status || statusUpdate.paymentStatus || statusUpdate.fulfillmentStatus}`,
                notifyCustomer: statusUpdate.notifyCustomer
            });

            await client.query('COMMIT');

            return await this.getOrderById(orderId);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
    }

    /**
     * Get order tracking history
     */
    public static async getOrderTrackingHistory(orderId: string): Promise<Array<{
        id: string;
        orderId: string;
        status: string;
        notes?: string;
        metadata?: any;
        createdAt: Date;
    }>> {
        const result = await EcommerceDatabase.query(`
            SELECT * FROM order_status_history 
            WHERE order_id = $1 
            ORDER BY created_at ASC
        `, [orderId]);

        return result.rows.map((row: any) => ({
            id: row.id,
            orderId: row.order_id,
            status: row.status,
            notes: row.notes,
            metadata: row.metadata,
            createdAt: row.created_at
        }));
    }

    /**
     * Create order status history entry
     */
    private static async createOrderStatusHistory(orderId: string, historyData: {
        status: string;
        notes?: string;
        metadata?: any;
        notifyCustomer?: boolean;
    }): Promise<void> {
        await EcommerceDatabase.query(`
            INSERT INTO order_status_history (order_id, status, notes, metadata, notify_customer)
            VALUES ($1, $2, $3, $4, $5)
        `, [
            orderId,
            historyData.status,
            historyData.notes,
            JSON.stringify(historyData.metadata || {}),
            historyData.notifyCustomer || false
        ]);
    }

    /**
     * Get orders by tracking number
     */
    public static async getOrderByTrackingNumber(trackingNumber: string): Promise<Order | null> {
        const result = await EcommerceDatabase.query(
            'SELECT id FROM orders WHERE tracking_number = $1',
            [trackingNumber]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return await this.getOrderById(result.rows[0].id);
    }
}