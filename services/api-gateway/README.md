# API Gateway Service

The API Gateway service acts as the single entry point for all client requests in the multi-service architecture. It handles routing, load balancing, rate limiting, authentication, and monitoring for all downstream services.

## Features

- **Service Routing**: Routes requests to appropriate microservices
- **Rate Limiting**: Protects services from abuse and overload
- **Health Monitoring**: Monitors health of all downstream services
- **Request Logging**: Comprehensive logging of all requests and responses
- **Error Handling**: Centralized error handling and response formatting
- **Security**: CORS, Helmet security headers, and request validation
- **Service Discovery**: Dynamic service registration and discovery

## Architecture

The API Gateway implements the following patterns:
- **Gateway Routing Pattern**: Single entry point for all client requests
- **Circuit Breaker Pattern**: Fail-fast when services are unavailable
- **Rate Limiting Pattern**: Protect downstream services from overload
- **Health Check Pattern**: Monitor service availability

## API Endpoints

### Health Check Endpoints

- `GET /health` - Basic gateway health status
- `GET /health/detailed` - Detailed health including all services
- `GET /health/service/:serviceName` - Health of specific service
- `GET /health/ready` - Kubernetes readiness probe
- `GET /health/live` - Kubernetes liveness probe

### Service Proxy Routes

- `POST /api/auth/*` - Authentication service routes
- `POST /api/payment/*` - Payment service routes
- `POST /api/notification/*` - Notification service routes
- `GET /api/search/*` - Search service routes
- `POST /api/file/*` - File service routes
- `GET /api/analytics/*` - Analytics service routes

## Configuration

### Environment Variables

```bash
# Server Configuration
NODE_ENV=development
PORT=8000
SERVICE_NAME=api-gateway

# Service URLs
AUTH_SERVICE_URL=http://localhost:8001
PAYMENT_SERVICE_URL=http://localhost:8002
NOTIFICATION_SERVICE_URL=http://localhost:8003
SEARCH_SERVICE_URL=http://localhost:8004
FILE_SERVICE_URL=http://localhost:8005
ANALYTICS_SERVICE_URL=http://localhost:8006

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:3000

# Health Check
HEALTH_CHECK_TIMEOUT=5000
HEALTH_CACHE_TIMEOUT=30000

# Logging
LOG_LEVEL=info
```

### Rate Limiting Configuration

The gateway implements different rate limiting strategies:

- **General API**: 100 requests per 15 minutes
- **Authentication**: 5 requests per 15 minutes
- **Payment**: 10 requests per minute
- **File Upload**: 20 requests per minute

## Development

### Prerequisites

- Node.js 18+
- TypeScript
- Access to downstream services

### Installation

```bash
# Install dependencies
npm install

# Build the service
npm run build

# Start in development mode
npm run dev

# Start in production mode
npm start
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix
```

### Project Structure

```
src/
├── config/
│   └── rate-limit-config.ts    # Rate limiting configuration
├── middleware/
│   ├── error-handler.ts        # Global error handling
│   └── request-logger.ts       # Request logging middleware
├── routes/
│   └── health-routes.ts        # Health check endpoints
├── services/
│   ├── service-registry.ts     # Service discovery and registration
│   └── health-check-service.ts # Health monitoring service
├── tests/
│   ├── setup.ts               # Test configuration
│   ├── app.test.ts            # Integration tests
│   ├── service-registry.test.ts
│   └── health-check-service.test.ts
└── app.ts                     # Main application file
```

## Monitoring and Observability

### Health Checks

The gateway provides comprehensive health monitoring:

1. **Gateway Health**: Basic service health and resource usage
2. **Service Health**: Health status of all downstream services
3. **Detailed Health**: Combined health report with service summary
4. **Readiness Probe**: Kubernetes readiness check
5. **Liveness Probe**: Kubernetes liveness check

### Logging

All requests are logged with:
- Request ID for tracing
- Method, URL, and IP address
- Response time and status code
- User agent and referrer
- Error details for failed requests

### Metrics

The gateway exposes metrics for:
- Request count and response times
- Error rates by service
- Rate limiting statistics
- Service health status

## Security

### Implemented Security Measures

1. **Helmet**: Security headers (CSP, HSTS, etc.)
2. **CORS**: Cross-origin resource sharing configuration
3. **Rate Limiting**: Protection against abuse and DDoS
4. **Request Validation**: Input sanitization and validation
5. **Error Handling**: Secure error responses without sensitive data

### Security Headers

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security` (in production)
- `Content-Security-Policy` (configurable)

## Deployment

### Docker

```bash
# Build Docker image
docker build -t api-gateway .

# Run container
docker run -p 8000:8000 --env-file .env api-gateway
```

### Kubernetes

The service includes readiness and liveness probes for Kubernetes deployment:

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 8000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 8000
  initialDelaySeconds: 5
  periodSeconds: 5
```

## Troubleshooting

### Common Issues

1. **Service Unavailable (503)**: Downstream service is not responding
   - Check service health endpoints
   - Verify service URLs in configuration
   - Check network connectivity

2. **Rate Limited (429)**: Too many requests from client
   - Check rate limiting configuration
   - Implement exponential backoff in client
   - Consider increasing rate limits if appropriate

3. **Gateway Timeout (504)**: Request timeout to downstream service
   - Check service response times
   - Increase timeout configuration if needed
   - Investigate service performance issues

### Debugging

Enable debug logging:
```bash
LOG_LEVEL=debug npm run dev
```

Check service health:
```bash
curl http://localhost:8000/health/detailed
```

Monitor specific service:
```bash
curl http://localhost:8000/health/service/auth
```

## Contributing

1. Follow TypeScript and ESLint configurations
2. Write tests for new features
3. Update documentation for API changes
4. Follow semantic versioning for releases

## License

This project is licensed under the MIT License.