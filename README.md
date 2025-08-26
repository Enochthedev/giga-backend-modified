# Giga Multi-Service Platform

A comprehensive microservices platform built with Node.js, TypeScript, and modern cloud-native technologies. The platform provides e-commerce, hotel booking, taxi services, payment processing, and more through a scalable microservices architecture.

## 🚀 Quick Start

### Option 1: Full Development Environment (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd giga-backend-modified

# Install dependencies
npm install

# Start all services with Docker
npm run docker:dev

# Or manually:
docker-compose -f docker-compose.dev.yml up -d
```

### Option 2: Essential Services Only

For development with minimal resource usage:

```bash
# Start core infrastructure and essential services
./start-essential-platform.sh

# Or manually:
docker-compose -f docker-compose.essential.yml up -d
```

### Option 3: Local Development

Run services locally without Docker:

```bash
# Install dependencies
pnpm install

# Build common package
pnpm run build:common

# Start individual services
pnpm run dev:auth      # Authentication service on port 8001
pnpm run dev:admin     # Admin service on port 3006
pnpm run dev:gateway   # API Gateway on port 3000
```

## 📋 Prerequisites

- **Docker**: Docker Desktop 20.10+ or Docker Engine 20.10+
- **Node.js**: 18+ 
- **PostgreSQL**: 12+ (or use Docker)
- **Redis**: 6+ (or use Docker)
- **pnpm**: 8+ or yarn

## 🏗️ Architecture

The platform consists of 13 microservices:

### Core Services
- **API Gateway** (Port 3000) - Main entry point and routing
- **Authentication Service** (Port 8001) - User auth & management
- **Admin Service** (Port 3006) - Administrative functions

### Business Services
- **E-commerce Service** (Port 8002) - Product & order management
- **Hotel Service** (Port 8003) - Hotel booking & management
- **Taxi Service** (Port 8004) - Ride booking & management
- **Payment Service** (Port 8005) - Payment processing
- **Advertisement Service** (Port 8010) - Ad management

### Support Services
- **Notification Service** (Port 8006) - Push notifications
- **Search Service** (Port 8007) - Search functionality
- **File Service** (Port 8008) - File upload/download
- **Analytics Service** (Port 8009) - Data analytics
- **Messaging Service** (Port 8011) - Chat & messaging

### Infrastructure
- **PostgreSQL** (Port 5432) - Primary database
- **Redis** (Port 6379) - Cache & sessions
- **RabbitMQ** (Port 5672) - Message queue
- **Elasticsearch** (Port 9200) - Search engine

## 🐳 Docker Setup

### Quick Commands

```bash
# Start all services
docker-compose -f docker-compose.dev.yml up -d

# Start specific service
docker-compose -f docker-compose.dev.yml up -d authentication-service

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop all services
docker-compose -f docker-compose.dev.yml down

# Reset environment (WARNING: deletes all data)
docker-compose -f docker-compose.dev.yml down -v
```

### Docker Compose Files

- **`docker-compose.essential.yml`** - Core services only
- **`docker-compose.dev.yml`** - Full development environment
- **`docker-compose.prod.yml`** - Production configuration

For detailed Docker setup instructions, see [DOCKER_SETUP_GUIDE.md](./DOCKER_SETUP_GUIDE.md).

## 🔧 Local Development

### 1. Start Infrastructure

```bash
# Start databases and caches
docker-compose -f docker-compose.essential.yml up -d postgres redis rabbitmq
```

### 2. Set Environment Variables

```bash
# Database connection
export DATABASE_URL="postgresql://postgres:password@localhost:5432/auth_db"
export REDIS_URL="redis://localhost:6379"

# Service URLs
export AUTH_SERVICE_URL="http://localhost:8001"
export ADMIN_SERVICE_URL="http://localhost:3006"
```

### 3. Run Services Locally

```bash
# Authentication Service
cd services/authentication-service
pnpm install
pnpm run dev

# Admin Service
cd services/admin-service
pnpm install
pnpm run dev

# API Gateway
cd services/api-gateway
pnpm install
pnpm run dev
```

## 📚 Documentation

### Service Documentation

Each service has comprehensive documentation:

- [Authentication Service](./services/authentication-service/README.md)
- [Admin Service](./services/admin-service/README.md)
- [API Gateway](./services/api-gateway/README.md)
- [E-commerce Service](./services/ecommerce-service/README.md)
- [Hotel Service](./services/hotel-service/README.md)
- [Taxi Service](./services/taxi-service/README.md)
- [Payment Service](./services/payment-service/README.md)
- [Notification Service](./services/notification-service/README.md)
- [Search Service](./services/search-service/README.md)
- [File Service](./services/file-service/README.md)
- [Analytics Service](./services/analytics-service/README.md)
- [Advertisement Service](./services/advertisement-service/README.md)
- [Messaging Service](./services/messaging-service/README.md)

### Platform Documentation

- [Docker Setup Guide](./DOCKER_SETUP_GUIDE.md) - Complete Docker setup instructions
- [Architecture Overview](./docs/architecture.md) - System architecture details
- [Development Guide](./docs/development/DEVELOPMENT_DOCS.md) - Development guidelines
- [API Documentation](./docs/architecture/SWAGGER_AND_TYPES_SUMMARY.md) - API specifications

## 🧪 Testing

### Run All Tests

```bash
# Run tests for all services
pnpm test

# Run tests with coverage
pnpm run test:coverage

# Run specific service tests
pnpm test --workspace=@giga/authentication-service
```

### Health Checks

```bash
# Check all services
curl http://localhost:3000/health

# Check specific service
curl http://localhost:8001/health
curl http://localhost:3006/health
```

## 🔍 Monitoring

### Metrics & Health

- **Health Endpoints**: `/health` on each service
- **Metrics**: `/metrics` for Prometheus monitoring
- **API Documentation**: `/api-docs` for Swagger UI

### Logs

```bash
# View service logs
docker-compose -f docker-compose.dev.yml logs -f authentication-service

# View all logs
docker-compose -f docker-compose.dev.yml logs -f
```

## 🚀 Deployment

### Development

```bash
# Start development environment
pnpm run docker:dev

# Or manually
docker-compose -f docker-compose.dev.yml up -d
```

### Production

```bash
# Start production environment
pnpm run docker:prod

# Or manually
docker-compose -f docker-compose.prod.yml up -d
```

### Kubernetes

Kubernetes manifests are available in the `k8s/` directory:

```bash
# Deploy to Kubernetes
kubectl apply -f k8s/manifests/

# Or use Helm charts
helm install giga-platform ./k8s/charts/multi-service-platform/
```

## 🛠️ Development Workflow

### 1. Start Infrastructure

```bash
docker-compose -f docker-compose.essential.yml up -d postgres redis
```

### 2. Run Services Locally

```bash
# Set environment variables
export DATABASE_URL="postgresql://postgres:password@localhost:5432/auth_db"

# Start service
cd services/authentication-service
npm run dev
```

### 3. Mix Local and Docker

```bash
# Some services in Docker, others locally
docker-compose -f docker-compose.dev.yml up -d api-gateway
pnpm run dev:auth  # Run auth service locally
```

## 🔧 Configuration

### Environment Variables

Key environment variables for each service:

```bash
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/database_name

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-here

# Service URLs
AUTH_SERVICE_URL=http://localhost:8001
ADMIN_SERVICE_URL=http://localhost:3006
```

### Service Configuration

Each service has its own configuration file and environment variables. See individual service README files for complete configuration details.

## 🚨 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   lsof -ti :8001 | xargs kill
   ```

2. **Database Connection Error**
   - Ensure PostgreSQL is running
   - Check DATABASE_URL format
   - Verify database exists

3. **Service Won't Start**
   - Check service logs: `docker logs <container_name>`
   - Verify environment variables
   - Check dependencies

### Reset Environment

```bash
# Stop all services
docker-compose -f docker-compose.dev.yml down

# Remove volumes (WARNING: deletes all data)
docker-compose -f docker-compose.dev.yml down -v

# Start fresh
docker-compose -f docker-compose.dev.yml up -d
```

## 📖 API Usage

### Authentication

```bash
# Register user
curl -X POST http://localhost:8001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","firstName":"John","lastName":"Doe"}'

# Login
curl -X POST http://localhost:8001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### Products

```bash
# Get products
curl http://localhost:8002/products

# Search products
curl "http://localhost:8002/products/search?q=laptop&category=electronics"
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Update documentation
6. Submit a pull request

### Development Standards

- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation
- Follow REST API conventions
- Use proper error handling

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the service-specific README files
- **Issues**: Create GitHub issues for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas

## 🔗 Quick Links

- [Docker Setup Guide](./DOCKER_SETUP_GUIDE.md)
- [Service Documentation](./services/)
- [Architecture Overview](./docs/architecture.md)
- [Development Guide](./docs/development/DEVELOPMENT_DOCS.md)
- [API Documentation](./docs/architecture/SWAGGER_AND_TYPES_SUMMARY.md)

---

**Happy coding! 🚀**