#!/bin/bash

# Deploy Services to Production Environment
# This script specifically handles microservices deployment to production with safety checks

set -e

echo "🚀 Deploying microservices to production environment..."

# Configuration
ENVIRONMENT="production"
NAMESPACE="production"
REGISTRY="ghcr.io"
REPO_NAME="${GITHUB_REPOSITORY:-your-org/your-repo}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Function to deploy microservices with canary strategy
deploy_microservices_canary() {
    print_status "Deploying microservices to production using canary strategy..."
    
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
    
    # Deploy critical services first with extra care
    local critical_services=("authentication-service" "api-gateway" "payment-service")
    local regular_services=()
    
    # Separate critical from regular services
    for service in "${services[@]}"; do
        if [[ " ${critical_services[@]} " =~ " ${service} " ]]; then
            continue
        else
            regular_services+=("$service")
        fi
    done
    
    # Deploy regular services first
    for service in "${regular_services[@]}"; do
        deploy_service_canary "$service"
    done
    
    # Deploy critical services with extra validation
    for service in "${critical_services[@]}"; do
        deploy_service_canary "$service" "critical"
    done
}

# Function to deploy a single service with canary strategy
deploy_service_canary() {
    local service_name="$1"
    local service_type="${2:-regular}"
    local chart_path="./k8s/charts/$service_name"
    local values_file="./k8s/values/$ENVIRONMENT/$service_name.yaml"
    
    if [ ! -d "$chart_path" ]; then
        print_warning "Chart not found for $service_name, skipping..."
        return 0
    fi
    
    print_status "Deploying $service_name ($service_type) with canary strategy..."
    
    # Step 1: Deploy canary version (10% traffic)
    print_info "Step 1: Deploying canary version of $service_name..."
    
    helm upgrade --install \
        "${service_name}-canary" \
        "$chart_path" \
        --namespace "$NAMESPACE" \
        --create-namespace \
        --values "$values_file" \
        --set image.tag="${GITHUB_SHA:-latest}" \
        --set environment="$ENVIRONMENT" \
        --set replicaCount=1 \
        --set service.name="${service_name}-canary" \
        --wait \
        --timeout=15m
    
    if [ $? -ne 0 ]; then
        print_error "Failed to deploy canary version of $service_name"
        return 1
    fi
    
    # Step 2: Health check canary version
    print_info "Step 2: Running health checks on canary version..."
    
    if ! run_service_health_check "${service_name}-canary"; then
        print_error "Canary health check failed for $service_name"
        helm uninstall "${service_name}-canary" -n "$NAMESPACE"
        return 1
    fi
    
    # Step 3: Gradual traffic shift for critical services
    if [ "$service_type" = "critical" ]; then
        print_info "Step 3: Gradual traffic shift for critical service $service_name..."
        
        # 25% traffic
        update_traffic_split "$service_name" 25
        sleep 60
        
        if ! run_service_health_check "$service_name"; then
            print_error "Health check failed at 25% traffic for $service_name"
            rollback_canary "$service_name"
            return 1
        fi
        
        # 50% traffic
        update_traffic_split "$service_name" 50
        sleep 60
        
        if ! run_service_health_check "$service_name"; then
            print_error "Health check failed at 50% traffic for $service_name"
            rollback_canary "$service_name"
            return 1
        fi
        
        # 75% traffic
        update_traffic_split "$service_name" 75
        sleep 60
        
        if ! run_service_health_check "$service_name"; then
            print_error "Health check failed at 75% traffic for $service_name"
            rollback_canary "$service_name"
            return 1
        fi
    fi
    
    # Step 4: Full deployment
    print_info "Step 4: Completing full deployment of $service_name..."
    
    helm upgrade --install \
        "$service_name" \
        "$chart_path" \
        --namespace "$NAMESPACE" \
        --values "$values_file" \
        --set image.tag="${GITHUB_SHA:-latest}" \
        --set environment="$ENVIRONMENT" \
        --wait \
        --timeout=15m
    
    if [ $? -ne 0 ]; then
        print_error "Failed to complete deployment of $service_name"
        rollback_canary "$service_name"
        return 1
    fi
    
    # Step 5: Final health check and cleanup
    print_info "Step 5: Final validation and cleanup..."
    
    if run_service_health_check "$service_name"; then
        print_status "✅ Successfully deployed $service_name"
        
        # Clean up canary version
        helm uninstall "${service_name}-canary" -n "$NAMESPACE" 2>/dev/null || true
    else
        print_error "Final health check failed for $service_name"
        rollback_canary "$service_name"
        return 1
    fi
}

# Function to update traffic split (simplified - would use service mesh in real implementation)
update_traffic_split() {
    local service_name="$1"
    local canary_percentage="$2"
    
    print_info "Updating traffic split: $canary_percentage% to canary version of $service_name"
    
    # This is a simplified example - in practice, you'd use Istio, Linkerd, or similar
    # kubectl patch service "$service_name" -n "$NAMESPACE" --type='merge' -p='{"spec":{"selector":{"version":"canary"}}}'
}

# Function to run health check for a service
run_service_health_check() {
    local service_name="$1"
    local max_attempts=5
    local attempt=1
    
    print_info "Running health check for $service_name..."
    
    while [ $attempt -le $max_attempts ]; do
        local service_ip=$(kubectl get service "$service_name" -n $NAMESPACE -o jsonpath='{.spec.clusterIP}' 2>/dev/null)
        
        if [ -n "$service_ip" ] && [ "$service_ip" != "None" ]; then
            if kubectl run health-check-$RANDOM --rm -i --restart=Never --image=curlimages/curl -- \
                curl -f "http://$service_ip/health" --max-time 10 &>/dev/null; then
                print_status "✅ Health check passed for $service_name"
                return 0
            fi
        fi
        
        print_warning "Health check attempt $attempt/$max_attempts failed for $service_name"
        attempt=$((attempt + 1))
        sleep 10
    done
    
    print_error "❌ Health check failed for $service_name after $max_attempts attempts"
    return 1
}

# Function to rollback canary deployment
rollback_canary() {
    local service_name="$1"
    
    print_warning "Rolling back canary deployment for $service_name..."
    
    # Remove canary version
    helm uninstall "${service_name}-canary" -n "$NAMESPACE" 2>/dev/null || true
    
    # Ensure original service is still running
    if ! kubectl get deployment "$service_name" -n "$NAMESPACE" &>/dev/null; then
        print_error "Original service $service_name not found, manual intervention required"
        return 1
    fi
    
    print_status "Canary rollback completed for $service_name"
}

# Function to run comprehensive validation
run_comprehensive_validation() {
    print_status "Running comprehensive validation..."
    
    # Run smoke tests
    if [ -f "./scripts/smoke-tests.sh" ]; then
        ./scripts/smoke-tests.sh "$ENVIRONMENT"
    else
        print_warning "Smoke tests script not found"
    fi
    
    # Check all services are healthy
    local services=$(kubectl get deployments -n $NAMESPACE -o jsonpath='{.items[*].metadata.name}')
    
    for service in $services; do
        if ! run_service_health_check "$service"; then
            print_error "Validation failed for $service"
            return 1
        fi
    done
    
    print_status "✅ Comprehensive validation passed"
}

# Main function
main() {
    print_status "🚀 Starting production microservices deployment..."
    
    # Check prerequisites
    if ! command -v helm &> /dev/null; then
        print_error "helm is not installed"
        exit 1
    fi
    
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed"
        exit 1
    fi
    
    # Verify we're connected to production cluster
    local current_context=$(kubectl config current-context)
    print_info "Current kubectl context: $current_context"
    
    if [[ ! "$current_context" =~ "production" ]] && [[ ! "$current_context" =~ "prod" ]]; then
        print_warning "Current context doesn't appear to be production. Continue? (y/N)"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            print_error "Deployment cancelled"
            exit 1
        fi
    fi
    
    # Deploy microservices
    if deploy_microservices_canary; then
        print_status "✅ All microservices deployed successfully"
    else
        print_error "❌ Some microservices failed to deploy"
        exit 1
    fi
    
    # Run comprehensive validation
    if run_comprehensive_validation; then
        print_status "🎉 Production microservices deployment completed successfully!"
    else
        print_error "❌ Validation failed after deployment"
        exit 1
    fi
}

# Error handling
trap 'print_error "Production microservices deployment failed at line $LINENO"' ERR

# Run main function
main "$@"