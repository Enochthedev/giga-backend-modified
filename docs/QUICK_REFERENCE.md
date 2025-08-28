# 🚀 Quick Reference Guide

## 📍 Service Ports & URLs

| Service | Port | Health Check | API Docs | Description |
|---------|------|--------------|----------|-------------|
| **API Gateway** | `3000` | `/health` | `/api-docs` | Main entry point and routing |
| **Authentication** | `3001` | `/health` | `/api-docs` | User auth & management |
| **E-commerce** | `3002` | `/health` | `/api-docs` | Product catalog & orders |
| **Payment** | `3003` | `/health` | `/api-docs` | Payment processing |
| **Taxi** | `3004` | `/health` | `/api-docs` | Ride booking & management |
| **Hotel** | `3005` | `/health` | `/api-docs` | Hotel booking system |
| **Advertisement** | `3006` | `/health` | `/api-docs` | Ad management |
| **Notification** | `3007` | `/health` | `/api-docs` | Email, SMS, push notifications |
| **File Service** | `3008` | `/health` | `/api-docs` | File upload & management |
| **Search** | `3009` | `/health` | `/api-docs` | Search functionality |
| **Admin** | `3010` | `/health` | `/api-docs` | Admin dashboard |
| **Analytics** | `3011` | `/health` | `/api-docs` | Data analytics |
| **Messaging** | `3012` | `/health` | `/api-docs` | Real-time messaging |

## 🗄️ Infrastructure Services

| Service | Port | Access | Credentials | Management UI |
|---------|------|--------|-------------|---------------|
| **PostgreSQL** | `5432` | Database | `postgres:password` | - |
| **Redis** | `6379` | Cache | No auth (dev) | - |
| **RabbitMQ** | `5672` | Message Queue | `admin:password` | http://localhost:15672 |
| **Elasticsearch** | `9200` | Search Engine | No auth (dev) | - |
| **Prometheus** | `9090` | Metrics | No auth (dev) | http://localhost:9090 |
| **Grafana** | `3100` | Dashboards | `admin:admin123` | http://localhost:3100 |

## 🚀 Quick Commands

### Platform Management
```bash
# Start essential services (minimal resources)
./start-platform.sh essential

# Start all services
./start-platform.sh full

# Start with specific features
./start-platform.sh search      # Core + search
./start-platform.sh admin       # Core + admin
./start-platform.sh monitoring  # Core + monitoring

# Infrastructure only
./start-platform.sh infra

# Stop all services
./start-platform.sh stop

# View status
./start-platform.sh status

# View logs
./start-platform.sh logs

# Clean environment (deletes data)
./start-platform.sh clean
```

### Docker Compose Commands
```bash
# Start specific services
docker-compose up -d postgres redis api-gateway

# View logs for specific service
docker-compose logs -f authentication-service

# Restart specific service
docker-compose restart payment-service

# Scale service
docker-compose up -d --scale ecommerce-service=3

# Stop specific service
docker-compose stop taxi-service
```

## 🔍 Health Checks & Testing

### Quick Health Check
```bash
# Check all services via API Gateway
curl http://localhost:3000/health

# Check specific service
curl http://localhost:3001/health

# Check all core services
for port in 3001 3002 3003 3004 3005 3006 3007 3008; do
  echo "Port $port: $(curl -s http://localhost:$port/health | jq -r '.status // "ERROR"')"
done
```

### Infrastructure Health
```bash
# PostgreSQL
docker exec -it multi-service-postgres pg_isready -U postgres

# Redis
docker exec -it multi-service-redis redis-cli ping

# RabbitMQ
curl -u admin:password http://localhost:15672/api/aliveness-test/%2F

# Elasticsearch
curl http://localhost:9200/_cluster/health?pretty
```

## 🧪 Testing Commands

```bash
# Run all tests
pnpm test

# Run tests for specific service
pnpm test --workspace=@platform/authentication-service

# Run tests with coverage
pnpm run test:coverage

# Run integration tests
pnpm run test:integration

# Test specific endpoint
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 🔧 Development Workflow

### Local Development Setup
```bash
# 1. Start infrastructure only
./start-platform.sh infra

# 2. Set environment variables
export DATABASE_URL="postgresql://postgres:password@localhost:5432/auth_db"
export REDIS_URL="redis://localhost:6379"

# 3. Run service locally
cd services/authentication-service
pnpm install
pnpm run dev
```

### Mixed Development (Some Docker, Some Local)
```bash
# Start infrastructure and some services in Docker
docker-compose up -d postgres redis api-gateway

# Run specific service locally for development
cd services/authentication-service
pnpm run dev
```

### Environment Variables
```bash
# Core variables
export NODE_ENV=development
export DATABASE_URL=postgresql://postgres:password@localhost:5432/auth_db
export REDIS_URL=redis://localhost:6379
export JWT_SECRET=your-super-secret-jwt-key

# Service URLs (for inter-service communication)
export AUTH_SERVICE_URL=http://localhost:3001
export PAYMENT_SERVICE_URL=http://localhost:3003
```

## 🐛 Troubleshooting

### Common Issues & Solutions

#### Port Already in Use
```bash
# Find process using port
lsof -i :3000

# Kill process
lsof -ti :3000 | xargs kill

# Or use different port
API_GATEWAY_PORT=3001 ./start-platform.sh essential
```

#### Service Won't Start
```bash
# Check logs
docker-compose logs authentication-service

# Check container status
docker ps -a

# Restart service
docker-compose restart authentication-service

# Rebuild service
docker-compose build authentication-service
docker-compose up -d authentication-service
```

#### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Test connection
docker exec -it multi-service-postgres psql -U postgres -d multi_service_platform

# Reset database
docker-compose down postgres
docker volume rm multi-service-platform_postgres_data
docker-compose up -d postgres
```

#### Memory/Resource Issues
```bash
# Check resource usage
docker stats

# Clean up unused resources
docker system prune -f

# Increase Docker memory limit in Docker Desktop
# Or start with fewer services
./start-platform.sh essential
```

### Reset Everything
```bash
# Nuclear option - removes all data
./start-platform.sh clean

# Or manually
docker-compose down -v
docker system prune -a
docker-compose up -d
```

## 📱 API Testing Examples

### Authentication Flow
```bash
# Register user
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'

# Use token for authenticated requests
TOKEN="your-jwt-token"
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/auth/profile
```

### E-commerce Operations
```bash
# Get products
curl http://localhost:3002/products

# Search products
curl "http://localhost:3002/products/search?q=laptop&category=electronics"

# Create order (requires authentication)
curl -X POST http://localhost:3002/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"productId": "123", "quantity": 2}],
    "shippingAddress": "123 Main St"
  }'
```

### Payment Processing
```bash
# Process payment
curl -X POST http://localhost:3003/payments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 2999,
    "currency": "USD",
    "paymentMethod": "card",
    "orderId": "order-123"
  }'
```

## 📊 Monitoring & Observability

### Metrics Access
```bash
# Service metrics (Prometheus format)
curl http://localhost:3001/metrics

# System metrics
curl http://localhost:9090/api/v1/query?query=up

# Custom business metrics
curl http://localhost:3002/metrics | grep order_total
```

### Log Analysis
```bash
# View logs for all services
./start-platform.sh logs

# View logs for specific service
docker-compose logs -f --tail=100 authentication-service

# Search logs
docker-compose logs authentication-service 2>&1 | grep ERROR

# Follow logs with timestamps
docker-compose logs -f -t authentication-service
```

### Performance Testing
```bash
# Simple load test with curl
for i in {1..100}; do
  curl -s http://localhost:3000/health > /dev/null &
done
wait

# Using Apache Bench (if installed)
ab -n 1000 -c 10 http://localhost:3000/health

# Using wrk (if installed)
wrk -t12 -c400 -d30s http://localhost:3000/health
```

## 🔗 Useful Links & Resources

### Documentation
- [Main README](../README.md) - Complete platform overview
- [Kubernetes Deployment](../k8s/README-KUBERNETES-DEPLOYMENT.md) - Production deployment
- [Service Documentation](../services/) - Individual service docs

### Development Tools
- **Swagger UI**: http://localhost:3000/api-docs (API Gateway)
- **RabbitMQ Management**: http://localhost:15672 (admin/password)
- **Grafana Dashboards**: http://localhost:3100 (admin/admin123)
- **Prometheus Metrics**: http://localhost:9090

### External Resources
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [RabbitMQ Documentation](https://www.rabbitmq.com/documentation.html)

---

**💡 Pro Tip**: Bookmark this page and use `./start-platform.sh help` for quick command reference!