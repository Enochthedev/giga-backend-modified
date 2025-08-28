# Multi-Service Platform

A comprehensive microservices platform built with Node.js, TypeScript, and modern cloud-native technologies. The platform provides e-commerce, hotel booking, taxi services, payment processing, and more through a scalable microservices architecture.

## 🚀 Quick Start

### Option 1: Essential Services (Recommended for Development)

Start core services with minimal resource usage:

```bash
# Clone the repository
git clone <repository-url>
cd multi-service-platform

# Copy environment file and configure
cp .env.example .env

# Start essential services
./start-platform.sh essential
```

### Option 2: Full Platform

Start all services including monitoring and analytics:

```bash
# Start everything
./start-platform.sh full
```

### Option 3: Custom Configuration

Start specific service combinations:

```bash
# Core services + search functionality
./start-platform.sh search

# Core services + admin panel
./start-platform.sh admin

# Core services + monitoring
./start-platform.sh monitoring

# Infrastructure only (for local development)
./start-platform.sh infra
```

## 📋 Prerequisites

- **Docker**: Docker Desktop 20.10+ or Docker Engine 20.10+
- **Docker Compose**: 2.0+
- **Node.js**: 18+ (for local development)
- **pnpm**: 8+ (recommended) or npm/yarn

## 🏗️ Architecture

The platform consists of 12 microservices organized into logical groups:

### Core Services
- **API Gateway** (Port 3000) - Main entry point, routing, and load balancing
- **Authentication Service** (Port 3001) - User authentication and authorization

### Business Services
- **E-commerce Service** (Port 3002) - Product catalog, cart, and order management
- **Payment Service** (Port 3003) - Payment processing and transaction management
- **Taxi Service** (Port 3004) - Ride booking and driver management
- **Hotel Service** (Port 3005) - Hotel booking and reservation management
- **Advertisement Service** (Port 3006) - Advertisement campaigns and analytics

### Support Services
- **Notification Service** (Port 3007) - Email, SMS, and push notifications
- **File Service** (Port 3008) - File upload, storage, and management
- **Search Service** (Port 3009) - Full-text search and indexing
- **Admin Service** (Port 3010) - Administrative dashboard and management
- **Analytics Service** (Port 3011) - Data analytics and reporting
- **Messaging Service** (Port 3012) - Real-time chat and messaging

### Infrastructure
- **PostgreSQL** (Port 5432) - Primary database
- **Redis** (Port 6379) - Cache and session storage
- **RabbitMQ** (Port 5672) - Message queue and event streaming
- **Elasticsearch** (Port 9200) - Search engine and log storage

## 🐳 Docker Configuration

### Service Profiles

The platform uses Docker Compose profiles for flexible deployment:

- **default**: Core services (gateway, auth, ecommerce, payment, taxi, hotel, advertisement, notification, file)
- **full**: All services including search, admin, analytics, messaging, and monitoring
- **search**: Adds search service and Elasticsearch
- **admin**: Adds admin service
- **analytics**: Adds analytics service
- **messaging**: Adds messaging service
- **monitoring**: Adds Prometheus and Grafana

### Quick Commands

```bash
# Start essential services
./start-platform.sh essential

# Start all services
./start-platform.sh full

# Stop all services
./start-platform.sh stop

# View service status
./start-platform.sh status

# View logs
./start-platform.sh logs

# Clean environment (removes all data)
./start-platform.sh clean
```

### Manual Docker Compose

```bash
# Start core services
docker-compose up -d

# Start with specific profile
docker-compose --profile full up -d

# Start specific services
docker-compose up -d postgres redis api-gateway authentication-service
```

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Core configuration
NODE_ENV=development
POSTGRES_PASSWORD=password
JWT_SECRET=your-super-secret-jwt-key

# Service ports (optional, defaults provided)
API_GATEWAY_PORT=3000
AUTH_SERVICE_PORT=3001

# External services
STRIPE_SECRET_KEY=sk_test_your_stripe_key
SENDGRID_API_KEY=SG.your_sendgrid_key
AWS_ACCESS_KEY_ID=your_aws_key
```

### Service URLs

| Service | URL | Health Check | Description |
|---------|-----|--------------|-------------|
| API Gateway | http://localhost:3000 | `/health` | Main entry point |
| Authentication | http://localhost:3001 | `/health` | User auth |
| E-commerce | http://localhost:3002 | `/health` | Products & orders |
| Payment | http://localhost:3003 | `/health` | Payment processing |
| Taxi | http://localhost:3004 | `/health` | Ride booking |
| Hotel | http://localhost:3005 | `/health` | Hotel booking |
| Advertisement | http://localhost:3006 | `/health` | Ad management |
| Notification | http://localhost:3007 | `/health` | Notifications |
| File Service | http://localhost:3008 | `/health` | File management |
| Search | http://localhost:3009 | `/health` | Search functionality |
| Admin | http://localhost:3010 | `/health` | Admin dashboard |
| Analytics | http://localhost:3011 | `/health` | Data analytics |
| Messaging | http://localhost:3012 | `/health` | Real-time messaging |

### Infrastructure URLs

| Service | URL | Credentials | Description |
|---------|-----|-------------|-------------|
| PostgreSQL | localhost:5432 | postgres/password | Database |
| Redis | localhost:6379 | - | Cache |
| RabbitMQ | localhost:5672 | admin/password | Message queue |
| RabbitMQ Management | http://localhost:15672 | admin/password | Queue management |
| Elasticsearch | http://localhost:9200 | - | Search engine |
| Prometheus | http://localhost:9090 | - | Metrics |
| Grafana | http://localhost:3100 | admin/admin123 | Dashboards |

## 🧪 Testing

### Health Checks

```bash
# Check all services via API Gateway
curl http://localhost:3000/health

# Check specific service
curl http://localhost:3001/health

# Check infrastructure
curl http://localhost:9200/_cluster/health
```

### Run Tests

```bash
# Run all tests
pnpm test

# Run tests for specific service
pnpm test --workspace=@platform/authentication-service

# Run tests with coverage
pnpm run test:coverage
```

## 🔍 Development

### Local Development Setup

1. **Start Infrastructure**
   ```bash
   ./start-platform.sh infra
   ```

2. **Set Environment Variables**
   ```bash
   export DATABASE_URL="postgresql://postgres:password@localhost:5432/auth_db"
   export REDIS_URL="redis://localhost:6379"
   ```

3. **Run Service Locally**
   ```bash
   cd services/authentication-service
   pnpm install
   pnpm run dev
   ```

### Mixed Development

Run some services in Docker, others locally:

```bash
# Start infrastructure and some services
docker-compose up -d postgres redis api-gateway

# Run auth service locally for development
cd services/authentication-service
pnpm run dev
```

### API Documentation

Each service provides Swagger documentation:

- **API Gateway**: http://localhost:3000/api-docs
- **Authentication**: http://localhost:3001/api-docs
- **E-commerce**: http://localhost:3002/api-docs
- **Payment**: http://localhost:3003/api-docs

## 🚀 Deployment

### Development

```bash
# Start development environment
./start-platform.sh full
```

### Production

For production deployment, see the Kubernetes configuration:

```bash
# Deploy to Kubernetes
kubectl apply -f k8s/manifests/

# Or use Helm
helm install platform ./k8s/charts/multi-service-platform/
```

### Docker Swarm

```bash
# Deploy to Docker Swarm
docker stack deploy -c docker-compose.yml platform
```

## 📊 Monitoring

### Built-in Monitoring

- **Health Endpoints**: `/health` on each service
- **Metrics**: `/metrics` for Prometheus
- **Logs**: Structured JSON logging with correlation IDs

### Monitoring Stack

Start with monitoring profile:

```bash
./start-platform.sh monitoring
```

Access monitoring tools:
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3100 (admin/admin123)

### Key Metrics

- Request rate and latency
- Error rates and types
- Database connection pools
- Cache hit rates
- Queue depths and processing times

## 🔒 Security

### Authentication

- JWT-based authentication with refresh tokens
- OAuth integration (Google, Facebook, Apple)
- Role-based access control (RBAC)
- API key authentication for service-to-service communication

### Security Features

- Input validation and sanitization
- Rate limiting and DDoS protection
- CORS configuration
- Security headers (HSTS, CSP, etc.)
- Encrypted data storage
- Audit logging

## 🛠️ Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Find and kill process
   lsof -ti :3000 | xargs kill
   ```

2. **Service Won't Start**
   ```bash
   # Check logs
   docker-compose logs authentication-service
   
   # Check service status
   ./start-platform.sh status
   ```

3. **Database Connection Issues**
   ```bash
   # Check PostgreSQL
   docker exec -it multi-service-postgres psql -U postgres
   
   # Reset database
   ./start-platform.sh clean
   ```

4. **Memory Issues**
   ```bash
   # Check Docker resource usage
   docker stats
   
   # Increase Docker memory in Docker Desktop settings
   ```

### Reset Environment

```bash
# Stop and remove everything (WARNING: deletes all data)
./start-platform.sh clean

# Start fresh
./start-platform.sh essential
```

### Debug Mode

```bash
# Enable debug logging
export DEBUG=true
export LOG_LEVEL=debug

# Start services
./start-platform.sh essential
```

## 📚 Documentation

### Quick Start Guides

- **[Mobile & Frontend Setup](./docs/MOBILE_FRONTEND_SETUP.md)** - For mobile and frontend developers
- **[Individual Service Setup](./docs/INDIVIDUAL_SERVICE_SETUP.md)** - Run services individually
- **[Quick Reference](./docs/QUICK_REFERENCE.md)** - Commands, ports, and troubleshooting
- **[Migration Guide](./docs/MIGRATION_GUIDE.md)** - Migrating from old setup

### Deployment Guides

- **[Production Deployment](./docs/PRODUCTION_DEPLOYMENT.md)** - Complete production deployment guide
- **[Kubernetes Deployment](./k8s/README-KUBERNETES-DEPLOYMENT.md)** - Enterprise Kubernetes setup

### Service Documentation

Each service has comprehensive documentation in its directory:

- [Authentication Service](./services/authentication-service/README.md)
- [E-commerce Service](./services/ecommerce-service/README.md)
- [Payment Service](./services/payment-service/README.md)
- [Taxi Service](./services/taxi-service/README.md)
- [Hotel Service](./services/hotel-service/README.md)
- [And more...](./services/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Update documentation
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Development Standards

- Follow TypeScript best practices
- Write comprehensive tests (aim for >80% coverage)
- Update documentation for any API changes
- Use conventional commit messages
- Ensure all services have health checks
- Follow REST API conventions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check service-specific README files
- **Issues**: Create GitHub issues for bugs or feature requests
- **Health Checks**: Use `./start-platform.sh status` to check service health
- **Logs**: Use `./start-platform.sh logs` to view service logs

## 🔗 Quick Reference

### Essential Commands

```bash
# Start platform
./start-platform.sh essential

# Check status
./start-platform.sh status

# View logs
./start-platform.sh logs

# Stop platform
./start-platform.sh stop

# Clean environment
./start-platform.sh clean
```

### Service Health Checks

```bash
# Check all services
curl http://localhost:3000/health

# Check specific services
for port in 3001 3002 3003 3004 3005; do
  echo "Service on port $port:"
  curl -s http://localhost:$port/health | jq .
done
```

### Database Access

```bash
# Connect to PostgreSQL
docker exec -it multi-service-postgres psql -U postgres -d multi_service_platform

# Connect to Redis
docker exec -it multi-service-redis redis-cli

# Check Elasticsearch
curl http://localhost:9200/_cluster/health?pretty
```

---

**Happy coding! 🚀**

For detailed setup instructions, see the individual service documentation in the `services/` directory.