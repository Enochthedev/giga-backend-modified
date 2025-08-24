import { z } from 'zod';
import { UUIDSchema } from './common.validation';

/**
 * Category validation schemas
 */

export const CreateCategorySchema = z.object({
    name: z.string().min(1, 'Category name is required').max(255),
    description: z.string().max(1000).optional(),
    parentId: UUIDSchema.optional(),
    imageUrl: z.string().url('Invalid image URL').optional(),
    isActive: z.boolean().default(true)
});

export const UpdateCategorySchema = CreateCategorySchema.partial();

export const CategoryParamsSchema = z.object({
    id: UUIDSchema
});