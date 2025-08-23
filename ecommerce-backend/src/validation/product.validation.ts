import { z } from 'zod';
import {
    UUIDSchema,
    PaginationSchema,
    DimensionsSchema,
    ImageSchema,
    PriceSchema,
    SKUSchema,
    TagsSchema
} from './common.validation';

/**
 * Product validation schemas
 */

export const CreateProductSchema = z.object({
    name: z.string().min(1, 'Product name is required').max(255),
    description: z.string().max(5000).optional(),
    shortDescription: z.string().max(500).optional(),
    sku: SKUSchema,
    price: PriceSchema,
    comparePrice: PriceSchema.optional(),
    costPrice: PriceSchema.optional(),
    categoryId: UUIDSchema.optional(),
    brand: z.string().max(255).optional(),
    weight: z.number().positive().optional(),
    dimensions: DimensionsSchema.optional(),
    images: z.array(ImageSchema).default([]),
    tags: TagsSchema.default([]),
    metaTitle: z.string().max(255).optional(),
    metaDescription: z.string().max(500).optional(),
    isActive: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
    requiresShipping: z.boolean().default(true),
    trackInventory: z.boolean().default(true),
    initialInventory: z.number().int().min(0).default(0)
}).refine(data => {
    if (data.comparePrice && data.comparePrice <= data.price) {
        return false;
    }
    return true;
}, {
    message: 'Compare price must be greater than regular price',
    path: ['comparePrice']
});

export const UpdateProductSchema = z.object({
    name: z.string().min(1, 'Product name is required').max(255).optional(),
    description: z.string().max(5000).optional(),
    shortDescription: z.string().max(500).optional(),
    price: PriceSchema.optional(),
    comparePrice: PriceSchema.optional(),
    costPrice: PriceSchema.optional(),
    categoryId: UUIDSchema.optional(),
    brand: z.string().max(255).optional(),
    weight: z.number().positive().optional(),
    dimensions: DimensionsSchema.optional(),
    images: z.array(ImageSchema).optional(),
    tags: TagsSchema.optional(),
    metaTitle: z.string().max(255).optional(),
    metaDescription: z.string().max(500).optional(),
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    requiresShipping: z.boolean().optional(),
    trackInventory: z.boolean().optional()
});

export const CreateProductVariantSchema = z.object({
    sku: SKUSchema,
    name: z.string().min(1, 'Variant name is required').max(255),
    price: PriceSchema.optional(),
    comparePrice: PriceSchema.optional(),
    costPrice: PriceSchema.optional(),
    inventoryQuantity: z.number().int().min(0).default(0),
    weight: z.number().positive().optional(),
    imageUrl: z.string().url().optional(),
    options: z.record(z.string(), z.string()).refine(options => {
        return Object.keys(options).length > 0;
    }, 'At least one option is required'),
    isActive: z.boolean().default(true)
});

export const UpdateProductVariantSchema = CreateProductVariantSchema.partial().omit({ sku: true });

export const ProductSearchSchema = PaginationSchema.extend({
    q: z.string().optional(),
    categoryId: UUIDSchema.optional(),
    vendorId: UUIDSchema.optional(),
    brand: z.string().optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    tags: z.union([
        z.string().transform(str => str.split(',')),
        z.array(z.string())
    ]).optional(),
    isActive: z.coerce.boolean().optional(),
    isFeatured: z.coerce.boolean().optional(),
    inStock: z.coerce.boolean().optional(),
    sortBy: z.enum(['name', 'price', 'createdAt', 'updatedAt', 'rating']).default('createdAt')
}).refine(data => {
    if (data.minPrice && data.maxPrice && data.minPrice > data.maxPrice) {
        return false;
    }
    return true;
}, {
    message: 'Minimum price cannot be greater than maximum price',
    path: ['minPrice']
});

export const ProductParamsSchema = z.object({
    id: UUIDSchema
});

export const ProductVariantParamsSchema = z.object({
    productId: UUIDSchema,
    variantId: UUIDSchema
});