export interface PaymentMethod {
    id: string;
    userId: string;
    type: 'card' | 'bank_account' | 'digital_wallet';
    provider: 'stripe' | 'paypal' | 'flutterwave' | 'paystack';
    providerPaymentMethodId: string;
    isDefault: boolean;
    metadata: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

export interface Transaction {
    id: string;
    userId: string;
    paymentMethodId?: string;
    amount: number;
    currency: string;
    status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled' | 'refunded';
    type: 'payment' | 'refund' | 'payout';
    provider: 'stripe' | 'paypal' | 'flutterwave' | 'paystack';
    providerTransactionId?: string;
    serviceName: string;
    serviceTransactionId: string;
    description?: string;
    metadata: Record<string, any>;
    failureReason?: string;
    processedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface Refund {
    id: string;
    transactionId: string;
    amount: number;
    currency: string;
    status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled';
    provider: 'stripe' | 'paypal' | 'flutterwave' | 'paystack';
    providerRefundId?: string;
    reason?: string;
    metadata: Record<string, any>;
    processedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface PaymentIntent {
    id: string;
    userId: string;
    amount: number;
    currency: string;
    status: 'created' | 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'succeeded' | 'cancelled';
    provider: 'stripe' | 'paypal' | 'flutterwave' | 'paystack';
    providerIntentId?: string;
    serviceName: string;
    serviceTransactionId: string;
    clientSecret?: string;
    description?: string;
    metadata: Record<string, any>;
    expiresAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface WebhookEvent {
    id: string;
    provider: 'stripe' | 'paypal' | 'flutterwave' | 'paystack';
    providerEventId: string;
    eventType: string;
    processed: boolean;
    payload: Record<string, any>;
    createdAt: Date;
    processedAt?: Date;
}

// Request/Response types
export interface CreatePaymentIntentRequest {
    amount: number;
    currency?: string;
    serviceName: string;
    serviceTransactionId: string;
    description?: string;
    metadata?: Record<string, any>;
    paymentMethodId?: string;
}

export interface ProcessPaymentRequest {
    paymentIntentId: string;
    paymentMethodId?: string;
    confirmationToken?: string;
}

export interface CreateRefundRequest {
    transactionId: string;
    amount?: number;
    reason?: string;
    metadata?: Record<string, any>;
}

export interface PaymentMethodRequest {
    type: 'card' | 'bank_account' | 'digital_wallet';
    provider?: 'stripe' | 'paypal' | 'flutterwave' | 'paystack';
    providerPaymentMethodId?: string;
    isDefault?: boolean;
    metadata?: Record<string, any>;
}

export interface PaymentResponse {
    success: boolean;
    data?: any;
    error?: string;
    code?: string;
}

export interface PaginationParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface TransactionFilters extends PaginationParams {
    userId?: string;
    status?: string;
    type?: string;
    provider?: string;
    serviceName?: string;
    startDate?: Date;
    endDate?: Date;
}