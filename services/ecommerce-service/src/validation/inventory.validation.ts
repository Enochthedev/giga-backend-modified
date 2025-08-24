import { z } from 'zod';
import { UUIDSchema } from './common.validation';

/**
 * Inventory validation schemas
 */

export const InventoryAdjustmentSchema = z.object({
    type: z.enum(['increase', 'decrease', 'set']),
    quantity: z.number().int().min(0),
    reason: z.string().min(1).max(255),
    notes: z.string().max(500).optional()
});

export const UpdateLowStockThresholdSchema = z.object({
    threshold: z.number().int().min(0)
});

export const BulkInventoryUpdateSchema = z.object({
    updates: z.array(z.object({
        productId: UUIDSchema.optional(),
        variantId: UUIDSchema.optional(),
        quantity: z.number().int().min(0),
        reason: z.string().min(1).max(255)
    })).min(1)
}).refine(data => {
    return data.updates.every(update => update.productId || update.variantId);
}, {
    message: 'Each update must have either productId or variantId'
});

export const InventoryQuerySchema = z.object({
    productId: UUIDSchema.optional(),
    variantId: UUIDSchema.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50)
}).refine(data => {
    return data.productId || data.variantId;
}, {
    message: 'Either productId or variantId is required'
});