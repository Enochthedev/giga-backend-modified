# Docker Build Troubleshooting Guide

## Common Docker Build Issues and Solutions

### Issue: "COPY src/ ./src/: not found" Error

**Problem**: Docker can't find the source directory when building services.

**Cause**: Usually caused by Docker cache containing old build layers with incorrect paths.

**Solutions**:

#### 1. Quick Fix - Clean Build Specific Service
```bash
# For notification service specifically
./scripts/docker-clean-build.sh notification

# For any other service
./scripts/docker-clean-build.sh [service-name]
```

#### 2. Clean Build All Services
```bash
# Clean everything and rebuild
./scripts/docker-clean-build.sh all

# Or using npm script
pnpm run docker:build:clean
```

#### 3. Manual Docker Cache Cleanup
```bash
# Stop all containers
docker-compose down

# Remove all containers
docker container prune -f

# Remove all images
docker image prune -a -f

# Remove build cache
docker builder prune -a -f

# Rebuild without cache
docker-compose build --no-cache
```

#### 4. Nuclear Option - Complete Docker Reset
```bash
# WARNING: This removes ALL Docker data
docker system prune -a --volumes -f

# Then rebuild
docker-compose build --no-cache
```

### Issue: "Context" or "Dockerfile" Not Found

**Problem**: Docker-compose can't find the Dockerfile or build context.

**Solution**: Ensure you're running docker-compose from the project root directory:
```bash
# Make sure you're in the project root
cd /path/to/giga-backend-modified

# Then run docker-compose
docker-compose up --build
```

### Issue: Permission Denied Errors

**Problem**: Docker doesn't have permission to access files.

**Solutions**:
```bash
# Fix file permissions
chmod -R 755 services/
chmod -R 755 packages/

# Or run with sudo (not recommended for production)
sudo docker-compose up --build
```

### Issue: Out of Disk Space

**Problem**: Docker images and containers consuming too much space.

**Solution**:
```bash
# Check Docker disk usage
docker system df

# Clean up unused data
docker system prune -a -f

# Remove unused volumes
docker volume prune -f
```

## Service-Specific Troubleshooting

### Notification Service
```bash
# Clean rebuild notification service
./scripts/docker-clean-build.sh notification-service

# Check if source directory exists
ls -la services/notification-service/src/

# Verify Dockerfile paths
cat services/notification-service/Dockerfile | grep COPY
```

### Authentication Service
```bash
# Clean rebuild auth service
./scripts/docker-clean-build.sh authentication-service

# Check dependencies
ls -la services/authentication-service/
ls -la packages/common/
```

### Payment Service
```bash
# Clean rebuild payment service
./scripts/docker-clean-build.sh payment-service

# Verify service structure
ls -la services/payment-service/src/
```

## Prevention Tips

### 1. Always Use Clean Builds After Git Pull
```bash
# After pulling changes
git pull
./scripts/docker-clean-build.sh all
```

### 2. Regular Docker Cleanup
```bash
# Weekly cleanup routine
docker system prune -f
docker image prune -f
```

### 3. Use Specific Service Rebuilds
```bash
# Instead of rebuilding everything, rebuild specific services
./scripts/docker-clean-build.sh notification
./scripts/docker-clean-build.sh auth
```

## Verification Commands

### Check Service Health
```bash
# Check if services are running
docker-compose ps

# Check service logs
docker-compose logs notification-service
docker-compose logs authentication-service

# Check service health endpoints
curl http://localhost:3006/health  # notification-service
curl http://localhost:3001/health  # authentication-service
```

### Validate Dockerfiles
```bash
# Run Dockerfile validation
./scripts/validate-dockerfiles.sh
```

## Getting Help

If issues persist:

1. **Check service logs**: `docker-compose logs [service-name]`
2. **Verify file structure**: `ls -la services/[service-name]/`
3. **Run validation**: `./scripts/validate-dockerfiles.sh`
4. **Clean rebuild**: `./scripts/docker-clean-build.sh [service-name]`

## Quick Reference Commands

```bash
# Essential commands for Docker issues
./scripts/docker-clean-build.sh notification    # Clean rebuild notification service
./scripts/docker-clean-build.sh all            # Clean rebuild everything
pnpm run docker:build:clean                    # Same as above via npm
docker-compose build --no-cache                # Manual clean build
docker-compose up --build                      # Build and start
docker-compose logs -f notification-service    # Follow logs
```