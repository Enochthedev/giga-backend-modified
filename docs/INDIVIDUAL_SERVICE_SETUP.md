# Individual Service Setup Guide

This guide explains how to run individual services for development, testing, or debugging purposes. Perfect for developers who want to work on specific services without running the entire platform.

## 🎯 Overview

The platform consists of 12 microservices that can be run individually or in combination. Each service can run:

1. **Locally** (Node.js development)
2. **In Docker** (containerized)
3. **Mixed mode** (some local, some Docker)

## 📋 Prerequisites

### For Local Development
- **Node.js** 18+
- **pnpm** 8+ (recommended)
- **PostgreSQL** 12+ (or Docker)
- **Redis** 6+ (or Docker)
- **RabbitMQ** 3.8+ (optional, or Docker)

### For Docker Development
- **Docker Desktop** 20.10+
- **Docker Compose** 2.0+

## 🏗️ Service Dependencies

Understanding service dependencies helps you decide which services to run together:

```mermaid
graph TD
    A[API Gateway] --> B[Authentication Service]
    A --> C[E-commerce Service]
    A --> D[Payment Service]
    A --> E[Taxi Service]
    A --> F[Hotel Service]
    
    C --> B
    C --> D
    C --> I[Search Service]
    
    D --> B
    E --> B
    E --> D
    E --> G[Notification Service]
    
    F --> B
    F --> D
    F --> I
    
    H[File Service] --> B
    I --> J[Elasticsearch]
    
    K[Admin Service] --> B
    K --> C
    K --> D
    K --> E
    K --> F
    
    L[Analytics Service] --> B
    M[Messaging Service] --> B
```

### Core Dependencies
- **PostgreSQL**: Required by most services for data storage
- **Redis**: Required by most services for caching and sessions
- **Authentication Service**: Required by most business services
- **RabbitMQ**: Required for inter-service messaging (optional for basic functionality)

## 🚀 Quick Start: Infrastructure First

### Option 1: Docker Infrastructure

```bash
# Start just the infrastructure services
./start-platform.sh infra

# This starts:
# - PostgreSQL (port 5432)
# - Redis (port 6379)
# - RabbitMQ (port 5672, management 15672)
# - Elasticsearch (port 9200) - if needed
```

### Option 2: Local Infrastructure

```bash
# Install and start PostgreSQL
brew install postgresql  # macOS
sudo apt install postgresql  # Ubuntu
# Start: brew services start postgresql

# Install and start Redis
brew install redis  # macOS
sudo apt install redis-server  # Ubuntu
# Start: brew services start redis

# Install and start RabbitMQ (optional)
brew install rabbitmq  # macOS
sudo apt install rabbitmq-server  # Ubuntu
# Start: brew services start rabbitmq
```

## 🔧 Environment Configuration

### 1. Global Environment Setup

```bash
# Copy the environment template
cp .env.example .env

# Edit .env with your configuration
# Key variables for local development:
NODE_ENV=development
POSTGRES_PASSWORD=password
REDIS_PORT=6379
JWT_SECRET=your-development-jwt-secret
```

### 2. Service-Specific Environment

Each service needs these environment variables:

```bash
# Database connection
export DATABASE_URL="postgresql://postgres:password@localhost:5432/service_db"
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=postgres
export DB_PASSWORD=password

# Redis connection
export REDIS_URL="redis://localhost:6379"

# RabbitMQ connection (if needed)
export RABBITMQ_URL="amqp://admin:password@localhost:5672"

# Service URLs (for inter-service communication)
export AUTH_SERVICE_URL="http://localhost:3001"
export API_GATEWAY_URL="http://localhost:3000"

# JWT configuration
export JWT_SECRET="your-development-jwt-secret"
export JWT_EXPIRES_IN="24h"
```

## 🏃‍♂️ Running Individual Services

### Method 1: Local Development (Recommended for Development)

#### 1. Authentication Service (Port 3001)

```bash
# Terminal 1: Start infrastructure
./start-platform.sh infra

# Terminal 2: Run authentication service
cd services/authentication-service

# Install dependencies
pnpm install

# Set environment variables
export DATABASE_URL="postgresql://postgres:password@localhost:5432/auth_db"
export REDIS_URL="redis://localhost:6379"
export JWT_SECRET="your-development-jwt-secret"
export PORT=3001

# Run database migrations
pnpm run migrate

# Start the service
pnpm run dev

# Test the service
curl http://localhost:3001/health
```

#### 2. API Gateway (Port 3000)

```bash
# Terminal 3: Run API Gateway
cd services/api-gateway

# Install dependencies
pnpm install

# Set environment variables
export REDIS_URL="redis://localhost:6379"
export AUTH_SERVICE_URL="http://localhost:3001"
export PORT=3000

# Start the service
pnpm run dev

# Test the service
curl http://localhost:3000/health
```

#### 3. E-commerce Service (Port 3002)

```bash
# Terminal 4: Run E-commerce service
cd services/ecommerce-service

# Install dependencies
pnpm install

# Set environment variables
export DATABASE_URL="postgresql://postgres:password@localhost:5432/ecommerce_db"
export REDIS_URL="redis://localhost:6379"
export AUTH_SERVICE_URL="http://localhost:3001"
export PORT=3002

# Run database migrations
pnpm run migrate

# Start the service
pnpm run dev

# Test the service
curl http://localhost:3002/health
```

### Method 2: Docker Individual Services

#### Run Specific Services with Docker

```bash
# Start infrastructure
./start-platform.sh infra

# Run specific services
docker-compose up -d authentication-service
docker-compose up -d api-gateway
docker-compose up -d ecommerce-service

# Check status
docker-compose ps

# View logs
docker-compose logs -f authentication-service
```

#### Build and Run Single Service

```bash
# Build specific service
docker-compose build authentication-service

# Run with custom environment
docker-compose up -d authentication-service

# Or run with overrides
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d authentication-service
```

### Method 3: Mixed Mode (Some Docker, Some Local)

This is perfect for debugging specific services while keeping others in Docker:

```bash
# Start infrastructure and some services in Docker
docker-compose up -d postgres redis rabbitmq api-gateway

# Run authentication service locally for debugging
cd services/authentication-service
export DATABASE_URL="postgresql://postgres:password@localhost:5432/auth_db"
export REDIS_URL="redis://localhost:6379"
pnpm run dev

# The API Gateway in Docker will connect to your local auth service
# Update API Gateway environment to point to host.docker.internal:3001
```

## 📊 Service-Specific Setup Instructions

### 1. Authentication Service

**Dependencies**: PostgreSQL, Redis

```bash
cd services/authentication-service

# Environment variables
export DATABASE_URL="postgresql://postgres:password@localhost:5432/auth_db"
export REDIS_URL="redis://localhost:6379"
export JWT_SECRET="your-jwt-secret"
export JWT_EXPIRES_IN="24h"
export JWT_REFRESH_EXPIRES_IN="7d"

# Install and run
pnpm install
pnpm run migrate
pnpm run dev

# Test endpoints
curl http://localhost:3001/health
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","firstName":"Test","lastName":"User"}'
```

### 2. E-commerce Service

**Dependencies**: PostgreSQL, Redis, Authentication Service

```bash
cd services/ecommerce-service

# Environment variables
export DATABASE_URL="postgresql://postgres:password@localhost:5432/ecommerce_db"
export REDIS_URL="redis://localhost:6379"
export AUTH_SERVICE_URL="http://localhost:3001"

# Install and run
pnpm install
pnpm run migrate
pnpm run dev

# Test endpoints
curl http://localhost:3002/health
curl http://localhost:3002/products
```

### 3. Payment Service

**Dependencies**: PostgreSQL, Redis, Authentication Service

```bash
cd services/payment-service

# Environment variables
export DATABASE_URL="postgresql://postgres:password@localhost:5432/payment_db"
export REDIS_URL="redis://localhost:6379"
export AUTH_SERVICE_URL="http://localhost:3001"
export STRIPE_SECRET_KEY="sk_test_your_stripe_key"

# Install and run
pnpm install
pnpm run migrate
pnpm run dev

# Test endpoints
curl http://localhost:3003/health
```

### 4. Taxi Service

**Dependencies**: PostgreSQL, Redis, Authentication Service, Payment Service

```bash
cd services/taxi-service

# Environment variables
export DATABASE_URL="postgresql://postgres:password@localhost:5432/taxi_db"
export REDIS_URL="redis://localhost:6379"
export AUTH_SERVICE_URL="http://localhost:3001"
export PAYMENT_SERVICE_URL="http://localhost:3003"

# Install and run
pnpm install
pnpm run migrate
pnpm run dev

# Test endpoints
curl http://localhost:3004/health
```

### 5. Hotel Service

**Dependencies**: PostgreSQL, Redis, Authentication Service, Payment Service

```bash
cd services/hotel-service

# Environment variables
export DATABASE_URL="postgresql://postgres:password@localhost:5432/hotel_db"
export REDIS_URL="redis://localhost:6379"
export AUTH_SERVICE_URL="http://localhost:3001"
export PAYMENT_SERVICE_URL="http://localhost:3003"

# Install and run
pnpm install
pnpm run migrate
pnpm run dev

# Test endpoints
curl http://localhost:3005/health
```

### 6. File Service

**Dependencies**: PostgreSQL, Redis, Authentication Service

```bash
cd services/file-service

# Environment variables
export DATABASE_URL="postgresql://postgres:password@localhost:5432/file_db"
export REDIS_URL="redis://localhost:6379"
export AUTH_SERVICE_URL="http://localhost:3001"
export AWS_ACCESS_KEY_ID="your_aws_key"
export AWS_SECRET_ACCESS_KEY="your_aws_secret"
export AWS_S3_BUCKET="your_bucket"

# Install and run
pnpm install
pnpm run migrate
pnpm run dev

# Test endpoints
curl http://localhost:3008/health
```

### 7. Search Service

**Dependencies**: Elasticsearch, Redis, Authentication Service

```bash
# Start Elasticsearch
docker-compose up -d elasticsearch

cd services/search-service

# Environment variables
export ELASTICSEARCH_URL="http://localhost:9200"
export REDIS_URL="redis://localhost:6379"
export AUTH_SERVICE_URL="http://localhost:3001"

# Install and run
pnpm install
pnpm run dev

# Test endpoints
curl http://localhost:3009/health
```

### 8. Notification Service

**Dependencies**: PostgreSQL, Redis, RabbitMQ

```bash
cd services/notification-service

# Environment variables
export DATABASE_URL="postgresql://postgres:password@localhost:5432/notification_db"
export REDIS_URL="redis://localhost:6379"
export RABBITMQ_URL="amqp://admin:password@localhost:5672"
export SENDGRID_API_KEY="your_sendgrid_key"
export TWILIO_ACCOUNT_SID="your_twilio_sid"
export TWILIO_AUTH_TOKEN="your_twilio_token"

# Install and run
pnpm install
pnpm run migrate
pnpm run dev

# Test endpoints
curl http://localhost:3007/health
```

### 9. Admin Service

**Dependencies**: PostgreSQL, Redis, Authentication Service

```bash
cd services/admin-service

# Environment variables
export DATABASE_URL="postgresql://postgres:password@localhost:5432/admin_db"
export REDIS_URL="redis://localhost:6379"
export AUTH_SERVICE_URL="http://localhost:3001"

# Install and run
pnpm install
pnpm run migrate
pnpm run dev

# Test endpoints
curl http://localhost:3010/health
```

## 🧪 Testing Individual Services

### Unit Tests

```bash
# Run tests for specific service
cd services/authentication-service
pnpm test

# Run tests with coverage
pnpm run test:coverage

# Run tests in watch mode
pnpm run test:watch
```

### Integration Tests

```bash
# Start dependencies first
./start-platform.sh infra

# Run integration tests
cd services/authentication-service
pnpm run test:integration
```

### API Testing

```bash
# Test authentication flow
cd services/authentication-service

# Register user
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'

# Login user
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Use the returned token for authenticated requests
TOKEN="your-jwt-token"
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/auth/profile
```

## 🔍 Debugging Individual Services

### 1. Enable Debug Logging

```bash
# Set debug environment
export DEBUG=true
export LOG_LEVEL=debug

# Start service
pnpm run dev
```

### 2. Use Node.js Debugger

```bash
# Start with debugger
node --inspect-brk=0.0.0.0:9229 dist/app.js

# Or with ts-node
node --inspect-brk=0.0.0.0:9229 -r ts-node/register src/app.ts
```

### 3. Database Debugging

```bash
# Connect to PostgreSQL
psql -h localhost -U postgres -d auth_db

# Check tables
\dt

# Check specific data
SELECT * FROM users LIMIT 5;
```

### 4. Redis Debugging

```bash
# Connect to Redis
redis-cli

# Check keys
KEYS *

# Check specific key
GET user:session:123
```

## 🔄 Development Workflows

### Workflow 1: Frontend Developer

```bash
# Start backend services needed for frontend
./start-platform.sh infra
docker-compose up -d api-gateway authentication-service ecommerce-service

# Your frontend connects to http://localhost:3000
```

### Workflow 2: Service Developer

```bash
# Start infrastructure and dependencies
./start-platform.sh infra
docker-compose up -d authentication-service

# Run your service locally for development
cd services/payment-service
pnpm run dev
```

### Workflow 3: Full Stack Developer

```bash
# Start infrastructure
./start-platform.sh infra

# Run multiple services locally
cd services/authentication-service && pnpm run dev &
cd services/ecommerce-service && pnpm run dev &
cd services/api-gateway && pnpm run dev &

# Wait for all services to start
wait
```

### Workflow 4: Debugging Specific Issue

```bash
# Start everything except the problematic service
./start-platform.sh essential
docker-compose stop payment-service

# Run the problematic service locally with debugging
cd services/payment-service
export DEBUG=true
export LOG_LEVEL=debug
pnpm run dev
```

## 📊 Monitoring Individual Services

### Health Checks

```bash
# Check all running services
for port in 3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 3011 3012; do
  echo "Port $port: $(curl -s http://localhost:$port/health | jq -r '.status // "ERROR"')"
done
```

### Metrics

```bash
# Check service metrics (Prometheus format)
curl http://localhost:3001/metrics

# Check specific metrics
curl http://localhost:3001/metrics | grep http_requests_total
```

### Logs

```bash
# View logs for Docker services
docker-compose logs -f authentication-service

# View logs for local services
# Logs are output to console when running with pnpm run dev
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Port Already in Use

```bash
# Find what's using the port
lsof -i :3001

# Kill the process
lsof -ti :3001 | xargs kill

# Or use a different port
export PORT=3011
pnpm run dev
```

#### 2. Database Connection Failed

```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# Check database exists
psql -h localhost -U postgres -l | grep auth_db

# Create database if missing
createdb -h localhost -U postgres auth_db
```

#### 3. Service Dependencies Not Available

```bash
# Check if dependency service is running
curl http://localhost:3001/health

# Start dependency service
docker-compose up -d authentication-service

# Or run dependency locally
cd services/authentication-service && pnpm run dev
```

#### 4. Environment Variables Not Set

```bash
# Check current environment
env | grep -E "(DATABASE_URL|REDIS_URL|JWT_SECRET)"

# Set missing variables
export DATABASE_URL="postgresql://postgres:password@localhost:5432/auth_db"
export REDIS_URL="redis://localhost:6379"
export JWT_SECRET="your-jwt-secret"
```

#### 5. Build/Compilation Errors

```bash
# Clean and rebuild
pnpm run clean
pnpm install
pnpm run build

# Check for TypeScript errors
pnpm run type-check
```

### Service-Specific Troubleshooting

#### Authentication Service
```bash
# Check JWT secret is set
echo $JWT_SECRET

# Check database migrations
pnpm run migrate:status

# Test database connection
psql $DATABASE_URL -c "SELECT 1"
```

#### Search Service
```bash
# Check Elasticsearch is running
curl http://localhost:9200/_cluster/health

# Check Elasticsearch indices
curl http://localhost:9200/_cat/indices
```

#### File Service
```bash
# Check AWS credentials
aws sts get-caller-identity

# Check S3 bucket access
aws s3 ls s3://your-bucket-name
```

## 💡 Pro Tips

### 1. Use Environment Files

Create `.env.local` files for each service:

```bash
# services/authentication-service/.env.local
DATABASE_URL=postgresql://postgres:password@localhost:5432/auth_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-jwt-secret
LOG_LEVEL=debug
```

### 2. Use Process Managers

```bash
# Install PM2 for process management
npm install -g pm2

# Create ecosystem file
# ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'auth-service',
      cwd: './services/authentication-service',
      script: 'pnpm',
      args: 'run dev',
      env: {
        PORT: 3001,
        DATABASE_URL: 'postgresql://postgres:password@localhost:5432/auth_db'
      }
    },
    {
      name: 'api-gateway',
      cwd: './services/api-gateway',
      script: 'pnpm',
      args: 'run dev',
      env: {
        PORT: 3000,
        AUTH_SERVICE_URL: 'http://localhost:3001'
      }
    }
  ]
};

# Start all services
pm2 start ecosystem.config.js

# Monitor services
pm2 monit
```

### 3. Use Docker Compose Overrides

```yaml
# docker-compose.override.yml
version: '3.8'
services:
  authentication-service:
    volumes:
      - ./services/authentication-service:/app
      - /app/node_modules
    environment:
      - LOG_LEVEL=debug
    ports:
      - "9229:9229"  # Debug port
```

### 4. Database Seeding

```bash
# Create seed data for development
cd services/authentication-service
pnpm run seed

# Or manually create test data
psql $DATABASE_URL -c "
INSERT INTO users (email, password, first_name, last_name) 
VALUES ('test@example.com', 'hashed_password', 'Test', 'User');
"
```

---

**Individual service setup complete! 🚀**

You can now run any combination of services for your specific development needs.