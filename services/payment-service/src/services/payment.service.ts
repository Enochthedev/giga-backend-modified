import { v4 as uuidv4 } from 'uuid';
import { db } from '../database/connection';
import { StripeService } from './stripe.service';
import { logger } from '../utils/logger';
import {
    PaymentIntent,
    Transaction,
    PaymentMethod,
    Refund,
    CreatePaymentIntentRequest,
    ProcessPaymentRequest,
    CreateRefundRequest,
    PaymentMethodRequest,
    TransactionFilters
} from '../types/payment.types';
import {
    PaymentError,
    TransactionNotFoundError,
    PaymentMethodNotFoundError,
    PaymentIntentNotFoundError,
    DuplicateTransactionError,
    RefundError
} from '../utils/errors';

export class PaymentService {
    private stripeService: StripeService;

    constructor() {
        this.stripeService = new StripeService();
    }

    /**
     * Create a payment intent
     */
    async createPaymentIntent(
        userId: string,
        request: CreatePaymentIntentRequest
    ): Promise<PaymentIntent> {
        try {
            // Check for duplicate service transaction ID
            const existingIntent = await this.getPaymentIntentByServiceTransaction(
                request.serviceName,
                request.serviceTransactionId
            );

            if (existingIntent) {
                throw new DuplicateTransactionError(request.serviceTransactionId);
            }

            // Create Stripe payment intent
            const stripeIntent = await this.stripeService.createPaymentIntent(
                request.amount,
                request.currency || 'USD',
                {
                    userId,
                    serviceName: request.serviceName,
                    serviceTransactionId: request.serviceTransactionId,
                    ...request.metadata
                }
            );

            // Save to database
            const paymentIntent = await this.savePaymentIntent({
                id: uuidv4(),
                userId,
                amount: request.amount,
                currency: request.currency || 'USD',
                status: 'created',
                provider: 'stripe',
                providerIntentId: stripeIntent.id,
                serviceName: request.serviceName,
                serviceTransactionId: request.serviceTransactionId,
                clientSecret: stripeIntent.client_secret || undefined,
                description: request.description,
                metadata: request.metadata || {},
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                createdAt: new Date(),
                updatedAt: new Date()
            });

            logger.info('Payment intent created', {
                paymentIntentId: paymentIntent.id,
                userId,
                amount: request.amount,
                serviceName: request.serviceName
            });

            return paymentIntent;
        } catch (error) {
            logger.error('Failed to create payment intent', { error, userId, request });
            throw error;
        }
    }

    /**
     * Process a payment
     */
    async processPayment(
        userId: string,
        request: ProcessPaymentRequest
    ): Promise<Transaction> {
        try {
            // Get payment intent
            const paymentIntent = await this.getPaymentIntentById(request.paymentIntentId);
            if (!paymentIntent) {
                throw new PaymentIntentNotFoundError(request.paymentIntentId);
            }

            // Verify ownership
            if (paymentIntent.userId !== userId) {
                throw new PaymentError('Unauthorized access to payment intent', 'UNAUTHORIZED', 403);
            }

            // Confirm payment with Stripe
            const stripeIntent = await this.stripeService.confirmPaymentIntent(
                paymentIntent.providerIntentId!,
                request.paymentMethodId
            );

            // Update payment intent status
            await this.updatePaymentIntentStatus(
                paymentIntent.id,
                this.mapStripeStatusToIntentStatus(stripeIntent.status)
            );

            // Create transaction record
            const transaction = await this.createTransaction({
                id: uuidv4(),
                userId,
                paymentMethodId: request.paymentMethodId,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
                status: this.mapStripeStatusToTransactionStatus(stripeIntent.status),
                type: 'payment',
                provider: 'stripe',
                providerTransactionId: stripeIntent.id,
                serviceName: paymentIntent.serviceName,
                serviceTransactionId: paymentIntent.serviceTransactionId,
                description: paymentIntent.description,
                metadata: paymentIntent.metadata,
                processedAt: stripeIntent.status === 'succeeded' ? new Date() : undefined,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            logger.info('Payment processed', {
                transactionId: transaction.id,
                paymentIntentId: paymentIntent.id,
                status: transaction.status,
                amount: transaction.amount
            });

            return transaction;
        } catch (error) {
            logger.error('Failed to process payment', { error, userId, request });
            throw error;
        }
    }

    /**
     * Create a refund
     */
    async createRefund(
        userId: string,
        request: CreateRefundRequest
    ): Promise<Refund> {
        try {
            // Get original transaction
            const transaction = await this.getTransactionById(request.transactionId);
            if (!transaction) {
                throw new TransactionNotFoundError(request.transactionId);
            }

            // Verify ownership
            if (transaction.userId !== userId) {
                throw new PaymentError('Unauthorized access to transaction', 'UNAUTHORIZED', 403);
            }

            // Verify transaction can be refunded
            if (transaction.status !== 'succeeded') {
                throw new RefundError('Transaction must be succeeded to create refund');
            }

            if (transaction.type !== 'payment') {
                throw new RefundError('Only payment transactions can be refunded');
            }

            // Calculate refund amount
            const refundAmount = request.amount || transaction.amount;
            if (refundAmount > transaction.amount) {
                throw new RefundError('Refund amount cannot exceed original transaction amount');
            }

            // Create Stripe refund
            const stripeRefund = await this.stripeService.createRefund(
                transaction.providerTransactionId!,
                refundAmount,
                request.reason
            );

            // Save refund to database
            const refund = await this.saveRefund({
                id: uuidv4(),
                transactionId: transaction.id,
                amount: refundAmount,
                currency: transaction.currency,
                status: this.mapStripeRefundStatus(stripeRefund.status),
                provider: 'stripe',
                providerRefundId: stripeRefund.id,
                reason: request.reason,
                metadata: request.metadata || {},
                processedAt: stripeRefund.status === 'succeeded' ? new Date() : undefined,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            // Update original transaction status if fully refunded
            if (refundAmount === transaction.amount) {
                await this.updateTransactionStatus(transaction.id, 'refunded');
            }

            logger.info('Refund created', {
                refundId: refund.id,
                transactionId: transaction.id,
                amount: refundAmount
            });

            return refund;
        } catch (error) {
            logger.error('Failed to create refund', { error, userId, request });
            throw error;
        }
    }

    /**
     * Add payment method
     */
    async addPaymentMethod(
        userId: string,
        request: PaymentMethodRequest
    ): Promise<PaymentMethod> {
        try {
            // If setting as default, unset other default methods
            if (request.isDefault) {
                await this.unsetDefaultPaymentMethods(userId);
            }

            const paymentMethod = await this.savePaymentMethod({
                id: uuidv4(),
                userId,
                type: request.type,
                provider: request.provider || 'stripe',
                providerPaymentMethodId: request.providerPaymentMethodId || '',
                isDefault: request.isDefault || false,
                metadata: request.metadata || {},
                createdAt: new Date(),
                updatedAt: new Date()
            });

            logger.info('Payment method added', {
                paymentMethodId: paymentMethod.id,
                userId,
                type: request.type
            });

            return paymentMethod;
        } catch (error) {
            logger.error('Failed to add payment method', { error, userId, request });
            throw error;
        }
    }

    /**
     * Get user's payment methods
     */
    async getUserPaymentMethods(userId: string): Promise<PaymentMethod[]> {
        try {
            const result = await db.query(
                `SELECT * FROM payment_methods 
         WHERE user_id = $1 
         ORDER BY is_default DESC, created_at DESC`,
                [userId]
            );

            return result.rows.map(this.mapRowToPaymentMethod);
        } catch (error) {
            logger.error('Failed to get user payment methods', { error, userId });
            throw error;
        }
    }

    /**
     * Get user's transactions
     */
    async getUserTransactions(
        userId: string,
        filters: TransactionFilters = {}
    ): Promise<{ transactions: Transaction[]; total: number }> {
        try {
            const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc' } = filters;
            const offset = (page - 1) * limit;

            let whereClause = 'WHERE user_id = $1';
            const queryParams: any[] = [userId];
            let paramIndex = 2;

            // Add filters
            if (filters.status) {
                whereClause += ` AND status = $${paramIndex}`;
                queryParams.push(filters.status);
                paramIndex++;
            }

            if (filters.type) {
                whereClause += ` AND type = $${paramIndex}`;
                queryParams.push(filters.type);
                paramIndex++;
            }

            if (filters.provider) {
                whereClause += ` AND provider = $${paramIndex}`;
                queryParams.push(filters.provider);
                paramIndex++;
            }

            if (filters.serviceName) {
                whereClause += ` AND service_name = $${paramIndex}`;
                queryParams.push(filters.serviceName);
                paramIndex++;
            }

            if (filters.startDate) {
                whereClause += ` AND created_at >= $${paramIndex}`;
                queryParams.push(filters.startDate);
                paramIndex++;
            }

            if (filters.endDate) {
                whereClause += ` AND created_at <= $${paramIndex}`;
                queryParams.push(filters.endDate);
                paramIndex++;
            }

            // Get total count
            const countResult = await db.query(
                `SELECT COUNT(*) FROM transactions ${whereClause}`,
                queryParams
            );
            const total = parseInt(countResult.rows[0].count);

            // Get transactions
            const result = await db.query(
                `SELECT * FROM transactions ${whereClause}
         ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
                [...queryParams, limit, offset]
            );

            const transactions = result.rows.map(this.mapRowToTransaction);

            return { transactions, total };
        } catch (error) {
            logger.error('Failed to get user transactions', { error, userId, filters });
            throw error;
        }
    }

    // Private helper methods

    private async getPaymentIntentByServiceTransaction(
        serviceName: string,
        serviceTransactionId: string
    ): Promise<PaymentIntent | null> {
        const result = await db.query(
            'SELECT * FROM payment_intents WHERE service_name = $1 AND service_transaction_id = $2',
            [serviceName, serviceTransactionId]
        );

        return result.rows.length > 0 ? this.mapRowToPaymentIntent(result.rows[0]) : null;
    }

    private async getPaymentIntentById(id: string): Promise<PaymentIntent | null> {
        const result = await db.query(
            'SELECT * FROM payment_intents WHERE id = $1',
            [id]
        );

        return result.rows.length > 0 ? this.mapRowToPaymentIntent(result.rows[0]) : null;
    }

    private async getTransactionById(id: string): Promise<Transaction | null> {
        const result = await db.query(
            'SELECT * FROM transactions WHERE id = $1',
            [id]
        );

        return result.rows.length > 0 ? this.mapRowToTransaction(result.rows[0]) : null;
    }

    private async savePaymentIntent(paymentIntent: PaymentIntent): Promise<PaymentIntent> {
        await db.query(
            `INSERT INTO payment_intents (
        id, user_id, amount, currency, status, provider, provider_intent_id,
        service_name, service_transaction_id, client_secret, description,
        metadata, expires_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
            [
                paymentIntent.id,
                paymentIntent.userId,
                paymentIntent.amount,
                paymentIntent.currency,
                paymentIntent.status,
                paymentIntent.provider,
                paymentIntent.providerIntentId,
                paymentIntent.serviceName,
                paymentIntent.serviceTransactionId,
                paymentIntent.clientSecret,
                paymentIntent.description,
                JSON.stringify(paymentIntent.metadata),
                paymentIntent.expiresAt,
                paymentIntent.createdAt,
                paymentIntent.updatedAt
            ]
        );

        return paymentIntent;
    }

    private async createTransaction(transaction: Transaction): Promise<Transaction> {
        await db.query(
            `INSERT INTO transactions (
        id, user_id, payment_method_id, amount, currency, status, type,
        provider, provider_transaction_id, service_name, service_transaction_id,
        description, metadata, processed_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
            [
                transaction.id,
                transaction.userId,
                transaction.paymentMethodId,
                transaction.amount,
                transaction.currency,
                transaction.status,
                transaction.type,
                transaction.provider,
                transaction.providerTransactionId,
                transaction.serviceName,
                transaction.serviceTransactionId,
                transaction.description,
                JSON.stringify(transaction.metadata),
                transaction.processedAt,
                transaction.createdAt,
                transaction.updatedAt
            ]
        );

        return transaction;
    }

    private async saveRefund(refund: Refund): Promise<Refund> {
        await db.query(
            `INSERT INTO refunds (
        id, transaction_id, amount, currency, status, provider,
        provider_refund_id, reason, metadata, processed_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
                refund.id,
                refund.transactionId,
                refund.amount,
                refund.currency,
                refund.status,
                refund.provider,
                refund.providerRefundId,
                refund.reason,
                JSON.stringify(refund.metadata),
                refund.processedAt,
                refund.createdAt,
                refund.updatedAt
            ]
        );

        return refund;
    }

    private async savePaymentMethod(paymentMethod: PaymentMethod): Promise<PaymentMethod> {
        await db.query(
            `INSERT INTO payment_methods (
        id, user_id, type, provider, provider_payment_method_id,
        is_default, metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                paymentMethod.id,
                paymentMethod.userId,
                paymentMethod.type,
                paymentMethod.provider,
                paymentMethod.providerPaymentMethodId,
                paymentMethod.isDefault,
                JSON.stringify(paymentMethod.metadata),
                paymentMethod.createdAt,
                paymentMethod.updatedAt
            ]
        );

        return paymentMethod;
    }

    private async updatePaymentIntentStatus(id: string, status: string): Promise<void> {
        await db.query(
            'UPDATE payment_intents SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [status, id]
        );
    }

    private async updateTransactionStatus(id: string, status: string): Promise<void> {
        await db.query(
            'UPDATE transactions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [status, id]
        );
    }

    private async unsetDefaultPaymentMethods(userId: string): Promise<void> {
        await db.query(
            'UPDATE payment_methods SET is_default = FALSE WHERE user_id = $1 AND is_default = TRUE',
            [userId]
        );
    }

    // Mapping functions
    private mapRowToPaymentIntent(row: any): PaymentIntent {
        return {
            id: row.id,
            userId: row.user_id,
            amount: parseFloat(row.amount),
            currency: row.currency,
            status: row.status,
            provider: row.provider,
            providerIntentId: row.provider_intent_id,
            serviceName: row.service_name,
            serviceTransactionId: row.service_transaction_id,
            clientSecret: row.client_secret,
            description: row.description,
            metadata: row.metadata || {},
            expiresAt: row.expires_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }

    private mapRowToTransaction(row: any): Transaction {
        return {
            id: row.id,
            userId: row.user_id,
            paymentMethodId: row.payment_method_id,
            amount: parseFloat(row.amount),
            currency: row.currency,
            status: row.status,
            type: row.type,
            provider: row.provider,
            providerTransactionId: row.provider_transaction_id,
            serviceName: row.service_name,
            serviceTransactionId: row.service_transaction_id,
            description: row.description,
            metadata: row.metadata || {},
            failureReason: row.failure_reason,
            processedAt: row.processed_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }

    private mapRowToPaymentMethod(row: any): PaymentMethod {
        return {
            id: row.id,
            userId: row.user_id,
            type: row.type,
            provider: row.provider,
            providerPaymentMethodId: row.provider_payment_method_id,
            isDefault: row.is_default,
            metadata: row.metadata || {},
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }

    private mapStripeStatusToIntentStatus(stripeStatus: string): string {
        const statusMap: Record<string, string> = {
            'requires_payment_method': 'requires_payment_method',
            'requires_confirmation': 'requires_confirmation',
            'requires_action': 'requires_action',
            'processing': 'processing',
            'succeeded': 'succeeded',
            'canceled': 'cancelled'
        };
        return statusMap[stripeStatus] || stripeStatus;
    }

    private mapStripeStatusToTransactionStatus(stripeStatus: string): 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled' | 'refunded' {
        const statusMap: Record<string, 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled' | 'refunded'> = {
            'requires_payment_method': 'pending',
            'requires_confirmation': 'pending',
            'requires_action': 'pending',
            'processing': 'processing',
            'succeeded': 'succeeded',
            'canceled': 'cancelled'
        };
        return statusMap[stripeStatus] || 'pending';
    }

    private mapStripeRefundStatus(stripeStatus: string | null): 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled' {
        if (!stripeStatus) return 'pending';

        const statusMap: Record<string, 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled'> = {
            'pending': 'pending',
            'succeeded': 'succeeded',
            'failed': 'failed',
            'canceled': 'cancelled'
        };
        return statusMap[stripeStatus] || 'pending';
    }
}