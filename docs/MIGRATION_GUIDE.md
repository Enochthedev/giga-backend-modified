# Migration Guide - Unified Docker Compose Setup

This guide helps you migrate from the old multi-file Docker Compose setup to the new unified configuration.

## 🔄 What Changed

### Removed Files
- `docker-compose.dev.yml` → Merged into `docker-compose.yml`
- `docker-compose.essential.yml` → Replaced by profiles in `docker-compose.yml`
- `docker-compose.legacy.yml` → Removed (legacy services consolidated)
- `start-essential-platform.sh` → Replaced by `start-platform.sh`
- `DEVELOPER_QUICK_REFERENCE.md` → Moved to `docs/QUICK_REFERENCE.md`
- `DOCKER_SETUP_GUIDE.md` → Integrated into main `README.md`
- `legacy-services-backup-*` → Removed (legacy code cleaned up)
- `common/` directory → Removed (functionality moved to `packages/common`)

### New Files
- `docker-compose.yml` → Unified configuration with profiles
- `start-platform.sh` → New unified startup script
- `.env.example` → Updated with all configuration options
- `docs/QUICK_REFERENCE.md` → Consolidated quick reference

## 🚀 Migration Steps

### 1. Update Your Commands

#### Old Commands → New Commands

```bash
# OLD: Multiple compose files
docker-compose -f docker-compose.essential.yml up -d
docker-compose -f docker-compose.dev.yml up -d

# NEW: Single file with profiles
./start-platform.sh essential
./start-platform.sh full
# OR
docker-compose up -d                    # Core services
docker-compose --profile full up -d    # All services
```

#### Script Commands

```bash
# OLD
./start-essential-platform.sh

# NEW
./start-platform.sh essential
```

#### NPM Scripts

```bash
# OLD
npm run docker:essential
npm run docker:dev

# NEW
npm run start:essential
npm run start:full
```

### 2. Update Environment Configuration

#### Old `.env` → New `.env`

```bash
# Copy new environment template
cp .env.example .env

# Update with your values
# The new .env has better organization and more options
```

#### Key Changes in Environment Variables

- More organized sections (Database, Services, External APIs)
- Added support for custom ports via environment variables
- Better documentation for each variable
- Added Docker profile configuration

### 3. Update Your Development Workflow

#### Before (Multiple Files)
```bash
# Start infrastructure
docker-compose -f docker-compose.essential.yml up -d postgres redis

# Start specific services
docker-compose -f docker-compose.dev.yml up -d api-gateway authentication-service

# Different commands for different setups
```

#### After (Unified)
```bash
# Start infrastructure only
./start-platform.sh infra

# Start core services
./start-platform.sh essential

# Start everything
./start-platform.sh full

# Start with specific features
./start-platform.sh search      # Core + search
./start-platform.sh admin       # Core + admin
./start-platform.sh monitoring  # Core + monitoring
```

### 4. Update CI/CD Pipelines

#### Docker Compose Commands
```bash
# OLD
docker-compose -f docker-compose.dev.yml up -d --build
docker-compose -f docker-compose.dev.yml down

# NEW
docker-compose up -d --build
docker-compose down
# OR
docker-compose --profile full up -d --build
```

#### Health Checks
```bash
# OLD
curl http://localhost:3000/health
curl http://localhost:8001/health

# NEW (ports standardized)
curl http://localhost:3000/health
curl http://localhost:3001/health
```

### 5. Update Documentation References

#### File Paths
- `DEVELOPER_QUICK_REFERENCE.md` → `docs/QUICK_REFERENCE.md`
- `DOCKER_SETUP_GUIDE.md` → See main `README.md`

#### Service Ports (Standardized)
- Authentication: `8001` → `3001`
- E-commerce: `4000` → `3002`
- Payment: `4002` → `3003`
- Taxi: `3002` → `3004`
- Hotel: `4001` → `3005`
- Advertisement: `4003` → `3006`

## 🐳 Docker Profiles Explained

The new setup uses Docker Compose profiles for flexible service combinations:

### Available Profiles

```bash
# Default (no profile) - Core services
docker-compose up -d
# Includes: postgres, redis, rabbitmq, api-gateway, authentication-service,
#          ecommerce-service, payment-service, taxi-service, hotel-service,
#          advertisement-service, notification-service, file-service

# Full profile - Everything
docker-compose --profile full up -d
# Includes: All default services + search, admin, analytics, messaging, monitoring

# Specific profiles
docker-compose --profile search up -d      # Core + search + elasticsearch
docker-compose --profile admin up -d       # Core + admin service
docker-compose --profile monitoring up -d  # Core + prometheus + grafana
```

### Using Profiles with Scripts

```bash
./start-platform.sh essential   # Default profile
./start-platform.sh full        # Full profile
./start-platform.sh search      # Search profile
./start-platform.sh admin       # Admin profile
./start-platform.sh monitoring  # Monitoring profile
```

## 🔧 Configuration Migration

### Environment Variables

#### New Variables Added
```bash
# Service ports (customizable)
API_GATEWAY_PORT=3000
AUTH_SERVICE_PORT=3001
ECOMMERCE_SERVICE_PORT=3002
# ... etc

# Docker configuration
COMPOSE_PROJECT_NAME=multi-service-platform

# Monitoring
PROMETHEUS_PORT=9090
GRAFANA_PORT=3100
GRAFANA_PASSWORD=admin123
```

#### Renamed Variables
```bash
# OLD
GIGA_POSTGRES_PASSWORD=password

# NEW
POSTGRES_PASSWORD=password
```

### Service Names

#### Container Names (Standardized)
```bash
# OLD
giga-postgres, giga-redis, giga-api-gateway

# NEW
multi-service-postgres, multi-service-redis, multi-service-api-gateway
```

## 🧪 Testing Your Migration

### 1. Verify Services Start
```bash
# Start essential services
./start-platform.sh essential

# Check status
./start-platform.sh status

# Check health
curl http://localhost:3000/health
```

### 2. Test Service Communication
```bash
# Test authentication
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test via API Gateway
curl http://localhost:3000/health
```

### 3. Verify Database Connections
```bash
# Connect to PostgreSQL
docker exec -it multi-service-postgres psql -U postgres -d multi_service_platform

# Check Redis
docker exec -it multi-service-redis redis-cli ping
```

## 🚨 Troubleshooting Migration Issues

### Port Conflicts
If you have port conflicts with the new standardized ports:

```bash
# Option 1: Use environment variables
export AUTH_SERVICE_PORT=8001
./start-platform.sh essential

# Option 2: Update .env file
echo "AUTH_SERVICE_PORT=8001" >> .env
```

### Data Migration
If you need to preserve data from old containers:

```bash
# 1. Export data from old containers
docker exec old-postgres-container pg_dump -U postgres database_name > backup.sql

# 2. Start new containers
./start-platform.sh essential

# 3. Import data
docker exec -i multi-service-postgres psql -U postgres -d multi_service_platform < backup.sql
```

### Service Discovery Issues
Update any hardcoded service URLs in your code:

```bash
# OLD
AUTH_SERVICE_URL=http://localhost:8001

# NEW
AUTH_SERVICE_URL=http://localhost:3001
```

## 📚 Additional Resources

- [Main README](./README.md) - Complete platform overview
- [Quick Reference](./docs/QUICK_REFERENCE.md) - Commands and URLs
- [Kubernetes Deployment](./k8s/README-KUBERNETES-DEPLOYMENT.md) - Production deployment

## 🆘 Need Help?

If you encounter issues during migration:

1. **Check the logs**: `./start-platform.sh logs`
2. **Verify status**: `./start-platform.sh status`
3. **Clean start**: `./start-platform.sh clean` (⚠️ removes data)
4. **Check documentation**: See `docs/QUICK_REFERENCE.md`

## ✅ Migration Checklist

- [ ] Update startup commands to use `./start-platform.sh`
- [ ] Copy and configure new `.env` file
- [ ] Update any hardcoded service ports in code
- [ ] Update CI/CD pipeline commands
- [ ] Test service health checks
- [ ] Verify database connections
- [ ] Update team documentation
- [ ] Remove old Docker Compose files from version control

---

**Migration complete! 🎉**

The new unified setup provides better organization, easier management, and more flexible deployment options.