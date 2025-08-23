# Payment Service

This is the payment service for the Giga Backend platform. It handles payment processing, refunds, payment methods, and integrates with multiple payment providers including Stripe.

## Features

- **Payment Intent Management**: Create and manage payment intents for secure payment processing
- **Payment Processing**: Process payments through multiple providers (Stripe, PayPal, Flutterwave, Paystack)
- **Refund Management**: Handle full and partial refunds
- **Payment Methods**: Manage user payment methods (cards, bank accounts, digital wallets)
- **Webhook Handling**: Process webhooks from payment providers for real-time updates
- **Transaction History**: Track and query payment transactions with filtering and pagination
- **Multi-Provider Support**: Extensible architecture for multiple payment gateways
- **Security**: PCI DSS compliant payment data handling with encryption

## API Endpoints

### Payment Intents
- `POST /payment-intents` - Create a new payment intent
- `GET /payment-intents/:id` - Get payment intent details

### Payments
- `POST /payments` - Process a payment
- `GET /payments` - Get user transactions (with filtering and pagination)
- `GET /payments/:id` - Get specific transaction details

### Refunds
- `POST /refunds` - Create a refund for a transaction

### Payment Methods
- `POST /payment-methods` - Add a new payment method
- `GET /payment-methods` - Get user's payment methods
- `PUT /payment-methods/:id` - Update payment method
- `DELETE /payment-methods/:id` - Remove payment method

### Webhooks
- `POST /webhooks/stripe` - Handle Stripe webhooks
- `POST /webhooks/paypal` - Handle PayPal webhooks (future)

### Admin
- `GET /admin/statistics` - Get payment statistics (admin only)

### Health
- `GET /health` - Service health check

## Environment Variables

```bash
# Server Configuration
PORT=4002
NODE_ENV=development

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/payment_db
DATABASE_POOL_SIZE=10
DATABASE_SSL=false

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h

# RabbitMQ Configuration
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_EXCHANGE=payment_events
RABBITMQ_QUEUE=payment_queue

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=logs/payment.log
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp env.example .env
# Edit .env with your configuration
```

3. Run database migrations:
```bash
npm run migrate
```

4. Build the service:
```bash
npm run build
```

5. Start the service:
```bash
npm start
```

## Development

1. Start in development mode:
```bash
npm run dev
```

2. Run tests:
```bash
npm test
```

3. Run linting:
```bash
npm run lint
```

## Database Schema

The service uses PostgreSQL with the following main tables:

- `payment_intents` - Payment intent records
- `transactions` - Payment transaction records
- `payment_methods` - User payment methods
- `refunds` - Refund records
- `webhook_events` - Webhook event logs for idempotency

## Payment Flow

1. **Create Payment Intent**: Client creates a payment intent with amount and service details
2. **Process Payment**: Client confirms payment with payment method
3. **Webhook Processing**: Service receives webhook from payment provider
4. **Status Updates**: Transaction status is updated and events are published
5. **Refund Processing**: If needed, refunds can be processed against successful transactions

## Security Features

- JWT-based authentication
- Input validation using Zod schemas
- SQL injection prevention with parameterized queries
- Rate limiting and CORS protection
- Webhook signature verification
- Encrypted sensitive data storage
- Audit logging for all operations

## Integration

The payment service integrates with:

- **Authentication Service**: For user authentication and authorization
- **Notification Service**: For payment status notifications
- **Other Services**: Via message queue events for payment status updates

## API Documentation

Full API documentation is available at `/docs` when the service is running.

## Testing

The service includes:

- Unit tests for business logic
- Integration tests for API endpoints
- Validation tests for input schemas
- Mock implementations for external services

Run tests with:
```bash
npm test
```

## Monitoring

The service provides:

- Health check endpoint
- Structured logging with Winston
- Payment statistics and analytics
- Error tracking and reporting

## Contributing

1. Follow the coding standards defined in the project
2. Write tests for new features
3. Update documentation as needed
4. Ensure all tests pass before submitting
