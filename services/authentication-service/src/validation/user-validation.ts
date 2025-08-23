import { z } from 'zod';

/**
 * Validation schemas for user endpoints
 */

// Name validation
const nameSchema = z.string()
    .min(2, 'Name must be at least 2 characters long')
    .max(50, 'Name cannot exceed 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes');

// Phone validation (optional)
const phoneSchema = z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .optional();

// Date validation - keep as string for input, transform in service layer
const dateSchema = z.string()
    .refine(date => !isNaN(Date.parse(date)), 'Invalid date format')
    .optional();

// Update user schema (all fields optional)
export const updateUserSchema = z.object({
    firstName: nameSchema.optional(),
    lastName: nameSchema.optional(),
    phone: phoneSchema,
    dateOfBirth: dateSchema
}).refine(data => {
    // At least one field must be provided
    return Object.values(data).some(value => value !== undefined);
}, {
    message: 'At least one field must be provided for update'
});

// User search/filter schema
export const userSearchSchema = z.object({
    email: z.string().email('Invalid email format').optional(),
    firstName: z.string().min(1, 'First name cannot be empty').optional(),
    lastName: z.string().min(1, 'Last name cannot be empty').optional(),
    isActive: z.boolean().optional(),
    isVerified: z.boolean().optional(),
    role: z.enum(['super_admin', 'admin', 'user', 'vendor', 'driver', 'property_owner']).optional(),
    createdAfter: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid date format').optional(),
    createdBefore: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid date format').optional(),
    page: z.number().int().min(1, 'Page must be at least 1').default(1),
    limit: z.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(10),
    sortBy: z.enum(['email', 'firstName', 'lastName', 'createdAt', 'updatedAt', 'lastLoginAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// Bulk user operations schema
export const bulkUserOperationSchema = z.object({
    userIds: z.array(z.string().uuid('Invalid user ID format')).min(1, 'At least one user ID is required').max(100, 'Cannot process more than 100 users at once'),
    operation: z.enum(['activate', 'deactivate', 'verify', 'unverify'], {
        errorMap: () => ({ message: 'Operation must be one of: activate, deactivate, verify, unverify' })
    })
});

// User role assignment schema
export const assignRoleSchema = z.object({
    roleName: z.enum(['super_admin', 'admin', 'user', 'vendor', 'driver', 'property_owner'], {
        errorMap: () => ({ message: 'Invalid role name' })
    }),
    assignedBy: z.string().uuid('Invalid assigner user ID').optional()
});

// User statistics query schema
export const userStatsQuerySchema = z.object({
    startDate: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid start date format').optional(),
    endDate: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid end date format').optional(),
    groupBy: z.enum(['day', 'week', 'month', 'year']).default('day'),
    includeInactive: z.boolean().default(false)
});

// User activity log query schema
export const userActivityQuerySchema = z.object({
    userId: z.string().uuid('Invalid user ID format'),
    activityType: z.enum(['login', 'logout', 'password_change', 'profile_update', 'role_change']).optional(),
    startDate: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid start date format').optional(),
    endDate: z.string().refine(date => !isNaN(Date.parse(date)), 'Invalid end date format').optional(),
    page: z.number().int().min(1, 'Page must be at least 1').default(1),
    limit: z.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(20)
});

// User preferences schema
export const userPreferencesSchema = z.object({
    language: z.string().length(2, 'Language must be a 2-character code').default('en'),
    timezone: z.string().min(1, 'Timezone is required').default('UTC'),
    currency: z.string().length(3, 'Currency must be a 3-character code').default('USD'),
    notifications: z.object({
        email: z.boolean().default(true),
        sms: z.boolean().default(false),
        push: z.boolean().default(true),
        marketing: z.boolean().default(false)
    }).default({}),
    privacy: z.object({
        profileVisibility: z.enum(['public', 'private', 'friends']).default('public'),
        showEmail: z.boolean().default(false),
        showPhone: z.boolean().default(false),
        allowDataCollection: z.boolean().default(true)
    }).default({})
});

// Export all schemas
export const userValidationSchemas = {
    updateUser: updateUserSchema,
    userSearch: userSearchSchema,
    bulkUserOperation: bulkUserOperationSchema,
    assignRole: assignRoleSchema,
    userStats: userStatsQuerySchema,
    userActivity: userActivityQuerySchema,
    userPreferences: userPreferencesSchema
};

// Export type inference helpers
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserSearchInput = z.infer<typeof userSearchSchema>;
export type BulkUserOperationInput = z.infer<typeof bulkUserOperationSchema>;
export type AssignRoleInput = z.infer<typeof assignRoleSchema>;
export type UserStatsQueryInput = z.infer<typeof userStatsQuerySchema>;
export type UserActivityQueryInput = z.infer<typeof userActivityQuerySchema>;
export type UserPreferencesInput = z.infer<typeof userPreferencesSchema>;