import { z } from 'zod';
import { UUIDSchema, PaginationSchema, AddressSchema } from './common.validation';

/**
 * Order validation schemas
 */

export const CreateOrderItemSchema = z.object({
    productId: UUIDSchema.optional(),
    variantId: UUIDSchema.optional(),
    quantity: z.number().int().min(1, 'Quantity must be at least 1')
}).refine(data => {
    return data.productId || data.variantId;
}, {
    message: 'Either productId or variantId is required',
    path: ['productId']
});

export const CreateOrderSchema = z.object({
    cartId: UUIDSchema.optional(),
    items: z.array(CreateOrderItemSchema).optional(),
    billingAddress: AddressSchema,
    shippingAddress: AddressSchema.optional(),
    paymentMethod: z.string().min(1, 'Payment method is required'),
    shippingMethod: z.string().optional(),
    notes: z.string().max(1000).optional(),
    tags: z.array(z.string()).default([])
}).refine(data => {
    return data.cartId || (data.items && data.items.length > 0);
}, {
    message: 'Either cartId or items array is required',
    path: ['cartId']
});

export const UpdateOrderSchema = z.object({
    status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']).optional(),
    paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded', 'partially_refunded']).optional(),
    fulfillmentStatus: z.enum(['unfulfilled', 'partial', 'fulfilled', 'shipped', 'delivered']).optional(),
    paymentReference: z.string().optional(),
    shippingMethod: z.string().optional(),
    trackingNumber: z.string().optional(),
    notes: z.string().max(1000).optional(),
    tags: z.array(z.string()).optional()
});

export const OrderSearchSchema = PaginationSchema.extend({
    userId: UUIDSchema.optional(),
    status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']).optional(),
    paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded', 'partially_refunded']).optional(),
    fulfillmentStatus: z.enum(['unfulfilled', 'partial', 'fulfilled', 'shipped', 'delivered']).optional(),
    orderNumber: z.string().optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    sortBy: z.enum(['orderNumber', 'createdAt', 'totalAmount', 'status']).default('createdAt')
}).refine(data => {
    if (data.dateFrom && data.dateTo && data.dateFrom > data.dateTo) {
        return false;
    }
    return true;
}, {
    message: 'Date from cannot be greater than date to',
    path: ['dateFrom']
});

export const OrderParamsSchema = z.object({
    id: UUIDSchema
});

export const OrderNumberParamsSchema = z.object({
    orderNumber: z.string().min(1, 'Order number is required')
});