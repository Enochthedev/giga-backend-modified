#!/bin/bash

# Redis Cluster Startup Script
# This script starts Redis in different modes based on the environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REDIS_MODE=${REDIS_MODE:-"single"}
ENVIRONMENT=${NODE_ENV:-"development"}

echo -e "${GREEN}Starting Redis in ${REDIS_MODE} mode for ${ENVIRONMENT} environment${NC}"

# Function to check if Redis is running
check_redis() {
    local host=$1
    local port=$2
    
    if redis-cli -h "$host" -p "$port" ping > /dev/null 2>&1; then
        echo -e "${GREEN}Redis is running on ${host}:${port}${NC}"
        return 0
    else
        echo -e "${RED}Redis is not running on ${host}:${port}${NC}"
        return 1
    fi
}

# Function to wait for Redis to be ready
wait_for_redis() {
    local host=$1
    local port=$2
    local timeout=${3:-30}
    
    echo "Waiting for Redis to be ready on ${host}:${port}..."
    
    for i in $(seq 1 $timeout); do
        if check_redis "$host" "$port"; then
            return 0
        fi
        echo "Attempt $i/$timeout failed, retrying in 1 second..."
        sleep 1
    done
    
    echo -e "${RED}Redis failed to start within ${timeout} seconds${NC}"
    return 1
}

# Start Redis based on mode
case $REDIS_MODE in
    "single")
        echo -e "${YELLOW}Starting single Redis instance...${NC}"
        docker-compose -f docker-compose.yml up -d redis
        wait_for_redis "localhost" "6379"
        ;;
        
    "sentinel")
        echo -e "${YELLOW}Starting Redis with Sentinel for high availability...${NC}"
        docker-compose -f docker-compose.redis.yml up -d
        
        # Wait for master
        wait_for_redis "localhost" "6379"
        
        # Wait for replicas
        wait_for_redis "localhost" "6380"
        wait_for_redis "localhost" "6381"
        
        # Wait for sentinels
        echo "Waiting for Sentinels to be ready..."
        sleep 5
        
        # Check sentinel status
        redis-cli -h localhost -p 26379 sentinel masters || echo -e "${YELLOW}Sentinel not fully ready yet${NC}"
        ;;
        
    "cluster")
        echo -e "${YELLOW}Starting Redis Cluster...${NC}"
        
        # Create cluster configuration if it doesn't exist
        if [ ! -f "redis-cluster.yml" ]; then
            echo -e "${YELLOW}Creating Redis cluster configuration...${NC}"
            cat > redis-cluster.yml << EOF
version: '3.8'
services:
  redis-cluster-1:
    image: redis:7-alpine
    command: redis-server --port 7000 --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes
    ports:
      - "7000:7000"
    volumes:
      - redis-cluster-1:/data
    networks:
      - redis-cluster

  redis-cluster-2:
    image: redis:7-alpine
    command: redis-server --port 7001 --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes
    ports:
      - "7001:7001"
    volumes:
      - redis-cluster-2:/data
    networks:
      - redis-cluster

  redis-cluster-3:
    image: redis:7-alpine
    command: redis-server --port 7002 --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes
    ports:
      - "7002:7002"
    volumes:
      - redis-cluster-3:/data
    networks:
      - redis-cluster

  redis-cluster-4:
    image: redis:7-alpine
    command: redis-server --port 7003 --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes
    ports:
      - "7003:7003"
    volumes:
      - redis-cluster-4:/data
    networks:
      - redis-cluster

  redis-cluster-5:
    image: redis:7-alpine
    command: redis-server --port 7004 --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes
    ports:
      - "7004:7004"
    volumes:
      - redis-cluster-5:/data
    networks:
      - redis-cluster

  redis-cluster-6:
    image: redis:7-alpine
    command: redis-server --port 7005 --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes
    ports:
      - "7005:7005"
    volumes:
      - redis-cluster-6:/data
    networks:
      - redis-cluster

volumes:
  redis-cluster-1:
  redis-cluster-2:
  redis-cluster-3:
  redis-cluster-4:
  redis-cluster-5:
  redis-cluster-6:

networks:
  redis-cluster:
    driver: bridge
EOF
        fi
        
        docker-compose -f redis-cluster.yml up -d
        
        # Wait for all nodes to be ready
        for port in 7000 7001 7002 7003 7004 7005; do
            wait_for_redis "localhost" "$port"
        done
        
        # Create cluster
        echo -e "${YELLOW}Creating Redis cluster...${NC}"
        sleep 5
        echo "yes" | redis-cli --cluster create \
            127.0.0.1:7000 127.0.0.1:7001 127.0.0.1:7002 \
            127.0.0.1:7003 127.0.0.1:7004 127.0.0.1:7005 \
            --cluster-replicas 1
        ;;
        
    *)
        echo -e "${RED}Unknown Redis mode: $REDIS_MODE${NC}"
        echo "Available modes: single, sentinel, cluster"
        exit 1
        ;;
esac

echo -e "${GREEN}Redis setup completed successfully!${NC}"

# Show Redis status
echo -e "${YELLOW}Redis Status:${NC}"
case $REDIS_MODE in
    "single")
        redis-cli -h localhost -p 6379 info server | grep redis_version || true
        ;;
    "sentinel")
        echo "Master:"
        redis-cli -h localhost -p 6379 info replication | grep role || true
        echo "Sentinels:"
        redis-cli -h localhost -p 26379 sentinel masters | head -20 || true
        ;;
    "cluster")
        redis-cli -h localhost -p 7000 cluster info || true
        ;;
esac

echo -e "${GREEN}Redis is ready for use!${NC}"