# 🚀 Developer Quick Reference Card

## 📍 **Service Ports & URLs**

| Service | Port | Health | Docs | Raw Spec | Description |
|---------|------|--------|------|----------|-------------|
| **giga-main** | `3000` | `/health` | `/docs` | `/docs-json` | Core user management & auth |
| **giga-taxi-main** | `3002` | `/health` | `/docs` | `/docs-json` | Taxi service main logic |
| **giga-taxi-driver** | `3004` | `/health` | `/docs` | `/docs-json` | Taxi driver management |
| **ecommerce-service** | `4000` | `/health` | `/docs` | `/docs-json` | E-commerce backend |
| **hotel-service** | `4001` | `/health` | `/docs` | `/docs-json` | Hotel booking system |
| **payment-service** | `4002` | `/health` | `/docs` | `/docs-json` | Payment processing |
| **advertisement-service** | `4003` | `/health` | `/docs` | `/docs-json` | Advertisement management |

## 🗄️ **Infrastructure Services**

| Service | Port | Access | Credentials |
|---------|------|--------|-------------|
| **PostgreSQL** | `5432` | Database | `postgres:postgres` |
| **MongoDB** | `27017` | Database | No auth (dev) |
| **Redis** | `6379` | Cache | No auth (dev) |
| **RabbitMQ** | `5672` | Message Queue | `guest:guest` |
| **RabbitMQ UI** | `15672` | Web UI | `guest:guest` |
| **Nginx** | `80` | Reverse Proxy | N/A |

## 🚀 **Quick Commands**

### **Start Services**
```bash
# Start everything
docker-compose up -d

# Start specific services
docker-compose up giga-main postgres redis

# Start with logs
docker-compose up
```

### **Stop Services**
```bash
# Stop everything
docker-compose down

# Stop specific service
docker-compose stop giga-main
```

### **Check Status**
```bash
# Check running services
docker-compose ps

# Check logs
docker-compose logs giga-main

# Check specific service logs
docker logs giga-main
```

### **Restart Services**
```bash
# Restart everything
docker-compose restart

# Restart specific service
docker-compose restart giga-main
```

## 📚 **Documentation Access**

### **Swagger UI (Interactive)**
- **Giga Main**: http://localhost:3000/docs
- **Taxi Main**: http://localhost:3002/docs
- **Taxi Driver**: http://localhost:3004/docs
- **E-commerce**: http://localhost:4000/docs
- **Hotel**: http://localhost:4001/docs
- **Payment**: http://localhost:4002/docs
- **Advertisement**: http://localhost:4003/docs

### **OpenAPI Specs (Raw)**
- **Giga Main**: http://localhost:3000/docs-json
- **Taxi Main**: http://localhost:3002/docs-json
- **Taxi Driver**: http://localhost:3004/docs-json
- **E-commerce**: http://localhost:4000/docs-json
- **Hotel**: http://localhost:4001/docs-json
- **Payment**: http://localhost:4002/docs-json
- **Advertisement**: http://localhost:4003/docs-json

## 🔍 **Health Checks**

```bash
# Quick health check for all services
curl http://localhost:3000/health    # Giga Main
curl http://localhost:3002/health    # Taxi Main
curl http://localhost:3004/health    # Taxi Driver
curl http://localhost:4000/health    # E-commerce
curl http://localhost:4001/health    # Hotel
curl http://localhost:4002/health    # Payment
curl http://localhost:4003/health    # Advertisement
```

## 🧪 **Testing**

```bash
# Run all tests
./test-all.sh

# Test specific service
cd giga_main && npm test
cd common && npm test

# Test with coverage
npm run test:coverage
```

## 🔧 **Development**

### **Local Development (without Docker)**
```bash
# Install dependencies
cd giga_main && npm install
cd ../common && npm install

# Start services
cd giga_main && npm run dev
cd ../giga_taxi_main && npm run dev
```

### **Environment Variables**
Each service needs its own `.env` file. Copy from `env.example`:
```bash
# Database
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres
MONGODB_URL=mongodb://localhost:27017/giga
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_jwt_secret
REFRESH_SECRET=your_refresh_secret

# OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
APPLE_CLIENT_ID=your_apple_client_id

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## 🐛 **Troubleshooting**

### **Service Won't Start**
```bash
# Check logs
docker-compose logs <service-name>

# Check if port is in use
lsof -i :3000

# Restart service
docker-compose restart <service-name>
```

### **Database Issues**
```bash
# Check database status
docker exec -it postgres pg_isready
docker exec -it mongo mongosh --eval "db.adminCommand('ping')"
docker exec -it redis redis-cli ping

# Restart databases
docker-compose restart postgres mongo redis
```

### **Reset Everything**
```bash
# Nuclear option
docker-compose down -v
docker system prune -a
docker-compose up --build
```

## 📱 **API Testing**

### **Using Swagger UI**
1. Go to any service's `/docs` endpoint
2. Click "Try it out" on any endpoint
3. Fill in parameters and click "Execute"

### **Using curl**
```bash
# Test user creation
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"password123"}'

# Test health check
curl http://localhost:3000/health
```

### **Using Postman**
- Import OpenAPI specs from `/docs-json` endpoints
- Set base URL to `http://localhost:<port>`
- Use Bearer token for authenticated endpoints

## 🎯 **Key Features by Service**

### **Giga Main Service** (`:3000`)
- ✅ User registration & authentication
- ✅ OAuth (Google & Apple)
- ✅ File upload with metadata stripping
- ✅ Email system (OTP, verification)
- ✅ Enhanced user profiles
- ✅ JWT token management

### **Taxi Services** (`:3002`, `:6000`)
- 🚕 Ride booking & management
- 🚗 Driver assignment & tracking
- 📍 Location services

### **Business Services** (`:4000-4003`)
- 🛒 E-commerce: Product catalog, cart, orders
- 🏨 Hotel: Booking, availability, reservations
- 💳 Payment: Processing, transactions, gateways
- 📢 Advertisement: Campaigns, tracking, analytics

## 📞 **Support & Resources**

- **Documentation**: Check `/docs` endpoints for each service
- **Architecture**: See `docs/architecture.md`
- **Development Guide**: See `DEVELOPMENT_DOCS.md`
- **Implementation Status**: See `IMPLEMENTATION_SUMMARY.md`
- **Swagger Overview**: See `SWAGGER_AND_TYPES_SUMMARY.md`

---

**💡 Pro Tip**: Use the `verify-docs.sh` script to quickly check if all services and documentation are running correctly!

**Last Updated**: January 15, 2024  
**Version**: 1.0.0
