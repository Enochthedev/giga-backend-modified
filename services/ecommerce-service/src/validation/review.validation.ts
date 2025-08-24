import { z } from 'zod';
import { UUIDSchema, PaginationSchema } from './common.validation';

/**
 * Review validation schemas
 */

export const CreateReviewSchema = z.object({
    productId: UUIDSchema,
    orderId: UUIDSchema.optional(),
    rating: z.number().int().min(1).max(5),
    title: z.string().max(255).optional(),
    content: z.string().max(2000).optional(),
    images: z.array(z.string().url()).max(5).default([])
}).refine(data => {
    if (!data.title && !data.content) {
        return false;
    }
    return true;
}, {
    message: 'Either title or content is required',
    path: ['title']
});

export const UpdateReviewSchema = z.object({
    rating: z.number().int().min(1).max(5).optional(),
    title: z.string().max(255).optional(),
    content: z.string().max(2000).optional(),
    images: z.array(z.string().url()).max(5).optional()
});

export const ReviewSearchSchema = PaginationSchema.extend({
    productId: UUIDSchema.optional(),
    userId: UUIDSchema.optional(),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    isApproved: z.coerce.boolean().optional(),
    isVerified: z.coerce.boolean().optional(),
    sortBy: z.enum(['rating', 'createdAt', 'helpfulCount']).default('createdAt')
});

export const ReviewParamsSchema = z.object({
    id: UUIDSchema
});

export const ProductReviewParamsSchema = z.object({
    productId: UUIDSchema
});

export const TrackingNumberParamsSchema = z.object({
    trackingNumber: z.string().min(1)
});