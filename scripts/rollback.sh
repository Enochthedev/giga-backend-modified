#!/bin/bash

# Automated Rollback Script
# This script provides automated rollback mechanisms for failed deployments

set -e

# Configuration
ENVIRONMENT="${1:-production}"
NAMESPACE="$ENVIRONMENT"

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

# Function to show usage
show_usage() {
    echo "Usage: $0 [environment] [options]"
    echo ""
    echo "Arguments:"
    echo "  environment    Target environment (staging|production) [default: production]"
    echo ""
    echo "Options:"
    echo "  --service NAME     Rollback specific service only"
    echo "  --to-version VER   Rollback to specific version"
    echo "  --list-versions    List available versions for rollback"
    echo "  --dry-run          Show what would be rolled back without executing"
    echo "  --force            Skip confirmation prompts"
    echo "  --help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 production                           # Rollback all services in production"
    echo "  $0 staging --service api-gateway        # Rollback only api-gateway in staging"
    echo "  $0 production --to-version v1.2.3      # Rollback to specific version"
    echo "  $0 production --list-versions           # List available versions"
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites for rollback..."
    
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed"
        exit 1
    fi
    
    if ! command -v helm &> /dev/null; then
        print_error "helm is not installed"
        exit 1
    fi
    
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Verify namespace exists
    if ! kubectl get namespace $NAMESPACE &> /dev/null; then
        print_error "Namespace $NAMESPACE does not exist"
        exit 1
    fi
    
    print_status "Prerequisites check passed"
}

# Function to list available versions for rollback
list_versions() {
    local service_name=$1
    
    print_info "Available versions for rollback:"
    echo ""
    
    if [ -n "$service_name" ]; then
        # List versions for specific service
        print_info "Service: $service_name"
        helm history "$service_name" -n $NAMESPACE 2>/dev/null || {
            print_warning "No Helm history found for $service_name"
        }
    else
        # List versions for all services
        local services=$(helm list -n $NAMESPACE -q)
        
        for service in $services; do
            print_info "Service: $service"
            helm history "$service" -n $NAMESPACE --max 5 2>/dev/null || {
                print_warning "No history found for $service"
            }
            echo ""
        done
    fi
}

# Function to get the previous stable version
get_previous_version() {
    local service_name=$1
    
    # Get the last successful deployment (status: deployed)
    local previous_revision=$(helm history "$service_name" -n $NAMESPACE -o json 2>/dev/null | \
        jq -r '.[] | select(.status == "deployed") | .revision' | \
        sort -nr | \
        sed -n '2p')  # Get second most recent (first is current)
    
    if [ -n "$previous_revision" ] && [ "$previous_revision" != "null" ]; then
        echo "$previous_revision"
    else
        # Fallback to previous revision regardless of status
        helm history "$service_name" -n $NAMESPACE -o json 2>/dev/null | \
            jq -r '.[].revision' | \
            sort -nr | \
            sed -n '2p'
    fi
}

# Function to rollback a single service
rollback_service() {
    local service_name=$1
    local target_version=$2
    local dry_run=$3
    
    print_status "Rolling back service: $service_name"
    
    # Check if service exists
    if ! helm list -n $NAMESPACE | grep -q "^$service_name"; then
        print_error "Service $service_name not found in namespace $NAMESPACE"
        return 1
    fi
    
    # Determine target version
    if [ -z "$target_version" ]; then
        target_version=$(get_previous_version "$service_name")
        if [ -z "$target_version" ]; then
            print_error "Cannot determine previous version for $service_name"
            return 1
        fi
        print_info "Auto-detected previous version: $target_version"
    fi
    
    # Show what will be rolled back
    print_info "Rollback details:"
    echo "  Service: $service_name"
    echo "  Target Version: $target_version"
    echo "  Namespace: $NAMESPACE"
    
    if [ "$dry_run" = "true" ]; then
        print_warning "DRY RUN: Would rollback $service_name to version $target_version"
        return 0
    fi
    
    # Perform the rollback
    print_status "Executing rollback for $service_name..."
    
    if helm rollback "$service_name" "$target_version" -n $NAMESPACE --wait --timeout=10m; then
        print_status "✅ Successfully rolled back $service_name to version $target_version"
        
        # Verify the rollback
        if verify_service_health "$service_name"; then
            print_status "✅ Service $service_name is healthy after rollback"
        else
            print_warning "⚠️ Service $service_name may have issues after rollback"
        fi
    else
        print_error "❌ Failed to rollback $service_name"
        return 1
    fi
}

# Function to verify service health after rollback
verify_service_health() {
    local service_name=$1
    local max_attempts=5
    local attempt=1
    
    print_status "Verifying health of $service_name..."
    
    # Wait for deployment to be ready
    if kubectl wait --for=condition=available \
        --timeout=300s \
        deployment/$service_name \
        -n $NAMESPACE 2>/dev/null; then
        
        # Try health endpoint if available
        while [ $attempt -le $max_attempts ]; do
            local service_ip=$(kubectl get service "$service_name" -n $NAMESPACE -o jsonpath='{.spec.clusterIP}' 2>/dev/null)
            
            if [ -n "$service_ip" ] && [ "$service_ip" != "None" ]; then
                if kubectl run health-check-$RANDOM --rm -i --restart=Never --image=curlimages/curl -- \
                    curl -f "http://$service_ip/health" --max-time 10 &>/dev/null; then
                    return 0
                fi
            fi
            
            attempt=$((attempt + 1))
            sleep 10
        done
    fi
    
    return 1
}

# Function to rollback all services
rollback_all_services() {
    local target_version=$1
    local dry_run=$2
    
    print_status "Rolling back all services in namespace: $NAMESPACE"
    
    # Get list of all Helm releases
    local services=$(helm list -n $NAMESPACE -q)
    
    if [ -z "$services" ]; then
        print_warning "No Helm releases found in namespace $NAMESPACE"
        return 0
    fi
    
    print_info "Services to rollback:"
    for service in $services; do
        echo "  - $service"
    done
    
    if [ "$dry_run" = "true" ]; then
        print_warning "DRY RUN: Would rollback all services listed above"
        return 0
    fi
    
    # Rollback services in reverse dependency order (most critical last)
    local critical_services=("api-gateway" "authentication-service")
    local regular_services=()
    
    # Separate critical from regular services
    for service in $services; do
        if [[ " ${critical_services[@]} " =~ " ${service} " ]]; then
            continue
        else
            regular_services+=("$service")
        fi
    done
    
    # Rollback regular services first
    local failed_services=()
    
    for service in "${regular_services[@]}"; do
        if ! rollback_service "$service" "$target_version" "$dry_run"; then
            failed_services+=("$service")
        fi
        sleep 5  # Brief pause between rollbacks
    done
    
    # Rollback critical services last
    for service in "${critical_services[@]}"; do
        if [[ " ${services[@]} " =~ " ${service} " ]]; then
            if ! rollback_service "$service" "$target_version" "$dry_run"; then
                failed_services+=("$service")
            fi
            sleep 5
        fi
    done
    
    # Report results
    if [ ${#failed_services[@]} -eq 0 ]; then
        print_status "✅ All services rolled back successfully"
    else
        print_error "❌ Failed to rollback the following services: ${failed_services[*]}"
        return 1
    fi
}

# Function to create rollback report
create_rollback_report() {
    local report_file="./rollback-report-$(date +%Y%m%d_%H%M%S).txt"
    
    print_status "Creating rollback report: $report_file"
    
    {
        echo "Rollback Report"
        echo "==============="
        echo "Date: $(date)"
        echo "Environment: $ENVIRONMENT"
        echo "Namespace: $NAMESPACE"
        echo ""
        echo "Services Status After Rollback:"
        echo "==============================="
        
        local services=$(helm list -n $NAMESPACE -q)
        for service in $services; do
            local status=$(kubectl get deployment "$service" -n $NAMESPACE -o jsonpath='{.status.conditions[?(@.type=="Available")].status}' 2>/dev/null || echo "Unknown")
            local replicas=$(kubectl get deployment "$service" -n $NAMESPACE -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
            local desired=$(kubectl get deployment "$service" -n $NAMESPACE -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
            
            echo "$service: $status ($replicas/$desired replicas ready)"
        done
        
        echo ""
        echo "Helm Release Status:"
        echo "==================="
        helm list -n $NAMESPACE
        
    } > "$report_file"
    
    print_status "Report saved to: $report_file"
}

# Function to send rollback notifications
send_rollback_notifications() {
    local status=$1
    local details=$2
    
    local message="🔄 Rollback $status in $ENVIRONMENT: $details"
    
    print_status "Sending rollback notifications..."
    
    # Log to file
    echo "$(date): $message" >> ./rollback.log
    
    # Send to notification channels (if configured)
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\"}" \
            "$SLACK_WEBHOOK_URL" &>/dev/null || true
    fi
    
    if [ -n "$TEAMS_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\"}" \
            "$TEAMS_WEBHOOK_URL" &>/dev/null || true
    fi
}

# Main function
main() {
    local service_name=""
    local target_version=""
    local dry_run="false"
    local force="false"
    local list_versions_only="false"
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --service)
                service_name="$2"
                shift 2
                ;;
            --to-version)
                target_version="$2"
                shift 2
                ;;
            --list-versions)
                list_versions_only="true"
                shift
                ;;
            --dry-run)
                dry_run="true"
                shift
                ;;
            --force)
                force="true"
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                if [[ "$1" =~ ^(staging|production)$ ]]; then
                    ENVIRONMENT="$1"
                    NAMESPACE="$1"
                    shift
                else
                    print_error "Unknown option: $1"
                    show_usage
                    exit 1
                fi
                ;;
        esac
    done
    
    print_status "🔄 Starting rollback process for $ENVIRONMENT environment..."
    
    # Check prerequisites
    check_prerequisites
    
    # Handle list versions request
    if [ "$list_versions_only" = "true" ]; then
        list_versions "$service_name"
        exit 0
    fi
    
    # Confirmation prompt (unless forced or dry run)
    if [ "$force" != "true" ] && [ "$dry_run" != "true" ]; then
        if [ -n "$service_name" ]; then
            print_warning "Are you sure you want to rollback $service_name in $ENVIRONMENT? (y/N)"
        else
            print_warning "Are you sure you want to rollback ALL services in $ENVIRONMENT? (y/N)"
        fi
        
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            print_info "Rollback cancelled"
            exit 0
        fi
    fi
    
    # Perform rollback
    local rollback_success=true
    
    if [ -n "$service_name" ]; then
        # Rollback specific service
        if ! rollback_service "$service_name" "$target_version" "$dry_run"; then
            rollback_success=false
        fi
    else
        # Rollback all services
        if ! rollback_all_services "$target_version" "$dry_run"; then
            rollback_success=false
        fi
    fi
    
    # Generate report and send notifications
    if [ "$dry_run" != "true" ]; then
        create_rollback_report
        
        if [ "$rollback_success" = "true" ]; then
            send_rollback_notifications "completed successfully" "All services rolled back"
            print_status "🎉 Rollback completed successfully!"
        else
            send_rollback_notifications "completed with errors" "Some services failed to rollback"
            print_error "❌ Rollback completed with errors"
            exit 1
        fi
    else
        print_info "Dry run completed"
    fi
}

# Error handling
trap 'print_error "Rollback script failed at line $LINENO"' ERR

# Run main function
main "$@"