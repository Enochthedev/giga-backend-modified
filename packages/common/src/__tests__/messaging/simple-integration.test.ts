import { MessagePublisher, MessageConsumer, EventHandler, EventSerializer } from '../../messaging';
import { DomainEvent } from '../../types';

// Mock logger to avoid console output during tests
jest.mock('../../utils/logger');

describe('Simple Messaging Integration', () => {
    let receivedEvents: DomainEvent[] = [];

    const testHandler: EventHandler = async (event: DomainEvent) => {
        receivedEvents.push(event);
    };

    beforeEach(async () => {
        receivedEvents = [];
        await MessagePublisher.close();
        await MessageConsumer.close();
        jest.clearAllMocks();
    });

    afterEach(async () => {
        await MessageConsumer.close();
        await MessagePublisher.close();
    });

    it('should create, validate, and process events successfully', async () => {
        // Initialize messaging components
        await MessagePublisher.initialize();
        await MessageConsumer.initialize();

        // Create a valid event using EventSerializer
        const testEvent = EventSerializer.createEvent(
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

        // Verify event structure
        expect(testEvent.id).toBeDefined();
        expect(testEvent.type).toBe('UserCreated');
        expect(testEvent.aggregateType).toBe('User');
        expect(testEvent.data.email).toBe('test@example.com');

        // Set up consumer
        const queueName = 'simple-test-queue';
        const routingPattern = 'User.*';

        await MessageConsumer.subscribe(queueName, routingPattern, testHandler);

        // Wait for subscription to be established
        await new Promise(resolve => setTimeout(resolve, 100));

        // Publish the event
        await MessagePublisher.publishEvent(testEvent);

        // Wait for message to be processed
        await new Promise(resolve => setTimeout(resolve, 500));

        // Verify event was received and processed
        expect(receivedEvents).toHaveLength(1);
        expect(receivedEvents[0]?.id).toBe(testEvent.id);
        expect(receivedEvents[0]?.type).toBe('UserCreated');
        expect(receivedEvents[0]?.data.email).toBe('test@example.com');

        // Clean up
        await MessageConsumer.unsubscribe(queueName, routingPattern);
    }, 10000);

    it('should validate event schemas correctly', () => {
        // Test valid event creation
        expect(() => {
            EventSerializer.createEvent(
                'PaymentProcessed',
                'Payment',
                'payment-123',
                {
                    amount: 100.50,
                    currency: 'USD',
                    paymentMethodId: 'pm_123',
                    status: 'succeeded' as const,
                    transactionId: 'txn_123',
                    customerId: 'cust_123'
                },
                {
                    correlationId: '550e8400-e29b-41d4-a716-446655440001',
                    source: 'payment-service'
                }
            );
        }).not.toThrow();

        // Test invalid event creation (should throw)
        expect(() => {
            EventSerializer.createEvent(
                'PaymentProcessed',
                'Payment',
                'payment-123',
                {
                    amount: -100, // Invalid negative amount
                    currency: 'INVALID', // Invalid currency code
                    paymentMethodId: 'pm_123',
                    status: 'succeeded' as const,
                    transactionId: 'txn_123',
                    customerId: 'cust_123'
                },
                {
                    correlationId: '550e8400-e29b-41d4-a716-446655440001',
                    source: 'payment-service'
                }
            );
        }).toThrow();
    });

    it('should handle event serialization and deserialization', () => {
        const originalEvent = EventSerializer.createEvent(
            'OrderCreated',
            'Order',
            'order-456',
            {
                customerId: 'customer-123',
                items: [
                    {
                        productId: 'product-1',
                        quantity: 2,
                        price: 25.99
                    }
                ],
                totalAmount: 51.98,
                currency: 'USD',
                shippingAddress: {
                    street: '123 Test St',
                    city: 'Test City',
                    state: 'TS',
                    zipCode: '12345',
                    country: 'US'
                }
            },
            {
                correlationId: '550e8400-e29b-41d4-a716-446655440002',
                source: 'ecommerce-service'
            }
        );

        // Serialize the event
        const serialized = EventSerializer.serialize(originalEvent);
        expect(serialized).toBeDefined();
        expect(typeof serialized).toBe('string');

        // Deserialize the event
        const deserialized = EventSerializer.deserialize(serialized);
        expect(deserialized.id).toBe(originalEvent.id);
        expect(deserialized.type).toBe(originalEvent.type);
        expect(deserialized.data.customerId).toBe(originalEvent.data.customerId);
        expect(deserialized.data.totalAmount).toBe(originalEvent.data.totalAmount);
    });

    it('should list registered event types', () => {
        const eventTypes = EventSerializer.getRegisteredEventTypes();

        expect(eventTypes).toContain('UserCreated');
        expect(eventTypes).toContain('PaymentProcessed');
        expect(eventTypes).toContain('OrderCreated');
        expect(eventTypes).toContain('NotificationSent');
        expect(eventTypes.length).toBeGreaterThan(10);
    });
});