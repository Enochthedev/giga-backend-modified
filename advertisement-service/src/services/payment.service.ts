import { db } from '../database/connection';
import {
    AdTransaction,
    TransactionType,
    TransactionStatus,
    Advertiser
} from '../types/advertisement.types';

export class PaymentService {
    private paymentServiceUrl: string;

    constructor() {
        this.paymentServiceUrl = process.env.PAYMENT_SERVICE_URL || 'http://localhost:4001';
    }

    async createAdvertiser(advertiserData: {
        id: string;
        company_name?: string;
        contact_email: string;
        contact_phone?: string;
        billing_address?: string;
    }): Promise<Advertiser> {
        const query = `
      INSERT INTO advertisers (id, company_name, contact_email, contact_phone, billing_address)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

        const values = [
            advertiserData.id,
            advertiserData.company_name,
            advertiserData.contact_email,
            advertiserData.contact_phone,
            advertiserData.billing_address
        ];

        const result = await db.query(query, values);
        return result.rows[0];
    }

    async getAdvertiserById(id: string): Promise<Advertiser | null> {
        const query = 'SELECT * FROM advertisers WHERE id = $1';
        const result = await db.query(query, [id]);
        return result.rows[0] || null;
    }

    async updateAdvertiserBalance(advertiserId: string, amount: number): Promise<Advertiser | null> {
        const query = `
      UPDATE advertisers 
      SET account_balance = account_balance + $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

        const result = await db.query(query, [amount, advertiserId]);
        return result.rows[0] || null;
    }

    async createTransaction(transactionData: {
        campaign_id: number;
        advertiser_id: string;
        amount: number;
        transaction_type: TransactionType;
        payment_method?: string;
        payment_reference?: string;
    }): Promise<AdTransaction> {
        const query = `
      INSERT INTO ad_transactions (campaign_id, advertiser_id, amount, transaction_type, payment_method, payment_reference)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

        const values = [
            transactionData.campaign_id,
            transactionData.advertiser_id,
            transactionData.amount,
            transactionData.transaction_type,
            transactionData.payment_method,
            transactionData.payment_reference
        ];

        const result = await db.query(query, values);
        return result.rows[0];
    }

    async updateTransactionStatus(
        transactionId: number,
        status: TransactionStatus,
        paymentReference?: string
    ): Promise<AdTransaction | null> {
        const query = `
      UPDATE ad_transactions 
      SET status = $1, payment_reference = COALESCE($2, payment_reference), updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;

        const result = await db.query(query, [status, paymentReference, transactionId]);
        return result.rows[0] || null;
    }

    async processPayment(
        advertiserId: string,
        campaignId: number,
        amount: number,
        paymentMethod: string,
        paymentDetails: any
    ): Promise<{ success: boolean; transaction: AdTransaction; error?: string }> {
        try {
            // Create pending transaction
            const transaction = await this.createTransaction({
                campaign_id: campaignId,
                advertiser_id: advertiserId,
                amount,
                transaction_type: 'charge',
                payment_method: paymentMethod
            });

            // Call external payment service
            const paymentResult = await this.callPaymentService({
                amount,
                currency: 'USD',
                payment_method: paymentMethod,
                customer_id: advertiserId,
                description: `Ad campaign funding - Campaign ${campaignId}`,
                metadata: {
                    campaign_id: campaignId,
                    transaction_id: transaction.id
                },
                ...paymentDetails
            });

            if (paymentResult.success) {
                // Update transaction as completed
                const updatedTransaction = await this.updateTransactionStatus(
                    transaction.id,
                    'completed',
                    paymentResult.payment_reference
                );

                // Update advertiser balance
                await this.updateAdvertiserBalance(advertiserId, amount);

                return {
                    success: true,
                    transaction: updatedTransaction!
                };
            } else {
                // Update transaction as failed
                await this.updateTransactionStatus(transaction.id, 'failed');

                return {
                    success: false,
                    transaction,
                    error: paymentResult.error
                };
            }
        } catch (error) {
            console.error('Payment processing error:', error);
            return {
                success: false,
                transaction: {} as AdTransaction,
                error: 'Payment processing failed'
            };
        }
    }

    async processRefund(
        transactionId: number,
        amount?: number,
        reason?: string
    ): Promise<{ success: boolean; refund_transaction?: AdTransaction; error?: string }> {
        try {
            // Get original transaction
            const originalTransaction = await this.getTransactionById(transactionId);
            if (!originalTransaction) {
                return { success: false, error: 'Original transaction not found' };
            }

            const refundAmount = amount || originalTransaction.amount;

            // Create refund transaction
            const refundTransaction = await this.createTransaction({
                campaign_id: originalTransaction.campaign_id,
                advertiser_id: originalTransaction.advertiser_id,
                amount: refundAmount,
                transaction_type: 'refund',
                payment_method: originalTransaction.payment_method
            });

            // Call external payment service for refund
            const refundResult = await this.callPaymentService({
                type: 'refund',
                original_payment_reference: originalTransaction.payment_reference,
                amount: refundAmount,
                reason
            });

            if (refundResult.success) {
                // Update refund transaction as completed
                const updatedRefundTransaction = await this.updateTransactionStatus(
                    refundTransaction.id,
                    'completed',
                    refundResult.payment_reference
                );

                // Update advertiser balance (subtract refund amount)
                await this.updateAdvertiserBalance(originalTransaction.advertiser_id, -refundAmount);

                return {
                    success: true,
                    refund_transaction: updatedRefundTransaction!
                };
            } else {
                // Update refund transaction as failed
                await this.updateTransactionStatus(refundTransaction.id, 'failed');

                return {
                    success: false,
                    error: refundResult.error
                };
            }
        } catch (error) {
            console.error('Refund processing error:', error);
            return {
                success: false,
                error: 'Refund processing failed'
            };
        }
    }

    async getTransactionById(id: number): Promise<AdTransaction | null> {
        const query = 'SELECT * FROM ad_transactions WHERE id = $1';
        const result = await db.query(query, [id]);
        return result.rows[0] || null;
    }

    async getTransactionsByAdvertiser(
        advertiserId: string,
        page: number = 1,
        limit: number = 20
    ): Promise<{ transactions: AdTransaction[]; total: number }> {
        const offset = (page - 1) * limit;

        const countQuery = 'SELECT COUNT(*) FROM ad_transactions WHERE advertiser_id = $1';
        const countResult = await db.query(countQuery, [advertiserId]);
        const total = parseInt(countResult.rows[0].count);

        const query = `
      SELECT at.*, c.name as campaign_name
      FROM ad_transactions at
      LEFT JOIN campaigns c ON at.campaign_id = c.id
      WHERE at.advertiser_id = $1
      ORDER BY at.created_at DESC
      LIMIT $2 OFFSET $3
    `;

        const result = await db.query(query, [advertiserId, limit, offset]);

        return {
            transactions: result.rows,
            total
        };
    }

    async getTransactionsByCampaign(campaignId: number): Promise<AdTransaction[]> {
        const query = `
      SELECT * FROM ad_transactions 
      WHERE campaign_id = $1 
      ORDER BY created_at DESC
    `;

        const result = await db.query(query, [campaignId]);
        return result.rows;
    }

    async checkSufficientBalance(advertiserId: string, requiredAmount: number): Promise<boolean> {
        const advertiser = await this.getAdvertiserById(advertiserId);
        if (!advertiser) {
            return false;
        }

        return advertiser.account_balance >= requiredAmount;
    }

    async deductFromBalance(
        advertiserId: string,
        campaignId: number,
        amount: number,
        description: string = 'Ad spend deduction'
    ): Promise<{ success: boolean; transaction?: AdTransaction; error?: string }> {
        try {
            const hasBalance = await this.checkSufficientBalance(advertiserId, amount);
            if (!hasBalance) {
                return { success: false, error: 'Insufficient balance' };
            }

            // Create deduction transaction
            const transaction = await this.createTransaction({
                campaign_id: campaignId,
                advertiser_id: advertiserId,
                amount,
                transaction_type: 'charge',
                payment_method: 'account_balance'
            });

            // Update transaction as completed
            const updatedTransaction = await this.updateTransactionStatus(
                transaction.id,
                'completed',
                `balance_deduction_${Date.now()}`
            );

            // Deduct from advertiser balance
            await this.updateAdvertiserBalance(advertiserId, -amount);

            return {
                success: true,
                transaction: updatedTransaction!
            };
        } catch (error) {
            console.error('Balance deduction error:', error);
            return {
                success: false,
                error: 'Balance deduction failed'
            };
        }
    }

    private async callPaymentService(paymentData: any): Promise<any> {
        try {
            // Mock payment service call - replace with actual HTTP request
            console.log('Calling payment service with:', paymentData);

            // Simulate payment processing
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Mock successful response
            return {
                success: true,
                payment_reference: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                status: 'completed'
            };
        } catch (error) {
            console.error('Payment service call failed:', error);
            return {
                success: false,
                error: 'Payment service unavailable'
            };
        }
    }

    async getBillingReport(
        advertiserId: string,
        startDate: Date,
        endDate: Date
    ): Promise<any> {
        const query = `
      SELECT 
        DATE_TRUNC('day', at.created_at) as date,
        at.transaction_type,
        SUM(at.amount) as total_amount,
        COUNT(*) as transaction_count,
        c.name as campaign_name
      FROM ad_transactions at
      LEFT JOIN campaigns c ON at.campaign_id = c.id
      WHERE at.advertiser_id = $1
      AND at.created_at BETWEEN $2 AND $3
      AND at.status = 'completed'
      GROUP BY DATE_TRUNC('day', at.created_at), at.transaction_type, c.name
      ORDER BY date DESC
    `;

        const result = await db.query(query, [advertiserId, startDate, endDate]);
        return result.rows;
    }
}