# Giga Multi-Service Platform

A comprehensive microservices platform supporting ecommerce, taxi services, hotel booking, payments, and advertising functionality.

## Architecture Overview

This platform follows a microservices architecture with the following core services:

- **API Gateway**: Central entry point for all client requests
- **Authentication Service**: User authentication and authorization
- **Payment Service**: Multi-gateway payment processing
- **Notification Service**: Multi-channel notifications (email, SMS, push)
- **Search Service**: Elasticsearch-powered search and recommendations
- **File Service**: Media upload and management
- **Analytics Service**: Business intelligence and reporting

## Project Structure

```
├── packages/
│   └── common/                 # Shared utilities and types
├── services/
│   ├── api-gateway/           # API Gateway service
│   ├── authentication-service/ # Authentication service
│   ├── payment-service/       # Payment processing service
│   ├── notification-service/  # Notification service
│   ├── search-service/        # Search and recommendations
│   ├── file-service/          # File and media management
│   └── analytics-service/     # Analytics and BI
├── docker-compose.dev.yml     # Development environment
├── docker-compose.prod.yml    # Production environment
└── migrations/                # Database migrations
```

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker and Docker Compose
- PostgreSQL 15+
- Redis 7+
- RabbitMQ 3+
- Elasticsearch 8+

## Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd giga-multi-service-platform

# Install dependencies
npm run setup
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 3. Development with Docker

```bash
# Start all services with dependencies
npm run docker:dev

# Or start individual services
npm run dev:gateway
npm run dev:auth
npm run dev:payment
```

### 4. Manual Development Setup

```bash
# Start infrastructure services
docker-compose -f docker-compose.dev.yml up postgres redis rabbitmq elasticsearch

# Build common package
npm run build:common

# Start services in development mode
npm run dev
```

## Available Scripts

### Root Level Commands

- `npm run setup` - Install dependencies and build common package
- `npm run build` - Build all packages and services
- `npm run dev` - Start all services in development mode
- `npm run test` - Run tests across all services
- `npm run lint` - Lint all code
- `npm run docker:dev` - Start development environment with Docker

### Service-Specific Commands

- `npm run dev:gateway` - Start API Gateway
- `npm run dev:auth` - Start Authentication Service
- `npm run dev:payment` - Start Payment Service
- `npm run dev:notification` - Start Notification Service
- `npm run dev:search` - Start Search Service
- `npm run dev:file` - Start File Service
- `npm run dev:analytics` - Start Analytics Service

## Service Ports

| Service | Port | Description |
|---------|------|-------------|
| API Gateway | 8000 | Main entry point |
| Authentication | 8001 | User auth and authorization |
| Payment | 8002 | Payment processing |
| Notification | 8003 | Multi-channel notifications |
| Search | 8004 | Search and recommendations |
| File | 8005 | File and media management |
| Analytics | 8006 | Analytics and BI |

## Infrastructure Services

| Service | Port | UI/Management |
|---------|------|---------------|
| PostgreSQL | 5432 | - |
| Redis | 6379 | - |
| RabbitMQ | 5672 | Management UI: http://localhost:15672 |
| Elasticsearch | 9200 | - |
| Prometheus | 9090 | UI: http://localhost:9090 |
| Grafana | 3000 | UI: http://localhost:3000 |

## Development Workflow

### 1. Adding a New Service

```bash
# Create service directory
mkdir services/new-service

# Copy package.json template
cp services/authentication-service/package.json services/new-service/
# Edit package.json with new service details

# Create TypeScript config
cp services/authentication-service/tsconfig.json services/new-service/

# Create Dockerfile
cp services/authentication-service/Dockerfile services/new-service/
```

### 2. Working with Common Package

The `@giga/common` package contains shared utilities, types, and middleware:

```typescript
import { ApiError, ApiResponseUtil, Logger } from '@giga/common';

// Use shared error handling
throw ApiError.badRequest('Invalid input');

// Use shared response utilities
return ApiResponseUtil.success(data, 'Operation successful');

// Use shared logging
Logger.info('Service started', { port: 8001 });
```

### 3. Testing

```bash
# Run all tests
npm test

# Run tests for specific service
npm test --workspace=@giga/authentication-service

# Run tests in watch mode
npm run test:watch --workspace=@giga/authentication-service
```

### 4. Linting and Code Quality

```bash
# Lint all code
npm run lint

# Fix linting issues
npm run lint:fix

# Check TypeScript compilation
npm run build
```

## Docker Development

### Development Environment

```bash
# Start all services
npm run docker:dev

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop services
npm run docker:dev:down
```

### Production Environment

```bash
# Build and start production environment
npm run docker:prod

# Stop production environment
npm run docker:prod:down
```

## Monitoring and Observability

### Prometheus Metrics

Access Prometheus at http://localhost:9090 to view metrics and create alerts.

### Grafana Dashboards

Access Grafana at http://localhost:3000 (admin/admin) for visualization dashboards.

### Application Logs

All services use structured JSON logging. View logs with:

```bash
# View all service logs
docker-compose -f docker-compose.dev.yml logs -f

# View specific service logs
docker-compose -f docker-compose.dev.yml logs -f authentication-service
```

## API Documentation

Each service exposes OpenAPI/Swagger documentation:

- API Gateway: http://localhost:8000/docs
- Authentication: http://localhost:8001/docs
- Payment: http://localhost:8002/docs
- Notification: http://localhost:8003/docs
- Search: http://localhost:8004/docs
- File: http://localhost:8005/docs
- Analytics: http://localhost:8006/docs

## Contributing

1. Follow the established coding standards (see .eslintrc.js)
2. Write tests for new functionality
3. Update documentation as needed
4. Use conventional commit messages
5. Ensure all services build and tests pass

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure no other services are running on the required ports
2. **Database connection**: Verify PostgreSQL is running and credentials are correct
3. **Memory issues**: Increase Docker memory allocation if services fail to start
4. **Permission errors**: Ensure proper file permissions for Docker volumes

### Health Checks

Each service exposes a health check endpoint:

```bash
curl http://localhost:8001/health  # Authentication service
curl http://localhost:8002/health  # Payment service
# ... etc
```

### Logs and Debugging

Enable debug logging by setting `LOG_LEVEL=debug` in your .env file.

## License

MIT License - see LICENSE file for details.