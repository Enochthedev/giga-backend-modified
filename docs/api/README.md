# API Documentation

This directory contains OpenAPI/Swagger specifications for all microservices in the platform.

## Services

- [Authentication Service](./authentication-service.yaml) - User authentication, authorization, and session management
- [API Gateway](./api-gateway.yaml) - Request routing, rate limiting, and service orchestration
- [Payment Service](./payment-service.yaml) - Payment processing, refunds, and multi-gateway integration
- [Ecommerce Service](./ecommerce-service.yaml) - Product catalog, orders, shopping cart, and vendor management
- [Taxi Service](./taxi-service.yaml) - Ride booking, driver management, and real-time tracking
- [Hotel Service](./hotel-service.yaml) - Property listings, booking management, and reviews
- [Advertisement Service](./advertisement-service.yaml) - Ad campaign management, targeting, and analytics
- [Notification Service](./notification-service.yaml) - Multi-channel notifications (email, SMS, push)
- [File Service](./file-service.yaml) - File upload, storage, and media processing
- [Search Service](./search-service.yaml) - Full-text search, recommendations, and autocomplete
- [Analytics Service](./analytics-service.yaml) - Data collection, processing, and reporting
- [Admin Service](./admin-service.yaml) - Administrative interfaces and system management

## Usage

### Viewing Documentation
1. Install Swagger UI or use online viewer at https://editor.swagger.io/
2. Load the YAML files to view interactive documentation
3. Use the documentation to understand API endpoints, request/response formats, and authentication requirements

### Generating Client SDKs
```bash
# Install OpenAPI Generator
npm install -g @openapitools/openapi-generator-cli

# Generate TypeScript client for a service
openapi-generator-cli generate -i docs/api/authentication-service.yaml -g typescript-axios -o clients/typescript/auth

# Generate Python client
openapi-generator-cli generate -i docs/api/payment-service.yaml -g python -o clients/python/payment
```

### API Testing
Use the specifications with tools like:
- Postman (import OpenAPI spec)
- Insomnia (import OpenAPI spec)
- Newman (automated testing)
- Dredd (API testing framework)

## Standards

All API specifications follow:
- OpenAPI 3.0.3 specification
- RESTful design principles
- Consistent error response formats
- Proper HTTP status codes
- Comprehensive examples and descriptions
- Security scheme definitions