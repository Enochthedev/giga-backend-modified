import { z } from 'zod';
import { UUIDSchema, AddressSchema } from './common.validation';

/**
 * Checkout validation schemas
 */

export const CreateCheckoutSessionSchema = z.object({
    cartId: UUIDSchema.optional(),
    items: z.array(z.object({
        productId: UUIDSchema.optional(),
        variantId: UUIDSchema.optional(),
        quantity: z.number().int().min(1)
    })).optional()
}).refine(data => {
    return data.cartId || (data.items && data.items.length > 0);
}, {
    message: 'Either cartId or items array is required'
}).refine(data => {
    if (data.items) {
        return data.items.every(item => item.productId || item.variantId);
    }
    return true;
}, {
    message: 'Each item must have either productId or variantId'
});

export const UpdateCheckoutSessionSchema = z.object({
    shippingAddress: AddressSchema.optional(),
    billingAddress: AddressSchema.optional(),
    shippingMethodId: z.string().optional(),
    paymentMethodId: z.string().optional(),
    promoCode: z.string().optional()
});

export const CheckoutSessionParamsSchema = z.object({
    sessionId: z.string().min(1)
});

export const BulkStockValidationSchema = z.object({
    items: z.array(z.object({
        productId: UUIDSchema.optional(),
        variantId: UUIDSchema.optional(),
        quantity: z.number().int().min(1)
    })).min(1)
});

export const TrackUserBehaviorSchema = z.object({
    productId: UUIDSchema,
    action: z.enum(['view', 'cart', 'purchase', 'wishlist', 'review']),
    weight: z.number().min(0).max(10).default(1.0)
});