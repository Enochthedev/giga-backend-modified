#!/bin/bash

# Dockerfile Validation Script
# Validates that all Dockerfiles follow the standardized patterns

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Services to validate
SERVICES=(
    "api-gateway"
    "authentication-service"
    "ecommerce-service"
    "payment-service"
    "taxi-service"
    "hotel-service"
    "advertisement-service"
    "notification-service"
    "file-service"
    "search-service"
    "admin-service"
    "analytics-service"
    "messaging-service"
    "data-governance-admin"
)

# Required patterns in Dockerfiles
REQUIRED_PATTERNS=(
    "FROM node:18-alpine AS builder"
    "FROM node:18-alpine AS production"
    "RUN apk add --no-cache dumb-init"
    "RUN addgroup -g 1001 -S nodejs"
    "USER.*user"
    "HEALTHCHECK"
    "ENTRYPOINT.*dumb-init"
    "CMD.*node.*dist/app.js"
    "pnpm install --frozen-lockfile"
    "pnpm install --prod --frozen-lockfile"
    "pnpm store prune"
)

# Security patterns
SECURITY_PATTERNS=(
    "USER.*user"
    "adduser.*-u 1001"
    "chown.*user:nodejs"
    "dumb-init"
)

# Build optimization patterns
OPTIMIZATION_PATTERNS=(
    "pnpm install --frozen-lockfile"
    "pnpm store prune"
    "COPY --from=builder"
    "apk add --no-cache"
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

# Function to validate a single Dockerfile
validate_dockerfile() {
    local service=$1
    local dockerfile="services/${service}/Dockerfile"
    local errors=0
    local warnings=0
    
    print_status "Validating ${service}..."
    
    # Check if Dockerfile exists
    if [ ! -f "$dockerfile" ]; then
        print_error "Dockerfile not found: $dockerfile"
        return 1
    fi
    
    # Read Dockerfile content
    local content=$(cat "$dockerfile")
    
    # Check required patterns
    for pattern in "${REQUIRED_PATTERNS[@]}"; do
        if ! echo "$content" | grep -q "$pattern"; then
            print_error "Missing required pattern in ${service}: $pattern"
            ((errors++))
        fi
    done
    
    # Check security patterns
    local security_score=0
    for pattern in "${SECURITY_PATTERNS[@]}"; do
        if echo "$content" | grep -q "$pattern"; then
            ((security_score++))
        fi
    done
    
    if [ $security_score -lt 3 ]; then
        print_warning "Security patterns incomplete in ${service} (${security_score}/4)"
        ((warnings++))
    fi
    
    # Check optimization patterns
    local optimization_score=0
    for pattern in "${OPTIMIZATION_PATTERNS[@]}"; do
        if echo "$content" | grep -q "$pattern"; then
            ((optimization_score++))
        fi
    done
    
    if [ $optimization_score -lt 3 ]; then
        print_warning "Build optimization patterns incomplete in ${service} (${optimization_score}/4)"
        ((warnings++))
    fi
    
    # Check for anti-patterns
    if echo "$content" | grep -q "FROM.*node:18[^-]"; then
        print_warning "Using full Node.js image instead of Alpine in ${service}"
        ((warnings++))
    fi
    
    if echo "$content" | grep -q "USER root"; then
        print_error "Running as root user in ${service}"
        ((errors++))
    fi
    
    if echo "$content" | grep -q "RUN.*npm install -g"; then
        if ! echo "$content" | grep -q "RUN.*npm install -g pnpm"; then
            print_warning "Installing global npm packages other than pnpm in ${service}"
            ((warnings++))
        fi
    fi
    
    # Check port consistency
    local expected_port=""
    case $service in
        "api-gateway") expected_port="3000" ;;
        "authentication-service") expected_port="3001" ;;
        "ecommerce-service") expected_port="3002" ;;
        "payment-service") expected_port="3003" ;;
        "taxi-service") expected_port="3004" ;;
        "hotel-service") expected_port="3005" ;;
        "advertisement-service") expected_port="3006" ;;
        "notification-service") expected_port="3007" ;;
        "file-service") expected_port="3008" ;;
        "search-service") expected_port="3009" ;;
        "admin-service") expected_port="3010" ;;
        "analytics-service") expected_port="3011" ;;
        "messaging-service") expected_port="3012" ;;
        "data-governance-admin") expected_port="3020" ;;
    esac
    
    if [ ! -z "$expected_port" ]; then
        if ! echo "$content" | grep -q "EXPOSE $expected_port"; then
            print_error "Port mismatch in ${service}: expected $expected_port"
            ((errors++))
        fi
    fi
    
    # Check health check endpoint consistency
    if ! echo "$content" | grep -q "localhost:.*health"; then
        print_error "Health check endpoint not found in ${service}"
        ((errors++))
    fi
    
    # Report results for this service
    if [ $errors -eq 0 ]; then
        if [ $warnings -eq 0 ]; then
            print_success "${service} validation passed"
        else
            print_warning "${service} validation passed with ${warnings} warnings"
        fi
    else
        print_error "${service} validation failed with ${errors} errors and ${warnings} warnings"
    fi
    
    return $errors
}

# Function to validate Docker Compose files
validate_compose_files() {
    print_status "Validating Docker Compose files..."
    
    local errors=0
    
    # Check main docker-compose.yml
    if [ ! -f "docker-compose.yml" ]; then
        print_error "docker-compose.yml not found"
        ((errors++))
    else
        # Validate compose file syntax
        if ! docker-compose config > /dev/null 2>&1; then
            print_error "docker-compose.yml syntax validation failed"
            ((errors++))
        else
            print_success "docker-compose.yml syntax is valid"
        fi
    fi
    
    # Check override file
    if [ -f "docker-compose.override.yml" ]; then
        if ! docker-compose -f docker-compose.yml -f docker-compose.override.yml config > /dev/null 2>&1; then
            print_error "docker-compose.override.yml validation failed"
            ((errors++))
        else
            print_success "docker-compose.override.yml is valid"
        fi
    fi
    
    return $errors
}

# Function to validate .dockerignore
validate_dockerignore() {
    print_status "Validating .dockerignore..."
    
    if [ ! -f ".dockerignore" ]; then
        print_warning ".dockerignore not found"
        return 1
    fi
    
    local content=$(cat ".dockerignore")
    local required_ignores=("node_modules/" "*.log" ".git" "dist/" "build/")
    local missing=0
    
    for ignore in "${required_ignores[@]}"; do
        if ! echo "$content" | grep -q "$ignore"; then
            print_warning "Missing .dockerignore entry: $ignore"
            ((missing++))
        fi
    done
    
    if [ $missing -eq 0 ]; then
        print_success ".dockerignore validation passed"
        return 0
    else
        print_warning ".dockerignore validation completed with $missing missing entries"
        return 1
    fi
}

# Function to test build capability
test_build_capability() {
    local service=$1
    print_status "Testing build capability for ${service}..."
    
    # Test if Dockerfile can be parsed
    if docker build -f "services/${service}/Dockerfile" --target builder -t "${service}:test-builder" . > /dev/null 2>&1; then
        print_success "${service} builder stage builds successfully"
        docker rmi "${service}:test-builder" > /dev/null 2>&1 || true
        return 0
    else
        print_error "${service} builder stage build failed"
        return 1
    fi
}

# Function to generate validation report
generate_report() {
    local total_services=$1
    local failed_services=$2
    local total_warnings=$3
    
    echo
    print_status "Validation Report"
    echo "=================="
    echo "Total services validated: $total_services"
    echo "Failed validations: $failed_services"
    echo "Successful validations: $((total_services - failed_services))"
    echo "Total warnings: $total_warnings"
    echo
    
    if [ $failed_services -eq 0 ]; then
        print_success "All Dockerfiles follow standardized patterns!"
    else
        print_error "$failed_services services have validation errors"
        return 1
    fi
}

# Main execution
main() {
    echo "Dockerfile Standardization Validation"
    echo "===================================="
    echo
    
    local total_errors=0
    local total_warnings=0
    local failed_services=0
    
    # Parse command line arguments
    local test_builds=false
    while [[ $# -gt 0 ]]; do
        case $1 in
            --test-builds)
                test_builds=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --test-builds    Test actual Docker build capability"
                echo "  --help           Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Validate each service Dockerfile
    for service in "${SERVICES[@]}"; do
        if ! validate_dockerfile "$service"; then
            ((failed_services++))
        fi
        
        # Test build capability if requested
        if [ "$test_builds" = true ]; then
            test_build_capability "$service" || true
        fi
        
        echo
    done
    
    # Validate Docker Compose files
    validate_compose_files || ((total_errors++))
    echo
    
    # Validate .dockerignore
    validate_dockerignore || ((total_warnings++))
    echo
    
    # Generate final report
    generate_report ${#SERVICES[@]} $failed_services $total_warnings
}

# Run main function
main "$@"