# API Gateway Service

A microservice acting as the main entry point for all client requests, providing routing, load balancing, authentication, rate limiting, and request/response transformation for the Giga platform.

## Features

- **Request Routing**: Route requests to appropriate microservices
- **Load Balancing**: Distribute traffic across service instances
- **Authentication & Authorization**: JWT validation and role-based access control
- **Rate Limiting**: Protect services from abuse and overload
- **Request/Response Transformation**: Modify requests and responses as needed
- **API Documentation**: Swagger/OpenAPI documentation
- **Health Checks**: Monitor downstream service health
- **Circuit Breaker**: Prevent cascade failures
- **Logging & Monitoring**: Comprehensive request logging and metrics
- **CORS Management**: Handle cross-origin requests
- **Request Validation**: Validate incoming requests
- **Response Caching**: Cache responses for improved performance

## Prerequisites

- Node.js 18+
- Redis (for rate limiting and caching)
- Access to all microservices
- npm or yarn

## Local Development Setup

### 1. Install Dependencies

```bash
cd services/api-gateway
pnpm install
```

### 2. Environment Configuration

Create a `.env` file in the service directory:

```bash
# Service Configuration
PORT=3000
NODE_ENV=development
SERVICE_NAME=api-gateway

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=false

# Service URLs (for local development)
AUTH_SERVICE_URL=http://localhost:8001
ADMIN_SERVICE_URL=http://localhost:3006
ECOMMERCE_SERVICE_URL=http://localhost:8002
HOTEL_SERVICE_URL=http://localhost:8003
TAXI_SERVICE_URL=http://localhost:8004
PAYMENT_SERVICE_URL=http://localhost:8005
NOTIFICATION_SERVICE_URL=http://localhost:8006
SEARCH_SERVICE_URL=http://localhost:8007
FILE_SERVICE_URL=http://localhost:8008
ANALYTICS_SERVICE_URL=http://localhost:8009
ADVERTISEMENT_SERVICE_URL=http://localhost:8010
MESSAGING_SERVICE_URL=http://localhost:8011

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
CORS_CREDENTIALS=true

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090

# Circuit Breaker
CIRCUIT_BREAKER_THRESHOLD=5
CIRCUIT_BREAKER_TIMEOUT=60000
CIRCUIT_BREAKER_RESET_TIMEOUT=30000
```

### 3. Start the Service

```bash
# Development mode with auto-reload
pnpm run dev

# Production mode
pnpm run build
pnpm start
```

The service will be available at `http://localhost:3000`

### 4. Health Check

```bash
curl http://localhost:3000/health
```

## API Endpoints

### Gateway Health & Status
- `GET /health` - Gateway health status
- `GET /status` - Detailed gateway status
- `GET /metrics` - Prometheus metrics
- `GET /api-docs` - Swagger API documentation

### Service Health Checks
- `GET /health/services` - Health status of all services
- `GET /health/services/:serviceName` - Health status of specific service

### Authentication Routes
- `POST /auth/register` → Authentication Service
- `POST /auth/login` → Authentication Service
- `POST /auth/logout` → Authentication Service
- `POST /auth/refresh` → Authentication Service

### User Management Routes
- `GET /users/profile` → Authentication Service
- `PUT /users/profile` → Authentication Service
- `GET /users/:id` → Authentication Service

### Admin Routes
- `GET /admin/users` → Admin Service
- `GET /admin/roles` → Admin Service
- `POST /admin/roles` → Admin Service

### E-commerce Routes
- `GET /products` → E-commerce Service
- `GET /products/:id` → E-commerce Service
- `POST /orders` → E-commerce Service

### Hotel Routes
- `GET /hotels` → Hotel Service
- `GET /hotels/:id` → Hotel Service
- `POST /bookings` → Hotel Service

### Taxi Routes
- `GET /rides` → Taxi Service
- `POST /rides` → Taxi Service
- `GET /rides/:id` → Taxi Service

### Payment Routes
- `POST /payments` → Payment Service
- `GET /payments/:id` → Payment Service

## Docker Setup

### Using Docker Compose (Recommended)

The service is included in the main `docker-compose.dev.yml`:

```bash
# From project root
docker-compose -f docker-compose.dev.yml up api-gateway
```

### Standalone Docker

```bash
# Build the image
docker build -t giga-api-gateway .

# Run the container
docker run -d \
  --name api-gateway \
  -p 3000:3000 \
  -e REDIS_URL=redis://host.docker.internal:6379 \
  -e JWT_SECRET=your-secret \
  -e AUTH_SERVICE_URL=http://host.docker.internal:8001 \
  giga-api-gateway
```

## Configuration

### Service Discovery

The gateway can be configured to use different service discovery methods:

1. **Static URLs** (default for local development)
2. **Service Registry** (Consul, etcd)
3. **Kubernetes Service Discovery**
4. **Docker Compose Service Names**

### Load Balancing

Supported load balancing strategies:

- **Round Robin** (default)
- **Least Connections**
- **Weighted Round Robin**
- **IP Hash**

### Rate Limiting

Rate limiting is applied per IP address and can be configured:

- **Window Size**: Time window for rate limiting
- **Max Requests**: Maximum requests per window
- **Skip Successful**: Whether to count successful requests
- **Custom Rules**: Different limits for different endpoints

### Circuit Breaker

Circuit breaker pattern implementation:

- **Threshold**: Number of failures before opening
- **Timeout**: How long to wait before attempting to close
- **Reset Timeout**: How long to wait before resetting

## Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm run test:watch

# Run tests with coverage
pnpm run test:coverage

# Run specific test suites
pnpm run test:unit
pnpm run test:integration
pnpm run test:e2e
```

## Monitoring

### Metrics

The gateway exposes comprehensive metrics:

- **Request Count**: Total requests per endpoint
- **Response Time**: Average, median, 95th percentile
- **Error Rate**: Percentage of failed requests
- **Active Connections**: Current active connections
- **Circuit Breaker Status**: Open/closed state per service

### Health Checks

Health checks are performed on all downstream services:

- **HTTP Health Checks**: Standard health endpoints
- **Custom Health Checks**: Service-specific health logic
- **Dependency Checks**: Database, cache, external services

### Logging

Structured logging for all requests:

- **Request Logging**: Method, URL, headers, body
- **Response Logging**: Status, response time, size
- **Error Logging**: Detailed error information
- **Performance Logging**: Slow request identification

## Security

### Authentication

- JWT token validation
- Token refresh handling
- Session management
- Anonymous endpoint support

### Authorization

- Role-based access control
- Permission checking
- Route-level protection
- Admin-only endpoints

### Rate Limiting

- IP-based rate limiting
- User-based rate limiting
- Endpoint-specific limits
- Burst handling

### Input Validation

- Request body validation
- Query parameter validation
- Header validation
- Size limits

## Troubleshooting

### Common Issues

1. **Service Connection Errors**
   - Verify service URLs are correct
   - Check if services are running
   - Ensure network connectivity

2. **Authentication Errors**
   - Verify JWT_SECRET is set
   - Check token expiration
   - Validate token format

3. **Rate Limiting Issues**
   - Check Redis connection
   - Verify rate limit configuration
   - Monitor rate limit headers

4. **Circuit Breaker Issues**
   - Check service health
   - Monitor error rates
   - Verify timeout settings

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug
NODE_ENV=development
```

### Logs

Check service logs for detailed information:

```bash
# If running locally
pnpm run dev

# If running in Docker
docker logs api-gateway
```

## Development

### Project Structure

```
src/
├── app.ts                 # Main application entry point
├── config/                # Configuration management
├── middleware/            # Express middleware
├── routes/                # Route definitions
├── services/              # Business logic
├── utils/                 # Utility functions
├── types/                 # TypeScript type definitions
└── tests/                 # Test files
```

### Adding New Routes

1. Define route in `src/routes/`
2. Add middleware as needed
3. Configure service mapping
4. Add rate limiting rules
5. Update documentation
6. Write tests

### Custom Middleware

The gateway supports custom middleware:

- **Authentication**: Custom auth logic
- **Validation**: Request/response validation
- **Transformation**: Request/response modification
- **Logging**: Custom logging logic

## Performance

### Caching

- **Response Caching**: Cache responses for GET requests
- **Token Caching**: Cache JWT validation results
- **Health Check Caching**: Cache service health status

### Optimization

- **Connection Pooling**: Reuse HTTP connections
- **Request Batching**: Batch multiple requests
- **Response Compression**: Compress responses
- **Async Processing**: Non-blocking request handling

## Contributing

1. Follow the project's coding standards
2. Write tests for new features
3. Update documentation as needed
4. Ensure all tests pass
5. Submit pull requests for review

## License

MIT License - see LICENSE file for details