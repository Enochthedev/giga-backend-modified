#!/bin/bash

# Build All Services Script
# Builds all Docker images for the multi-service platform with optimization

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REGISTRY=${DOCKER_REGISTRY:-""}
TAG=${DOCKER_TAG:-"latest"}
BUILD_ARGS=${DOCKER_BUILD_ARGS:-""}
PARALLEL_BUILDS=${PARALLEL_BUILDS:-4}

# Services to build
SERVICES=(
    "api-gateway:3000"
    "authentication-service:3001"
    "ecommerce-service:3002"
    "payment-service:3003"
    "taxi-service:3004"
    "hotel-service:3005"
    "advertisement-service:3006"
    "notification-service:3007"
    "file-service:3008"
    "search-service:3009"
    "admin-service:3010"
    "analytics-service:3011"
    "messaging-service:3012"
    "data-governance-admin:3020"
)

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to build a single service
build_service() {
    local service_info=$1
    local service_name=$(echo $service_info | cut -d':' -f1)
    local service_port=$(echo $service_info | cut -d':' -f2)
    
    local image_name="${service_name}"
    if [ ! -z "$REGISTRY" ]; then
        image_name="${REGISTRY}/${service_name}"
    fi
    
    print_status "Building ${service_name}..."
    
    # Check if Dockerfile exists
    if [ ! -f "services/${service_name}/Dockerfile" ]; then
        print_error "Dockerfile not found for ${service_name}"
        return 1
    fi
    
    # Build the image
    if docker build \
        -f "services/${service_name}/Dockerfile" \
        -t "${image_name}:${TAG}" \
        --build-arg PORT=${service_port} \
        ${BUILD_ARGS} \
        . > "build_${service_name}.log" 2>&1; then
        print_success "Built ${service_name} successfully"
        rm -f "build_${service_name}.log"
        return 0
    else
        print_error "Failed to build ${service_name}"
        echo "Build log:"
        cat "build_${service_name}.log"
        return 1
    fi
}

# Function to build services in parallel
build_services_parallel() {
    local services=("$@")
    local pids=()
    local failed_services=()
    
    # Start builds in parallel
    for service in "${services[@]}"; do
        # Limit concurrent builds
        while [ ${#pids[@]} -ge $PARALLEL_BUILDS ]; do
            for i in "${!pids[@]}"; do
                if ! kill -0 "${pids[$i]}" 2>/dev/null; then
                    wait "${pids[$i]}"
                    if [ $? -ne 0 ]; then
                        failed_services+=("${service}")
                    fi
                    unset pids[$i]
                fi
            done
            pids=("${pids[@]}")  # Reindex array
            sleep 1
        done
        
        # Start new build
        build_service "$service" &
        pids+=($!)
    done
    
    # Wait for remaining builds
    for pid in "${pids[@]}"; do
        wait "$pid"
        if [ $? -ne 0 ]; then
            failed_services+=("unknown")
        fi
    done
    
    return ${#failed_services[@]}
}

# Function to validate Docker environment
validate_environment() {
    print_status "Validating Docker environment..."
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running or not accessible"
        exit 1
    fi
    
    # Check Docker version
    local docker_version=$(docker version --format '{{.Server.Version}}' 2>/dev/null)
    if [ -z "$docker_version" ]; then
        print_error "Could not determine Docker version"
        exit 1
    fi
    
    print_success "Docker version: $docker_version"
    
    # Check available disk space
    local available_space=$(df . | awk 'NR==2 {print $4}')
    if [ "$available_space" -lt 5000000 ]; then  # 5GB in KB
        print_warning "Low disk space available: $(($available_space / 1024 / 1024))GB"
    fi
}

# Function to cleanup old images
cleanup_old_images() {
    print_status "Cleaning up old images..."
    
    # Remove dangling images
    local dangling=$(docker images -f "dangling=true" -q)
    if [ ! -z "$dangling" ]; then
        docker rmi $dangling > /dev/null 2>&1 || true
        print_success "Removed dangling images"
    fi
    
    # Remove old tagged images (keep last 3 versions)
    for service_info in "${SERVICES[@]}"; do
        local service_name=$(echo $service_info | cut -d':' -f1)
        local old_images=$(docker images "${service_name}" --format "table {{.Repository}}:{{.Tag}}\t{{.CreatedAt}}" | tail -n +2 | sort -k2 -r | tail -n +4 | awk '{print $1}')
        
        if [ ! -z "$old_images" ]; then
            echo "$old_images" | xargs -r docker rmi > /dev/null 2>&1 || true
        fi
    done
}

# Function to generate build report
generate_report() {
    local start_time=$1
    local end_time=$2
    local failed_count=$3
    
    local duration=$((end_time - start_time))
    local minutes=$((duration / 60))
    local seconds=$((duration % 60))
    
    echo
    print_status "Build Report"
    echo "=============="
    echo "Total services: ${#SERVICES[@]}"
    echo "Failed builds: $failed_count"
    echo "Successful builds: $((${#SERVICES[@]} - failed_count))"
    echo "Build time: ${minutes}m ${seconds}s"
    echo "Registry: ${REGISTRY:-"local"}"
    echo "Tag: $TAG"
    echo
    
    if [ $failed_count -eq 0 ]; then
        print_success "All services built successfully!"
    else
        print_error "$failed_count services failed to build"
        exit 1
    fi
}

# Main execution
main() {
    echo "Docker Multi-Service Build Script"
    echo "================================="
    echo
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --registry)
                REGISTRY="$2"
                shift 2
                ;;
            --tag)
                TAG="$2"
                shift 2
                ;;
            --parallel)
                PARALLEL_BUILDS="$2"
                shift 2
                ;;
            --cleanup)
                cleanup_old_images
                exit 0
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --registry REGISTRY    Docker registry to push to"
                echo "  --tag TAG             Docker tag (default: latest)"
                echo "  --parallel N          Number of parallel builds (default: 4)"
                echo "  --cleanup             Clean up old images and exit"
                echo "  --help                Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    local start_time=$(date +%s)
    
    # Validate environment
    validate_environment
    
    # Build services
    print_status "Building ${#SERVICES[@]} services with $PARALLEL_BUILDS parallel builds..."
    build_services_parallel "${SERVICES[@]}"
    local failed_count=$?
    
    local end_time=$(date +%s)
    
    # Generate report
    generate_report $start_time $end_time $failed_count
    
    # Optional: Push to registry
    if [ ! -z "$REGISTRY" ] && [ $failed_count -eq 0 ]; then
        print_status "Pushing images to registry..."
        for service_info in "${SERVICES[@]}"; do
            local service_name=$(echo $service_info | cut -d':' -f1)
            docker push "${REGISTRY}/${service_name}:${TAG}"
        done
        print_success "All images pushed to registry"
    fi
}

# Run main function
main "$@"