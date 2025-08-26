# Docker Setup Guide

This guide provides comprehensive instructions for setting up and running the Giga platform using Docker and Docker Compose.

## Prerequisites

- Docker Desktop 20.10+ or Docker Engine 20.10+
- Docker Compose 2.0+
- At least 8GB RAM available for Docker
- 20GB+ free disk space

## Quick Start

### 1. Start Essential Services Only

For development with minimal resource usage:

```bash
# Start core infrastructure services
./start-essential-platform.sh

# Or manually:
docker-compose -f docker-compose.essential.yml up -d
```

This starts:
- PostgreSQL database
- Redis cache
- RabbitMQ message queue
- Core microservices

### 2. Start Full Development Environment

For complete development environment:

```bash
# Start all services
docker-compose -f docker-compose.dev.yml up -d

# Or use pnpm script:
pnpm run docker:dev
```

### 3. Start Production Environment

For production-like setup:

```bash
# Start production services
docker-compose -f docker-compose.prod.yml up -d

# Or use pnpm script:
pnpm run docker:prod
```

## Docker Compose Files

### docker-compose.essential.yml

Minimal setup for core functionality:

```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: giga_platform
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  rabbitmq:
    image: rabbitmq:3-management-alpine
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: password
    ports:
      - "5672:5672"
      - "15672:15672"

  authentication-service:
    build: ./services/authentication-service
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/auth_db
      PORT: 8001
    ports:
      - "8001:8001"
    depends_on:
      - postgres
      - redis

  api-gateway:
    build: ./services/api-gateway
    environment:
      REDIS_URL: redis://redis:6379
      AUTH_SERVICE_URL: http://authentication-service:8001
      PORT: 3000
    ports:
      - "3000:3000"
    depends_on:
      - redis
      - authentication-service
```

### docker-compose.dev.yml

Complete development environment:

```yaml
services:
  # Infrastructure
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: giga_platform
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  rabbitmq:
    image: rabbitmq:3-management-alpine
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: password
    ports:
      - "5672:5672"
      - "15672:15672"

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.8.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

  # Core Services
  authentication-service:
    build: ./services/authentication-service
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/auth_db
      REDIS_URL: redis://redis:6379
      PORT: 8001
    ports:
      - "8001:8001"
    depends_on:
      - postgres
      - redis

  admin-service:
    build: ./services/admin-service
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/admin_db
      AUTH_SERVICE_URL: http://authentication-service:8001
      PORT: 3006
    ports:
      - "3006:3006"
    depends_on:
      - postgres
      - authentication-service

  api-gateway:
    build: ./services/api-gateway
    environment:
      REDIS_URL: redis://redis:6379
      AUTH_SERVICE_URL: http://authentication-service:8001
      ADMIN_SERVICE_URL: http://admin-service:3006
      PORT: 3000
    ports:
      - "3000:3000"
    depends_on:
      - redis
      - authentication-service
      - admin-service

  # Business Services
  ecommerce-service:
    build: ./services/ecommerce-service
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/ecommerce_db
      REDIS_URL: redis://redis:6379
      AUTH_SERVICE_URL: http://authentication-service:8001
      PORT: 8002
    ports:
      - "8002:8002"
    depends_on:
      - postgres
      - redis
      - authentication-service

  hotel-service:
    build: ./services/hotel-service
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/hotel_db
      REDIS_URL: redis://redis:6379
      AUTH_SERVICE_URL: http://authentication-service:8001
      PORT: 8003
    ports:
      - "8003:8003"
    depends_on:
      - postgres
      - redis
      - authentication-service

  taxi-service:
    build: ./services/taxi-service
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/taxi_db
      REDIS_URL: redis://redis:6379
      AUTH_SERVICE_URL: http://authentication-service:8001
      PORT: 8004
    ports:
      - "8004:8004"
    depends_on:
      - postgres
      - redis
      - authentication-service

  payment-service:
    build: ./services/payment-service
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/payment_db
      REDIS_URL: redis://redis:6379
      AUTH_SERVICE_URL: http://authentication-service:8001
      PORT: 8005
    ports:
      - "8005:8005"
    depends_on:
      - postgres
      - redis
      - authentication-service

  # Support Services
  notification-service:
    build: ./services/notification-service
    environment:
      REDIS_URL: redis://redis:6379
      RABBITMQ_URL: amqp://admin:password@rabbitmq:5672
      PORT: 8006
    ports:
      - "8006:8006"
    depends_on:
      - redis
      - rabbitmq

  search-service:
    build: ./services/search-service
    environment:
      ELASTICSEARCH_URL: http://elasticsearch:9200
      PORT: 8007
    ports:
      - "8007:8007"
    depends_on:
      - elasticsearch

  file-service:
    build: ./services/file-service
    environment:
      REDIS_URL: redis://redis:6379
      PORT: 8008
    ports:
      - "8008:8008"
    depends_on:
      - redis

  analytics-service:
    build: ./services/analytics-service
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/analytics_db
      REDIS_URL: redis://redis:6379
      ELASTICSEARCH_URL: http://elasticsearch:9200
      PORT: 8009
    ports:
      - "8009:8009"
    depends_on:
      - postgres
      - redis
      - elasticsearch

  advertisement-service:
    build: ./services/advertisement-service
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/advertisement_db
      REDIS_URL: redis://redis:6379
      PORT: 8010
    ports:
      - "8010:8010"
    depends_on:
      - postgres
      - redis

  messaging-service:
    build: ./services/messaging-service
    environment:
      REDIS_URL: redis://redis:6379
      RABBITMQ_URL: amqp://admin:password@rabbitmq:5672
      PORT: 8011
    ports:
      - "8011:8011"
    depends_on:
      - redis
      - rabbitmq

volumes:
  postgres_data:
  redis_data:
  elasticsearch_data:
```

## Service Ports

| Service | Port | Description |
|---------|------|-------------|
| API Gateway | 3000 | Main entry point |
| Admin Service | 3006 | Administrative functions |
| Authentication Service | 8001 | User auth & management |
| E-commerce Service | 8002 | Product & order management |
| Hotel Service | 8003 | Hotel booking & management |
| Taxi Service | 8004 | Ride booking & management |
| Payment Service | 8005 | Payment processing |
| Notification Service | 8006 | Push notifications |
| Search Service | 8007 | Search functionality |
| File Service | 8008 | File upload/download |
| Analytics Service | 8009 | Data analytics |
| Advertisement Service | 8010 | Ad management |
| Messaging Service | 8011 | Chat & messaging |

## Infrastructure Ports

| Service | Port | Description |
|---------|------|-------------|
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache & sessions |
| RabbitMQ | 5672 | Message queue |
| RabbitMQ Management | 15672 | Web UI |
| Elasticsearch | 9200 | Search engine |

## Environment Variables

### Common Variables

```bash
# Database
DATABASE_URL=postgresql://postgres:password@postgres:5432/database_name

# Redis
REDIS_URL=redis://redis:6379

# RabbitMQ
RABBITMQ_URL=amqp://admin:password@rabbitmq:5672

# Elasticsearch
ELASTICSEARCH_URL=http://elasticsearch:9200

# Authentication
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h

# Service URLs (for inter-service communication)
AUTH_SERVICE_URL=http://authentication-service:8001
ADMIN_SERVICE_URL=http://admin-service:3006
```

### Service-Specific Variables

Each service may have additional environment variables. Check individual service README files for complete lists.

## Database Setup

### Initial Database Creation

```bash
# Connect to PostgreSQL container
docker exec -it giga-backend-modified-postgres-1 psql -U postgres

# Create databases
CREATE DATABASE auth_db;
CREATE DATABASE admin_db;
CREATE DATABASE ecommerce_db;
CREATE DATABASE hotel_db;
CREATE DATABASE taxi_db;
CREATE DATABASE payment_db;
CREATE DATABASE analytics_db;
CREATE DATABASE advertisement_db;

# Exit
\q
```

### Run Migrations

```bash
# For each service that needs migrations
docker exec -it giga-backend-modified-authentication-service-1 pnpm run migrate
docker exec -it giga-backend-modified-admin-service-1 pnpm run migrate
# ... repeat for other services
```

## Monitoring & Management

### Health Checks

```bash
# Check all services
curl http://localhost:3000/health

# Check specific service
curl http://localhost:8001/health
curl http://localhost:3006/health
```

### Service Logs

```bash
# View logs for specific service
docker logs giga-backend-modified-authentication-service-1

# Follow logs in real-time
docker logs -f giga-backend-modified-authentication-service-1

# View logs for all services
docker-compose -f docker-compose.dev.yml logs -f
```

### Resource Usage

```bash
# Check container resource usage
docker stats

# Check disk usage
docker system df
```

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Find process using port
   lsof -i :3000
   
   # Kill process
   lsof -ti :3000 | xargs kill
   ```

2. **Container Won't Start**
   ```bash
   # Check container logs
   docker logs <container_name>
   
   # Check container status
   docker ps -a
   ```

3. **Database Connection Issues**
   ```bash
   # Check if PostgreSQL is running
   docker ps | grep postgres
   
   # Test connection
   docker exec -it giga-backend-modified-postgres-1 psql -U postgres -d auth_db
   ```

4. **Memory Issues**
   ```bash
   # Increase Docker memory limit in Docker Desktop
   # Or add memory limits to docker-compose
   services:
     service-name:
       deploy:
         resources:
           limits:
             memory: 1G
   ```

### Reset Environment

```bash
# Stop all services
docker-compose -f docker-compose.dev.yml down

# Remove volumes (WARNING: This deletes all data)
docker-compose -f docker-compose.dev.yml down -v

# Remove all containers and images
docker system prune -a

# Start fresh
docker-compose -f docker-compose.dev.yml up -d
```

## Development Workflow

### 1. Start Infrastructure Only

```bash
# Start just the databases and caches
docker-compose -f docker-compose.essential.yml up -d postgres redis rabbitmq
```

### 2. Run Services Locally

```bash
# Set environment variables for local development
export DATABASE_URL="postgresql://postgres:password@localhost:5432/auth_db"
export REDIS_URL="redis://localhost:6379"

# Run service locally
cd services/authentication-service
pnpm run dev
```

### 3. Mix Local and Docker

```bash
# Start infrastructure in Docker
docker-compose -f docker-compose.essential.yml up -d postgres redis

# Run some services locally, others in Docker
docker-compose -f docker-compose.dev.yml up -d api-gateway
pnpm run dev:auth  # Run auth service locally
```

## Production Considerations

### Security

- Change default passwords
- Use secrets management
- Enable SSL/TLS
- Restrict network access
- Regular security updates

### Performance

- Use production-grade images
- Configure resource limits
- Enable health checks
- Set up monitoring
- Use load balancers

### Scaling

- Use multiple instances
- Implement auto-scaling
- Use external databases
- Set up backup strategies
- Monitor resource usage

## Useful Commands

```bash
# Start services
docker-compose -f docker-compose.dev.yml up -d

# Stop services
docker-compose -f docker-compose.dev.yml down

# Restart specific service
docker-compose -f docker-compose.dev.yml restart authentication-service

# View running containers
docker ps

# View service logs
docker-compose -f docker-compose.dev.yml logs authentication-service

# Execute command in container
docker exec -it giga-backend-modified-postgres-1 psql -U postgres

# Build specific service
docker-compose -f docker-compose.dev.yml build authentication-service

# Pull latest images
docker-compose -f docker-compose.dev.yml pull

# Clean up unused resources
docker system prune
```

## Next Steps

1. **Start with essential services**: Use `docker-compose.essential.yml` for basic functionality
2. **Add business services**: Gradually add ecommerce, hotel, taxi services
3. **Configure monitoring**: Set up Prometheus, Grafana, and alerting
4. **Set up CI/CD**: Automate building and deployment
5. **Production deployment**: Use Kubernetes or Docker Swarm for production

For more detailed information about individual services, see their respective README files in the `services/` directory.
