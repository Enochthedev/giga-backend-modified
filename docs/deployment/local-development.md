# Local Development Setup

This guide walks you through setting up the complete multi-service platform on your local development machine.

## Prerequisites

### Required Software
- **Node.js**: Version 18.x or higher
- **pnpm**: Version 8.x or higher (preferred package manager)
- **Docker**: Version 20.x or higher
- **Docker Compose**: Version 2.x or higher
- **Git**: Latest version
- **PostgreSQL**: Version 14.x or higher (optional, can use Docker)
- **Redis**: Version 6.x or higher (optional, can use Docker)

### System Requirements
- **RAM**: Minimum 8GB, recommended 16GB
- **Storage**: At least 10GB free space
- **OS**: macOS, Linux, or Windows with WSL2

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/company/multi-service-platform.git
cd multi-service-platform
```

### 2. Install Dependencies

```bash
# Install root dependencies
pnpm install

# Install dependencies for all services
pnpm run install:all
```

### 3. Environment Configuration

```bash
# Copy environment templates
cp .env.example .env
cp .env.test.example .env.test

# Copy service-specific environment files
find services -name ".env.example" -exec sh -c 'cp "$1" "${1%.example}"' _ {} \;
```

### 4. Configure Environment Variables

Edit the `.env` file in the root directory:

```bash
# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/platform_dev
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h

# Payment Gateways (use test keys for development)
STRIPE_PUBLIC_KEY=pk_test_your_stripe_public_key
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# External Services
SENDGRID_API_KEY=your_sendgrid_api_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token

# AWS Configuration (for file service)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-dev-bucket

# Google Maps API (for taxi service)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### 5. Start Infrastructure Services

Using Docker Compose for infrastructure:

```bash
# Start databases and message queue
docker-compose -f docker-compose.dev.yml up -d postgres redis rabbitmq elasticsearch

# Wait for services to be ready
./scripts/wait-for-services.sh
```

### 6. Database Setup

```bash
# Run database migrations
pnpm run db:migrate

# Seed development data
pnpm run db:seed
```

### 7. Start All Services

```bash
# Start all services in development mode
pnpm run dev

# Or start services individually
pnpm run dev:auth
pnpm run dev:gateway
pnpm run dev:ecommerce
pnpm run dev:taxi
pnpm run dev:hotel
pnpm run dev:payment
```

## Service Ports

| Service | Port | URL |
|---------|------|-----|
| API Gateway | 3000 | http://localhost:3000 |
| Authentication | 3001 | http://localhost:3001 |
| Payment | 3002 | http://localhost:3002 |
| Ecommerce | 3003 | http://localhost:3003 |
| Taxi | 3004 | http://localhost:3004 |
| Hotel | 3005 | http://localhost:3005 |
| File | 3006 | http://localhost:3006 |
| Search | 3007 | http://localhost:3007 |
| Notification | 3008 | http://localhost:3008 |
| Analytics | 3009 | http://localhost:3009 |
| Advertisement | 3010 | http://localhost:3010 |
| Admin | 3011 | http://localhost:3011 |

## Infrastructure Services

| Service | Port | URL | Credentials |
|---------|------|-----|-------------|
| PostgreSQL | 5432 | localhost:5432 | postgres/password |
| Redis | 6379 | localhost:6379 | - |
| RabbitMQ | 5672, 15672 | http://localhost:15672 | guest/guest |
| Elasticsearch | 9200 | http://localhost:9200 | - |
| Kibana | 5601 | http://localhost:5601 | - |

## Development Workflow

### 1. Making Changes

```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# Make your changes
# ...

# Run tests
pnpm run test

# Run linting
pnpm run lint

# Fix linting issues
pnpm run lint:fix
```

### 2. Testing

```bash
# Run all tests
pnpm run test

# Run tests for specific service
pnpm run test:auth
pnpm run test:ecommerce

# Run integration tests
pnpm run test:integration

# Run end-to-end tests
pnpm run test:e2e

# Run tests with coverage
pnpm run test:coverage
```

### 3. Database Operations

```bash
# Create new migration
pnpm run db:migration:create --name=add_new_table

# Run migrations
pnpm run db:migrate

# Rollback last migration
pnpm run db:migrate:rollback

# Reset database (development only)
pnpm run db:reset

# Seed data
pnpm run db:seed
```

### 4. Service Management

```bash
# Start specific service
pnpm run dev:auth

# Stop all services
pnpm run stop

# Restart service
pnpm run restart:ecommerce

# View service logs
pnpm run logs:taxi

# Check service health
curl http://localhost:3001/health
```

## Debugging

### 1. Enable Debug Logging

```bash
# Set debug environment variable
export DEBUG=app:*

# Or for specific service
export DEBUG=auth:*,payment:*
```

### 2. Database Debugging

```bash
# Connect to PostgreSQL
psql postgresql://postgres:password@localhost:5432/platform_dev

# View active connections
SELECT * FROM pg_stat_activity;

# View table sizes
SELECT schemaname,tablename,attname,n_distinct,correlation FROM pg_stats;
```

### 3. Redis Debugging

```bash
# Connect to Redis
redis-cli

# View all keys
KEYS *

# Monitor commands
MONITOR

# View memory usage
INFO memory
```

### 4. Message Queue Debugging

Access RabbitMQ Management UI at http://localhost:15672

- Username: guest
- Password: guest

## Common Development Tasks

### 1. Adding a New Service

```bash
# Create service directory
mkdir services/new-service

# Copy template
cp -r services/_template/* services/new-service/

# Update package.json
# Update docker-compose.dev.yml
# Add to root package.json scripts
```

### 2. Adding New API Endpoint

```bash
# 1. Add route to service
# 2. Add controller method
# 3. Add service method
# 4. Add tests
# 5. Update API documentation
```

### 3. Database Schema Changes

```bash
# Create migration
pnpm run db:migration:create --name=add_user_preferences

# Edit migration file
# Run migration
pnpm run db:migrate

# Update models and types
```

### 4. Adding New Environment Variable

```bash
# 1. Add to .env.example
# 2. Add to service-specific .env.example
# 3. Update configuration files
# 4. Update documentation
```

## Performance Optimization

### 1. Database Performance

```bash
# Analyze query performance
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';

# Create indexes
CREATE INDEX idx_users_email ON users(email);

# View slow queries
SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC;
```

### 2. Application Performance

```bash
# Profile Node.js application
node --prof app.js

# Generate profile report
node --prof-process isolate-*.log > profile.txt

# Memory usage analysis
node --inspect app.js
```

### 3. Load Testing

```bash
# Install artillery
npm install -g artillery

# Run load test
artillery run load-test.yml

# Generate report
artillery report report.json
```

## Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

#### Database Connection Issues
```bash
# Check PostgreSQL status
brew services list | grep postgresql

# Restart PostgreSQL
brew services restart postgresql

# Check connection
psql postgresql://postgres:password@localhost:5432/platform_dev
```

#### Node Modules Issues
```bash
# Clear node modules
rm -rf node_modules
rm pnpm-lock.yaml

# Reinstall
pnpm install
```

#### Docker Issues
```bash
# Check Docker status
docker ps

# Restart Docker services
docker-compose -f docker-compose.dev.yml restart

# View logs
docker-compose -f docker-compose.dev.yml logs postgres
```

### Getting Help

1. **Check Logs**: Always check service logs first
2. **Health Endpoints**: Use `/health` endpoints to check service status
3. **Documentation**: Review service-specific README files
4. **Team Chat**: Ask in #development channel
5. **Create Issue**: Create GitHub issue for bugs

## IDE Configuration

### VS Code Extensions

Recommended extensions for development:

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "ms-vscode.vscode-json",
    "redhat.vscode-yaml",
    "ms-vscode.vscode-docker",
    "ms-kubernetes-tools.vscode-kubernetes-tools",
    "humao.rest-client"
  ]
}
```

### VS Code Settings

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.git": true
  }
}
```

## Security Considerations

### Development Security

1. **Never commit secrets**: Use .env files and .gitignore
2. **Use test API keys**: Never use production keys in development
3. **Local HTTPS**: Use mkcert for local HTTPS development
4. **Database security**: Use strong passwords even in development
5. **Network security**: Use VPN for accessing shared development resources

### Code Security

```bash
# Run security audit
pnpm audit

# Fix vulnerabilities
pnpm audit --fix

# Check for secrets in code
git-secrets --scan
```

## Next Steps

After completing the local setup:

1. **Explore APIs**: Use the API documentation to understand endpoints
2. **Run Tests**: Ensure all tests pass
3. **Make Changes**: Start with small changes to understand the codebase
4. **Review Code**: Read through service implementations
5. **Join Team**: Participate in code reviews and team discussions