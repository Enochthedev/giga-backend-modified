import { z } from 'zod';

/**
 * Common validation schemas
 */

export const UUIDSchema = z.string().uuid('Invalid UUID format');

export const PaginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export const AddressSchema = z.object({
    firstName: z.string().min(1, 'First name is required').max(100),
    lastName: z.string().min(1, 'Last name is required').max(100),
    company: z.string().max(100).optional(),
    address1: z.string().min(1, 'Address is required').max(255),
    address2: z.string().max(255).optional(),
    city: z.string().min(1, 'City is required').max(100),
    province: z.string().min(1, 'Province/State is required').max(100),
    country: z.string().min(1, 'Country is required').max(100),
    zip: z.string().min(1, 'Postal code is required').max(20),
    phone: z.string().max(20).optional()
});

export const DimensionsSchema = z.object({
    length: z.number().positive('Length must be positive'),
    width: z.number().positive('Width must be positive'),
    height: z.number().positive('Height must be positive'),
    unit: z.enum(['cm', 'in'])
});

export const ImageSchema = z.object({
    id: z.string(),
    url: z.string().url('Invalid image URL'),
    alt: z.string().optional(),
    width: z.number().positive().optional(),
    height: z.number().positive().optional()
});

export const MoneySchema = z.object({
    amount: z.number().min(0, 'Amount must be non-negative'),
    currency: z.string().length(3, 'Currency must be 3 characters')
});

// Common query parameters
export const SearchQuerySchema = z.object({
    q: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
});

// Price validation
export const PriceSchema = z.number().min(0, 'Price must be non-negative').multipleOf(0.01, 'Price must have at most 2 decimal places');

// SKU validation
export const SKUSchema = z.string().min(1, 'SKU is required').max(100).regex(/^[A-Za-z0-9\-_]+$/, 'SKU can only contain letters, numbers, hyphens, and underscores');

// Tags validation
export const TagsSchema = z.array(z.string().min(1).max(50)).max(20, 'Maximum 20 tags allowed');

// Rating validation
export const RatingSchema = z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5');