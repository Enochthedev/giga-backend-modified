import { z } from 'zod';

/**
 * Common validation schemas using Zod
 */

// Basic types
export const EmailSchema = z.string().email('Invalid email format');
export const PasswordSchema = z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
export const UuidSchema = z.string().uuid('Invalid UUID format');
export const PhoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format');
export const UrlSchema = z.string().url('Invalid URL format');
export const DateSchema = z.string().datetime('Invalid ISO date format');
export const AmountSchema = z.number().positive('Amount must be positive').multipleOf(0.01, 'Amount must have at most 2 decimal places');

// Pagination
export const PaginationSchema = z.object({
    page: z.number().int().min(1, 'Page must be at least 1').default(1),
    limit: z.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(10),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('asc')
});

// User schemas
export const CreateUserSchema = z.object({
    email: EmailSchema,
    password: PasswordSchema,
    firstName: z.string().min(2, 'First name must be at least 2 characters').max(50, 'First name cannot exceed 50 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters').max(50, 'Last name cannot exceed 50 characters'),
    phone: PhoneSchema.optional(),
    dateOfBirth: DateSchema.optional()
});

export const UpdateUserSchema = CreateUserSchema.partial().omit({ password: true });

export const LoginSchema = z.object({
    email: EmailSchema,
    password: z.string().min(1, 'Password is required')
});

export const ChangePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: PasswordSchema,
    confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
});

// Domain Event schemas
export const EventMetadataSchema = z.object({
    userId: UuidSchema.optional(),
    correlationId: UuidSchema,
    causationId: UuidSchema.optional(),
    source: z.string().min(1, 'Source is required')
});

export const DomainEventSchema = z.object({
    id: UuidSchema,
    type: z.string().min(1, 'Event type is required'),
    aggregateId: UuidSchema,
    aggregateType: z.string().min(1, 'Aggregate type is required'),
    data: z.record(z.any()),
    metadata: EventMetadataSchema,
    timestamp: z.date(),
    version: z.number().int().min(1, 'Version must be at least 1')
});

// Payment schemas
export const PaymentMethodSchema = z.object({
    type: z.enum(['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'wallet']),
    details: z.record(z.any())
});

export const CreatePaymentSchema = z.object({
    amount: AmountSchema,
    currency: z.string().length(3, 'Currency must be 3 characters (ISO 4217)'),
    paymentMethod: PaymentMethodSchema,
    description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
    metadata: z.record(z.any()).optional()
});

// Product schemas
export const CreateProductSchema = z.object({
    name: z.string().min(2, 'Product name must be at least 2 characters').max(200, 'Product name cannot exceed 200 characters'),
    description: z.string().max(2000, 'Description cannot exceed 2000 characters').optional(),
    price: AmountSchema,
    currency: z.string().length(3, 'Currency must be 3 characters'),
    category: z.string().min(1, 'Category is required'),
    sku: z.string().min(1, 'SKU is required'),
    inventory: z.number().int().min(0, 'Inventory cannot be negative'),
    images: z.array(UrlSchema).max(10, 'Cannot have more than 10 images').optional(),
    tags: z.array(z.string()).max(20, 'Cannot have more than 20 tags').optional(),
    isActive: z.boolean().default(true)
});

export const UpdateProductSchema = CreateProductSchema.partial();

// Order schemas
export const OrderItemSchema = z.object({
    productId: UuidSchema,
    quantity: z.number().int().min(1, 'Quantity must be at least 1'),
    price: AmountSchema,
    currency: z.string().length(3, 'Currency must be 3 characters')
});

export const CreateOrderSchema = z.object({
    customerId: UuidSchema,
    items: z.array(OrderItemSchema).min(1, 'Order must have at least one item'),
    shippingAddress: z.object({
        street: z.string().min(1, 'Street is required'),
        city: z.string().min(1, 'City is required'),
        state: z.string().min(1, 'State is required'),
        postalCode: z.string().min(1, 'Postal code is required'),
        country: z.string().length(2, 'Country must be 2 characters (ISO 3166-1)')
    }),
    billingAddress: z.object({
        street: z.string().min(1, 'Street is required'),
        city: z.string().min(1, 'City is required'),
        state: z.string().min(1, 'State is required'),
        postalCode: z.string().min(1, 'Postal code is required'),
        country: z.string().length(2, 'Country must be 2 characters (ISO 3166-1)')
    }).optional(),
    notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional()
});

// Booking schemas (for hotel/taxi services)
export const CreateBookingSchema = z.object({
    customerId: UuidSchema,
    serviceType: z.enum(['hotel', 'taxi', 'other']),
    startDate: DateSchema,
    endDate: DateSchema,
    details: z.record(z.any()),
    specialRequests: z.string().max(1000, 'Special requests cannot exceed 1000 characters').optional()
}).refine(data => new Date(data.endDate) > new Date(data.startDate), {
    message: 'End date must be after start date',
    path: ['endDate']
});

// File upload schemas
export const FileUploadSchema = z.object({
    filename: z.string().min(1, 'Filename is required'),
    mimetype: z.string().min(1, 'MIME type is required'),
    size: z.number().int().min(1, 'File size must be greater than 0').max(50 * 1024 * 1024, 'File size cannot exceed 50MB'),
    category: z.enum(['image', 'document', 'video', 'audio', 'other']).optional()
});

// Search schemas
export const SearchSchema = z.object({
    query: z.string().min(1, 'Search query is required').max(200, 'Search query cannot exceed 200 characters'),
    filters: z.record(z.any()).optional(),
    pagination: PaginationSchema.optional()
});

// Notification schemas
export const CreateNotificationSchema = z.object({
    userId: UuidSchema,
    type: z.enum(['email', 'sms', 'push', 'in_app']),
    title: z.string().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters'),
    message: z.string().min(1, 'Message is required').max(1000, 'Message cannot exceed 1000 characters'),
    data: z.record(z.any()).optional(),
    scheduledAt: DateSchema.optional()
});

// API Response schemas
export const ApiResponseSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    data: z.any().optional(),
    error: z.string().optional(),
    timestamp: z.date(),
    requestId: z.string().optional()
});

export const PaginatedResponseSchema = ApiResponseSchema.extend({
    data: z.array(z.any()),
    pagination: z.object({
        page: z.number().int(),
        limit: z.number().int(),
        total: z.number().int(),
        totalPages: z.number().int()
    })
});

// Configuration schemas
export const DatabaseConfigSchema = z.object({
    host: z.string().min(1, 'Database host is required'),
    port: z.number().int().min(1, 'Port must be greater than 0').max(65535, 'Port must be less than 65536'),
    database: z.string().min(1, 'Database name is required'),
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
    ssl: z.boolean().optional(),
    poolSize: z.number().int().min(1, 'Pool size must be at least 1').optional()
});

export const ServiceConfigSchema = z.object({
    name: z.string().min(1, 'Service name is required'),
    version: z.string().min(1, 'Version is required'),
    port: z.number().int().min(1, 'Port must be greater than 0').max(65535, 'Port must be less than 65536'),
    environment: z.enum(['development', 'staging', 'production']),
    database: DatabaseConfigSchema,
    redis: z.object({
        host: z.string().min(1, 'Redis host is required'),
        port: z.number().int().min(1, 'Port must be greater than 0').max(65535, 'Port must be less than 65536'),
        password: z.string().optional()
    }),
    jwt: z.object({
        secret: z.string().min(32, 'JWT secret must be at least 32 characters'),
        expiresIn: z.string().min(1, 'JWT expiration is required')
    })
});

// Export type inference helpers
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type PaginationInput = z.infer<typeof PaginationSchema>;
export type DomainEventInput = z.infer<typeof DomainEventSchema>;
export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;
export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;
export type FileUploadInput = z.infer<typeof FileUploadSchema>;
export type SearchInput = z.infer<typeof SearchSchema>;
export type CreateNotificationInput = z.infer<typeof CreateNotificationSchema>;
export type DatabaseConfigInput = z.infer<typeof DatabaseConfigSchema>;
export type ServiceConfigInput = z.infer<typeof ServiceConfigSchema>;