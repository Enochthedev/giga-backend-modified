import { z } from 'zod';
import { UUIDSchema } from './common.validation';

/**
 * Shopping cart validation schemas
 */

export const AddToCartSchema = z.object({
    productId: UUIDSchema.optional(),
    variantId: UUIDSchema.optional(),
    quantity: z.number().int().min(1, 'Quantity must be at least 1').max(999, 'Quantity cannot exceed 999')
}).refine(data => {
    return data.productId || data.variantId;
}, {
    message: 'Either productId or variantId is required',
    path: ['productId']
});

export const UpdateCartItemSchema = z.object({
    quantity: z.number().int().min(1, 'Quantity must be at least 1').max(999, 'Quantity cannot exceed 999')
});

export const CartParamsSchema = z.object({
    cartId: UUIDSchema
});

export const CartItemParamsSchema = z.object({
    cartId: UUIDSchema,
    itemId: UUIDSchema
});

export const GuestCartSessionSchema = z.object({
    sessionId: z.string().min(1, 'Session ID is required')
});