#!/bin/bash

# Deploy to Staging Environment
# This script deploys all services to the staging environment

set -e

echo "🚀 Starting deployment to staging environment..."

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

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if kubectl is available
check_kubectl() {
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    # Check if we can connect to the cluster
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    print_status "kubectl is available and connected to cluster"
}

# Function to check if helm is available
check_helm() {
    if ! command -v helm &> /dev/null; then
        print_error "helm is not installed or not in PATH"
        exit 1
    fi
    
    print_status "helm is available"
}

# Function to create namespace if it doesn't exist
create_namespace() {
    if ! kubectl get namespace $NAMESPACE &> /dev/null; then
        print_status "Creating namespace: $NAMESPACE"
        kubectl create namespace $NAMESPACE
    else
        print_status "Namespace $NAMESPACE already exists"
    fi
}

# Function to deploy a service using Helm
deploy_service() {
    local service_name=$1
    local chart_path="./k8s/charts/$service_name"
    local values_file="./k8s/values/$ENVIRONMENT/$service_name.yaml"
    
    print_status "Deploying $service_name to $ENVIRONMENT..."
    
    if [ ! -d "$chart_path" ]; then
        print_warning "Chart not found for $service_name at $chart_path, skipping..."
        return 0
    fi
    
    # Set image tag (use commit SHA or branch name)
    local image_tag="${GITHUB_SHA:-latest}"
    
    # Deploy using Helm
    helm upgrade --install \
        "$service_name" \
        "$chart_path" \
        --namespace "$NAMESPACE" \
        --values "$values_file" \
        --set image.tag="$image_tag" \
        --set environment="$ENVIRONMENT" \
        --wait \
        --timeout=10m
    
    if [ $? -eq 0 ]; then
        print_status "✅ Successfully deployed $service_name"
    else
        print_error "❌ Failed to deploy $service_name"
        return 1
    fi
}

# Function to wait for deployment to be ready
wait_for_deployment() {
    local service_name=$1
    
    print_status "Waiting for $service_name to be ready..."
    
    kubectl wait --for=condition=available \
        --timeout=300s \
        deployment/$service_name \
        -n $NAMESPACE
    
    if [ $? -eq 0 ]; then
        print_status "✅ $service_name is ready"
    else
        print_error "❌ $service_name failed to become ready"
        return 1
    fi
}

# Function to run health checks
run_health_checks() {
    print_status "Running health checks..."
    
    # Get all services in the namespace
    services=$(kubectl get services -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}')
    
    for service in $services; do
        # Skip if service doesn't have health endpoint
        if kubectl get service $service -n $NAMESPACE -o jsonpath='{.spec.ports[?(@.name=="http")]}' | grep -q "http"; then
            print_status "Checking health of $service..."
            
            # Port forward and check health (this is a simplified example)
            kubectl port-forward service/$service 8080:80 -n $NAMESPACE &
            local port_forward_pid=$!
            
            sleep 5
            
            if curl -f http://localhost:8080/health &> /dev/null; then
                print_status "✅ $service health check passed"
            else
                print_warning "⚠️ $service health check failed"
            fi
            
            kill $port_forward_pid 2>/dev/null || true
        fi
    done
}

# Main deployment function
main() {
    print_status "Starting deployment to $ENVIRONMENT environment"
    
    # Pre-deployment checks
    check_kubectl
    check_helm
    create_namespace
    
    # List of services to deploy
    services=(
        "api-gateway"
        "authentication-service"
        "admin-service"
        "analytics-service"
        "file-service"
        "messaging-service"
        "notification-service"
        "payment-service"
        "search-service"
        "taxi-service"
        "giga-main"
        "giga-taxi-main"
        "giga-taxi-driver"
        "ecommerce-backend"
        "advertisement-service"
        "hotel-service"
    )
    
    # Deploy infrastructure services first
    print_status "Deploying infrastructure services..."
    
    # Deploy PostgreSQL
    if [ ! -z "$(helm list -n $NAMESPACE | grep postgresql)" ]; then
        print_status "PostgreSQL already deployed"
    else
        helm repo add bitnami https://charts.bitnami.com/bitnami
        helm repo update
        helm install postgresql bitnami/postgresql \
            --namespace $NAMESPACE \
            --set auth.postgresPassword=staging-password \
            --set primary.persistence.size=10Gi
    fi
    
    # Deploy Redis
    if [ ! -z "$(helm list -n $NAMESPACE | grep redis)" ]; then
        print_status "Redis already deployed"
    else
        helm install redis bitnami/redis \
            --namespace $NAMESPACE \
            --set auth.password=staging-password \
            --set master.persistence.size=5Gi
    fi
    
    # Deploy RabbitMQ
    if [ ! -z "$(helm list -n $NAMESPACE | grep rabbitmq)" ]; then
        print_status "RabbitMQ already deployed"
    else
        helm install rabbitmq bitnami/rabbitmq \
            --namespace $NAMESPACE \
            --set auth.username=staging-user \
            --set auth.password=staging-password \
            --set persistence.size=5Gi
    fi
    
    # Wait for infrastructure to be ready
    sleep 30
    
    # Deploy application services
    print_status "Deploying application services..."
    
    for service in "${services[@]}"; do
        deploy_service "$service"
        wait_for_deployment "$service"
    done
    
    # Run health checks
    run_health_checks
    
    print_status "🎉 Deployment to $ENVIRONMENT completed successfully!"
    
    # Print access information
    print_status "Access information:"
    kubectl get ingress -n $NAMESPACE
}

# Error handling
trap 'print_error "Deployment failed at line $LINENO"' ERR

# Run main function
main "$@"