import { DomainEvent } from '../types';
import { Logger } from '../utils/logger';
import { ConnectionManager } from './connection-manager';
import { getMessagingConfig } from '../config/messaging-config';
import { EventValidationMiddleware } from './event-serializer';

export type EventHandler = (event: DomainEvent) => Promise<void>;

interface Subscription {
    queueName: string;
    routingPattern: string;
    handler: EventHandler;
    consumerTag?: string;
}

/**
 * Message consumer for event-driven communication
 */
export class MessageConsumer {
    private static connectionManager: ConnectionManager;
    private static isInitialized: boolean = false;
    private static subscriptions: Map<string, Subscription> = new Map();

    /**
     * Initialize message consumer
     */
    public static async initialize(): Promise<void> {
        try {
            this.connectionManager = ConnectionManager.getInstance();
            await this.connectionManager.connect();
            this.isInitialized = true;

            Logger.info('Message consumer initialized successfully');
        } catch (error) {
            Logger.error('Failed to initialize message consumer', error as Error);
            throw error;
        }
    }

    /**
     * Subscribe to events with a pattern
     */
    public static async subscribe(
        queueName: string,
        routingPattern: string,
        handler: EventHandler,
        options: {
            durable?: boolean;
            exclusive?: boolean;
            autoDelete?: boolean;
            deadLetterExchange?: string;
        } = {}
    ): Promise<void> {
        if (!this.isInitialized) {
            throw new Error('Message consumer not initialized. Call initialize() first.');
        }

        try {
            const channel = this.connectionManager.getChannel();
            const config = getMessagingConfig();

            // Assert queue with options
            const queueOptions = {
                durable: options.durable ?? true,
                exclusive: options.exclusive ?? false,
                autoDelete: options.autoDelete ?? false,
                arguments: options.deadLetterExchange ? {
                    'x-dead-letter-exchange': options.deadLetterExchange
                } : {}
            };

            await channel.assertQueue(queueName, queueOptions);

            // Bind queue to exchange with routing pattern
            await channel.bindQueue(queueName, config.exchange, routingPattern);

            // Start consuming messages
            const consumerResult = await channel.consume(
                queueName,
                async (message: any) => {
                    if (message) {
                        await this.handleMessage(message, handler, channel);
                    }
                },
                { noAck: false }
            );

            // Store subscription
            const subscriptionKey = `${queueName}:${routingPattern}`;
            this.subscriptions.set(subscriptionKey, {
                queueName,
                routingPattern,
                handler,
                consumerTag: consumerResult.consumerTag
            });

            Logger.info('Successfully subscribed to events', {
                queue: queueName,
                pattern: routingPattern,
                exchange: config.exchange,
                consumerTag: consumerResult.consumerTag
            });
        } catch (error) {
            Logger.error('Failed to subscribe to events', error as Error, {
                queue: queueName,
                pattern: routingPattern
            });
            throw error;
        }
    }

    /**
     * Unsubscribe from a queue
     */
    public static async unsubscribe(queueName: string, routingPattern: string): Promise<void> {
        const subscriptionKey = `${queueName}:${routingPattern}`;
        const subscription = this.subscriptions.get(subscriptionKey);

        if (!subscription) {
            Logger.warn('Subscription not found', { queue: queueName, pattern: routingPattern });
            return;
        }

        try {
            const channel = this.connectionManager.getChannel();

            if (subscription.consumerTag) {
                await channel.cancel(subscription.consumerTag);
            }

            this.subscriptions.delete(subscriptionKey);

            Logger.info('Successfully unsubscribed from events', {
                queue: queueName,
                pattern: routingPattern
            });
        } catch (error) {
            Logger.error('Failed to unsubscribe from events', error as Error, {
                queue: queueName,
                pattern: routingPattern
            });
            throw error;
        }
    }

    /**
     * Handle incoming message
     */
    private static async handleMessage(
        message: any,
        handler: EventHandler,
        channel: any
    ): Promise<void> {
        let event: DomainEvent | null = null;

        try {
            const content = message.content.toString();

            // Validate and deserialize the incoming message
            event = EventValidationMiddleware.validateIncomingMessage(content);

            Logger.debug('Processing message', {
                eventId: event.id,
                eventType: event.type,
                routingKey: message.fields.routingKey,
                correlationId: event.metadata.correlationId
            });

            // Execute handler
            await handler(event);

            // Acknowledge message
            channel.ack(message);

            Logger.debug('Message processed successfully', {
                eventId: event.id,
                eventType: event.type,
                correlationId: event.metadata.correlationId
            });
        } catch (error) {
            Logger.error('Failed to process message', error as Error, {
                routingKey: message.fields.routingKey,
                messageId: message.properties.messageId,
                eventId: event?.id,
                eventType: event?.type,
                correlationId: event?.metadata?.correlationId
            });

            // Reject message and send to dead letter queue if configured
            channel.nack(message, false, false);
        }
    }

    /**
     * Get active subscriptions
     */
    public static getSubscriptions(): Array<{ queueName: string; routingPattern: string }> {
        return Array.from(this.subscriptions.values()).map(sub => ({
            queueName: sub.queueName,
            routingPattern: sub.routingPattern
        }));
    }

    /**
     * Check if consumer is ready
     */
    public static isReady(): boolean {
        return this.isInitialized && this.connectionManager?.isConnected();
    }

    /**
     * Close connection and cancel all subscriptions
     */
    public static async close(): Promise<void> {
        try {
            // Cancel all subscriptions
            if (this.connectionManager && this.connectionManager.isConnected()) {
                const channel = this.connectionManager.getChannel();
                if (channel) {
                    for (const subscription of this.subscriptions.values()) {
                        if (subscription.consumerTag) {
                            await channel.cancel(subscription.consumerTag);
                        }
                    }
                }
            }

            this.subscriptions.clear();

            if (this.connectionManager) {
                await this.connectionManager.close();
            }

            this.isInitialized = false;
            Logger.info('Message consumer closed successfully');
        } catch (error) {
            Logger.error('Error closing message consumer', error as Error);
        }
    }
}