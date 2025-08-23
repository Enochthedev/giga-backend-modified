# Message Queue Infrastructure

This directory contains the complete message queue infrastructure for the multi-service architecture, built on RabbitMQ with comprehensive event validation, serialization, and dead letter queue handling.

## Overview

The messaging system provides:
- **Event-driven communication** between microservices
- **Schema validation** for all domain events
- **Dead letter queue handling** for failed messages
- **Connection management** with automatic reconnection
- **Type-safe event serialization/deserialization**

## Components

### 1. Connection Manager (`connection-manager.ts`)
Manages RabbitMQ connections with automatic reconnection and error handling.

```typescript
import { ConnectionManager } from './connection-manager';

const manager = ConnectionManager.getInstance();
await manager.connect();
```

### 2. Message Publisher (`publisher.ts`)
Publishes domain events with validation and serialization.

```typescript
import { MessagePublisher, EventSerializer } from './messaging';

await MessagePublisher.initialize();

const event = EventSerializer.createEvent(
    'UserCreated',
    'User',
    'user-123',
    { email: 'user@example.com', firstName: 'John', lastName: 'Doe' },
    { correlationId: randomUUID(), source: 'user-service' }
);

await MessagePublisher.publishEvent(event);
```

### 3. Message Consumer (`consumer.ts`)
Consumes and processes domain events with validation.

```typescript
import { MessageConsumer, EventHandler } from './messaging';

await MessageConsumer.initialize();

const handler: EventHandler = async (event) => {
    console.log('Processing event:', event.type);
    // Process the event
};

await MessageConsumer.subscribe('user-queue', 'User.*', handler);
```

### 4. Event Serializer (`event-serializer.ts`)
Provides event validation, serialization, and schema management.

```typescript
import { EventSerializer } from './messaging';

// Create validated events
const event = EventSerializer.createEvent(
    'PaymentProcessed',
    'Payment',
    'payment-123',
    {
        amount: 100.00,
        currency: 'USD',
        status: 'succeeded',
        customerId: 'customer-123'
    },
    { correlationId: randomUUID(), source: 'payment-service' }
);

// Serialize/deserialize
const serialized = EventSerializer.serialize(event);
const deserialized = EventSerializer.deserialize(serialized);
```

### 5. Dead Letter Handler (`dead-letter-handler.ts`)
Manages failed message processing and recovery.

```typescript
import { DeadLetterHandler } from './messaging';

await DeadLetterHandler.initialize();

// Setup dead letter queue for a specific queue
await DeadLetterHandler.setupDeadLetterQueue('user-queue');

// Process failed messages
await DeadLetterHandler.processDeadLetterQueue(async (message, originalQueue) => {
    // Decide whether to requeue the message
    return shouldRequeue(message);
});
```

## Event Schemas

The system includes comprehensive event schemas for validation:

### User Events
- `UserCreated` - User registration
- `UserUpdated` - User profile changes
- `UserDeleted` - User account deletion

### Payment Events
- `PaymentProcessed` - Successful payment
- `PaymentFailed` - Failed payment
- `RefundProcessed` - Refund completion

### Order Events
- `OrderCreated` - New order placement
- `OrderUpdated` - Order status changes

### Inventory Events
- `InventoryUpdated` - Stock level changes
- `ProductUpdated` - Product information changes

### Ride Events (Taxi Service)
- `RideRequested` - Ride booking request
- `RideAccepted` - Driver accepts ride
- `RideCompleted` - Ride completion

### Hotel Events
- `BookingCreated` - Hotel booking
- `BookingConfirmed` - Booking confirmation
- `PropertyUpdated` - Property information changes

### Notification Events
- `NotificationSent` - Notification delivery

## Configuration

Configure RabbitMQ connection in your environment:

```bash
# Environment variables
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_EXCHANGE=giga.events
RABBITMQ_EXCHANGE_TYPE=topic
RABBITMQ_RECONNECT_DELAY=5000
RABBITMQ_MAX_RECONNECT_ATTEMPTS=10
RABBITMQ_PREFETCH_COUNT=10
```

## Docker Setup

RabbitMQ is configured in `docker-compose.yml`:

```yaml
rabbitmq:
  image: rabbitmq:3-management
  container_name: rabbitmq
  ports:
    - "5672:5672"    # AMQP port
    - "15672:15672"  # Management UI
  environment:
    RABBITMQ_DEFAULT_USER: guest
    RABBITMQ_DEFAULT_PASS: guest
```

## Usage Examples

### Complete Service Setup

```typescript
import {
    MessagePublisher,
    MessageConsumer,
    DeadLetterHandler,
    EventHandler,
    EventSerializer
} from '@giga/common/messaging';

// Initialize all components
async function setupMessaging() {
    await MessagePublisher.initialize();
    await MessageConsumer.initialize();
    await DeadLetterHandler.initialize();
}

// Event handler
const userEventHandler: EventHandler = async (event) => {
    switch (event.type) {
        case 'UserCreated':
            await handleUserCreated(event);
            break;
        case 'UserUpdated':
            await handleUserUpdated(event);
            break;
        default:
            console.warn('Unknown event type:', event.type);
    }
};

// Subscribe to events
await MessageConsumer.subscribe(
    'user-service-queue',
    'User.*',
    userEventHandler,
    { durable: true, deadLetterExchange: 'giga.events.dlx' }
);

// Publish events
const userCreatedEvent = EventSerializer.createEvent(
    'UserCreated',
    'User',
    'user-123',
    { email: 'user@example.com', firstName: 'John', lastName: 'Doe' },
    { correlationId: randomUUID(), source: 'user-service' }
);

await MessagePublisher.publishEvent(userCreatedEvent);
```

### Cross-Service Communication

```typescript
// In Order Service - publish order created event
const orderEvent = EventSerializer.createEvent(
    'OrderCreated',
    'Order',
    orderId,
    {
        customerId: order.customerId,
        items: order.items,
        totalAmount: order.total,
        currency: 'USD',
        shippingAddress: order.shippingAddress
    },
    { correlationId: randomUUID(), source: 'order-service' }
);

await MessagePublisher.publishEvent(orderEvent);

// In Inventory Service - handle order created
const inventoryHandler: EventHandler = async (event) => {
    if (event.type === 'OrderCreated') {
        for (const item of event.data.items) {
            await updateInventory(item.productId, -item.quantity);
        }
    }
};

await MessageConsumer.subscribe('inventory-queue', 'Order.*', inventoryHandler);
```

## Testing

The messaging system includes comprehensive tests:

```bash
# Run all messaging tests
npm test -- --testPathPattern=messaging

# Run specific test suites
npm test -- --testPathPattern=publisher
npm test -- --testPathPattern=consumer
npm test -- --testPathPattern=dead-letter
npm test -- --testPathPattern=event-serializer
```

## Error Handling

The system provides robust error handling:

1. **Connection Errors**: Automatic reconnection with exponential backoff
2. **Validation Errors**: Schema validation with detailed error messages
3. **Processing Errors**: Dead letter queue for failed message processing
4. **Serialization Errors**: Type-safe serialization with error recovery

## Monitoring

Monitor the messaging system through:

1. **RabbitMQ Management UI**: http://localhost:15672
2. **Application Logs**: Structured logging for all messaging operations
3. **Dead Letter Queue Stats**: Monitor failed message processing
4. **Connection Health**: Track connection status and reconnection attempts

## Best Practices

1. **Event Design**: Use past tense for event names (UserCreated, not CreateUser)
2. **Schema Evolution**: Add optional fields for backward compatibility
3. **Correlation IDs**: Always include correlation IDs for request tracing
4. **Error Handling**: Implement proper error handling and dead letter processing
5. **Testing**: Write integration tests for event flows
6. **Monitoring**: Monitor queue depths and processing times

## Integration with Services

Each service should:

1. Initialize messaging components on startup
2. Define event handlers for relevant events
3. Publish events for state changes
4. Handle connection failures gracefully
5. Implement proper shutdown procedures

```typescript
// Service startup
async function startService() {
    await setupMessaging();
    await subscribeToEvents();
    console.log('Service started with messaging enabled');
}

// Service shutdown
async function shutdownService() {
    await MessageConsumer.close();
    await MessagePublisher.close();
    console.log('Service shutdown complete');
}
```

This messaging infrastructure provides a solid foundation for event-driven microservices communication with proper validation, error handling, and monitoring capabilities.