// Vendor management types

export interface VendorAddress {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
}

export interface BankAccountInfo {
    accountNumber: string;
    routingNumber: string;
    bankName: string;
    accountHolderName: string;
    accountType: 'checking' | 'savings';
}

export interface Vendor {
    id: string;
    userId: string;
    businessName: string;
    businessType: 'individual' | 'company' | 'partnership';
    businessRegistrationNumber?: string;
    taxId?: string;

    // Contact information
    contactPerson?: string;
    phone?: string;
    email?: string;
    website?: string;

    // Business address
    businessAddress: VendorAddress;

    // Banking information
    bankAccountInfo?: BankAccountInfo;

    // Status and verification
    status: 'pending' | 'approved' | 'suspended' | 'rejected';
    verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
    verificationDocuments: string[];

    // Business metrics
    totalSales: number;
    totalOrders: number;
    averageRating: number;
    totalReviews: number;

    // Commission
    commissionRate: number;

    // Settings
    settings: Record<string, any>;

    // Timestamps
    approvedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface VendorCategory {
    id: string;
    vendorId: string;
    categoryId: string;
    isApproved: boolean;
    approvedAt?: Date;
    approvedBy?: string;
    createdAt: Date;
}

export interface ProductApproval {
    id: string;
    productId: string;
    vendorId: string;
    status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
    submittedAt: Date;
    reviewedAt?: Date;
    reviewedBy?: string;
    rejectionReason?: string;
    adminNotes?: string;
    changesRequested?: string;
    productData: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

export interface VendorPayout {
    id: string;
    vendorId: string;
    payoutPeriodStart: Date;
    payoutPeriodEnd: Date;

    // Financial details
    grossSales: number;
    commissionAmount: number;
    netAmount: number;

    // Order details
    totalOrders: number;
    orderIds: string[];

    // Payout status
    status: 'pending' | 'processing' | 'completed' | 'failed';
    paymentMethod?: string;
    paymentReference?: string;
    paymentDate?: Date;

    // Metadata
    notes?: string;
    processedBy?: string;

    createdAt: Date;
    updatedAt: Date;
}

export interface VendorAnalytics {
    id: string;
    vendorId: string;
    date: Date;

    // Sales metrics
    totalSales: number;
    totalOrders: number;
    totalItemsSold: number;

    // Product metrics
    totalProducts: number;
    activeProducts: number;

    // Customer metrics
    uniqueCustomers: number;
    newCustomers: number;

    // Review metrics
    newReviews: number;
    averageRating: number;

    createdAt: Date;
    updatedAt: Date;
}

export interface VendorNotification {
    id: string;
    vendorId: string;
    type: string;
    title: string;
    message: string;
    data: Record<string, any>;
    isRead: boolean;
    createdAt: Date;
}

// Request/Response types
export interface CreateVendorRequest {
    businessName: string;
    businessType: 'individual' | 'company' | 'partnership';
    businessRegistrationNumber?: string;
    taxId?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    website?: string;
    businessAddress: VendorAddress;
    bankAccountInfo?: BankAccountInfo;
}

export interface UpdateVendorRequest {
    businessName?: string;
    businessType?: 'individual' | 'company' | 'partnership';
    businessRegistrationNumber?: string;
    taxId?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    website?: string;
    businessAddress?: VendorAddress;
    bankAccountInfo?: BankAccountInfo;
    settings?: Record<string, any>;
}

export interface VendorDashboardStats {
    totalSales: number;
    totalOrders: number;
    totalProducts: number;
    activeProducts: number;
    pendingProducts: number;
    averageRating: number;
    totalReviews: number;
    pendingPayouts: number;
    lastPayoutAmount: number;
    salesGrowth: number; // Percentage growth from previous period
    ordersGrowth: number;
}

export interface VendorSalesReport {
    period: {
        start: Date;
        end: Date;
    };
    totalSales: number;
    totalOrders: number;
    totalItemsSold: number;
    averageOrderValue: number;
    topProducts: Array<{
        productId: string;
        productName: string;
        sales: number;
        orders: number;
        revenue: number;
    }>;
    dailySales: Array<{
        date: Date;
        sales: number;
        orders: number;
        revenue: number;
    }>;
}

export interface ProductApprovalRequest {
    productId: string;
    productData: Record<string, any>;
}

export interface ApproveProductRequest {
    adminNotes?: string;
}

export interface RejectProductRequest {
    rejectionReason: string;
    adminNotes?: string;
}

export interface RequestChangesRequest {
    changesRequested: string;
    adminNotes?: string;
}

export interface VendorFilters {
    status?: 'pending' | 'approved' | 'suspended' | 'rejected';
    verificationStatus?: 'unverified' | 'pending' | 'verified' | 'rejected';
    businessType?: 'individual' | 'company' | 'partnership';
    minSales?: number;
    maxSales?: number;
    minRating?: number;
    maxRating?: number;
    createdAfter?: Date;
    createdBefore?: Date;
}

export interface VendorSearchQuery {
    query?: string;
    filters?: VendorFilters;
    sortBy?: 'businessName' | 'totalSales' | 'totalOrders' | 'averageRating' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
}