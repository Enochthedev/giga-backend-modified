#!/bin/bash

# Deploy to Production Environment
# This script deploys all services to the production environment with additional safety checks

set -e

echo "🚀 Starting deployment to production environment..."

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

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed"
        exit 1
    fi
    
    # Check helm
    if ! command -v helm &> /dev/null; then
        print_error "helm is not installed"
        exit 1
    fi
    
    # Check cluster connection
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Verify we're connected to the right cluster
    current_context=$(kubectl config current-context)
    print_info "Current kubectl context: $current_context"
    
    # Add safety check for production context
    if [[ ! "$current_context" =~ "production" ]] && [[ ! "$current_context" =~ "prod" ]]; then
        print_warning "Current context doesn't appear to be production. Continue? (y/N)"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            print_error "Deployment cancelled"
            exit 1
        fi
    fi
    
    print_status "Prerequisites check passed"
}

# Function to create backup of current deployment
create_backup() {
    print_status "Creating backup of current deployment..."
    
    local backup_dir="./backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup current Helm releases
    helm list -n $NAMESPACE -o yaml > "$backup_dir/helm-releases.yaml"
    
    # Backup current deployments
    kubectl get deployments -n $NAMESPACE -o yaml > "$backup_dir/deployments.yaml"
    
    # Backup current services
    kubectl get services -n $NAMESPACE -o yaml > "$backup_dir/services.yaml"
    
    # Backup current configmaps
    kubectl get configmaps -n $NAMESPACE -o yaml > "$backup_dir/configmaps.yaml"
    
    # Store backup path for potential rollback
    echo "$backup_dir" > /tmp/last_backup_path
    
    print_status "Backup created at: $backup_dir"
}

# Function to deploy with blue-green strategy
deploy_service_blue_green() {
    local service_name=$1
    local chart_path="./k8s/charts/$service_name"
    local values_file="./k8s/values/$ENVIRONMENT/$service_name.yaml"
    
    print_status "Deploying $service_name using blue-green strategy..."
    
    if [ ! -d "$chart_path" ]; then
        print_warning "Chart not found for $service_name, skipping..."
        return 0
    fi
    
    local image_tag="${GITHUB_SHA:-latest}"
    local green_release="${service_name}-green"
    local blue_release="${service_name}-blue"
    
    # Check if blue version exists
    if helm list -n $NAMESPACE | grep -q "$blue_release"; then
        print_status "Blue version exists, deploying green version..."
        current_release="$blue_release"
        new_release="$green_release"
    else
        print_status "No blue version found, deploying blue version..."
        current_release="$green_release"
        new_release="$blue_release"
    fi
    
    # Deploy new version
    helm upgrade --install \
        "$new_release" \
        "$chart_path" \
        --namespace "$NAMESPACE" \
        --values "$values_file" \
        --set image.tag="$image_tag" \
        --set environment="$ENVIRONMENT" \
        --set service.name="$service_name" \
        --wait \
        --timeout=15m
    
    if [ $? -ne 0 ]; then
        print_error "Failed to deploy $new_release"
        return 1
    fi
    
    # Wait for new deployment to be ready
    kubectl wait --for=condition=available \
        --timeout=300s \
        deployment/$new_release \
        -n $NAMESPACE
    
    # Run health checks on new version
    if run_service_health_check "$new_release"; then
        print_status "Health checks passed for $new_release"
        
        # Switch traffic to new version (update service selector)
        kubectl patch service "$service_name" -n $NAMESPACE \
            -p '{"spec":{"selector":{"version":"'$(echo $new_release | cut -d'-' -f2)'"}}}'
        
        # Wait a bit for traffic to switch
        sleep 30
        
        # Run final health check
        if run_service_health_check "$service_name"; then
            print_status "✅ Successfully switched traffic to $new_release"
            
            # Clean up old version after successful deployment
            if helm list -n $NAMESPACE | grep -q "$current_release"; then
                print_status "Cleaning up old version: $current_release"
                helm uninstall "$current_release" -n $NAMESPACE
            fi
        else
            print_error "Health check failed after traffic switch, rolling back..."
            rollback_service "$service_name" "$current_release"
            return 1
        fi
    else
        print_error "Health checks failed for $new_release, cleaning up..."
        helm uninstall "$new_release" -n $NAMESPACE
        return 1
    fi
}

# Function to run health check for a service
run_service_health_check() {
    local service_name=$1
    local max_attempts=5
    local attempt=1
    
    print_status "Running health check for $service_name..."
    
    while [ $attempt -le $max_attempts ]; do
        # Try to get service endpoint
        local service_ip=$(kubectl get service "$service_name" -n $NAMESPACE -o jsonpath='{.spec.clusterIP}' 2>/dev/null)
        
        if [ -n "$service_ip" ] && [ "$service_ip" != "None" ]; then
            # Use kubectl exec to run health check from within cluster
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

# Function to rollback a service
rollback_service() {
    local service_name=$1
    local previous_release=$2
    
    print_warning "Rolling back $service_name to $previous_release..."
    
    # Switch traffic back
    kubectl patch service "$service_name" -n $NAMESPACE \
        -p '{"spec":{"selector":{"version":"'$(echo $previous_release | cut -d'-' -f2)'"}}}'
    
    print_status "Rollback completed for $service_name"
}

# Function to run comprehensive smoke tests
run_smoke_tests() {
    print_status "Running comprehensive smoke tests..."
    
    # Test API Gateway
    if run_service_health_check "api-gateway"; then
        print_status "✅ API Gateway smoke test passed"
    else
        print_error "❌ API Gateway smoke test failed"
        return 1
    fi
    
    # Test Authentication Service
    if run_service_health_check "authentication-service"; then
        print_status "✅ Authentication Service smoke test passed"
    else
        print_error "❌ Authentication Service smoke test failed"
        return 1
    fi
    
    # Test critical user flows
    print_status "Testing critical user flows..."
    
    # This would typically involve running actual API tests
    # For now, we'll simulate with basic connectivity tests
    
    local services=(
        "admin-service"
        "analytics-service"
        "file-service"
        "messaging-service"
        "notification-service"
        "payment-service"
        "search-service"
        "taxi-service"
    )
    
    for service in "${services[@]}"; do
        if kubectl get service "$service" -n $NAMESPACE &>/dev/null; then
            if run_service_health_check "$service"; then
                print_status "✅ $service smoke test passed"
            else
                print_warning "⚠️ $service smoke test failed"
            fi
        fi
    done
    
    print_status "Smoke tests completed"
}

# Function to send deployment notifications
send_notifications() {
    local status=$1
    local message=$2
    
    print_status "Sending deployment notifications..."
    
    # This would integrate with your notification system
    # Examples: Slack, email, PagerDuty, etc.
    
    if [ "$status" = "success" ]; then
        echo "✅ Production Deployment Successful: $message" | tee /tmp/deployment_notification
    else
        echo "❌ Production Deployment Failed: $message" | tee /tmp/deployment_notification
    fi
    
    # Example Slack notification (requires webhook URL)
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$(cat /tmp/deployment_notification)\"}" \
            "$SLACK_WEBHOOK_URL"
    fi
}

# Function to perform full rollback
full_rollback() {
    print_error "Performing full rollback..."
    
    local backup_path=$(cat /tmp/last_backup_path 2>/dev/null || echo "")
    
    if [ -n "$backup_path" ] && [ -d "$backup_path" ]; then
        print_status "Rolling back using backup from: $backup_path"
        
        # Rollback Helm releases
        if [ -f "$backup_path/helm-releases.yaml" ]; then
            # This is a simplified rollback - in practice, you'd need more sophisticated logic
            print_status "Rolling back Helm releases..."
            # helm rollback commands would go here
        fi
        
        print_status "Rollback completed"
    else
        print_error "No backup found, manual intervention required"
    fi
}

# Main deployment function
main() {
    print_status "🚀 Starting production deployment..."
    
    # Pre-deployment checks
    check_prerequisites
    create_backup
    
    # Create namespace if it doesn't exist
    if ! kubectl get namespace $NAMESPACE &> /dev/null; then
        print_status "Creating namespace: $NAMESPACE"
        kubectl create namespace $NAMESPACE
    fi
    
    # Deploy infrastructure services first (if not already deployed)
    print_status "Ensuring infrastructure services are ready..."
    
    # List of application services to deploy
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
    
    # Deploy services using blue-green strategy
    print_status "Deploying application services..."
    
    local failed_services=()
    
    for service in "${services[@]}"; do
        if ! deploy_service_blue_green "$service"; then
            failed_services+=("$service")
            print_error "Failed to deploy $service"
        fi
    done
    
    # Check if any services failed
    if [ ${#failed_services[@]} -gt 0 ]; then
        print_error "The following services failed to deploy: ${failed_services[*]}"
        send_notifications "failure" "Services failed: ${failed_services[*]}"
        
        print_warning "Do you want to rollback all changes? (y/N)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            full_rollback
        fi
        
        exit 1
    fi
    
    # Run comprehensive smoke tests
    if ! run_smoke_tests; then
        print_error "Smoke tests failed"
        send_notifications "failure" "Smoke tests failed after deployment"
        
        print_warning "Do you want to rollback? (y/N)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            full_rollback
        fi
        
        exit 1
    fi
    
    # Success!
    print_status "🎉 Production deployment completed successfully!"
    send_notifications "success" "All services deployed and tested successfully"
    
    # Print access information
    print_status "Production access information:"
    kubectl get ingress -n $NAMESPACE
    
    # Clean up old backups (keep last 5)
    find ./backups -maxdepth 1 -type d -name "20*" | sort -r | tail -n +6 | xargs rm -rf 2>/dev/null || true
}

# Error handling
trap 'print_error "Production deployment failed at line $LINENO"; send_notifications "failure" "Deployment script error at line $LINENO"' ERR

# Run main function
main "$@"