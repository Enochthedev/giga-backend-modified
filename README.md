# Giga Multi-Service Platform

A comprehensive microservices platform supporting ecommerce, taxi services, hotel booking, payments, and advertising functionality. This platform has been modernized from legacy services into a scalable, maintainable microservices architecture.

## 🏗️ Architecture Overview

### Modern Services Architecture
- **API Gateway** (Port 8000): Central entry point with routing and rate limiting
- **Authentication Service** (Port 8001): JWT/OAuth authentication with Google & Apple
- **Payment Service** (Port 8002): Multi-gateway payment processing (Stripe, PayPal)
- **Taxi Service** (Port 8003): Unified ride booking and driver management
- **Notification Service** (Port 8004): Multi-channel notifications (email, SMS, push)
- **Search Service** (Port 8005): Elasticsearch-powered search and recommendations
- **File Service** (Port 8006): Cloud storage and media processing
- **Analytics Service** (Port 8007): Business intelligence and reporting
- **Admin Service** (Port 8008): Administrative dashboard and management

### Legacy Services (Being Migrated)
- **E-commerce Backend** (Port 4000): Product catalog, orders, vendor management
- **Hotel Service** (Port 4001): Property booking and management
- **Advertisement Service** (Port 4003): Ad campaigns and analytics

### Infrastructure
- **PostgreSQL**: Primary database for all services
- **Redis**: Caching and session storage
- **RabbitMQ**: Message queue for inter-service communication
- **Elasticsearch**: Search engine and analytics
- **Prometheus + Grafana**: Monitoring and observability

## 📁 Project Structure

```
├── packages/
│   └── common/                    # Shared utilities, types, and middleware
├── services/                      # Modern microservices
│   ├── api-gateway/              # Central routing and authentication
│   ├── authentication-service/   # User auth with OAuth support
│   ├── payment-service/          # Multi-gateway payment processing
│   ├── taxi-service/             # Unified taxi and driver management
│   ├── notification-service/     # Multi-channel notifications
│   ├── search-service/           # Elasticsearch-based search
│   ├── file-service/             # Cloud storage and media
│   ├── analytics-service/        # Business intelligence
│   └── admin-service/            # Administrative dashboard
├── ecommerce-backend/            # Legacy e-commerce (being migrated)
├── hotel-service/                # Legacy hotel service (being migrated)
├── advertisement-service/        # Legacy ads service (being migrated)
├── giga_taxi_main/              # Legacy taxi service (consolidated)
├── giga_taxi_driver/            # Legacy driver service (consolidated)
├── docs/                         # Documentation
│   ├── architecture/            # Architecture documentation
│   ├── development/             # Development guides
│   ├── deployment/              # Deployment and CI/CD
│   └── migration/               # Migration documentation
├── scripts/                      # Utility and deployment scripts
├── k8s/                         # Kubernetes deployment configs
├── docker-compose.dev.yml       # Development environment
├── docker-compose.essential.yml # Essential services only
└── docker-compose.legacy.yml    # Legacy services (reference)
```

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker and Docker Compose
- PostgreSQL 15+
- Redis 7+
- RabbitMQ 3+
- Elasticsearch 8+

## 🚀 Quick Start

### Option 1: Full Development Environment (Recommended)

```bash
# 1. Clone and setup
git clone <repository-url>
cd giga-multi-service-platform
npm run setup

# 2. Configure environment
cp .env.example .env
# Edit .env with your configuration

# 3. Start all services
docker-compose -f docker-compose.dev.yml up -d

# 4. Verify services are running
npm run health:check
```

### Option 2: Essential Services Only

```bash
# Start only core services (faster startup)
docker-compose -f docker-compose.essential.yml up -d
```

### Option 3: Manual Development

```bash
# Start infrastructure only
docker-compose -f docker-compose.dev.yml up postgres redis rabbitmq elasticsearch -d

# Build common package
npm run build:common

# Start individual services
npm run dev:auth
npm run dev:payment
npm run dev:gateway
```

### 🔍 Verify Installation

```bash
# Check service health
curl http://localhost:8001/health  # Authentication
curl http://localhost:8002/health  # Payment
curl http://localhost:8000/health  # API Gateway

# Access documentation
open http://localhost:8001/docs    # Authentication API docs
open http://localhost:15672        # RabbitMQ Management (guest/guest)
open http://localhost:3000         # Grafana (admin/admin)
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

## 🌐 Service Ports & URLs

### Modern Services
| Service | Port | Health | Docs | Description |
|---------|------|--------|------|-------------|
| API Gateway | 8000 | `/health` | `/docs` | Central routing and rate limiting |
| Authentication | 8001 | `/health` | `/docs` | JWT/OAuth authentication |
| Payment | 8002 | `/health` | `/docs` | Multi-gateway payment processing |
| Taxi | 8003 | `/health` | `/docs` | Unified ride and driver management |
| Notification | 8004 | `/health` | `/docs` | Email, SMS, push notifications |
| Search | 8005 | `/health` | `/docs` | Elasticsearch-based search |
| File | 8006 | `/health` | `/docs` | Cloud storage and media |
| Analytics | 8007 | `/health` | `/docs` | Business intelligence |
| Admin | 8008 | `/health` | `/docs` | Administrative dashboard |

### Legacy Services (Being Migrated)
| Service | Port | Status | Migration Target |
|---------|------|--------|------------------|
| E-commerce | 4000 | 🔄 Active | → New E-commerce Service |
| Hotel | 4001 | 🔄 Active | → New Hotel Service |
| Advertisement | 4003 | 🔄 Active | → New Advertisement Service |
| Giga Main | - | ✅ Migrated | → Authentication Service |
| Taxi Main/Driver | - | ✅ Migrated | → Taxi Service |
| Payment (Legacy) | - | ✅ Migrated | → Payment Service |

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