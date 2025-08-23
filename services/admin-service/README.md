# Admin Service

A comprehensive admin management service for the multi-service platform, providing role-based access control, system health monitoring, configuration management, and cross-service user management capabilities.

## Features

### Core Admin Management
- **Admin User Management**: Create, update, and manage admin users with role-based permissions
- **Role-Based Access Control (RBAC)**: Flexible permission system with predefined and custom roles
- **Authentication & Authorization**: JWT-based authentication with session management
- **Audit Logging**: Comprehensive logging of all admin actions and system events

### System Health Monitoring
- **Real-time Health Checks**: Monitor health status of all services in the platform
- **Performance Metrics**: Track response times, uptime, and system performance
- **Alert Management**: System alerts with severity levels and acknowledgment workflow
- **Historical Data**: Store and analyze historical health and performance data

### Configuration Management
- **Platform Settings**: Centralized configuration management for all services
- **Environment-specific Configs**: Support for different environments (dev, staging, prod)
- **Validation & Security**: Configuration validation and sensitive data protection
- **Import/Export**: Bulk configuration operations with JSON format support

### Cross-Service User Management
- **Unified User View**: Search and manage users across all platform services
- **Status Management**: Update user status across multiple services simultaneously
- **Activity Tracking**: Monitor user activity and engagement across services
- **Data Synchronization**: Keep user data synchronized across services

## API Endpoints

### Admin Management
- `POST /api/admin/login` - Admin login
- `POST /api/admin/logout` - Admin logout
- `GET /api/admin/profile` - Get current admin profile
- `GET /api/admin/users` - List admin users
- `POST /api/admin/users` - Create admin user
- `PUT /api/admin/users/:id` - Update admin user
- `GET /api/admin/roles` - List admin roles
- `POST /api/admin/roles` - Create admin role

### System Health
- `GET /health` - Service health check
- `GET /api/system-health/system` - Overall system health
- `GET /api/system-health/services/:name/metrics` - Service metrics
- `GET /api/system-health/performance` - Performance summary
- `POST /api/system-health/metrics` - Record custom metric

### Configuration
- `GET /api/configuration/categories` - List configuration categories
- `GET /api/configuration/:category` - Get configurations by category
- `GET /api/configuration/:category/:key` - Get specific configuration
- `PUT /api/configuration/:category/:key` - Set configuration value
- `DELETE /api/configuration/:category/:key` - Delete configuration
- `POST /api/configuration/bulk-update` - Bulk update configurations
- `GET /api/configuration/export` - Export configurations
- `POST /api/configuration/import` - Import configurations

### User Management
- `GET /api/users/search` - Search users across services
- `GET /api/users/dashboard-stats` - Dashboard statistics
- `PATCH /api/users/:id/status` - Update user status
- `GET /api/users/:service/:id` - Get user from specific service
- `POST /api/users/sync` - Sync user data from all services
- `GET /api/users/export` - Export user data

### Audit Logs
- `GET /api/admin/audit-logs` - Get audit logs
- `GET /api/admin/audit-logs/stats` - Audit statistics
- `GET /api/admin/audit-logs/export` - Export audit logs

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd services/admin-service
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database**
   ```bash
   # Create PostgreSQL database
   createdb admin_service_db
   
   # Run migrations
   npm run migrate
   ```

5. **Start the service**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm run build
   npm start
   ```

## Environment Variables

### Server Configuration
- `PORT` - Server port (default: 3006)
- `NODE_ENV` - Environment (development/production)

### Database Configuration
- `DATABASE_URL` - PostgreSQL connection string
- `DATABASE_POOL_SIZE` - Connection pool size (default: 10)
- `DATABASE_TIMEOUT` - Connection timeout (default: 30000)

### JWT Configuration
- `JWT_SECRET` - JWT signing secret
- `JWT_EXPIRES_IN` - Access token expiration (default: 24h)
- `JWT_REFRESH_EXPIRES_IN` - Refresh token expiration (default: 7d)

### Redis Configuration
- `REDIS_URL` - Redis connection string
- `REDIS_PASSWORD` - Redis password
- `REDIS_DB` - Redis database number

### Service URLs
- `API_GATEWAY_URL` - API Gateway service URL
- `AUTH_SERVICE_URL` - Authentication service URL
- `ECOMMERCE_SERVICE_URL` - Ecommerce service URL
- `TAXI_SERVICE_URL` - Taxi service URL
- `HOTEL_SERVICE_URL` - Hotel service URL
- `PAYMENT_SERVICE_URL` - Payment service URL

### Security Configuration
- `BCRYPT_ROUNDS` - Password hashing rounds (default: 12)
- `RATE_LIMIT_WINDOW_MS` - Rate limit window (default: 900000)
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window (default: 100)

### Admin Configuration
- `SUPER_ADMIN_EMAIL` - Default super admin email
- `SUPER_ADMIN_PASSWORD` - Default super admin password
- `DEFAULT_ADMIN_ROLE` - Default admin role name

## Database Schema

The service uses PostgreSQL with the following main tables:

- **admin_roles** - Admin roles and permissions
- **admin_users** - Admin user accounts
- **admin_sessions** - Active admin sessions
- **audit_logs** - Audit trail of all actions
- **system_health_metrics** - System health and performance data
- **platform_configurations** - Platform configuration settings
- **user_management_cache** - Cached user data from other services
- **system_alerts** - System alerts and notifications

## Permissions System

The service implements a comprehensive RBAC system with the following permission categories:

### User Management
- `users:read` - View user information
- `users:write` - Create and update users
- `users:delete` - Delete users

### Vendor Management
- `vendors:read` - View vendor information
- `vendors:write` - Create and update vendors
- `vendors:approve` - Approve vendor applications

### Product Management
- `products:read` - View products
- `products:write` - Create and update products
- `products:approve` - Approve product listings

### System Management
- `system:read` - View system information
- `system:write` - Modify system settings
- `audit:read` - View audit logs
- `admin:read` - View admin users
- `admin:write` - Manage admin users

### Super Admin
- `*` - All permissions (super admin)

## Default Roles

The service comes with predefined roles:

1. **Super Admin** - Full system access (`*`)
2. **Admin** - Most administrative functions
3. **Moderator** - Limited administrative access
4. **Support** - Read-only access for support staff

## Health Monitoring

The service provides comprehensive health monitoring:

### Service Health Checks
- Automatic health checks for all platform services
- Configurable check intervals and timeouts
- Health status aggregation and reporting

### Performance Metrics
- Response time tracking
- Uptime monitoring
- Resource usage metrics
- Custom metric recording

### Alerting
- Configurable alert thresholds
- Multiple severity levels (info, warning, error, critical)
- Alert acknowledgment and resolution workflow

## Configuration Management

### Categories
Configurations are organized into categories such as:
- `email` - Email service settings
- `payment` - Payment gateway configurations
- `security` - Security-related settings
- `features` - Feature flags and toggles
- `limits` - Rate limits and quotas

### Validation
- JSON schema validation for configuration values
- Type checking and constraint validation
- Sensitive data protection and encryption

### Import/Export
- JSON format for configuration export/import
- Bulk operations for multiple configurations
- Environment-specific configuration management

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- admin.service.test.ts
```

## Development

### Code Structure
```
src/
├── controllers/     # Request handlers
├── services/        # Business logic
├── middleware/      # Express middleware
├── routes/          # Route definitions
├── database/        # Database connection and migrations
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── tests/           # Test files
```

### Adding New Features
1. Define types in `src/types/`
2. Implement business logic in `src/services/`
3. Create controllers in `src/controllers/`
4. Define routes in `src/routes/`
5. Add tests in `src/tests/`

### Database Migrations
```bash
# Run migrations
npm run migrate

# Rollback migrations (development only)
npm run migrate:rollback
```

## Security Considerations

### Authentication
- JWT tokens with configurable expiration
- Refresh token rotation
- Session management and validation
- Account lockout after failed attempts

### Authorization
- Role-based access control
- Permission-based route protection
- Audit logging for all actions
- IP address and user agent tracking

### Data Protection
- Password hashing with bcrypt
- Sensitive configuration encryption
- SQL injection prevention
- Input validation and sanitization

## Monitoring and Logging

### Logging
- Structured logging with Winston
- Configurable log levels
- File and console output
- Request/response logging

### Metrics
- Health check metrics
- Performance monitoring
- Custom metric recording
- Historical data retention

### Alerts
- System health alerts
- Performance threshold alerts
- Security event alerts
- Custom alert rules

## API Documentation

Interactive API documentation is available at `/api-docs` when the service is running. The documentation includes:

- Complete endpoint reference
- Request/response schemas
- Authentication requirements
- Example requests and responses

## Contributing

1. Follow the coding standards defined in `.kiro/steering/coding-standards.md`
2. Write tests for new features
3. Update documentation as needed
4. Follow the commit message conventions
5. Ensure all tests pass before submitting

## License

This project is licensed under the MIT License - see the LICENSE file for details.