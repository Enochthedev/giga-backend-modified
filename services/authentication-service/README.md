# Authentication Service

The authentication service handles user registration, login, JWT token management, and role-based access control for the Giga platform.

## Features

- User registration and login
- JWT access token and refresh token management
- Password hashing with bcrypt
- Role-based access control (RBAC)
- Email verification
- Password reset functionality
- Multi-device session management
- OAuth integration support (Google, Facebook)
- Comprehensive input validation
- Rate limiting and security middleware

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login with email and password
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout (revoke refresh token)
- `POST /api/auth/logout-all` - Logout from all devices
- `POST /api/auth/change-password` - Change user password
- `POST /api/auth/verify-token` - Verify JWT token

### User Management

- `GET /api/users/:id` - Get user by ID
- `GET /api/users/:id/profile` - Get user profile with roles
- `PUT /api/users/:id` - Update user information
- `DELETE /api/users/:id` - Deactivate user (soft delete)
- `POST /api/users/:id/verify-email` - Verify user email
- `POST /api/users/:id/roles/:roleName` - Assign role to user
- `DELETE /api/users/:id/roles/:roleName` - Remove role from user

## Environment Variables

```bash
# Service Configuration
NODE_ENV=development
PORT=8001
SERVICE_NAME=authentication-service

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/database

# Redis (for caching and sessions)
REDIS_URL=redis://localhost:6379

# Message Queue
RABBITMQ_URL=amqp://username:password@localhost:5672

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=12

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

## Database Schema

The service uses PostgreSQL with the following main tables:

- `users` - User account information
- `roles` - Available roles in the system
- `permissions` - Available permissions
- `user_roles` - User-role assignments
- `role_permissions` - Role-permission assignments
- `refresh_tokens` - JWT refresh tokens
- `password_reset_tokens` - Password reset tokens
- `email_verification_tokens` - Email verification tokens
- `oauth_providers` - OAuth provider connections
- `user_sessions` - Active user sessions

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- RabbitMQ 3.8+

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Run database migrations:
```bash
npm run migrate
```

4. Start the service:
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Database Migrations

```bash
# Run pending migrations
npm run migrate

# Check migration status
npm run migrate:status

# Rollback last migration
npm run migrate:rollback
```

## Security Features

### Password Security
- Passwords are hashed using bcrypt with configurable rounds
- Password strength validation (minimum 8 characters, uppercase, lowercase, number, special character)
- Password change requires current password verification

### JWT Security
- Access tokens with short expiration (default 24h)
- Refresh tokens with longer expiration (default 7d)
- Refresh token rotation on use
- Token revocation support

### Rate Limiting
- Configurable rate limiting per IP address
- Different limits for different endpoints
- Automatic blocking of suspicious activity

### Input Validation
- Comprehensive input validation using Zod schemas
- SQL injection prevention
- XSS protection
- CSRF protection

## Role-Based Access Control

The service supports a flexible RBAC system:

### Default Roles
- `super_admin` - Full system access
- `admin` - Administrative access
- `user` - Regular user access
- `vendor` - Vendor-specific access
- `driver` - Driver-specific access
- `property_owner` - Property management access

### Permissions
Permissions are granular and follow the pattern `resource.action`:
- `users.read`, `users.write`, `users.delete`
- `roles.read`, `roles.write`, `roles.delete`
- `system.admin`

## API Usage Examples

### Register a new user
```bash
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Login
```bash
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

### Refresh token
```bash
curl -X POST http://localhost:8001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your-refresh-token-here"
  }'
```

## Error Handling

The service returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE",
  "timestamp": "2023-01-01T00:00:00.000Z",
  "requestId": "uuid"
}
```

Common error codes:
- `VALIDATION_ERROR` - Input validation failed
- `UNAUTHORIZED` - Authentication required or failed
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `CONFLICT` - Resource already exists
- `RATE_LIMIT_EXCEEDED` - Too many requests

## Monitoring and Logging

The service includes comprehensive logging and monitoring:

- Structured JSON logging
- Request/response logging
- Performance monitoring
- Security event logging
- Health check endpoint at `/health`

## Development

### Code Structure
```
src/
├── app.ts                 # Main application entry point
├── database/
│   ├── connection.ts      # Database connection management
│   ├── migrate.ts         # Migration runner
│   └── migrations/        # SQL migration files
├── models/
│   ├── user-model.ts      # User data access layer
│   └── refresh-token-model.ts
├── services/
│   └── auth-service.ts    # Authentication business logic
├── routes/
│   ├── auth-routes.ts     # Authentication endpoints
│   └── user-routes.ts     # User management endpoints
├── validation/
│   ├── auth-validation.ts # Authentication input validation
│   └── user-validation.ts # User input validation
└── tests/
    ├── setup.ts           # Test configuration
    └── auth-service.test.ts
```

### Contributing

1. Follow the existing code style and patterns
2. Add tests for new functionality
3. Update documentation as needed
4. Ensure all tests pass before submitting

### Linting

```bash
# Check for linting errors
npm run lint

# Fix linting errors automatically
npm run lint:fix
```