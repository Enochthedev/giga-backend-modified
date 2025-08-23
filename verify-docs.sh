#!/bin/bash

# 🚀 Giga Backend - Documentation Verification Script
# This script verifies that all Swagger documentation endpoints are accessible

echo "🔍 Verifying Giga Backend Documentation Endpoints..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a service is running
check_service() {
    local service_name=$1
    local port=$2
    local endpoint=$3
    
    echo -n "🔍 Checking $service_name on port $port... "
    
    if curl -s "http://localhost:$port$endpoint" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Running${NC}"
        return 0
    else
        echo -e "${RED}❌ Not accessible${NC}"
        return 1
    fi
}

# Function to check Swagger docs
check_swagger_docs() {
    local service_name=$1
    local port=$2
    
    echo -n "📚 Checking $service_name Swagger docs... "
    
    if curl -s "http://localhost:$port/docs" | grep -q "swagger-ui" 2>/dev/null; then
        echo -e "${GREEN}✅ Available${NC}"
        echo -e "   🌐 Access at: ${BLUE}http://localhost:$port/docs${NC}"
        echo -e "   📋 Raw spec: ${BLUE}http://localhost:$port/docs-json${NC}"
    else
        echo -e "${RED}❌ Not available${NC}"
    fi
}

# Function to check health endpoint
check_health() {
    local service_name=$1
    local port=$2
    
    echo -n "💚 Checking $service_name health... "
    
    if curl -s "http://localhost:$port/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Healthy${NC}"
    else
        echo -e "${RED}❌ Unhealthy${NC}"
    fi
}

echo ""
echo "🏥 Checking Service Health Endpoints..."
echo "---------------------------------------"

# Check health endpoints for all services
check_health "Giga Main" "3000"
check_health "Giga Taxi Main" "3002"
check_health "Giga Taxi Driver" "3004"
check_health "E-commerce Service" "4000"
check_health "Hotel Service" "4001"
check_health "Payment Service" "4002"
check_health "Advertisement Service" "4003"

echo ""
echo "📚 Checking Swagger Documentation Endpoints..."
echo "---------------------------------------------"

# Check Swagger docs for all services
check_swagger_docs "Giga Main" "3000"
check_swagger_docs "Giga Taxi Main" "3002"
check_swagger_docs "Giga Taxi Driver" "3004"
check_swagger_docs "E-commerce Service" "4000"
check_swagger_docs "Hotel Service" "4001"
check_swagger_docs "Payment Service" "4002"
check_swagger_docs "Advertisement Service" "4003"

echo ""
echo "🗄️ Checking Infrastructure Services..."
echo "-------------------------------------"

# Check infrastructure services
echo -n "🔍 Checking PostgreSQL (5432)... "
if docker ps | grep -q "postgres"; then
    echo -e "${GREEN}✅ Running${NC}"
else
    echo -e "${RED}❌ Not running${NC}"
fi

echo -n "🔍 Checking MongoDB (27017)... "
if docker ps | grep -q "mongo"; then
    echo -e "${GREEN}✅ Running${NC}"
else
    echo -e "${RED}❌ Not running${NC}"
fi

echo -n "🔍 Checking Redis (6379)... "
if docker ps | grep -q "redis"; then
    echo -e "${GREEN}✅ Running${NC}"
else
    echo -e "${RED}❌ Not running${NC}"
fi

echo -n "🔍 Checking RabbitMQ (5672/15672)... "
if docker ps | grep -q "rabbitmq"; then
    echo -e "${GREEN}✅ Running${NC}"
    echo -e "   🌐 Management UI: ${BLUE}http://localhost:15672${NC}"
else
    echo -e "${RED}❌ Not running${NC}"
fi

echo -n "🔍 Checking Nginx (80)... "
if docker ps | grep -q "nginx"; then
    echo -e "${GREEN}✅ Running${NC}"
    echo -e "   🌐 Proxy: ${BLUE}http://localhost:80${NC}"
else
    echo -e "${RED}❌ Not running${NC}"
fi

echo ""
echo "📊 Summary of Documentation Access..."
echo "===================================="

echo ""
echo "🎯 Core Services Documentation:"
echo "   • Giga Main:        http://localhost:3000/docs"
echo "   • Taxi Main:        http://localhost:3002/docs"
echo "   • Taxi Driver:      http://localhost:3004/docs"

echo ""
echo "🏢 Business Services Documentation:"
echo "   • E-commerce:       http://localhost:4000/docs"
echo "   • Hotel:            http://localhost:4001/docs"
echo "   • Payment:          http://localhost:4002/docs"
echo "   • Advertisement:    http://localhost:4003/docs"

echo ""
echo "🔧 Infrastructure Access:"
echo "   • RabbitMQ UI:      http://localhost:15672 (guest/guest)"
echo "   • Nginx Proxy:      http://localhost:80"
echo "   • PostgreSQL:       localhost:5432"
echo "   • MongoDB:          localhost:27017"
echo "   • Redis:            localhost:6379"

echo ""
echo "💡 Tips:"
echo "   • Use 'docker-compose up -d' to start all services"
echo "   • Check logs with 'docker-compose logs <service-name>'"
echo "   • Restart services with 'docker-compose restart <service-name>'"
echo "   • Access Swagger UI at /docs for each service"
echo "   • Get raw OpenAPI specs at /docs-json for each service"

echo ""
echo "✅ Documentation verification complete!"
echo "====================================="
