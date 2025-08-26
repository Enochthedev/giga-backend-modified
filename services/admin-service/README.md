# Admin Service

A microservice providing administrative and management capabilities for the Giga platform, including user management, system monitoring, and administrative operations.

## Features

- User management and administration
- Role and permission management
- System health monitoring
- Audit logging and reporting
- Platform configuration management
- Service discovery and health checks
- Administrative dashboard endpoints
- Bulk operations and data management

## Prerequisites

- Node.js 18+
- PostgreSQL 12+
- Redis (optional, for caching)
- npm or yarn

## Local Development Setup

### 1. Install Dependencies

```bash
cd services/admin-service
pnpm install
```

### 2. Environment Configuration

Create a `.env` file in the service directory:

```bash
# Service Configuration
PORT=3006
NODE_ENV=development
SERVICE_NAME=admin-service

# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/admin_db

# Redis Configuration (optional)
REDIS_URL=redis://localhost:6379

# Authentication Service URL
AUTH_SERVICE_URL=http://localhost:8001

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
```

### 3. Database Setup

Ensure PostgreSQL is running and create the database:

```sql
CREATE DATABASE admin_db;
```

Run migrations:

```bash
pnpm run migrate
```

### 4. Start the Service

```bash
# Development mode with auto-reload
pnpm run dev

# Production mode
pnpm run build
pnpm start
```

The service will be available at `http://localhost:3006`

### 5. Health Check

```bash
curl http://localhost:3006/health
```

## API Endpoints

### Health & Monitoring
- `GET /health` - Service health status
- `GET /metrics` - Prometheus metrics
- `GET /status` - Detailed service status

### User Management
- `GET /admin/users` - List all users
- `GET /admin/users/:id` - Get user details
- `PUT /admin/users/:id` - Update user
- `DELETE /admin/users/:id` - Deactivate user
- `POST /admin/users/:id/roles` - Assign roles
- `DELETE /admin/users/:id/roles/:roleId` - Remove role

### Role Management
- `GET /admin/roles` - List all roles
- `POST /admin/roles` - Create new role
- `PUT /admin/roles/:id` - Update role
- `DELETE /admin/roles/:id` - Delete role
- `GET /admin/roles/:id/permissions` - Get role permissions

### Permission Management
- `GET /admin/permissions` - List all permissions
- `POST /admin/permissions` - Create new permission
- `PUT /admin/permissions/:id` - Update permission
- `DELETE /admin/permissions/:id` - Delete permission

### System Management
- `GET /admin/system/status` - System overview
- `GET /admin/system/logs` - System logs
- `POST /admin/system/restart` - Restart service
- `GET /admin/system/config` - System configuration

### Audit & Reporting
- `GET /admin/audit/logs` - Audit trail
- `GET /admin/reports/users` - User reports
- `GET /admin/reports/activity` - Activity reports
- `POST /admin/reports/generate` - Generate custom reports

## Docker Setup

### Using Docker Compose (Recommended)

The service is included in the main `docker-compose.dev.yml`:

```bash
# From project root
docker-compose -f docker-compose.dev.yml up admin-service
```

### Standalone Docker

```bash
# Build the image
docker build -t giga-admin-service .

# Run the container
docker run -d \
  --name admin-service \
  -p 3006:3006 \
  -e DATABASE_URL=postgresql://postgres:password@host.docker.internal:5432/admin_db \
  -e JWT_SECRET=your-secret \
  -e AUTH_SERVICE_URL=http://host.docker.internal:8001 \
  giga-admin-service
```

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
```

## Monitoring

The service exposes comprehensive metrics and monitoring:

- **Health Endpoint**: `/health` - Basic service health
- **Metrics Endpoint**: `/metrics` - Prometheus-compatible metrics
- **Status Endpoint**: `/status` - Detailed service status
- **OpenTelemetry**: Distributed tracing support

### Key Metrics

- Request count and response times
- Database connection status
- Memory and CPU usage
- Error rates and types
- Active user sessions
- Role assignment counts

## Security

### Authentication & Authorization

- JWT-based authentication
- Role-based access control (RBAC)
- Permission-based authorization
- Rate limiting and throttling
- Input validation and sanitization

### Required Roles

- `super_admin` - Full system access
- `admin` - Administrative access
- `moderator` - Limited administrative access

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure PostgreSQL is running
   - Check DATABASE_URL format
   - Verify database exists and is accessible

2. **Authentication Service Connection**
   - Verify AUTH_SERVICE_URL is correct
   - Check if authentication service is running
   - Ensure network connectivity

3. **Permission Denied Errors**
   - Verify user has required roles
   - Check permission assignments
   - Review role hierarchy

4. **Port Already in Use**
   - Change PORT in .env file
   - Kill process using the port: `lsof -ti:3006 | xargs kill`

### Logs

Check service logs for detailed error information:

```bash
# If running locally
pnpm run dev

# If running in Docker
docker logs admin-service
```

### Debug Mode

Enable debug logging by setting:

```bash
LOG_LEVEL=debug
NODE_ENV=development
```

## Development

### Project Structure

```
src/
├── app.ts                 # Main application entry point
├── config/                # Configuration management
├── controllers/           # Request handlers
├── middleware/            # Express middleware
├── models/                # Data models
├── routes/                # API route definitions
├── services/              # Business logic
├── utils/                 # Utility functions
└── types/                 # TypeScript type definitions
```

### Adding New Endpoints

1. Create controller in `src/controllers/`
2. Add route in `src/routes/`
3. Implement business logic in `src/services/`
4. Add validation schemas
5. Write tests
6. Update documentation

### Code Standards

- Follow TypeScript best practices
- Use async/await for asynchronous operations
- Implement proper error handling
- Add comprehensive logging
- Write unit and integration tests
- Follow REST API conventions

## Contributing

1. Follow the project's coding standards
2. Write tests for new features
3. Update documentation as needed
4. Ensure all tests pass
5. Submit pull requests for review

## License

MIT License - see LICENSE file for details