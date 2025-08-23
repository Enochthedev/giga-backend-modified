/**
 * Admin service type definitions
 */

export interface AdminRole {
    id: string;
    name: string;
    description?: string;
    permissions: string[];
    isSystemRole: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface AdminUser {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    avatarUrl?: string;
    roleId: string;
    role?: AdminRole;
    status: 'active' | 'inactive' | 'suspended';
    lastLoginAt?: Date;
    passwordChangedAt: Date;
    failedLoginAttempts: number;
    lockedUntil?: Date;
    twoFactorEnabled: boolean;
    createdBy?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface AdminSession {
    id: string;
    adminId: string;
    tokenHash: string;
    refreshTokenHash?: string;
    ipAddress?: string;
    userAgent?: string;
    expiresAt: Date;
    createdAt: Date;
}

export interface AuditLog {
    id: string;
    adminId?: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    success: boolean;
    errorMessage?: string;
    metadata: Record<string, any>;
    createdAt: Date;
}

export interface SystemHealthMetric {
    id: string;
    serviceName: string;
    metricType: string;
    metricValue?: number;
    metricUnit?: string;
    status: 'healthy' | 'warning' | 'critical';
    metadata: Record<string, any>;
    recordedAt: Date;
}

export interface PlatformConfiguration {
    id: string;
    category: string;
    key: string;
    value: any;
    description?: string;
    isSensitive: boolean;
    validationSchema?: Record<string, any>;
    updatedBy?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface UserManagementCache {
    id: string;
    userId: string;
    serviceName: string;
    userData: Record<string, any>;
    lastSyncedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface SystemAlert {
    id: string;
    alertType: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    title: string;
    message: string;
    sourceService?: string;
    metadata: Record<string, any>;
    acknowledged: boolean;
    acknowledgedBy?: string;
    acknowledgedAt?: Date;
    resolved: boolean;
    resolvedBy?: string;
    resolvedAt?: Date;
    createdAt: Date;
}

// Request/Response types
export interface LoginRequest {
    email: string;
    password: string;
    twoFactorCode?: string;
}

export interface LoginResponse {
    success: boolean;
    token: string;
    refreshToken: string;
    user: Omit<AdminUser, 'passwordChangedAt' | 'failedLoginAttempts' | 'lockedUntil'>;
    expiresAt: Date;
}

export interface CreateAdminUserRequest {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    roleId: string;
}

export interface UpdateAdminUserRequest {
    firstName?: string;
    lastName?: string;
    phone?: string;
    roleId?: string;
    status?: 'active' | 'inactive' | 'suspended';
}

export interface CreateRoleRequest {
    name: string;
    description?: string;
    permissions: string[];
}

export interface UpdateRoleRequest {
    name?: string;
    description?: string;
    permissions?: string[];
}

export interface SystemHealthResponse {
    overall: 'healthy' | 'warning' | 'critical';
    services: {
        [serviceName: string]: {
            status: 'healthy' | 'warning' | 'critical';
            lastCheck: Date;
            metrics: SystemHealthMetric[];
        };
    };
    summary: {
        totalServices: number;
        healthyServices: number;
        warningServices: number;
        criticalServices: number;
    };
}

export interface DashboardStats {
    totalUsers: number;
    activeUsers: number;
    totalAdmins: number;
    activeAdmins: number;
    totalVendors: number;
    pendingVendors: number;
    totalOrders: number;
    todayOrders: number;
    totalRevenue: number;
    todayRevenue: number;
    systemHealth: 'healthy' | 'warning' | 'critical';
    recentAlerts: SystemAlert[];
}

export interface UserSearchQuery {
    query?: string;
    service?: string;
    status?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface AuditLogQuery {
    adminId?: string;
    action?: string;
    resourceType?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
}

// Permission constants
export const PERMISSIONS = {
    // User management
    USERS_READ: 'users:read',
    USERS_WRITE: 'users:write',
    USERS_DELETE: 'users:delete',

    // Vendor management
    VENDORS_READ: 'vendors:read',
    VENDORS_WRITE: 'vendors:write',
    VENDORS_APPROVE: 'vendors:approve',

    // Product management
    PRODUCTS_READ: 'products:read',
    PRODUCTS_WRITE: 'products:write',
    PRODUCTS_APPROVE: 'products:approve',

    // Order management
    ORDERS_READ: 'orders:read',
    ORDERS_WRITE: 'orders:write',

    // Payment management
    PAYMENTS_READ: 'payments:read',
    PAYMENTS_WRITE: 'payments:write',

    // Analytics
    ANALYTICS_READ: 'analytics:read',

    // System management
    SYSTEM_READ: 'system:read',
    SYSTEM_WRITE: 'system:write',

    // Audit logs
    AUDIT_READ: 'audit:read',

    // Admin management
    ADMIN_READ: 'admin:read',
    ADMIN_WRITE: 'admin:write',

    // Super admin (all permissions)
    ALL: '*'
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];