# Authentication Service

A microservice responsible for user authentication, authorization, and user management in the Giga platform.

## Features

- User registration and login
- JWT token-based authentication
- OAuth integration (Google, Apple, Facebook, GitHub)
- Role-based access control (RBAC)
- Two-factor authentication (2FA)
- Password reset and account recovery
- User profile management
- Session management
- Rate limiting and security

## Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- Redis (optional, for session storage)
- npm or yarn

## Local Development Setup

### 1. Install Dependencies

```bash
cd services/authentication-service
pnpm install
```

### 2. Environment Configuration

Create a `.env` file in the service directory:

```bash
# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/auth_db

# Service Configuration
PORT=8001
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# OAuth Configuration (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
APPLE_CLIENT_ID=your-apple-client-id
APPLE_CLIENT_SECRET=your-apple-client-secret
FACEBOOK_CLIENT_ID=your-facebook-client-id
FACEBOOK_CLIENT_SECRET=your-facebook-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Redis Configuration (optional)
REDIS_URL=redis://localhost:6379

# Email Configuration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 3. Database Setup

Ensure PostgreSQL is running and create the database:

```sql
CREATE DATABASE auth_db;
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

The service will be available at `http://localhost:8001`

### 5. Health Check

```bash
curl http://localhost:8001/health
```

## API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/refresh` - Refresh JWT token
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password

### OAuth
- `GET /auth/google` - Google OAuth
- `GET /auth/apple` - Apple OAuth
- `GET /auth/facebook` - Facebook OAuth
- `GET /auth/github` - GitHub OAuth

### User Management
- `GET /users/profile` - Get user profile
- `PUT /users/profile` - Update user profile
- `GET /users/:id` - Get user by ID
- `DELETE /users/:id` - Delete user

### 2FA
- `POST /2fa/enable` - Enable 2FA
- `POST /2fa/verify` - Verify 2FA code
- `POST /2fa/disable` - Disable 2FA

## Docker Setup

### Using Docker Compose (Recommended)

The service is included in the main `docker-compose.dev.yml`:

```bash
# From project root
docker-compose -f docker-compose.dev.yml up authentication-service
```

### Standalone Docker

```bash
# Build the image
docker build -t giga-auth-service .

# Run the container
docker run -d \
  --name auth-service \
  -p 8001:8001 \
  -e DATABASE_URL=postgresql://postgres:password@host.docker.internal:5432/auth_db \
  -e JWT_SECRET=your-secret \
  giga-auth-service
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Monitoring

The service exposes metrics at `/metrics` for Prometheus monitoring and includes OpenTelemetry tracing.

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure PostgreSQL is running
   - Check DATABASE_URL format
   - Verify database exists

2. **Port Already in Use**
   - Change PORT in .env file
   - Kill process using the port: `lsof -ti:8001 | xargs kill`

3. **JWT Errors**
   - Ensure JWT_SECRET is set
   - Check token expiration settings

4. **OAuth Errors**
   - Verify OAuth credentials
   - Check redirect URIs in OAuth provider settings

### Logs

Check service logs for detailed error information:

```bash
# If running locally
npm run dev

# If running in Docker
docker logs auth-service
```

## Contributing

1. Follow the project's coding standards
2. Write tests for new features
3. Update documentation as needed
4. Submit pull requests for review

## License

MIT License - see LICENSE file for details