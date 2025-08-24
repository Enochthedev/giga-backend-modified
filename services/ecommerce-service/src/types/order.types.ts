import { BaseEntity, Address } from './common.types';

/**
 * Order related types
 */

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
export type FulfillmentStatus = 'unfulfilled' | 'partial' | 'fulfilled' | 'shipped' | 'delivered';

export interface Order extends BaseEntity {
    orderNumber: string;
    userId: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    fulfillmentStatus: FulfillmentStatus;

    // Pricing
    subtotal: number;
    taxAmount: number;
    shippingAmount: number;
    discountAmount: number;
    totalAmount: number;

    // Addresses
    billingAddress: Address;
    shippingAddress?: Address;

    // Payment
    paymentMethod?: string;
    paymentReference?: string;

    // Shipping
    shippingMethod?: string;
    trackingNumber?: string;

    // Metadata
    notes?: string;
    tags: string[];

    items: OrderItem[];
}

export interface OrderItem extends BaseEntity {
    orderId: string;
    productId?: string;
    variantId?: string;
    vendorId: string;

    // Product details at time of order
    productName: string;
    variantName?: string;
    sku: string;

    quantity: number;
    unitPrice: number;
    totalPrice: number;

    // Fulfillment
    fulfillmentStatus: FulfillmentStatus;
}

export interface CreateOrderRequest {
    cartId?: string; // If creating from cart
    items?: CreateOrderItemRequest[]; // If creating directly
    billingAddress: Address;
    shippingAddress?: Address;
    paymentMethod: string;
    shippingMethod?: string;
    notes?: string;
    tags?: string[];
}

export interface CreateOrderItemRequest {
    productId?: string;
    variantId?: string;
    quantity: number;
}

export interface UpdateOrderRequest {
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    fulfillmentStatus?: FulfillmentStatus;
    paymentReference?: string;
    shippingMethod?: string;
    trackingNumber?: string;
    notes?: string;
    tags?: string[];
}

export interface OrderSearchQuery {
    userId?: string;
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    fulfillmentStatus?: FulfillmentStatus;
    orderNumber?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
    sortBy?: 'orderNumber' | 'createdAt' | 'totalAmount' | 'status';
    sortOrder?: 'asc' | 'desc';
}

export interface OrderSummary {
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    statusBreakdown: Record<OrderStatus, number>;
    paymentStatusBreakdown: Record<PaymentStatus, number>;
}