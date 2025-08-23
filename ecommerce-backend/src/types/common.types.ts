/**
 * Common types used across the ecommerce service
 */

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    pagination?: PaginationInfo;
}

export interface PaginationInfo {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

export interface PaginationQuery {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface Address {
    firstName: string;
    lastName: string;
    company?: string;
    address1: string;
    address2?: string;
    city: string;
    province: string;
    country: string;
    zip: string;
    phone?: string;
}

export interface Dimensions {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'in';
}

export interface Money {
    amount: number;
    currency: string;
}

export interface Image {
    id: string;
    url: string;
    alt?: string;
    width?: number;
    height?: number;
}

export interface BaseEntity {
    id: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface UserInfo {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
}

export interface PaymentRequest {
    amount: number;
    currency: string;
    paymentMethod: string;
    orderId: string;
    userId: string;
    metadata?: Record<string, any>;
}

export interface PaymentResponse {
    success: boolean;
    paymentId: string;
    status: 'pending' | 'completed' | 'failed' | 'cancelled';
    message?: string;
    transactionId?: string;
}