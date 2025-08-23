import { DomainEvent } from '../types';
import { Logger } from '../utils/logger';
import { ConnectionManager } from './connection-manager';
import { getMessagingConfig } from '../config/messaging-config';
import { EventValidationMiddleware } from './event-serializer';

/**
 * Message publisher for event-driven communication
 */
export class MessagePublisher {
    private static connectionManager: ConnectionManager;
    private static isInitialized: boolean = false;

    /**
     * Initialize message publisher
     */
    public static async initialize(): Promise<void> {
        try {
            this.connectionManager = ConnectionManager.getInstance();
            await this.connectionManager.connect();
            this.isInitialized = true;

            Logger.info('Message publisher initialized successfully');
        } catch (error) {
            Logger.error('Failed to initialize message publisher', error as Error);
            throw error;
        }
    }

    /**
     * Publish a domain event
     */
    public static async publishEvent(event: DomainEvent): Promise<void> {
        if (!this.isInitialized) {
            throw new Error('Message publisher not initialized. Call initialize() first.');
        }

        try {
            const channel = this.connectionManager.getChannel();
            const config = getMessagingConfig();
            const routingKey = `${event.aggregateType}.${event.type}`;

            // Validate and serialize the event
            const serializedEvent = EventValidationMiddleware.validateOutgoingEvent(event);

            // Add publishing metadata
            const eventWithMetadata = JSON.parse(serializedEvent);
            eventWithMetadata.publishedAt = new Date().toISOString();

            const message = Buffer.from(JSON.stringify(eventWithMetadata));

            const published = channel.publish(
                config.exchange,
                routingKey,
                message,
                {
                    persistent: true,
                    messageId: event.id,
                    timestamp: Date.now(),
                    contentType: 'application/json',
                    headers: {
                        eventType: event.type,
                        aggregateType: event.aggregateType,
                        aggregateId: event.aggregateId,
                        correlationId: event.metadata.correlationId,
                        source: event.metadata.source
                    }
                }
            );

            if (!published) {
                throw new Error('Failed to publish message - channel buffer full');
            }

            Logger.info('Event published successfully', {
                eventId: event.id,
                eventType: event.type,
                aggregateType: event.aggregateType,
                routingKey,
                exchange: config.exchange,
                correlationId: event.metadata.correlationId
            });
        } catch (error) {
            Logger.error('Failed to publish event', error as Error, {
                eventId: event.id,
                eventType: event.type
            });
            throw error;
        }
    }

    /**
     * Publish multiple events in a batch
     */
    public static async publishEvents(events: DomainEvent[]): Promise<void> {
        if (!this.isInitialized) {
            throw new Error('Message publisher not initialized. Call initialize() first.');
        }

        const publishPromises = events.map(event => this.publishEvent(event));
        await Promise.all(publishPromises);

        Logger.info('Batch events published successfully', {
            eventCount: events.length
        });
    }

    /**
     * Check if publisher is ready
     */
    public static isReady(): boolean {
        return this.isInitialized && this.connectionManager?.isConnected();
    }

    /**
     * Close connection
     */
    public static async close(): Promise<void> {
        try {
            if (this.connectionManager) {
                await this.connectionManager.close();
            }
            this.isInitialized = false;
            Logger.info('Message publisher closed successfully');
        } catch (error) {
            Logger.error('Error closing message publisher', error as Error);
        }
    }
}