import { Logger } from '../utils/logger';
import { ConnectionManager } from './connection-manager';
import { getMessagingConfig } from '../config/messaging-config';

/**
 * Dead letter queue handler for failed messages
 */
export class DeadLetterHandler {
    private static connectionManager: ConnectionManager;
    private static isInitialized: boolean = false;

    /**
     * Initialize dead letter handler
     */
    public static async initialize(): Promise<void> {
        try {
            this.connectionManager = ConnectionManager.getInstance();
            await this.connectionManager.connect();

            const channel = this.connectionManager.getChannel();
            const config = getMessagingConfig();

            // Create dead letter exchange
            const dlxExchange = `${config.exchange}.dlx`;
            await channel.assertExchange(dlxExchange, 'topic', { durable: true });

            // Create dead letter queue
            const dlqQueue = `${config.exchange}.dlq`;
            await channel.assertQueue(dlqQueue, {
                durable: true,
                arguments: {
                    'x-message-ttl': 24 * 60 * 60 * 1000, // 24 hours TTL
                }
            });

            // Bind dead letter queue to dead letter exchange
            await channel.bindQueue(dlqQueue, dlxExchange, '#');

            this.isInitialized = true;

            Logger.info('Dead letter handler initialized successfully', {
                dlxExchange,
                dlqQueue
            });
        } catch (error) {
            Logger.error('Failed to initialize dead letter handler', error as Error);
            throw error;
        }
    }

    /**
     * Setup dead letter queue for a specific queue
     */
    public static async setupDeadLetterQueue(queueName: string): Promise<string> {
        if (!this.isInitialized) {
            throw new Error('Dead letter handler not initialized. Call initialize() first.');
        }

        try {
            const channel = this.connectionManager.getChannel();
            const config = getMessagingConfig();
            const dlxExchange = `${config.exchange}.dlx`;

            // Assert the main queue with dead letter exchange configuration
            await channel.assertQueue(queueName, {
                durable: true,
                arguments: {
                    'x-dead-letter-exchange': dlxExchange,
                    'x-dead-letter-routing-key': `dlq.${queueName}`
                }
            });

            Logger.info('Dead letter queue configured for queue', {
                queueName,
                dlxExchange
            });

            return dlxExchange;
        } catch (error) {
            Logger.error('Failed to setup dead letter queue', error as Error, {
                queueName
            });
            throw error;
        }
    }

    /**
     * Process messages from dead letter queue
     */
    public static async processDeadLetterQueue(
        processor: (message: any, originalQueue: string) => Promise<boolean>
    ): Promise<void> {
        if (!this.isInitialized) {
            throw new Error('Dead letter handler not initialized. Call initialize() first.');
        }

        try {
            const channel = this.connectionManager.getChannel();
            const config = getMessagingConfig();
            const dlqQueue = `${config.exchange}.dlq`;

            await channel.consume(dlqQueue, async (message: any) => {
                if (!message) return;

                try {
                    const content = JSON.parse(message.content.toString());
                    const originalQueue = message.fields.routingKey.replace('dlq.', '');

                    Logger.info('Processing dead letter message', {
                        messageId: message.properties.messageId,
                        originalQueue,
                        routingKey: message.fields.routingKey
                    });

                    const shouldRequeue = await processor(content, originalQueue);

                    if (shouldRequeue) {
                        // Requeue to original exchange
                        const originalRoutingKey = message.properties.headers?.['x-original-routing-key'] || '#';

                        channel.publish(
                            config.exchange,
                            originalRoutingKey,
                            message.content,
                            {
                                ...message.properties,
                                headers: {
                                    ...message.properties.headers,
                                    'x-requeue-count': (message.properties.headers?.['x-requeue-count'] || 0) + 1
                                }
                            }
                        );

                        Logger.info('Message requeued to original exchange', {
                            messageId: message.properties.messageId,
                            originalQueue
                        });
                    }

                    channel.ack(message);
                } catch (error) {
                    Logger.error('Failed to process dead letter message', error as Error, {
                        messageId: message.properties.messageId
                    });
                    channel.nack(message, false, false);
                }
            });

            Logger.info('Started processing dead letter queue');
        } catch (error) {
            Logger.error('Failed to start dead letter queue processing', error as Error);
            throw error;
        }
    }

    /**
     * Get dead letter queue statistics
     */
    public static async getDeadLetterStats(): Promise<{
        messageCount: number;
        consumerCount: number;
    }> {
        if (!this.isInitialized) {
            throw new Error('Dead letter handler not initialized. Call initialize() first.');
        }

        try {
            const channel = this.connectionManager.getChannel();
            const config = getMessagingConfig();
            const dlqQueue = `${config.exchange}.dlq`;

            const queueInfo = await channel.checkQueue(dlqQueue);

            return {
                messageCount: queueInfo.messageCount,
                consumerCount: queueInfo.consumerCount
            };
        } catch (error) {
            Logger.error('Failed to get dead letter queue stats', error as Error);
            throw error;
        }
    }

    /**
     * Purge dead letter queue
     */
    public static async purgeDeadLetterQueue(): Promise<number> {
        if (!this.isInitialized) {
            throw new Error('Dead letter handler not initialized. Call initialize() first.');
        }

        try {
            const channel = this.connectionManager.getChannel();
            const config = getMessagingConfig();
            const dlqQueue = `${config.exchange}.dlq`;

            const result = await channel.purgeQueue(dlqQueue);

            Logger.info('Dead letter queue purged', {
                messageCount: result.messageCount
            });

            return result.messageCount;
        } catch (error) {
            Logger.error('Failed to purge dead letter queue', error as Error);
            throw error;
        }
    }

    /**
     * Close connection and cleanup resources
     */
    public static async close(): Promise<void> {
        try {
            if (this.connectionManager) {
                await this.connectionManager.close();
            }
            this.isInitialized = false;
            Logger.info('Dead letter handler closed successfully');
        } catch (error) {
            Logger.error('Error closing dead letter handler', error as Error);
        }
    }
}