import { EventSerializer, EventValidationMiddleware } from '../../messaging/event-serializer';
import { DomainEvent } from '../../types';

describe('EventSerializer', () => {
    const validEvent: DomainEvent = {
        id: 'test-event-id',
        type: 'UserCreated',
        aggregateType: 'User',
        aggregateId: 'user-123',
        data: {
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe'
        },
        metadata: {
            correlationId: '550e8400-e29b-41d4-a716-446655440000',
            source: 'test-service'
        },
        timestamp: new Date('2024-01-01T00:00:00.000Z'),
        version: 1
    };

    describe('serialize', () => {
        it('should serialize valid event to JSON string', () => {
            const serialized = EventSerializer.serialize(validEvent);
            const parsed = JSON.parse(serialized);

            expect(parsed.id).toBe(validEvent.id);
            expect(parsed.type).toBe(validEvent.type);
            expect(parsed.timestamp).toBe('2024-01-01T00:00:00.000Z');
            expect(parsed.data).toEqual(validEvent.data);
        });

        it('should handle events with nested dates in data', () => {
            const eventWithDates = {
                ...validEvent,
                data: {
                    ...validEvent.data,
                    createdAt: new Date('2024-01-01T12:00:00.000Z'),
                    profile: {
                        lastLogin: new Date('2024-01-01T11:00:00.000Z')
                    }
                }
            };

            const serialized = EventSerializer.serialize(eventWithDates);
            const parsed = JSON.parse(serialized);

            expect(parsed.data.createdAt).toBe('2024-01-01T12:00:00.000Z');
            expect(parsed.data.profile.lastLogin).toBe('2024-01-01T11:00:00.000Z');
        });

        it('should throw error for invalid event', () => {
            const invalidEvent = {
                ...validEvent,
                metadata: {
                    ...validEvent.metadata,
                    correlationId: 'invalid-uuid'
                }
            };

            expect(() => EventSerializer.serialize(invalidEvent))
                .toThrow('Event serialization failed');
        });
    });

    describe('deserialize', () => {
        it('should deserialize valid JSON string to event', () => {
            const serialized = EventSerializer.serialize(validEvent);
            const deserialized = EventSerializer.deserialize(serialized);

            expect(deserialized.id).toBe(validEvent.id);
            expect(deserialized.type).toBe(validEvent.type);
            expect(deserialized.timestamp).toEqual(validEvent.timestamp);
            expect(deserialized.data).toEqual(validEvent.data);
        });

        it('should throw error for invalid JSON', () => {
            expect(() => EventSerializer.deserialize('invalid json'))
                .toThrow('Event deserialization failed');
        });

        it('should throw error for JSON with invalid event structure', () => {
            const invalidJson = JSON.stringify({
                id: 'test',
                type: 'UserCreated',
                // missing required fields
            });

            expect(() => EventSerializer.deserialize(invalidJson))
                .toThrow('Event deserialization failed');
        });
    });

    describe('validateEvent', () => {
        it('should validate correct event without throwing', () => {
            expect(() => EventSerializer.validateEvent(validEvent)).not.toThrow();
        });

        it('should throw error for event with invalid structure', () => {
            const invalidEvent = {
                ...validEvent,
                id: '', // Invalid empty ID
            };

            expect(() => EventSerializer.validateEvent(invalidEvent))
                .toThrow('Event validation failed');
        });

        it('should throw error for event with invalid metadata', () => {
            const invalidEvent = {
                ...validEvent,
                metadata: {
                    ...validEvent.metadata,
                    correlationId: 'not-a-uuid'
                }
            };

            expect(() => EventSerializer.validateEvent(invalidEvent))
                .toThrow('Event validation failed');
        });

        it('should validate UserCreated event with correct data', () => {
            expect(() => EventSerializer.validateEvent(validEvent)).not.toThrow();
        });

        it('should throw error for UserCreated event with invalid email', () => {
            const invalidEvent = {
                ...validEvent,
                data: {
                    ...validEvent.data,
                    email: 'invalid-email'
                }
            };

            expect(() => EventSerializer.validateEvent(invalidEvent))
                .toThrow('Event validation failed');
        });
    });

    describe('createEvent', () => {
        it('should create valid event with proper structure', () => {
            const event = EventSerializer.createEvent(
                'UserCreated',
                'User',
                'user-123',
                {
                    email: 'test@example.com',
                    firstName: 'John',
                    lastName: 'Doe'
                },
                {
                    correlationId: '550e8400-e29b-41d4-a716-446655440000',
                    source: 'test-service'
                }
            );

            expect(event.id).toBeDefined();
            expect(event.type).toBe('UserCreated');
            expect(event.aggregateType).toBe('User');
            expect(event.aggregateId).toBe('user-123');
            expect(event.version).toBe(1);
            expect(event.timestamp).toBeInstanceOf(Date);
        });

        it('should throw error when creating event with invalid data', () => {
            expect(() => EventSerializer.createEvent(
                'UserCreated',
                'User',
                'user-123',
                {
                    email: 'invalid-email',
                    firstName: 'John',
                    lastName: 'Doe'
                },
                {
                    correlationId: '550e8400-e29b-41d4-a716-446655440000',
                    source: 'test-service'
                }
            )).toThrow('Event validation failed');
        });
    });

    describe('validateEvents', () => {
        it('should separate valid and invalid events', () => {
            const validEvent1 = { ...validEvent, id: 'valid-1' };
            const validEvent2 = { ...validEvent, id: 'valid-2' };
            const invalidEvent = {
                ...validEvent,
                id: 'invalid-1',
                metadata: {
                    ...validEvent.metadata,
                    correlationId: 'invalid-uuid'
                }
            };

            const result = EventSerializer.validateEvents([validEvent1, invalidEvent, validEvent2]);

            expect(result.valid).toHaveLength(2);
            expect(result.invalid).toHaveLength(1);
            expect(result.valid.map(e => e.id)).toEqual(['valid-1', 'valid-2']);
            expect(result.invalid[0]?.event.id).toBe('invalid-1');
        });
    });

    describe('schema utilities', () => {
        it('should return schema for registered event type', () => {
            const schema = EventSerializer.getEventSchema('UserCreated');
            expect(schema).toBeDefined();
        });

        it('should return null for unregistered event type', () => {
            const schema = EventSerializer.getEventSchema('UnknownEvent');
            expect(schema).toBeNull();
        });

        it('should check if event type has schema', () => {
            expect(EventSerializer.hasSchema('UserCreated')).toBe(true);
            expect(EventSerializer.hasSchema('UnknownEvent')).toBe(false);
        });

        it('should return list of registered event types', () => {
            const eventTypes = EventSerializer.getRegisteredEventTypes();
            expect(eventTypes).toContain('UserCreated');
            expect(eventTypes).toContain('PaymentProcessed');
            expect(eventTypes).toContain('OrderCreated');
        });
    });
});

describe('EventValidationMiddleware', () => {
    const validEvent: DomainEvent = {
        id: 'test-event-id',
        type: 'UserCreated',
        aggregateType: 'User',
        aggregateId: 'user-123',
        data: {
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe'
        },
        metadata: {
            correlationId: '550e8400-e29b-41d4-a716-446655440000',
            source: 'test-service'
        },
        timestamp: new Date('2024-01-01T00:00:00.000Z'),
        version: 1
    };

    describe('validateIncomingMessage', () => {
        it('should validate and deserialize valid message', () => {
            const serialized = EventSerializer.serialize(validEvent);
            const result = EventValidationMiddleware.validateIncomingMessage(serialized);

            expect(result.id).toBe(validEvent.id);
            expect(result.type).toBe(validEvent.type);
            expect(result.timestamp).toEqual(validEvent.timestamp);
        });

        it('should throw error for invalid message format', () => {
            expect(() => EventValidationMiddleware.validateIncomingMessage('invalid json'))
                .toThrow('Invalid message format');
        });

        it('should throw error for message with invalid event structure', () => {
            const invalidMessage = JSON.stringify({
                id: 'test',
                type: 'UserCreated'
                // missing required fields
            });

            expect(() => EventValidationMiddleware.validateIncomingMessage(invalidMessage))
                .toThrow('Invalid message format');
        });
    });

    describe('validateOutgoingEvent', () => {
        it('should validate and serialize valid event', () => {
            const result = EventValidationMiddleware.validateOutgoingEvent(validEvent);
            const parsed = JSON.parse(result);

            expect(parsed.id).toBe(validEvent.id);
            expect(parsed.type).toBe(validEvent.type);
        });

        it('should throw error for invalid event', () => {
            const invalidEvent = {
                ...validEvent,
                metadata: {
                    ...validEvent.metadata,
                    correlationId: 'invalid-uuid'
                }
            };

            expect(() => EventValidationMiddleware.validateOutgoingEvent(invalidEvent))
                .toThrow('Invalid event format');
        });
    });
});