/**
 * Example usage of the messaging system
 * This file demonstrates how to use the RabbitMQ messaging components
 */

import {
    MessagePublisher,
    MessageConsumer,
    DeadLetterHandler,
    EventHandler,
    EventSerializer
} from '../messaging';
import { DomainEvent } from '../types';
import { Logger } from '../utils/logger';
import { randomUUID } from 'crypto';

/**
 * Example: Setting up a message publisher
 */
export async function setupPublisher(): Promise<void> {
    try {
        // Initialize the publisher
        await MessagePublisher.initialize();

        Logger.info('Publisher initialized successfully');
    } catch (error) {
        Logger.error('Failed to initialize publisher', error as Error);
        throw error;
    }
}

/**
 * Example: Publishing a domain event with validation
 */
export async function publishUserCreatedEvent(userId: string, email: string, firstName: string, lastName: string): Promise<void> {
    try {
        // Create event using EventSerializer for automatic validation
        const event = EventSerializer.createEvent(
            'UserCreated',
            'User',
            userId,
            {
                email,
                firstName,
                lastName
            },
            {
                correlationId: randomUUID(),
                source: 'user-service'
            }
        );

        await MessagePublisher.publishEvent(event);
        Logger.info('User created event published', { userId, email, eventId: event.id });
    } catch (error) {
        Logger.error('Failed to publish user created event', error as Error);
        throw error;
    }
}

/**
 * Example: Publishing a payment processed event
 */
export async function publishPaymentProcessedEvent(
    paymentId: string,
    amount: number,
    currency: string,
    customerId: string,
    transactionId: string
): Promise<void> {
    try {
        const event = EventSerializer.createEvent(
            'PaymentProcessed',
            'Payment',
            paymentId,
            {
                amount,
                currency,
                paymentMethodId: 'pm_123',
                status: 'succeeded' as const,
                transactionId,
                customerId
            },
            {
                correlationId: randomUUID(),
                source: 'payment-service'
            }
        );

        await MessagePublisher.publishEvent(event);
        Logger.info('Payment processed event published', { paymentId, amount, currency });
    } catch (error) {
        Logger.error('Failed to publish payment processed event', error as Error);
        throw error;
    }
}

/**
 * Example: Setting up a message consumer
 */
export async function setupConsumer(): Promise<void> {
    try {
        // Initialize the consumer
        await MessageConsumer.initialize();

        // Initialize dead letter handler
        await DeadLetterHandler.initialize();

        Logger.info('Consumer and dead letter handler initialized successfully');
    } catch (error) {
        Logger.error('Failed to initialize consumer', error as Error);
        throw error;
    }
}

/**
 * Example: User event handler
 */
const userEventHandler: EventHandler = async (event: DomainEvent): Promise<void> => {
    Logger.info('Processing user event', {
        eventId: event.id,
        eventType: event.type,
        aggregateId: event.aggregateId
    });

    switch (event.type) {
        case 'UserCreated':
            await handleUserCreated(event);
            break;
        case 'UserUpdated':
            await handleUserUpdated(event);
            break;
        case 'UserDeleted':
            await handleUserDeleted(event);
            break;
        default:
            Logger.warn('Unknown user event type', { eventType: event.type });
    }
};

/**
 * Example: Subscribe to user events
 */
export async function subscribeToUserEvents(): Promise<void> {
    try {
        // Subscribe to all user events
        await MessageConsumer.subscribe(
            'user-service-queue',
            'User.*',
            userEventHandler,
            {
                durable: true,
                deadLetterExchange: 'giga.events.dlx'
            }
        );

        Logger.info('Subscribed to user events');
    } catch (error) {
        Logger.error('Failed to subscribe to user events', error as Error);
        throw error;
    }
}

/**
 * Example: Subscribe to payment events
 */
export async function subscribeToPaymentEvents(): Promise<void> {
    const paymentEventHandler: EventHandler = async (event: DomainEvent): Promise<void> => {
        Logger.info('Processing payment event', {
            eventId: event.id,
            eventType: event.type,
            aggregateId: event.aggregateId
        });

        // Handle payment events
        switch (event.type) {
            case 'PaymentProcessed':
                await handlePaymentProcessed(event);
                break;
            case 'PaymentFailed':
                await handlePaymentFailed(event);
                break;
            default:
                Logger.warn('Unknown payment event type', { eventType: event.type });
        }
    };

    try {
        await MessageConsumer.subscribe(
            'payment-notification-queue',
            'Payment.*',
            paymentEventHandler
        );

        Logger.info('Subscribed to payment events');
    } catch (error) {
        Logger.error('Failed to subscribe to payment events', error as Error);
        throw error;
    }
}

/**
 * Example: Complete messaging setup
 */
export async function setupMessaging(): Promise<void> {
    try {
        // Setup publisher
        await setupPublisher();

        // Setup consumer
        await setupConsumer();

        // Subscribe to events
        await subscribeToUserEvents();
        await subscribeToPaymentEvents();

        Logger.info('Messaging system setup completed');
    } catch (error) {
        Logger.error('Failed to setup messaging system', error as Error);
        throw error;
    }
}

/**
 * Example: Graceful shutdown
 */
export async function shutdownMessaging(): Promise<void> {
    try {
        await MessageConsumer.close();
        await MessagePublisher.close();

        Logger.info('Messaging system shutdown completed');
    } catch (error) {
        Logger.error('Error during messaging shutdown', error as Error);
    }
}

// Event handlers
async function handleUserCreated(event: DomainEvent): Promise<void> {
    // Example: Send welcome email, create user profile, etc.
    Logger.info('Handling user created event', { userId: event.aggregateId });
}

async function handleUserUpdated(event: DomainEvent): Promise<void> {
    // Example: Update user cache, sync with external systems, etc.
    Logger.info('Handling user updated event', { userId: event.aggregateId });
}

async function handleUserDeleted(event: DomainEvent): Promise<void> {
    // Example: Clean up user data, cancel subscriptions, etc.
    Logger.info('Handling user deleted event', { userId: event.aggregateId });
}

async function handlePaymentProcessed(event: DomainEvent): Promise<void> {
    // Example: Send payment confirmation, update order status, etc.
    Logger.info('Handling payment processed event', { paymentId: event.aggregateId });
}

async function handlePaymentFailed(event: DomainEvent): Promise<void> {
    // Example: Send payment failure notification, retry payment, etc.
    Logger.info('Handling payment failed event', { paymentId: event.aggregateId });
}