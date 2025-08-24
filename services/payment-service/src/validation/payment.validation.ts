import { z } from 'zod';

// Base schemas
export const PaymentProviderSchema = z.enum(['stripe', 'paypal', 'flutterwave', 'paystack']);
export const PaymentMethodTypeSchema = z.enum(['card', 'bank_account', 'digital_wallet']);
export const TransactionStatusSchema = z.enum(['pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded']);
export const TransactionTypeSchema = z.enum(['payment', 'refund', 'payout']);
export const CurrencySchema = z.string().length(3).toUpperCase();

// Payment Intent schemas
export const CreatePaymentIntentSchema = z.object({
    amount: z.number().positive().max(999999.99),
    currency: CurrencySchema.default('USD'),
    serviceName: z.string().min(1).max(100),
    serviceTransactionId: z.string().min(1).max(255),
    description: z.string().max(500).optional(),
    metadata: z.record(z.any()).default({}),
    paymentMethodId: z.string().uuid().optional(),
});

export const ProcessPaymentSchema = z.object({
    paymentIntentId: z.string().uuid(),
    paymentMethodId: z.string().uuid().optional(),
    confirmationToken: z.string().optional(),
});

// Payment Method schemas
export const CreatePaymentMethodSchema = z.object({
    type: PaymentMethodTypeSchema,
    provider: PaymentProviderSchema.default('stripe'),
    providerPaymentMethodId: z.string().optional(),
    isDefault: z.boolean().default(false),
    metadata: z.record(z.any()).default({}),
});

export const UpdatePaymentMethodSchema = z.object({
    isDefault: z.boolean().optional(),
    metadata: z.record(z.any()).optional(),
});

// Refund schemas
export const CreateRefundSchema = z.object({
    transactionId: z.string().uuid(),
    amount: z.number().positive().optional(),
    reason: z.string().max(255).optional(),
    metadata: z.record(z.any()).default({}),
});

// Query parameter schemas
export const PaginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const TransactionFiltersSchema = PaginationSchema.extend({
    userId: z.string().optional(),
    status: TransactionStatusSchema.optional(),
    type: TransactionTypeSchema.optional(),
    provider: PaymentProviderSchema.optional(),
    serviceName: z.string().optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
});

// Webhook schemas
export const StripeWebhookSchema = z.object({
    id: z.string(),
    object: z.literal('event'),
    type: z.string(),
    data: z.object({
        object: z.any(),
    }),
    created: z.number(),
    livemode: z.boolean(),
    pending_webhooks: z.number(),
    request: z.object({
        id: z.string().nullable(),
        idempotency_key: z.string().nullable(),
    }).nullable(),
});

// UUID validation
export const UUIDSchema = z.string().uuid();

// Validation helper functions
export function validateCreatePaymentIntent(data: unknown) {
    return CreatePaymentIntentSchema.parse(data);
}

export function validateProcessPayment(data: unknown) {
    return ProcessPaymentSchema.parse(data);
}

export function validateCreatePaymentMethod(data: unknown) {
    return CreatePaymentMethodSchema.parse(data);
}

export function validateUpdatePaymentMethod(data: unknown) {
    return UpdatePaymentMethodSchema.parse(data);
}

export function validateCreateRefund(data: unknown) {
    return CreateRefundSchema.parse(data);
}

export function validateTransactionFilters(data: unknown) {
    return TransactionFiltersSchema.parse(data);
}

export function validateUUID(data: unknown) {
    return UUIDSchema.parse(data);
}