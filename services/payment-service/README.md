# Payment Service

A comprehensive payment processing service that handles multiple payment gateways, transaction management, and financial operations for the Giga platform.

## Features

- **Multiple Payment Gateways**: Support for Stripe, PayPal, and other payment providers
- **Transaction Management**: Complete transaction lifecycle management
- **Refund Processing**: Automated and manual refund handling
- **Payment Methods**: Support for cards, digital wallets, and bank transfers
- **Webhook Handling**: Secure webhook processing for payment events
- **Real-time Notifications**: Event-driven payment status updates
- **Comprehensive Logging**: Detailed audit trails for all payment operations
- **Health Monitoring**: Built-in health checks and monitoring endpoints

## Architecture

The service follows a modern microservice architecture with:

- **Express.js** for HTTP server and API endpoints
- **PostgreSQL** for persistent data storage
- **RabbitMQ** for event-driven messaging
- **Common Package** for shared utilities and middleware
- **Swagger/OpenAPI** for API documentation
- **Jest** for comprehensive testing

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL 13+
- RabbitMQ 3.8+
- Docker (optional, for containerized deployment)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Run database migrations:
```bash
npm run migrate
```

4. Start the service:
```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

### Environment Configuration

Key environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `4002` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `STRIPE_SECRET_KEY` | Stripe secret key | Required |
| `RABBITMQ_URL` | RabbitMQ connection string | `amqp://localhost:5672` |
| `JWT_SECRET` | JWT signing secret | Required |

See `.env.example` for complete configuration options.

## API Documentation

Once the service is running, API documentation is available at:
- **Swagger UI**: `http://localhost:4002/docs`
- **Health Check**: `http://localhost:4002/health`
- **Readiness Check**: `http://localhost:4002/ready`

## API Endpoints

### Core Payment Operations

- `POST /api/v1/payment-intents` - Create payment intent
- `POST /api/v1/payments` - Process payment
- `GET /api/v1/payments/:id` - Get payment details
- `POST /api/v1/refunds` - Process refund
- `GET /api/v1/payment-methods` - List payment methods

### Webhook Endpoints

- `POST /webhooks/stripe` - Stripe webhook handler
- `POST /webhooks/paypal` - PayPal webhook handler

### Administrative

- `GET /admin/transactions` - List all transactions
- `GET /admin/analytics` - Payment analytics

## Database Schema

The service uses PostgreSQL with the following main tables:

- `payments` - Payment records and status
- `payment_intents` - Payment intent tracking
- `refunds` - Refund records
- `payment_methods` - Stored payment methods
- `transactions` - Transaction audit log

## Event System

The service publishes events to RabbitMQ for:

- Payment status changes
- Refund processing
- Failed transactions
- Webhook events

Event topics follow the pattern: `payment.{action}.{status}`

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Development

### Code Structure

```
src/
├── config/           # Service configuration
├── controllers/      # HTTP request handlers
├── services/         # Business logic
├── models/          # Data models and types
├── routes/          # API route definitions
├── middleware/      # Custom middleware
├── database/        # Database migrations and utilities
├── validation/      # Request validation schemas
├── utils/           # Utility functions
└── tests/           # Test files
```

### Adding New Payment Gateways

1. Create gateway service in `src/services/gateways/`
2. Implement the `PaymentGateway` interface
3. Add configuration to `service-config.ts`
4. Register webhook handlers
5. Add tests for the new gateway

### Database Migrations

```bash
# Create new migration
npm run migrate:create migration_name

# Run migrations
npm run migrate

# Rollback last migration
npm run migrate:rollback

# Check migration status
npm run migrate:status
```

## Deployment

### Docker

```bash
# Build image
docker build -t payment-service .

# Run container
docker run -p 4002:4002 --env-file .env payment-service
```

### Kubernetes

Helm charts are available in the `k8s/` directory:

```bash
helm install payment-service ./k8s/charts/payment-service
```

## Monitoring and Observability

The service includes:

- **Health Checks**: `/health` and `/ready` endpoints
- **Structured Logging**: JSON formatted logs with correlation IDs
- **Metrics**: Performance and business metrics
- **Error Tracking**: Comprehensive error handling and reporting

## Security

- **Input Validation**: All inputs validated using Joi schemas
- **Authentication**: JWT-based authentication
- **Rate Limiting**: Request rate limiting and throttling
- **Webhook Verification**: Cryptographic verification of webhooks
- **PCI Compliance**: Secure handling of payment data

## Contributing

1. Follow the coding standards in `.kiro/steering/coding-standards.md`
2. Write tests for new features
3. Update documentation
4. Ensure all checks pass before submitting PR

## Support

For issues and questions:
- Check the API documentation at `/docs`
- Review logs for error details
- Contact the backend team

## License

Internal use only - Giga Platform