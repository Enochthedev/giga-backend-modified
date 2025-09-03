# Standardized Docker Configuration

This document outlines the standardized Docker configuration patterns implemented across all services in the multi-service platform.

## Overview

All service Dockerfiles have been standardized to follow security best practices, build optimization, and consistency patterns. This ensures reliable builds, secure deployments, and maintainable container configurations.

## Standardized Features

### 1. Multi-Stage Build Pattern

All services use a two-stage build process:

- **Builder Stage**: Compiles TypeScript, installs all dependencies
- **Production Stage**: Creates optimized runtime image with only production dependencies

### 2. Security Best Practices

- **Non-root Users**: All containers run as non-root users with specific UID/GID (1001)
- **Alpine Linux**: Uses `node:18-alpine` for smaller attack surface
- **Signal Handling**: Uses `dumb-init` for proper signal handling
- **Minimal Privileges**: Containers run with minimal required privileges

### 3. Build Optimization

- **Layer Caching**: Optimized COPY order for better Docker layer caching
- **Dependency Management**: Uses `pnpm` with `--frozen-lockfile` for reproducible builds
- **Store Pruning**: Cleans up pnpm store to reduce image size
- **Multi-architecture Support**: Compatible with AMD64 and ARM64 architectures

### 4. Health Checks

- **Standardized Format**: All services implement consistent health check patterns
- **Configurable Endpoints**: Health checks use service-specific ports and endpoints
- **Error Handling**: Proper error handling in health check commands
- **Timeout Configuration**: 30s interval, 3s timeout, 5s start period, 3 retries

### 5. Port Standardization

Services use consistent port assignments:

- API Gateway: 3000
- Authentication: 3001
- E-commerce: 3002
- Payment: 3003
- Taxi: 3004
- Hotel: 3005
- Advertisement: 3006
- Notification: 3007
- File: 3008
- Search: 3009
- Admin: 3010
- Analytics: 3011
- Messaging: 3012
- Data Governance: 3020

## Dockerfile Template

The standardized template (`docker/Dockerfile.template`) provides:

```dockerfile
# Build stage
FROM node:18-alpine AS builder
RUN apk add --no-cache python3 make g++ && npm install -g pnpm
WORKDIR /app
COPY package*.json pnpm-lock.yaml* tsconfig.json ./
RUN pnpm install --frozen-lockfile
COPY src/ ./src/
RUN pnpm run build

# Production stage
FROM node:18-alpine AS production
RUN apk add --no-cache dumb-init && npm install -g pnpm
RUN addgroup -g 1001 -S nodejs && adduser -S appuser -u 1001 -G nodejs
WORKDIR /app
COPY package*.json pnpm-lock.yaml* ./
RUN pnpm install --prod --frozen-lockfile && pnpm store prune
COPY --from=builder --chown=appuser:nodejs /app/dist ./dist
RUN mkdir -p logs tmp && chown -R appuser:nodejs /app
USER appuser
EXPOSE ${PORT}
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:${PORT}/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/app.js"]
```

## Service-Specific Customizations

### File Service
- Includes `vips` runtime dependencies for image processing
- Additional `uploads` directory for file storage

### Data Governance Admin
- Specialized for governance and compliance features
- Uses port 3020 for administrative access

### Authentication Service
- Enhanced security configurations
- Specialized user management (`authuser`)

## Build Requirements

### Prerequisites
- Docker 20.10+
- Node.js 18+ (for local development)
- pnpm package manager

### Build Commands

```bash
# Build individual service
docker build -f services/[service-name]/Dockerfile -t [service-name]:latest .

# Build all services
docker-compose build

# Build with no cache
docker build --no-cache -f services/[service-name]/Dockerfile -t [service-name]:latest .
```

## Security Considerations

### Container Security
- All containers run as non-root users
- Minimal base images (Alpine Linux)
- No unnecessary packages or tools in production images
- Proper signal handling with dumb-init

### Network Security
- Services only expose necessary ports
- Internal communication uses Docker networking
- Health checks use localhost connections

### Data Security
- Proper file permissions and ownership
- Secure directory creation
- No sensitive data in images

## Development vs Production

### Development Mode
- Use `docker-compose.override.yml` for development-specific configurations
- Volume mounts for hot-reloading
- Debug port exposure
- Development dependencies available

### Production Mode
- Optimized images with minimal dependencies
- No development tools or debug ports
- Proper logging and monitoring integration
- Resource limits and constraints

## Troubleshooting

### Common Build Issues

1. **Missing Dependencies**
   ```bash
   # Clear pnpm cache
   docker build --no-cache
   ```

2. **Permission Issues**
   ```bash
   # Check user permissions
   docker run --rm -it [image] whoami
   ```

3. **Health Check Failures**
   ```bash
   # Test health endpoint manually
   docker run --rm -p 3000:3000 [image]
   curl http://localhost:3000/health
   ```

### Performance Optimization

1. **Build Time**
   - Use `.dockerignore` to exclude unnecessary files
   - Optimize layer caching with proper COPY order
   - Use multi-stage builds effectively

2. **Runtime Performance**
   - Set appropriate resource limits
   - Use production Node.js optimizations
   - Monitor memory and CPU usage

## Maintenance

### Regular Updates
- Update base images monthly for security patches
- Review and update dependencies quarterly
- Monitor for security vulnerabilities

### Monitoring
- Implement proper logging in all services
- Use health checks for container orchestration
- Monitor resource usage and performance metrics

## Compliance

This standardization ensures compliance with:
- Container security best practices
- Docker official recommendations
- Production deployment requirements
- Multi-environment compatibility