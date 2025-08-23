# @giga/common

Shared utilities and types for all services in the Giga multi-service architecture.

## Features

- **Messaging System**: RabbitMQ-based event-driven communication
- **Database Utilities**: PostgreSQL connection management
- **Logging**: Structured logging with Winston
- **Error Handling**: Standardized error classes and middleware
- **Validation**: Input validation utilities
- **Types**: Shared TypeScript interfaces and types

## Installation

```bash
npm install @giga/common
```

## Usage

### Messaging System

The messaging system provides event-driven communication between services using RabbitMQ.

#### Publisher

```typescript
import { MessagePublisher, DomainEvent } from '@giga/common';

// Initialize publisher
await MessagePublisher.initialize();

// Create and publish an event
const event: DomainEvent = {
  id: 'user-created-123',
  type: 'UserCreated',
  aggregateType: 'User',
  aggregateId: 'user-123',
  data: { email: 'user@example.com' },
  version: 1,
  occurredAt: new Date()
};

await MessagePublisher.publishEvent(event);
```

#### Consumer

```typescript
import { MessageConsumer, EventHandler } from '@giga/common';

// Initialize consumer
await MessageConsumer.initialize();

// Define event handler
const userEventHandler: EventHandler = async (event) => {
  console.log('Processing event:', event.type);
  // Handle the event
};

// Subscribe to events
await MessageConsumer.subscribe(
  'user-service-queue',
  'User.*',
  userEventHandler,
  {
    durable: true,
    deadLetterExchange: 'giga.events.dlx'
  }
);
```

#### Dead Letter Queue

```typescript
import { DeadLetterHandler } from '@giga/common';

// Initialize dead letter handler
await DeadLetterHandler.initialize();

// Process failed messages
await DeadLetterHandler.processDeadLetterQueue(async (message, originalQueue) => {
  console.log('Processing failed message from:', originalQueue);
  
  // Return true to requeue, false to discard
  return shouldRequeue(message);
});
```

### Database Connection

```typescript
import { DatabaseConnection } from '@giga/common';

// Initialize database connection
await DatabaseConnection.initialize();

// Get connection pool
const pool = DatabaseConnection.getPool();

// Execute query
const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
```

### Logging

```typescript
import { Logger } from '@giga/common';

Logger.info('User created', { userId: '123', email: 'user@example.com' });
Logger.error('Database error', error, { query: 'SELECT * FROM users' });
```

### Error Handling

```typescript
import { ApiError, ErrorHandler } from '@giga/common';

// Throw standardized errors
throw new ApiError('User not found', 404, 'USER_NOT_FOUND');

// Use error middleware in Express
app.use(ErrorHandler.handle);
```

## Configuration

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `RABBITMQ_URL` | RabbitMQ connection URL | `amqp://localhost:5672` |
| `RABBITMQ_EXCHANGE` | Main exchange name | `giga.events` |
| `RABBITMQ_EXCHANGE_TYPE` | Exchange type | `topic` |
| `RABBITMQ_RECONNECT_DELAY` | Reconnection delay (ms) | `5000` |
| `RABBITMQ_MAX_RECONNECT_ATTEMPTS` | Max reconnection attempts | `10` |
| `RABBITMQ_PREFETCH_COUNT` | Message prefetch count | `10` |
| `DATABASE_URL` | PostgreSQL connection URL | - |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `JWT_SECRET` | JWT signing secret | - |
| `LOG_LEVEL` | Logging level | `info` |

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test -- --coverage
```

## Development

```bash
# Build the package
npm run build

# Watch for changes
npm run dev

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## Architecture

### Event-Driven Communication

The messaging system follows these patterns:

1. **Domain Events**: Events represent business-significant occurrences
2. **Topic Exchange**: Uses routing keys for flexible message routing
3. **Dead Letter Queues**: Failed messages are sent to DLQ for retry/analysis
4. **Durable Queues**: Messages survive broker restarts
5. **Acknowledgments**: Manual acknowledgment ensures message processing

### Routing Key Convention

```
{AggregateType}.{EventType}
```

Examples:
- `User.Created`
- `Payment.Processed`
- `Order.Cancelled`

### Queue Naming Convention

```
{service-name}-{purpose}-queue
```

Examples:
- `user-service-queue`
- `payment-notification-queue`
- `order-processing-queue`

## Examples

See `src/examples/messaging-usage.ts` for comprehensive usage examples.

## License

MIT