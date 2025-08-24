export class PaymentError extends Error {
    public readonly code: string;
    public readonly statusCode: number;
    public readonly details?: any;

    constructor(message: string, code: string, statusCode: number = 400, details?: any) {
        super(message);
        this.name = 'PaymentError';
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
    }
}

export class ValidationError extends PaymentError {
    constructor(message: string, details?: any) {
        super(message, 'VALIDATION_ERROR', 400, details);
        this.name = 'ValidationError';
    }
}

export class PaymentProviderError extends PaymentError {
    constructor(message: string, provider: string, details?: any) {
        super(message, 'PAYMENT_PROVIDER_ERROR', 502, { ...details, provider });
        this.name = 'PaymentProviderError';
    }
}

export class TransactionNotFoundError extends PaymentError {
    constructor(transactionId: string) {
        super(`Transaction not found: ${transactionId}`, 'TRANSACTION_NOT_FOUND', 404);
        this.name = 'TransactionNotFoundError';
    }
}

export class PaymentMethodNotFoundError extends PaymentError {
    constructor(paymentMethodId: string) {
        super(`Payment method not found: ${paymentMethodId}`, 'PAYMENT_METHOD_NOT_FOUND', 404);
        this.name = 'PaymentMethodNotFoundError';
    }
}

export class PaymentIntentNotFoundError extends PaymentError {
    constructor(paymentIntentId: string) {
        super(`Payment intent not found: ${paymentIntentId}`, 'PAYMENT_INTENT_NOT_FOUND', 404);
        this.name = 'PaymentIntentNotFoundError';
    }
}

export class InsufficientFundsError extends PaymentError {
    constructor() {
        super('Insufficient funds for this transaction', 'INSUFFICIENT_FUNDS', 402);
        this.name = 'InsufficientFundsError';
    }
}

export class PaymentDeclinedError extends PaymentError {
    constructor(reason?: string) {
        super(`Payment declined${reason ? `: ${reason}` : ''}`, 'PAYMENT_DECLINED', 402);
        this.name = 'PaymentDeclinedError';
    }
}

export class DuplicateTransactionError extends PaymentError {
    constructor(serviceTransactionId: string) {
        super(`Duplicate transaction: ${serviceTransactionId}`, 'DUPLICATE_TRANSACTION', 409);
        this.name = 'DuplicateTransactionError';
    }
}

export class RefundError extends PaymentError {
    constructor(message: string, details?: any) {
        super(message, 'REFUND_ERROR', 400, details);
        this.name = 'RefundError';
    }
}

export class WebhookError extends PaymentError {
    constructor(message: string, details?: any) {
        super(message, 'WEBHOOK_ERROR', 400, details);
        this.name = 'WebhookError';
    }
}