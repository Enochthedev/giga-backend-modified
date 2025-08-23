import Stripe from 'stripe';
import { logger } from '../utils/logger';
import { PaymentProviderError, PaymentDeclinedError, InsufficientFundsError } from '../utils/errors';
import { PaymentIntent, Transaction, PaymentMethod } from '../types/payment.types';

export class StripeService {
    private stripe: Stripe;

    constructor() {
        const secretKey = process.env.STRIPE_SECRET_KEY;
        if (!secretKey) {
            throw new Error('STRIPE_SECRET_KEY environment variable is required');
        }

        this.stripe = new Stripe(secretKey, {
            apiVersion: '2023-08-16',
        });
    }

    /**
     * Create a payment intent with Stripe
     */
    async createPaymentIntent(
        amount: number,
        currency: string,
        metadata: Record<string, any> = {}
    ): Promise<Stripe.PaymentIntent> {
        try {
            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: Math.round(amount * 100), // Convert to cents
                currency: currency.toLowerCase(),
                metadata,
                automatic_payment_methods: {
                    enabled: true,
                },
            });

            logger.info('Stripe payment intent created', {
                paymentIntentId: paymentIntent.id,
                amount,
                currency
            });

            return paymentIntent;
        } catch (error) {
            logger.error('Failed to create Stripe payment intent', { error, amount, currency });
            throw new PaymentProviderError(
                'Failed to create payment intent',
                'stripe',
                { originalError: error }
            );
        }
    }

    /**
     * Confirm a payment intent
     */
    async confirmPaymentIntent(
        paymentIntentId: string,
        paymentMethodId?: string
    ): Promise<Stripe.PaymentIntent> {
        try {
            const confirmParams: Stripe.PaymentIntentConfirmParams = {
                return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/return`,
            };

            if (paymentMethodId) {
                confirmParams.payment_method = paymentMethodId;
            }

            const paymentIntent = await this.stripe.paymentIntents.confirm(
                paymentIntentId,
                confirmParams
            );

            logger.info('Stripe payment intent confirmed', {
                paymentIntentId,
                status: paymentIntent.status
            });

            return paymentIntent;
        } catch (error) {
            logger.error('Failed to confirm Stripe payment intent', { error, paymentIntentId });

            if (error instanceof Stripe.errors.StripeCardError) {
                if (error.code === 'insufficient_funds') {
                    throw new InsufficientFundsError();
                }
                throw new PaymentDeclinedError(error.message);
            }

            throw new PaymentProviderError(
                'Failed to confirm payment intent',
                'stripe',
                { originalError: error }
            );
        }
    }

    /**
     * Retrieve a payment intent
     */
    async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
        try {
            return await this.stripe.paymentIntents.retrieve(paymentIntentId);
        } catch (error) {
            logger.error('Failed to retrieve Stripe payment intent', { error, paymentIntentId });
            throw new PaymentProviderError(
                'Failed to retrieve payment intent',
                'stripe',
                { originalError: error }
            );
        }
    }

    /**
     * Cancel a payment intent
     */
    async cancelPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
        try {
            const paymentIntent = await this.stripe.paymentIntents.cancel(paymentIntentId);

            logger.info('Stripe payment intent cancelled', { paymentIntentId });

            return paymentIntent;
        } catch (error) {
            logger.error('Failed to cancel Stripe payment intent', { error, paymentIntentId });
            throw new PaymentProviderError(
                'Failed to cancel payment intent',
                'stripe',
                { originalError: error }
            );
        }
    }

    /**
     * Create a refund
     */
    async createRefund(
        paymentIntentId: string,
        amount?: number,
        reason?: string
    ): Promise<Stripe.Refund> {
        try {
            const refundParams: Stripe.RefundCreateParams = {
                payment_intent: paymentIntentId,
            };

            if (amount) {
                refundParams.amount = Math.round(amount * 100); // Convert to cents
            }

            if (reason) {
                refundParams.reason = reason as Stripe.RefundCreateParams.Reason;
            }

            const refund = await this.stripe.refunds.create(refundParams);

            logger.info('Stripe refund created', {
                refundId: refund.id,
                paymentIntentId,
                amount: refund.amount
            });

            return refund;
        } catch (error) {
            logger.error('Failed to create Stripe refund', { error, paymentIntentId, amount });
            throw new PaymentProviderError(
                'Failed to create refund',
                'stripe',
                { originalError: error }
            );
        }
    }

    /**
     * Create a payment method
     */
    async createPaymentMethod(
        type: string,
        card?: any,
        customerId?: string
    ): Promise<Stripe.PaymentMethod> {
        try {
            const paymentMethodParams: Stripe.PaymentMethodCreateParams = {
                type: type as Stripe.PaymentMethodCreateParams.Type,
            };

            if (card) {
                paymentMethodParams.card = card;
            }

            const paymentMethod = await this.stripe.paymentMethods.create(paymentMethodParams);

            // Attach to customer if provided
            if (customerId) {
                await this.stripe.paymentMethods.attach(paymentMethod.id, {
                    customer: customerId,
                });
            }

            logger.info('Stripe payment method created', {
                paymentMethodId: paymentMethod.id,
                type,
                customerId
            });

            return paymentMethod;
        } catch (error) {
            logger.error('Failed to create Stripe payment method', { error, type });
            throw new PaymentProviderError(
                'Failed to create payment method',
                'stripe',
                { originalError: error }
            );
        }
    }

    /**
     * Retrieve a payment method
     */
    async retrievePaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
        try {
            return await this.stripe.paymentMethods.retrieve(paymentMethodId);
        } catch (error) {
            logger.error('Failed to retrieve Stripe payment method', { error, paymentMethodId });
            throw new PaymentProviderError(
                'Failed to retrieve payment method',
                'stripe',
                { originalError: error }
            );
        }
    }

    /**
     * Detach a payment method
     */
    async detachPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
        try {
            const paymentMethod = await this.stripe.paymentMethods.detach(paymentMethodId);

            logger.info('Stripe payment method detached', { paymentMethodId });

            return paymentMethod;
        } catch (error) {
            logger.error('Failed to detach Stripe payment method', { error, paymentMethodId });
            throw new PaymentProviderError(
                'Failed to detach payment method',
                'stripe',
                { originalError: error }
            );
        }
    }

    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(payload: string, signature: string): Stripe.Event {
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
            throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
        }

        try {
            return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
        } catch (error) {
            logger.error('Failed to verify Stripe webhook signature', { error });
            throw new PaymentProviderError(
                'Invalid webhook signature',
                'stripe',
                { originalError: error }
            );
        }
    }

    /**
     * Convert Stripe amount from cents to dollars
     */
    convertFromCents(amount: number): number {
        return amount / 100;
    }

    /**
     * Convert amount to cents for Stripe
     */
    convertToCents(amount: number): number {
        return Math.round(amount * 100);
    }
}