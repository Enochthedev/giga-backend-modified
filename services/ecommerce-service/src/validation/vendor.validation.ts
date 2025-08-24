import { z } from 'zod';

// Vendor address schema
export const VendorAddressSchema = z.object({
    street: z.string().min(1, 'Street is required').max(255),
    city: z.string().min(1, 'City is required').max(100),
    state: z.string().min(1, 'State is required').max(100),
    country: z.string().min(1, 'Country is required').max(100),
    postalCode: z.string().min(1, 'Postal code is required').max(20)
});

// Bank account info schema
export const BankAccountInfoSchema = z.object({
    accountNumber: z.string().min(1, 'Account number is required'),
    routingNumber: z.string().min(1, 'Routing number is required'),
    bankName: z.string().min(1, 'Bank name is required').max(255),
    accountHolderName: z.string().min(1, 'Account holder name is required').max(255),
    accountType: z.enum(['checking', 'savings'])
});

// Create vendor schema
export const CreateVendorSchema = z.object({
    businessName: z.string().min(1, 'Business name is required').max(255),
    businessType: z.enum(['individual', 'company', 'partnership']),
    businessRegistrationNumber: z.string().max(100).optional(),
    taxId: z.string().max(100).optional(),
    contactPerson: z.string().max(255).optional(),
    phone: z.string().max(50).optional(),
    email: z.string().email('Invalid email format').max(255).optional(),
    website: z.string().url('Invalid website URL').max(255).optional(),
    businessAddress: VendorAddressSchema,
    bankAccountInfo: BankAccountInfoSchema.optional()
});

// Update vendor schema
export const UpdateVendorSchema = z.object({
    businessName: z.string().min(1, 'Business name is required').max(255).optional(),
    businessType: z.enum(['individual', 'company', 'partnership']).optional(),
    businessRegistrationNumber: z.string().max(100).optional(),
    taxId: z.string().max(100).optional(),
    contactPerson: z.string().max(255).optional(),
    phone: z.string().max(50).optional(),
    email: z.string().email('Invalid email format').max(255).optional(),
    website: z.string().url('Invalid website URL').max(255).optional(),
    businessAddress: VendorAddressSchema.optional(),
    bankAccountInfo: BankAccountInfoSchema.optional(),
    settings: z.record(z.any()).optional()
});

// Product approval request schema
export const ProductApprovalRequestSchema = z.object({
    productId: z.string().uuid('Invalid product ID'),
    productData: z.record(z.any())
});

// Admin approve product schema
export const ApproveProductSchema = z.object({
    adminNotes: z.string().max(1000).optional()
});

// Admin reject product schema
export const RejectProductSchema = z.object({
    rejectionReason: z.string().min(1, 'Rejection reason is required').max(1000),
    adminNotes: z.string().max(1000).optional()
});

// Admin request changes schema
export const RequestChangesSchema = z.object({
    changesRequested: z.string().min(1, 'Changes requested is required').max(1000),
    adminNotes: z.string().max(1000).optional()
});

// Vendor search query schema
export const VendorSearchQuerySchema = z.object({
    query: z.string().max(255).optional(),
    filters: z.object({
        status: z.enum(['pending', 'approved', 'suspended', 'rejected']).optional(),
        verificationStatus: z.enum(['unverified', 'pending', 'verified', 'rejected']).optional(),
        businessType: z.enum(['individual', 'company', 'partnership']).optional(),
        minSales: z.number().min(0).optional(),
        maxSales: z.number().min(0).optional(),
        minRating: z.number().min(0).max(5).optional(),
        maxRating: z.number().min(0).max(5).optional(),
        createdAfter: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
        createdBefore: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined)
    }).optional(),
    sortBy: z.enum(['businessName', 'totalSales', 'totalOrders', 'averageRating', 'createdAt']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    page: z.number().int().min(1).optional(),
    limit: z.number().int().min(1).max(100).optional()
});

// Sales report query schema
export const SalesReportQuerySchema = z.object({
    startDate: z.string().datetime().transform(val => new Date(val)),
    endDate: z.string().datetime().transform(val => new Date(val))
}).refine(data => data.startDate <= data.endDate, {
    message: 'Start date must be before or equal to end date',
    path: ['startDate']
});

// Commission update schema
export const UpdateCommissionSchema = z.object({
    commissionRate: z.number().min(0, 'Commission rate must be at least 0').max(1, 'Commission rate must be at most 1')
});

// Payout processing schema
export const ProcessPayoutSchema = z.object({
    startDate: z.string().datetime().transform(val => new Date(val)),
    endDate: z.string().datetime().transform(val => new Date(val))
}).refine(data => data.startDate <= data.endDate, {
    message: 'Start date must be before or equal to end date',
    path: ['startDate']
});

// Vendor action schema (for approve/reject/suspend)
export const VendorActionSchema = z.object({
    reason: z.string().min(1, 'Reason is required').max(1000).optional()
});

// Pagination query schema
export const PaginationQuerySchema = z.object({
    page: z.string().optional().transform(val => val ? parseInt(val) : 1),
    limit: z.string().optional().transform(val => val ? Math.min(parseInt(val) || 20, 100) : 20)
});

// Notification query schema
export const NotificationQuerySchema = z.object({
    page: z.string().optional().transform(val => val ? parseInt(val) : 1),
    limit: z.string().optional().transform(val => val ? Math.min(parseInt(val) || 20, 50) : 20)
});