import { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';
import { WebhookService } from '../services/webhook.service';
import { logger } from '../utils/logger';
import { sendSuccess, sendError, sendValidationError } from '../utils/response';
import {
    validateCreatePaymentIntent,
    validateProcessPayment,
    validateCreateRefund,
    validateCreatePaymentMethod,
    validateTransactionFilters,
    validateUUID
} from '../validation/payment.validation';
import { ZodError } from 'zod';

export class PaymentController {
    private paymentService: PaymentService;
    private webhookService: WebhookService;

    constructor() {
        this.paymentService = new PaymentService();
        this.webhookService = new WebhookService();
    }

    /**
     * Create payment intent
     */
    createPaymentIntent = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                sendError(res, 'User not authenticated', 'UNAUTHORIZED', 401);
                return;
            }

            const validatedData = validateCreatePaymentIntent(req.body);
            const paymentIntent = await this.paymentService.createPaymentIntent(userId, validatedData);

            sendSuccess(res, paymentIntent, 201);
        } catch (error) {
            this.handleError(res, error, 'Failed to create payment intent');
        }
    };

    /**
     * Process payment
     */
    processPayment = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                sendError(res, 'User not authenticated', 'UNAUTHORIZED', 401);
                return;
            }

            const validatedData = validateProcessPayment(req.body);
            const transaction = await this.paymentService.processPayment(userId, validatedData);

            sendSuccess(res, transaction);
        } catch (error) {
            this.handleError(res, error, 'Failed to process payment');
        }
    };

    /**
     * Create refund
     */
    createRefund = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                sendError(res, 'User not authenticated', 'UNAUTHORIZED', 401);
                return;
            }

            const validatedData = validateCreateRefund(req.body);
            const refund = await this.paymentService.createRefund(userId, validatedData);

            sendSuccess(res, refund, 201);
        } catch (error) {
            this.handleError(res, error, 'Failed to create refund');
        }
    };

    /**
     * Add payment method
     */
    addPaymentMethod = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                sendError(res, 'User not authenticated', 'UNAUTHORIZED', 401);
                return;
            }

            const validatedData = validateCreatePaymentMethod(req.body);
            const paymentMethod = await this.paymentService.addPaymentMethod(userId, validatedData);

            sendSuccess(res, paymentMethod, 201);
        } catch (error) {
            this.handleError(res, error, 'Failed to add payment method');
        }
    };

    /**
     * Get user payment methods
     */
    getUserPaymentMethods = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                sendError(res, 'User not authenticated', 'UNAUTHORIZED', 401);
                return;
            }

            const paymentMethods = await this.paymentService.getUserPaymentMethods(userId);
            sendSuccess(res, paymentMethods);
        } catch (error) {
            this.handleError(res, error, 'Failed to get payment methods');
        }
    };

    /**
     * Get user transactions
     */
    getUserTransactions = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                sendError(res, 'User not authenticated', 'UNAUTHORIZED', 401);
                return;
            }

            const filters = validateTransactionFilters(req.query);
            const result = await this.paymentService.getUserTransactions(userId, filters);

            sendSuccess(res, {
                transactions: result.transactions,
                pagination: {
                    total: result.total,
                    page: filters.page,
                    limit: filters.limit,
                    totalPages: Math.ceil(result.total / filters.limit)
                }
            });
        } catch (error) {
            this.handleError(res, error, 'Failed to get transactions');
        }
    };

    /**
     * Get transaction by ID
     */
    getTransactionById = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                sendError(res, 'User not authenticated', 'UNAUTHORIZED', 401);
                return;
            }

            const transactionId = validateUUID(req.params.id);

            // Get user transactions with filter for specific transaction
            const result = await this.paymentService.getUserTransactions(userId, {
                page: 1,
                limit: 1
            });

            const transaction = result.transactions.find(t => t.id === transactionId);
            if (!transaction) {
                sendError(res, 'Transaction not found', 'TRANSACTION_NOT_FOUND', 404);
                return;
            }

            sendSuccess(res, transaction);
        } catch (error) {
            this.handleError(res, error, 'Failed to get transaction');
        }
    };

    /**
     * Handle Stripe webhook
     */
    handleStripeWebhook = async (req: Request, res: Response): Promise<void> => {
        try {
            const signature = req.headers['stripe-signature'] as string;
            if (!signature) {
                sendError(res, 'Missing stripe signature', 'MISSING_SIGNATURE', 400);
                return;
            }

            const payload = req.body;
            await this.webhookService.processStripeWebhook(payload, signature);

            res.status(200).send('OK');
        } catch (error) {
            logger.error('Stripe webhook error', { error });
            sendError(res, 'Webhook processing failed', 'WEBHOOK_ERROR', 400);
        }
    };

    /**
     * Health check endpoint
     */
    healthCheck = async (req: Request, res: Response): Promise<void> => {
        try {
            // Basic health check - could be expanded to check database connectivity, etc.
            sendSuccess(res, {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                service: 'payment-service',
                version: process.env.SERVICE_VERSION || '1.0.0'
            });
        } catch (error) {
            sendError(res, 'Service unhealthy', 'HEALTH_CHECK_FAILED', 503);
        }
    };

    /**
     * Get payment statistics (admin endpoint)
     */
    getPaymentStatistics = async (req: Request, res: Response): Promise<void> => {
        try {
            // This would typically require admin role validation
            const userId = req.user?.id;
            if (!userId) {
                sendError(res, 'User not authenticated', 'UNAUTHORIZED', 401);
                return;
            }

            // For now, return basic stats for the user
            const result = await this.paymentService.getUserTransactions(userId, {
                page: 1,
                limit: 1000 // Get all transactions for stats
            });

            const stats = {
                totalTransactions: result.total,
                successfulPayments: result.transactions.filter(t => t.status === 'succeeded' && t.type === 'payment').length,
                failedPayments: result.transactions.filter(t => t.status === 'failed' && t.type === 'payment').length,
                totalRefunds: result.transactions.filter(t => t.type === 'refund').length,
                totalAmount: result.transactions
                    .filter(t => t.status === 'succeeded' && t.type === 'payment')
                    .reduce((sum, t) => sum + t.amount, 0),
                totalRefundAmount: result.transactions
                    .filter(t => t.status === 'succeeded' && t.type === 'refund')
                    .reduce((sum, t) => sum + t.amount, 0)
            };

            sendSuccess(res, stats);
        } catch (error) {
            this.handleError(res, error, 'Failed to get payment statistics');
        }
    };

    /**
     * Handle errors consistently
     */
    private handleError(res: Response, error: any, defaultMessage: string): void {
        logger.error(defaultMessage, { error });

        if (error instanceof ZodError) {
            sendValidationError(res, error.errors);
            return;
        }

        if (error.statusCode && error.code) {
            sendError(res, error.message, error.code, error.statusCode, error.details);
            return;
        }

        sendError(res, defaultMessage, 'INTERNAL_ERROR', 500);
    }
}

// Extend Express Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email?: string;
                roles?: string[];
            };
        }
    }
}