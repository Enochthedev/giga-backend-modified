import { z } from 'zod';
import { DomainEvent } from '../types';
import { Logger } from '../utils/logger';
import { EventSchemaRegistry, EventType, DomainEventSchema } from '../validation/event-schemas';
import { randomUUID } from 'crypto';

/**
 * Event serialization and validation utilities
 */
export class EventSerializer {
    /**
     * Serialize a domain event to JSON string
     */
    public static serialize(event: DomainEvent): string {
        try {
            // Validate event structure first
            this.validateEvent(event);

            // Convert dates to ISO strings for serialization
            const serializedEvent = {
                ...event,
                timestamp: event.timestamp.toISOString(),
                data: this.serializeEventData(event.data)
            };

            return JSON.stringify(serializedEvent);
        } catch (error) {
            Logger.error('Failed to serialize event', error as Error, {
                eventId: event.id,
                eventType: event.type
            });
            throw new Error(`Event serialization failed: ${(error as Error).message}`);
        }
    }

    /**
     * Deserialize JSON string to domain event
     */
    public static deserialize(jsonString: string): DomainEvent {
        try {
            const parsed = JSON.parse(jsonString);

            // Convert ISO string back to Date
            const event: DomainEvent = {
                ...parsed,
                timestamp: new Date(parsed.timestamp)
            };

            // Validate the deserialized event
            this.validateEvent(event);

            return event;
        } catch (error) {
            Logger.error('Failed to deserialize event', error as Error, {
                jsonString: jsonString.substring(0, 200) + '...'
            });
            throw new Error(`Event deserialization failed: ${(error as Error).message}`);
        }
    }

    /**
     * Validate a domain event against its schema
     */
    public static validateEvent(event: DomainEvent): void {
        try {
            // First validate basic event structure
            DomainEventSchema.parse(event);

            // Then validate specific event type if schema exists
            const eventType = event.type as EventType;
            const schema = EventSchemaRegistry[eventType];

            if (schema) {
                schema.parse(event);
                Logger.debug('Event validation successful', {
                    eventId: event.id,
                    eventType: event.type
                });
            } else {
                Logger.warn('No specific schema found for event type', {
                    eventType: event.type,
                    eventId: event.id
                });
            }
        } catch (error) {
            if (error instanceof z.ZodError) {
                const validationErrors = error.errors.map(err => ({
                    path: err.path.join('.'),
                    message: err.message,
                    code: err.code
                }));

                Logger.error('Event validation failed', new Error('Validation error'), {
                    eventId: event.id,
                    eventType: event.type,
                    validationErrors
                });

                throw new Error(`Event validation failed: ${JSON.stringify(validationErrors)}`);
            }
            throw error;
        }
    }

    /**
     * Create a new domain event with validation
     */
    public static createEvent<T = any>(
        type: string,
        aggregateType: string,
        aggregateId: string,
        data: T,
        metadata: {
            userId?: string;
            correlationId: string;
            causationId?: string;
            source: string;
        }
    ): DomainEvent {
        const event: DomainEvent = {
            id: this.generateEventId(),
            type,
            aggregateType,
            aggregateId,
            data,
            metadata,
            timestamp: new Date(),
            version: 1
        };

        // Validate the created event
        this.validateEvent(event);

        return event;
    }

    /**
     * Batch validate multiple events
     */
    public static validateEvents(events: DomainEvent[]): { valid: DomainEvent[]; invalid: Array<{ event: DomainEvent; error: string }> } {
        const valid: DomainEvent[] = [];
        const invalid: Array<{ event: DomainEvent; error: string }> = [];

        for (const event of events) {
            try {
                this.validateEvent(event);
                valid.push(event);
            } catch (error) {
                invalid.push({
                    event,
                    error: (error as Error).message
                });
            }
        }

        return { valid, invalid };
    }

    /**
     * Get event schema for a specific event type
     */
    public static getEventSchema(eventType: string): z.ZodSchema | null {
        return EventSchemaRegistry[eventType as EventType] || null;
    }

    /**
     * Check if an event type has a registered schema
     */
    public static hasSchema(eventType: string): boolean {
        return eventType in EventSchemaRegistry;
    }

    /**
     * Get all registered event types
     */
    public static getRegisteredEventTypes(): string[] {
        return Object.keys(EventSchemaRegistry);
    }

    /**
     * Serialize event data, handling special types
     */
    private static serializeEventData(data: any): any {
        if (data === null || data === undefined) {
            return data;
        }

        if (data instanceof Date) {
            return data.toISOString();
        }

        if (Array.isArray(data)) {
            return data.map(item => this.serializeEventData(item));
        }

        if (typeof data === 'object') {
            const serialized: any = {};
            for (const [key, value] of Object.entries(data)) {
                serialized[key] = this.serializeEventData(value);
            }
            return serialized;
        }

        return data;
    }

    /**
     * Generate a unique event ID (UUID v4)
     */
    private static generateEventId(): string {
        return randomUUID();
    }
}

/**
 * Event validation middleware for message processing
 */
export class EventValidationMiddleware {
    /**
     * Validate incoming message before processing
     */
    public static validateIncomingMessage(messageContent: string): DomainEvent {
        try {
            return EventSerializer.deserialize(messageContent);
        } catch (error) {
            Logger.error('Invalid incoming message format', error as Error, {
                messageContent: messageContent.substring(0, 200) + '...'
            });
            throw new Error(`Invalid message format: ${(error as Error).message}`);
        }
    }

    /**
     * Validate outgoing event before publishing
     */
    public static validateOutgoingEvent(event: DomainEvent): string {
        try {
            return EventSerializer.serialize(event);
        } catch (error) {
            Logger.error('Invalid outgoing event format', error as Error, {
                eventId: event.id,
                eventType: event.type
            });
            throw new Error(`Invalid event format: ${(error as Error).message}`);
        }
    }
}