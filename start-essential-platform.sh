#!/bin/bash

# Giga Multi-Service Platform - Essential Services Quick Start
# This script starts the core services without Elasticsearch to avoid Docker issues

set -e

echo "🚀 Starting Giga Platform - Essential Services"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi
print_status "Docker is installed"

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi
print_status "Docker Compose is installed"

# Stop any existing containers
echo ""
echo "Stopping any existing containers..."
docker-compose -f docker-compose.essential.yml down --remove-orphans 2>/dev/null || true
print_status "Existing containers stopped"

# Start infrastructure services first
echo ""
echo "Starting infrastructure services..."
docker-compose -f docker-compose.essential.yml up -d postgres redis rabbitmq
print_status "Infrastructure services started"

# Wait for databases to be ready
echo ""
echo "Waiting for databases to be ready..."
sleep 15

# Check PostgreSQL
echo "Checking PostgreSQL connection..."
for i in {1..30}; do
    if docker-compose -f docker-compose.essential.yml exec -T postgres pg_isready -U postgres 2>/dev/null; then
        print_status "PostgreSQL is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "PostgreSQL failed to start"
        exit 1
    fi
    sleep 2
done

# Check Redis
echo "Checking Redis connection..."
for i in {1..30}; do
    if docker-compose -f docker-compose.essential.yml exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; then
        print_status "Redis is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "Redis failed to start"
        exit 1
    fi
    sleep 2
done

# Check RabbitMQ
echo "Checking RabbitMQ connection..."
for i in {1..30}; do
    if curl -s -u admin:password http://localhost:15672/api/overview 2>/dev/null | grep -q '"management_version"'; then
        print_status "RabbitMQ is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "RabbitMQ failed to start"
        exit 1
    fi
    sleep 2
done

# Start core services
echo ""
echo "Starting core services..."
docker-compose -f docker-compose.essential.yml up -d \
    authentication-service \
    payment-service \
    notification-service \
    file-service \
    analytics-service \
    admin-service

print_status "Core services started"

# Wait for core services
echo ""
echo "Waiting for core services to be ready..."
sleep 20

# Start taxi service
echo ""
echo "Starting taxi service..."
docker-compose -f docker-compose.essential.yml up -d taxi-service
print_status "Taxi service started"

# Start API Gateway last
echo ""
echo "Starting API Gateway..."
docker-compose -f docker-compose.essential.yml up -d api-gateway
print_status "API Gateway started"

# Wait for all services to be fully ready
echo ""
echo "Waiting for all services to be fully ready..."
sleep 15

# Health check all services
echo ""
echo "Performing health checks..."

services=(
    "http://localhost:3000/health:API Gateway"
    "http://localhost:3001/health:Authentication Service"
    "http://localhost:3002/health:Taxi Service"
    "http://localhost:3003/health:Payment Service"
    "http://localhost:3004/health:Notification Service"
    "http://localhost:3005/health:File Service"
    "http://localhost:3007/health:Analytics Service"
    "http://localhost:3008/health:Admin Service"
)

all_healthy=true

for service in "${services[@]}"; do
    url=$(echo $service | cut -d: -f1-2)
    name=$(echo $service | cut -d: -f3-)
    
    if curl -s -f "$url" > /dev/null 2>&1; then
        print_status "$name is healthy"
    else
        print_warning "$name is not responding (this is normal for new services)"
    fi
done

echo ""
echo "=============================================="
print_status "🎉 Essential services are running!"
echo ""
echo "🌐 Service URLs:"
echo "   • API Gateway:        http://localhost:3000"
echo "   • Authentication:     http://localhost:3001"
echo "   • Taxi:               http://localhost:3002"
echo "   • Payment:            http://localhost:3003"
echo "   • Notification:       http://localhost:3004"
echo "   • File:               http://localhost:3005"
echo "   • Analytics:          http://localhost:3007"
echo "   • Admin:              http://localhost:3008"
echo ""
echo "📊 Management URLs:"
echo "   • RabbitMQ:           http://localhost:15672 (admin/password)"
echo ""
echo "📚 API Documentation (when services are built):"
echo "   • Authentication:     http://localhost:3001/docs"
echo "   • Taxi:               http://localhost:3002/docs"
echo "   • Payment:            http://localhost:3003/docs"
echo ""
print_info "Platform is ready for development! 🚀"
echo ""
echo "To stop all services:"
echo "   docker-compose -f docker-compose.essential.yml down"
echo ""
echo "To view logs:"
echo "   docker-compose -f docker-compose.essential.yml logs -f [service-name]"
echo ""
echo "To add the ecommerce service later:"
echo "   npm run consolidated:add-ecommerce"
echo "=============================================="