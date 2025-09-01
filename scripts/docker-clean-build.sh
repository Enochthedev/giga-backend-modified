#!/bin/bash

# Docker Clean Build Script
# Rebuilds services with clean cache to resolve build issues

echo "🐳 Docker Clean Build Script"
echo "============================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SERVICE_NAME=${1:-"all"}

echo -e "${BLUE}Cleaning Docker cache and rebuilding services...${NC}"
echo ""

# Function to clean and rebuild specific service
clean_and_rebuild_service() {
    local service=$1
    echo -e "${YELLOW}Cleaning and rebuilding $service...${NC}"
    
    # Stop the service if running
    docker-compose stop $service 2>/dev/null || true
    
    # Remove the container
    docker-compose rm -f $service 2>/dev/null || true
    
    # Remove the image
    docker rmi $(docker images -q "*$service*" 2>/dev/null) 2>/dev/null || true
    
    # Rebuild with no cache
    docker-compose build --no-cache $service
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $service rebuilt successfully${NC}"
    else
        echo -e "${RED}❌ Failed to rebuild $service${NC}"
        return 1
    fi
}

# Function to clean all Docker cache
clean_all_cache() {
    echo -e "${YELLOW}Cleaning all Docker cache...${NC}"
    
    # Stop all services
    docker-compose down
    
    # Remove all containers
    docker container prune -f
    
    # Remove all images
    docker image prune -a -f
    
    # Remove build cache
    docker builder prune -a -f
    
    echo -e "${GREEN}✅ Docker cache cleaned${NC}"
}

case $SERVICE_NAME in
    "all")
        echo "Cleaning all Docker cache and rebuilding all services..."
        clean_all_cache
        docker-compose build --no-cache
        ;;
    "notification-service"|"notification")
        clean_and_rebuild_service "notification-service"
        ;;
    "authentication-service"|"auth")
        clean_and_rebuild_service "authentication-service"
        ;;
    "payment-service"|"payment")
        clean_and_rebuild_service "payment-service"
        ;;
    "api-gateway"|"gateway")
        clean_and_rebuild_service "api-gateway"
        ;;
    *)
        clean_and_rebuild_service "$SERVICE_NAME"
        ;;
esac

echo ""
echo -e "${BLUE}Clean build complete!${NC}"
echo ""
echo "Usage examples:"
echo "  ./scripts/docker-clean-build.sh                    # Clean and rebuild all"
echo "  ./scripts/docker-clean-build.sh notification       # Clean and rebuild notification service"
echo "  ./scripts/docker-clean-build.sh auth              # Clean and rebuild auth service"
echo ""
echo "After clean build, start services with:"
echo "  docker-compose up -d"