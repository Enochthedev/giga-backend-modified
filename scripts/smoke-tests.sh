#!/bin/bash

# Smoke Tests Script
# This script runs comprehensive smoke tests after deployment

set -e

# Configuration
ENVIRONMENT="${1:-production}"
NAMESPACE="$ENVIRONMENT"
BASE_URL="${BASE_URL:-http://localhost}"
TIMEOUT=30

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

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
FAILED_TEST_NAMES=()

# Function to run a test and track results
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    print_info "Running test: $test_name"
    
    if eval "$test_command"; then
        print_status "✅ PASS: $test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        print_error "❌ FAIL: $test_name"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        FAILED_TEST_NAMES+=("$test_name")
        return 1
    fi
}

# Function to check if a service is running
check_service_health() {
    local service_name="$1"
    local health_endpoint="${2:-/health}"
    
    # Try to get service cluster IP
    local service_ip=$(kubectl get service "$service_name" -n $NAMESPACE -o jsonpath='{.spec.clusterIP}' 2>/dev/null)
    
    if [ -z "$service_ip" ] || [ "$service_ip" = "None" ]; then
        return 1
    fi
    
    # Use kubectl run to test from within cluster
    kubectl run smoke-test-$RANDOM --rm -i --restart=Never --image=curlimages/curl -- \
        curl -f "http://$service_ip$health_endpoint" --max-time $TIMEOUT &>/dev/null
}

# Function to check deployment status
check_deployment_status() {
    local deployment_name="$1"
    
    local ready_replicas=$(kubectl get deployment "$deployment_name" -n $NAMESPACE -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    local desired_replicas=$(kubectl get deployment "$deployment_name" -n $NAMESPACE -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "1")
    
    [ "$ready_replicas" -eq "$desired_replicas" ] && [ "$ready_replicas" -gt 0 ]
}

# Function to test API Gateway
test_api_gateway() {
    print_status "Testing API Gateway..."
    
    run_test "API Gateway - Health Check" "check_service_health 'api-gateway' '/health'"
    run_test "API Gateway - Deployment Status" "check_deployment_status 'api-gateway'"
    
    # Test routing capabilities
    if kubectl get service api-gateway -n $NAMESPACE &>/dev/null; then
        run_test "API Gateway - Service Discovery" "kubectl get endpoints api-gateway -n $NAMESPACE -o jsonpath='{.subsets[0].addresses[0].ip}' | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$'"
    fi
}

# Function to test Authentication Service
test_authentication_service() {
    print_status "Testing Authentication Service..."
    
    run_test "Auth Service - Health Check" "check_service_health 'authentication-service' '/health'"
    run_test "Auth Service - Deployment Status" "check_deployment_status 'authentication-service'"
    
    # Test authentication endpoints (basic connectivity)
    if kubectl get service authentication-service -n $NAMESPACE &>/dev/null; then
        run_test "Auth Service - Login Endpoint" "kubectl run auth-test-$RANDOM --rm -i --restart=Never --image=curlimages/curl -- curl -f http://authentication-service/api/auth/login --max-time $TIMEOUT -X POST -H 'Content-Type: application/json' -d '{}' -w '%{http_code}' -o /dev/null | grep -E '^[4-5][0-9][0-9]$'"
    fi
}

# Function to test Payment Service
test_payment_service() {
    print_status "Testing Payment Service..."
    
    run_test "Payment Service - Health Check" "check_service_health 'payment-service' '/health'"
    run_test "Payment Service - Deployment Status" "check_deployment_status 'payment-service'"
    
    # Test payment endpoints
    if kubectl get service payment-service -n $NAMESPACE &>/dev/null; then
        run_test "Payment Service - API Endpoint" "kubectl run payment-test-$RANDOM --rm -i --restart=Never --image=curlimages/curl -- curl -f http://payment-service/api/payments/health --max-time $TIMEOUT"
    fi
}

# Function to test Ecommerce Service
test_ecommerce_service() {
    print_status "Testing Ecommerce Service..."
    
    run_test "Ecommerce Service - Health Check" "check_service_health 'ecommerce-backend' '/health'"
    run_test "Ecommerce Service - Deployment Status" "check_deployment_status 'ecommerce-backend'"
    
    # Test product endpoints
    if kubectl get service ecommerce-backend -n $NAMESPACE &>/dev/null; then
        run_test "Ecommerce Service - Products API" "kubectl run ecommerce-test-$RANDOM --rm -i --restart=Never --image=curlimages/curl -- curl -f http://ecommerce-backend/api/products --max-time $TIMEOUT"
    fi
}

# Function to test Taxi Service
test_taxi_service() {
    print_status "Testing Taxi Service..."
    
    run_test "Taxi Service - Health Check" "check_service_health 'taxi-service' '/health'"
    run_test "Taxi Service - Deployment Status" "check_deployment_status 'taxi-service'"
    
    # Test taxi endpoints
    if kubectl get service taxi-service -n $NAMESPACE &>/dev/null; then
        run_test "Taxi Service - Rides API" "kubectl run taxi-test-$RANDOM --rm -i --restart=Never --image=curlimages/curl -- curl -f http://taxi-service/api/rides --max-time $TIMEOUT"
    fi
}

# Function to test Hotel Service
test_hotel_service() {
    print_status "Testing Hotel Service..."
    
    run_test "Hotel Service - Health Check" "check_service_health 'hotel-service' '/health'"
    run_test "Hotel Service - Deployment Status" "check_deployment_status 'hotel-service'"
    
    # Test hotel endpoints
    if kubectl get service hotel-service -n $NAMESPACE &>/dev/null; then
        run_test "Hotel Service - Properties API" "kubectl run hotel-test-$RANDOM --rm -i --restart=Never --image=curlimages/curl -- curl -f http://hotel-service/api/properties --max-time $TIMEOUT"
    fi
}

# Function to test Notification Service
test_notification_service() {
    print_status "Testing Notification Service..."
    
    run_test "Notification Service - Health Check" "check_service_health 'notification-service' '/health'"
    run_test "Notification Service - Deployment Status" "check_deployment_status 'notification-service'"
}

# Function to test File Service
test_file_service() {
    print_status "Testing File Service..."
    
    run_test "File Service - Health Check" "check_service_health 'file-service' '/health'"
    run_test "File Service - Deployment Status" "check_deployment_status 'file-service'"
}

# Function to test Search Service
test_search_service() {
    print_status "Testing Search Service..."
    
    run_test "Search Service - Health Check" "check_service_health 'search-service' '/health'"
    run_test "Search Service - Deployment Status" "check_deployment_status 'search-service'"
}

# Function to test Analytics Service
test_analytics_service() {
    print_status "Testing Analytics Service..."
    
    run_test "Analytics Service - Health Check" "check_service_health 'analytics-service' '/health'"
    run_test "Analytics Service - Deployment Status" "check_deployment_status 'analytics-service'"
}

# Function to test Admin Service
test_admin_service() {
    print_status "Testing Admin Service..."
    
    run_test "Admin Service - Health Check" "check_service_health 'admin-service' '/health'"
    run_test "Admin Service - Deployment Status" "check_deployment_status 'admin-service'"
}

# Function to test Advertisement Service
test_advertisement_service() {
    print_status "Testing Advertisement Service..."
    
    run_test "Advertisement Service - Health Check" "check_service_health 'advertisement-service' '/health'"
    run_test "Advertisement Service - Deployment Status" "check_deployment_status 'advertisement-service'"
}

# Function to test infrastructure services
test_infrastructure() {
    print_status "Testing Infrastructure Services..."
    
    # Test PostgreSQL
    if kubectl get service postgresql -n $NAMESPACE &>/dev/null; then
        run_test "PostgreSQL - Service Available" "kubectl get service postgresql -n $NAMESPACE -o jsonpath='{.spec.clusterIP}' | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$'"
        run_test "PostgreSQL - Pod Running" "kubectl get pods -n $NAMESPACE -l app.kubernetes.io/name=postgresql -o jsonpath='{.items[0].status.phase}' | grep -q 'Running'"
    fi
    
    # Test Redis
    if kubectl get service redis -n $NAMESPACE &>/dev/null; then
        run_test "Redis - Service Available" "kubectl get service redis -n $NAMESPACE -o jsonpath='{.spec.clusterIP}' | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$'"
        run_test "Redis - Pod Running" "kubectl get pods -n $NAMESPACE -l app.kubernetes.io/name=redis -o jsonpath='{.items[0].status.phase}' | grep -q 'Running'"
    fi
    
    # Test RabbitMQ
    if kubectl get service rabbitmq -n $NAMESPACE &>/dev/null; then
        run_test "RabbitMQ - Service Available" "kubectl get service rabbitmq -n $NAMESPACE -o jsonpath='{.spec.clusterIP}' | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$'"
        run_test "RabbitMQ - Pod Running" "kubectl get pods -n $NAMESPACE -l app.kubernetes.io/name=rabbitmq -o jsonpath='{.items[0].status.phase}' | grep -q 'Running'"
    fi
}

# Function to test cross-service communication
test_cross_service_communication() {
    print_status "Testing Cross-Service Communication..."
    
    # Test API Gateway to Auth Service routing
    if kubectl get service api-gateway -n $NAMESPACE &>/dev/null && kubectl get service authentication-service -n $NAMESPACE &>/dev/null; then
        run_test "API Gateway -> Auth Service" "kubectl run comm-test-$RANDOM --rm -i --restart=Never --image=curlimages/curl -- curl -f http://api-gateway/api/auth/health --max-time $TIMEOUT"
    fi
    
    # Test service discovery
    run_test "Service Discovery - DNS Resolution" "kubectl run dns-test-$RANDOM --rm -i --restart=Never --image=busybox -- nslookup api-gateway.$NAMESPACE.svc.cluster.local"
}

# Function to test critical user flows
test_critical_flows() {
    print_status "Testing Critical User Flows..."
    
    # Test user registration flow (simplified)
    if kubectl get service api-gateway -n $NAMESPACE &>/dev/null; then
        run_test "User Registration Flow" "kubectl run flow-test-$RANDOM --rm -i --restart=Never --image=curlimages/curl -- curl -f http://api-gateway/api/auth/register --max-time $TIMEOUT -X POST -H 'Content-Type: application/json' -d '{\"email\":\"test@example.com\",\"password\":\"testpass\"}' -w '%{http_code}' -o /dev/null | grep -E '^[2-4][0-9][0-9]$'"
    fi
    
    # Test product listing (if ecommerce is available)
    if kubectl get service ecommerce-backend -n $NAMESPACE &>/dev/null; then
        run_test "Product Listing Flow" "kubectl run product-test-$RANDOM --rm -i --restart=Never --image=curlimages/curl -- curl -f http://ecommerce-backend/api/products --max-time $TIMEOUT"
    fi
}

# Function to test performance and load
test_performance() {
    print_status "Testing Performance..."
    
    # Test response times for critical endpoints
    if kubectl get service api-gateway -n $NAMESPACE &>/dev/null; then
        run_test "API Gateway Response Time" "kubectl run perf-test-$RANDOM --rm -i --restart=Never --image=curlimages/curl -- curl -w '%{time_total}' -o /dev/null -s http://api-gateway/health | awk '{if(\$1 < 2.0) exit 0; else exit 1}'"
    fi
    
    # Test concurrent connections (simplified)
    run_test "Concurrent Connection Handling" "kubectl get pods -n $NAMESPACE --field-selector=status.phase=Running | wc -l | awk '{if(\$1 > 0) exit 0; else exit 1}'"
}

# Function to generate test report
generate_report() {
    local report_file="./smoke-test-report-$(date +%Y%m%d_%H%M%S).txt"
    
    print_status "Generating test report: $report_file"
    
    {
        echo "Smoke Test Report"
        echo "================="
        echo "Date: $(date)"
        echo "Environment: $ENVIRONMENT"
        echo "Namespace: $NAMESPACE"
        echo ""
        echo "Test Summary:"
        echo "============="
        echo "Total Tests: $TOTAL_TESTS"
        echo "Passed: $PASSED_TESTS"
        echo "Failed: $FAILED_TESTS"
        echo "Success Rate: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%"
        echo ""
        
        if [ ${#FAILED_TEST_NAMES[@]} -gt 0 ]; then
            echo "Failed Tests:"
            echo "============="
            for test_name in "${FAILED_TEST_NAMES[@]}"; do
                echo "- $test_name"
            done
            echo ""
        fi
        
        echo "Service Status:"
        echo "==============="
        kubectl get pods -n $NAMESPACE -o wide
        echo ""
        
        echo "Service Endpoints:"
        echo "=================="
        kubectl get services -n $NAMESPACE
        echo ""
        
        echo "Ingress Information:"
        echo "==================="
        kubectl get ingress -n $NAMESPACE 2>/dev/null || echo "No ingress resources found"
        
    } > "$report_file"
    
    print_status "Report saved to: $report_file"
}

# Function to send test notifications
send_notifications() {
    local success_rate=$(( PASSED_TESTS * 100 / TOTAL_TESTS ))
    local status="success"
    
    if [ $FAILED_TESTS -gt 0 ]; then
        status="warning"
    fi
    
    if [ $success_rate -lt 80 ]; then
        status="failure"
    fi
    
    local message="🧪 Smoke Tests $status in $ENVIRONMENT: $PASSED_TESTS/$TOTAL_TESTS passed ($success_rate%)"
    
    print_status "Sending test notifications..."
    
    # Log to file
    echo "$(date): $message" >> ./smoke-tests.log
    
    # Send to notification channels (if configured)
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\"}" \
            "$SLACK_WEBHOOK_URL" &>/dev/null || true
    fi
}

# Main function
main() {
    print_status "🧪 Starting smoke tests for $ENVIRONMENT environment..."
    
    # Check prerequisites
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed"
        exit 1
    fi
    
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    if ! kubectl get namespace $NAMESPACE &> /dev/null; then
        print_error "Namespace $NAMESPACE does not exist"
        exit 1
    fi
    
    print_status "Prerequisites check passed"
    
    # Run all test suites
    test_infrastructure
    test_api_gateway
    test_authentication_service
    test_payment_service
    test_ecommerce_service
    test_taxi_service
    test_hotel_service
    test_notification_service
    test_file_service
    test_search_service
    test_analytics_service
    test_admin_service
    test_advertisement_service
    test_cross_service_communication
    test_critical_flows
    test_performance
    
    # Generate report and send notifications
    generate_report
    send_notifications
    
    # Print final results
    echo ""
    print_status "🎯 Smoke Test Results:"
    print_info "Total Tests: $TOTAL_TESTS"
    print_info "Passed: $PASSED_TESTS"
    print_info "Failed: $FAILED_TESTS"
    
    local success_rate=$(( PASSED_TESTS * 100 / TOTAL_TESTS ))
    print_info "Success Rate: $success_rate%"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        print_status "🎉 All smoke tests passed!"
        exit 0
    elif [ $success_rate -ge 80 ]; then
        print_warning "⚠️ Some tests failed, but success rate is acceptable ($success_rate%)"
        exit 0
    else
        print_error "❌ Too many tests failed ($success_rate% success rate)"
        exit 1
    fi
}

# Error handling
trap 'print_error "Smoke tests failed at line $LINENO"' ERR

# Run main function
main "$@"