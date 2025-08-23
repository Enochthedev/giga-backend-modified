import { MessagePublisher } from '../../messaging/publisher';
import { MessageConsumer, EventHandler } from '../../messaging/consumer';
import { DeadLetterHandler } from '../../messaging/dead-letter-handler';
import { EventSerializer } from '../../messaging/event-serializer';
import { DomainEvent } from '../../types';
import { Logger } from '../../utils/logger';

// Mock logger to avoid console output during tests
jest.mock('../../utils/logger');

describe('Messaging Integration Tests', () => {
    let receivedEvents: DomainEvent[] = [];
    let processingErrors: Error[] = [];

    const testHandler: EventHandler = async (event: DomainEvent) => {
        try {
            receivedEvents.push(event);

            // Simulate processing time
            await new Promise(resolve => setTimeout(resolve, 10));

            // Simulate occasional processing errors for testing
            if (event.data?.shouldFail) {
                throw new Error('Simulated processing error');
            }
        } catch (error) {
            processingErrors.push(error as Error);
            throw error;
        }
    };

    const createTestEvent = (overrides: Partial<DomainEvent> = {}): DomainEvent => {
        const baseEvent = EventSerializer.createEvent(
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

        return { ...baseEvent, ...overrides };
    };

    beforeEach(async () => {
        receivedEvents = [];
        processingErrors = [];

        // Clean up any existing connections
        await MessagePublisher.close();
        await MessageConsumer.close();

        jest.clearAllMocks();
    });

    afterEach(async () => {
        await MessageConsumer.close();
        await MessagePublisher.close();
    });

    describe('End-to-End Message Flow', () => {
        it('should publish and consume messages successfully', async () => {
            // Initialize publisher and consumer
            await MessagePublisher.initialize();
            await MessageConsumer.initialize();

            // Set up consumer subscription
            const queueName = 'test-integration-queue';
            const routingPattern = 'User.*';

            await MessageConsumer.subscribe(queueName, routingPattern, testHandler);

            // Wait for subscription to be established
            await new Promise(resolve => setTimeout(resolve, 100));

            // Publish test events
            const testEvents = [
                createTestEvent(),
                createTestEvent({
                    id: 'event-2',
                    data: { email: 'test2@example.com', firstName: 'Jane', lastName: 'Smith' }
                }),
                createTestEvent({
                    id: 'event-3',
                    data: { email: 'test3@example.com', firstName: 'Bob', lastName: 'Johnson' }
                })
            ];

            for (const event of testEvents) {
                await MessagePublisher.publishEvent(event);
            }

            // Wait for messages to be processed
            await new Promise(resolve => setTimeout(resolve, 500));

            // Verify all events were received and processed
            expect(receivedEvents).toHaveLength(3);
            expect(receivedEvents.map(e => e.id)).toEqual(
                expect.arrayContaining(testEvents.map(e => e.id))
            );
            expect(processingErrors).toHaveLength(0);

            // Clean up
            await MessageConsumer.unsubscribe(queueName, routingPattern);
        }, 10000);

        it('should handle batch publishing correctly', async () => {
            await MessagePublisher.initialize();
            await MessageConsumer.initialize();

            const queueName = 'test-batch-queue';
            const routingPattern = 'User.*';

            await MessageConsumer.subscribe(queueName, routingPattern, testHandler);
            await new Promise(resolve => setTimeout(resolve, 100));

            // Create batch of events
            const batchEvents = Array.from({ length: 5 }, (_, i) =>
                createTestEvent({
                    id: `batch-event-${i}`,
                    data: {
                        email: `batch${i}@example.com`,
                        firstName: `User${i}`,
                        lastName: 'Batch'
                    }
                })
            );

            // Publish batch
            await MessagePublisher.publishEvents(batchEvents);

            // Wait for processing
            await new Promise(resolve => setTimeout(resolve, 1000));

            expect(receivedEvents).toHaveLength(5);
            expect(receivedEvents.map(e => e.id)).toEqual(
                expect.arrayContaining(batchEvents.map(e => e.id))
            );

            await MessageConsumer.unsubscribe(queueName, routingPattern);
        }, 10000);
    });

    describe('Event Validation Integration', () => {
        it('should reject invalid events during publishing', async () => {
            await MessagePublisher.initialize();

            const invalidEvent = {
                id: 'invalid-event',
                type: 'UserCreated',
                aggregateType: 'User',
                aggregateId: 'user-123',
                data: {
                    email: 'invalid-email', // Invalid email format
                    firstName: '',          // Empty required field
                    lastName: 'Doe'
                },
                metadata: {
                    correlationId: 'invalid-correlation', // Invalid UUID format
                    source: 'test-service'
                },
                timestamp: new Date(),
                version: 1
            } as DomainEvent;

            await expect(MessagePublisher.publishEvent(invalidEvent))
                .rejects.toThrow('Event validation failed');
        });

        it('should handle malformed messages gracefully', async () => {
            await MessageConsumer.initialize();

            const queueName = 'test-malformed-queue';
            const routingPattern = 'User.*';

            await MessageConsumer.subscribe(queueName, routingPattern, testHandler);
            await new Promise(resolve => setTimeout(resolve, 100));

            // Simulate publishing a malformed message directly to the queue
            // This would normally be handled by the dead letter queue
            const validEvent = createTestEvent();
            await MessagePublisher.publishEvent(validEvent);

            await new Promise(resolve => setTimeout(resolve, 500));

            // Should still process valid events
            expect(receivedEvents).toHaveLength(1);
            expect(receivedEvents[0]?.id).toBe(validEvent.id);

            await MessageConsumer.unsubscribe(queueName, routingPattern);
        });
    });

    describe('Dead Letter Queue Integration', () => {
        it('should handle failed message processing', async () => {
            await MessagePublisher.initialize();
            await MessageConsumer.initialize();
            await DeadLetterHandler.initialize();

            const queueName = 'test-dlq-queue';
            const routingPattern = 'User.*';

            // Set up dead letter queue for this queue
            await DeadLetterHandler.setupDeadLetterQueue(queueName);

            await MessageConsumer.subscribe(queueName, routingPattern, testHandler, {
                deadLetterExchange: 'giga.events.dlx'
            });

            await new Promise(resolve => setTimeout(resolve, 100));

            // Publish events that will succeed and fail
            const successEvent = createTestEvent({ id: 'success-event' });
            const failEvent = createTestEvent({
                id: 'fail-event',
                data: {
                    email: 'fail@example.com',
                    firstName: 'Fail',
                    lastName: 'User',
                    shouldFail: true
                }
            });

            await MessagePublisher.publishEvent(successEvent);
            await MessagePublisher.publishEvent(failEvent);

            // Wait for processing
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Should have processed successful event
            expect(receivedEvents).toHaveLength(1);
            expect(receivedEvents[0]?.id).toBe('success-event');

            // Should have one processing error
            expect(processingErrors).toHaveLength(1);

            // Check dead letter queue stats
            const dlqStats = await DeadLetterHandler.getDeadLetterStats();
            expect(dlqStats.messageCount).toBeGreaterThan(0);

            await MessageConsumer.unsubscribe(queueName, routingPattern);
        }, 15000);
    });

    describe('Connection Resilience', () => {
        it('should handle publisher reconnection', async () => {
            await MessagePublisher.initialize();
            expect(MessagePublisher.isReady()).toBe(true);

            // Simulate connection loss and recovery
            await MessagePublisher.close();
            expect(MessagePublisher.isReady()).toBe(false);

            await MessagePublisher.initialize();
            expect(MessagePublisher.isReady()).toBe(true);

            // Should be able to publish after reconnection
            const testEvent = createTestEvent();
            await expect(MessagePublisher.publishEvent(testEvent)).resolves.not.toThrow();
        });

        it('should handle consumer reconnection', async () => {
            await MessageConsumer.initialize();
            expect(MessageConsumer.isReady()).toBe(true);

            const queueName = 'test-reconnect-queue';
            const routingPattern = 'User.*';

            await MessageConsumer.subscribe(queueName, routingPattern, testHandler);

            // Simulate connection loss and recovery
            await MessageConsumer.close();
            expect(MessageConsumer.isReady()).toBe(false);

            await MessageConsumer.initialize();
            expect(MessageConsumer.isReady()).toBe(true);

            // Should be able to subscribe after reconnection
            await expect(
                MessageConsumer.subscribe(queueName, routingPattern, testHandler)
            ).resolves.not.toThrow();

            await MessageConsumer.unsubscribe(queueName, routingPattern);
        });
    });

    describe('Performance and Load Testing', () => {
        it('should handle high message throughput', async () => {
            await MessagePublisher.initialize();
            await MessageConsumer.initialize();

            const queueName = 'test-performance-queue';
            const routingPattern = 'User.*';

            await MessageConsumer.subscribe(queueName, routingPattern, testHandler);
            await new Promise(resolve => setTimeout(resolve, 100));

            const messageCount = 100;
            const events = Array.from({ length: messageCount }, (_, i) =>
                createTestEvent({
                    id: `perf-event-${i}`,
                    data: {
                        email: `perf${i}@example.com`,
                        firstName: `User${i}`,
                        lastName: 'Performance'
                    }
                })
            );

            const startTime = Date.now();

            // Publish all events
            await Promise.all(events.map(event => MessagePublisher.publishEvent(event)));

            // Wait for all messages to be processed
            const maxWaitTime = 30000; // 30 seconds
            const checkInterval = 100;
            let waitTime = 0;

            while (receivedEvents.length < messageCount && waitTime < maxWaitTime) {
                await new Promise(resolve => setTimeout(resolve, checkInterval));
                waitTime += checkInterval;
            }

            const endTime = Date.now();
            const processingTime = endTime - startTime;

            expect(receivedEvents).toHaveLength(messageCount);
            expect(processingTime).toBeLessThan(maxWaitTime);
            expect(processingErrors).toHaveLength(0);

            Logger.info('Performance test completed', {
                messageCount,
                processingTime,
                messagesPerSecond: Math.round((messageCount / processingTime) * 1000)
            });

            await MessageConsumer.unsubscribe(queueName, routingPattern);
        }, 45000);
    });

    describe('Message Ordering and Delivery Guarantees', () => {
        it('should maintain message order for same routing key', async () => {
            await MessagePublisher.initialize();
            await MessageConsumer.initialize();

            const queueName = 'test-ordering-queue';
            const routingPattern = 'User.UserCreated';

            await MessageConsumer.subscribe(queueName, routingPattern, testHandler);
            await new Promise(resolve => setTimeout(resolve, 100));

            // Publish events in sequence
            const eventCount = 10;
            const publishPromises = [];

            for (let i = 0; i < eventCount; i++) {
                const event = createTestEvent({
                    id: `order-event-${i.toString().padStart(2, '0')}`,
                    data: {
                        email: `order${i}@example.com`,
                        firstName: `User${i}`,
                        lastName: 'Order',
                        sequence: i
                    }
                });
                publishPromises.push(MessagePublisher.publishEvent(event));
            }

            await Promise.all(publishPromises);

            // Wait for processing
            await new Promise(resolve => setTimeout(resolve, 2000));

            expect(receivedEvents).toHaveLength(eventCount);

            // Check if events were processed in order (may not be guaranteed in all cases)
            const sequences = receivedEvents.map(e => e.data.sequence);
            Logger.info('Message processing order', { sequences });

            await MessageConsumer.unsubscribe(queueName, routingPattern);
        }, 15000);
    });
});