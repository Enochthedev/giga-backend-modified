#!/bin/bash

# Deploy Services to Staging Environment
# This script specifically handles microservices deployment to staging

set -e

echo "🚀 Deploying microservices to staging environment..."

# Configuration
ENVIRONMENT="staging"
NAMESPACE="staging"
REGISTRY="ghcr.io"
REPO_NAME="${GITHUB_REPOSITORY:-your-org/your-repo}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to deploy microservices
deploy_microservices() {
    print_status "Deploying microservices to staging..."
    
    local services=(
        "admin-service"
        "analytics-service"
        "api-gateway"
        "authentication-service"
        "file-service"
        "messaging-service"
        "notification-service"
        "payment-service"
        "search-service"
        "taxi-service"
    )
    
    for service in "${services[@]}"; do
        local chart_path="./k8s/charts/$service"
        local values_file="./k8s/values/$ENVIRONMENT/$service.yaml"
        
        if [ -d "$chart_path" ]; then
            print_status "Deploying $service..."
            
            helm upgrade --install \
                "$service" \
                "$chart_path" \
                --namespace "$NAMESPACE" \
                --create-namespace \
                --values "$values_file" \
                --set image.tag="${GITHUB_SHA:-develop}" \
                --set environment="$ENVIRONMENT" \
                --wait \
                --timeout=10m
                
            if [ $? -eq 0 ]; then
                print_status "✅ Successfully deployed $service"
            else
                print_error "❌ Failed to deploy $service"
                return 1
            fi
        else
            print_warning "Chart not found for $service, skipping..."
        fi
    done
}

# Main function
main() {
    # Check prerequisites
    if ! command -v helm &> /dev/null; then
        print_error "helm is not installed"
        exit 1
    fi
    
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed"
        exit 1
    fi
    
    # Deploy services
    deploy_microservices
    
    print_status "🎉 Microservices deployment to staging completed!"
}

# Error handling
trap 'print_error "Microservices deployment failed at line $LINENO"' ERR

# Run main function
main "$@"