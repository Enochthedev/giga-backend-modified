import { db } from '../database/connection';
import { StripeService } from './stripe.service';
import { logger } from '../utils/logger';
import { WebhookError } from '../utils/errors';
import { WebhookEvent } from '../types/payment.types';
import { v4 as uuidv4 } from 'uuid';

export class WebhookService {
    private stripeService: StripeService;

    constructor() {
        this.stripeService = new StripeService();
    }

    /**
     * Process Stripe webhook
     */
    async processStripeWebhook(payload: string, signature: string): Promise<void> {
        try {
            // Verify webhook signature
            const event = this.stripeService.verifyWebhookSignature(payload, signature);

            // Check if event has already been processed (idempotency)
            const existingEvent = await this.getWebhookEvent('stripe', event.id);
            if (existingEvent && existingEvent.processed) {
                logger.info('Webhook event already processed', { eventId: event.id });
                return;
            }

            // Save webhook event
            await this.saveWebhookEvent({
                id: uuidv4(),
                provider: 'stripe',
                providerEventId: event.id,
                eventType: event.type,
                processed: false,
                payload: event,
                createdAt: new Date()
            });

            // Process the event based on type
            await this.handleStripeEvent(event);

            // Mark event as processed
            await this.markWebhookEventProcessed('stripe', event.id);

            logger.info('Stripe webhook processed successfully', {
                eventId: event.id,
                eventType: event.type
            });
        } catch (error) {
            logger.error('Failed to process Stripe webhook', { error, signature });
            throw new WebhookError('Failed to process webhook', { originalError: error });
        }
    }

    /**
     * Handle different Stripe event types
     */
    private async handleStripeEvent(event: any): Promise<void> {
        switch (event.type) {
            case 'payment_intent.succeeded':
                await this.handlePaymentIntentSucceeded(event.data.object);
                break;

            case 'payment_intent.payment_failed':
                await this.handlePaymentIntentFailed(event.data.object);
                break;

            case 'payment_intent.canceled':
                await this.handlePaymentIntentCanceled(event.data.object);
                break;

            case 'charge.dispute.created':
                await this.handleChargeDisputeCreated(event.data.object);
                break;

            case 'invoice.payment_succeeded':
                await this.handleInvoicePaymentSucceeded(event.data.object);
                break;

            case 'invoice.payment_failed':
                await this.handleInvoicePaymentFailed(event.data.object);
                break;

            case 'customer.subscription.created':
                await this.handleSubscriptionCreated(event.data.object);
                break;

            case 'customer.subscription.updated':
                await this.handleSubscriptionUpdated(event.data.object);
                break;

            case 'customer.subscription.deleted':
                await this.handleSubscriptionDeleted(event.data.object);
                break;

            default:
                logger.info('Unhandled Stripe event type', { eventType: event.type });
                break;
        }
    }

    /**
     * Handle payment intent succeeded
     */
    private async handlePaymentIntentSucceeded(paymentIntent: any): Promise<void> {
        try {
            // Update payment intent status
            await this.updatePaymentIntentByProviderIntentId(
                paymentIntent.id,
                'succeeded'
            );

            // Update transaction status
            await this.updateTransactionByProviderTransactionId(
                paymentIntent.id,
                'succeeded',
                new Date()
            );

            // Publish payment succeeded event
            await this.publishPaymentEvent('payment.succeeded', {
                paymentIntentId: paymentIntent.id,
                amount: this.stripeService.convertFromCents(paymentIntent.amount),
                currency: paymentIntent.currency,
                metadata: paymentIntent.metadata
            });

            logger.info('Payment intent succeeded processed', {
                paymentIntentId: paymentIntent.id,
                amount: paymentIntent.amount
            });
        } catch (error) {
            logger.error('Failed to handle payment intent succeeded', {
                error,
                paymentIntentId: paymentIntent.id
            });
            throw error;
        }
    }

    /**
     * Handle payment intent failed
     */
    private async handlePaymentIntentFailed(paymentIntent: any): Promise<void> {
        try {
            const failureReason = paymentIntent.last_payment_error?.message || 'Payment failed';

            // Update payment intent status
            await this.updatePaymentIntentByProviderIntentId(
                paymentIntent.id,
                'requires_payment_method'
            );

            // Update transaction status
            await this.updateTransactionByProviderTransactionId(
                paymentIntent.id,
                'failed',
                new Date(),
                failureReason
            );

            // Publish payment failed event
            await this.publishPaymentEvent('payment.failed', {
                paymentIntentId: paymentIntent.id,
                amount: this.stripeService.convertFromCents(paymentIntent.amount),
                currency: paymentIntent.currency,
                failureReason,
                metadata: paymentIntent.metadata
            });

            logger.info('Payment intent failed processed', {
                paymentIntentId: paymentIntent.id,
                failureReason
            });
        } catch (error) {
            logger.error('Failed to handle payment intent failed', {
                error,
                paymentIntentId: paymentIntent.id
            });
            throw error;
        }
    }

    /**
     * Handle payment intent canceled
     */
    private async handlePaymentIntentCanceled(paymentIntent: any): Promise<void> {
        try {
            // Update payment intent status
            await this.updatePaymentIntentByProviderIntentId(
                paymentIntent.id,
                'cancelled'
            );

            // Update transaction status
            await this.updateTransactionByProviderTransactionId(
                paymentIntent.id,
                'cancelled',
                new Date()
            );

            // Publish payment canceled event
            await this.publishPaymentEvent('payment.cancelled', {
                paymentIntentId: paymentIntent.id,
                amount: this.stripeService.convertFromCents(paymentIntent.amount),
                currency: paymentIntent.currency,
                metadata: paymentIntent.metadata
            });

            logger.info('Payment intent canceled processed', {
                paymentIntentId: paymentIntent.id
            });
        } catch (error) {
            logger.error('Failed to handle payment intent canceled', {
                error,
                paymentIntentId: paymentIntent.id
            });
            throw error;
        }
    }

    /**
     * Handle charge dispute created
     */
    private async handleChargeDisputeCreated(dispute: any): Promise<void> {
        try {
            // Publish dispute created event
            await this.publishPaymentEvent('payment.dispute.created', {
                disputeId: dispute.id,
                chargeId: dispute.charge,
                amount: this.stripeService.convertFromCents(dispute.amount),
                currency: dispute.currency,
                reason: dispute.reason,
                status: dispute.status
            });

            logger.info('Charge dispute created processed', {
                disputeId: dispute.id,
                chargeId: dispute.charge,
                reason: dispute.reason
            });
        } catch (error) {
            logger.error('Failed to handle charge dispute created', {
                error,
                disputeId: dispute.id
            });
            throw error;
        }
    }

    /**
     * Handle invoice payment succeeded
     */
    private async handleInvoicePaymentSucceeded(invoice: any): Promise<void> {
        try {
            // Publish invoice payment succeeded event
            await this.publishPaymentEvent('invoice.payment.succeeded', {
                invoiceId: invoice.id,
                subscriptionId: invoice.subscription,
                customerId: invoice.customer,
                amount: this.stripeService.convertFromCents(invoice.amount_paid),
                currency: invoice.currency
            });

            logger.info('Invoice payment succeeded processed', {
                invoiceId: invoice.id,
                subscriptionId: invoice.subscription
            });
        } catch (error) {
            logger.error('Failed to handle invoice payment succeeded', {
                error,
                invoiceId: invoice.id
            });
            throw error;
        }
    }

    /**
     * Handle invoice payment failed
     */
    private async handleInvoicePaymentFailed(invoice: any): Promise<void> {
        try {
            // Publish invoice payment failed event
            await this.publishPaymentEvent('invoice.payment.failed', {
                invoiceId: invoice.id,
                subscriptionId: invoice.subscription,
                customerId: invoice.customer,
                amount: this.stripeService.convertFromCents(invoice.amount_due),
                currency: invoice.currency,
                attemptCount: invoice.attempt_count
            });

            logger.info('Invoice payment failed processed', {
                invoiceId: invoice.id,
                subscriptionId: invoice.subscription,
                attemptCount: invoice.attempt_count
            });
        } catch (error) {
            logger.error('Failed to handle invoice payment failed', {
                error,
                invoiceId: invoice.id
            });
            throw error;
        }
    }

    /**
     * Handle subscription created
     */
    private async handleSubscriptionCreated(subscription: any): Promise<void> {
        try {
            // Publish subscription created event
            await this.publishPaymentEvent('subscription.created', {
                subscriptionId: subscription.id,
                customerId: subscription.customer,
                status: subscription.status,
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000)
            });

            logger.info('Subscription created processed', {
                subscriptionId: subscription.id,
                customerId: subscription.customer,
                status: subscription.status
            });
        } catch (error) {
            logger.error('Failed to handle subscription created', {
                error,
                subscriptionId: subscription.id
            });
            throw error;
        }
    }

    /**
     * Handle subscription updated
     */
    private async handleSubscriptionUpdated(subscription: any): Promise<void> {
        try {
            // Publish subscription updated event
            await this.publishPaymentEvent('subscription.updated', {
                subscriptionId: subscription.id,
                customerId: subscription.customer,
                status: subscription.status,
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000)
            });

            logger.info('Subscription updated processed', {
                subscriptionId: subscription.id,
                customerId: subscription.customer,
                status: subscription.status
            });
        } catch (error) {
            logger.error('Failed to handle subscription updated', {
                error,
                subscriptionId: subscription.id
            });
            throw error;
        }
    }

    /**
     * Handle subscription deleted
     */
    private async handleSubscriptionDeleted(subscription: any): Promise<void> {
        try {
            // Publish subscription deleted event
            await this.publishPaymentEvent('subscription.deleted', {
                subscriptionId: subscription.id,
                customerId: subscription.customer,
                canceledAt: new Date(subscription.canceled_at * 1000),
                cancelAtPeriodEnd: subscription.cancel_at_period_end
            });

            logger.info('Subscription deleted processed', {
                subscriptionId: subscription.id,
                customerId: subscription.customer
            });
        } catch (error) {
            logger.error('Failed to handle subscription deleted', {
                error,
                subscriptionId: subscription.id
            });
            throw error;
        }
    }

    // Private helper methods

    private async getWebhookEvent(provider: string, providerEventId: string): Promise<WebhookEvent | null> {
        const result = await db.query(
            'SELECT * FROM webhook_events WHERE provider = $1 AND provider_event_id = $2',
            [provider, providerEventId]
        );

        return result.rows.length > 0 ? this.mapRowToWebhookEvent(result.rows[0]) : null;
    }

    private async saveWebhookEvent(webhookEvent: WebhookEvent): Promise<void> {
        await db.query(
            `INSERT INTO webhook_events (
        id, provider, provider_event_id, event_type, processed, payload, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                webhookEvent.id,
                webhookEvent.provider,
                webhookEvent.providerEventId,
                webhookEvent.eventType,
                webhookEvent.processed,
                JSON.stringify(webhookEvent.payload),
                webhookEvent.createdAt
            ]
        );
    }

    private async markWebhookEventProcessed(provider: string, providerEventId: string): Promise<void> {
        await db.query(
            'UPDATE webhook_events SET processed = TRUE, processed_at = CURRENT_TIMESTAMP WHERE provider = $1 AND provider_event_id = $2',
            [provider, providerEventId]
        );
    }

    private async updatePaymentIntentByProviderIntentId(providerIntentId: string, status: string): Promise<void> {
        await db.query(
            'UPDATE payment_intents SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE provider_intent_id = $2',
            [status, providerIntentId]
        );
    }

    private async updateTransactionByProviderTransactionId(
        providerTransactionId: string,
        status: string,
        processedAt?: Date,
        failureReason?: string
    ): Promise<void> {
        await db.query(
            `UPDATE transactions 
       SET status = $1, processed_at = $2, failure_reason = $3, updated_at = CURRENT_TIMESTAMP 
       WHERE provider_transaction_id = $4`,
            [status, processedAt, failureReason, providerTransactionId]
        );
    }

    private async publishPaymentEvent(eventType: string, data: any): Promise<void> {
        try {
            // TODO: Implement message queue publishing
            // This would typically publish to RabbitMQ or similar message queue
            logger.info('Payment event published', { eventType, data });
        } catch (error) {
            logger.error('Failed to publish payment event', { error, eventType, data });
            // Don't throw error here as webhook processing should continue
        }
    }

    private mapRowToWebhookEvent(row: any): WebhookEvent {
        return {
            id: row.id,
            provider: row.provider,
            providerEventId: row.provider_event_id,
            eventType: row.event_type,
            processed: row.processed,
            payload: row.payload,
            createdAt: row.created_at,
            processedAt: row.processed_at
        };
    }
}