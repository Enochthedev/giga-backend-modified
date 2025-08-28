#!/bin/bash

# Kubernetes Deployment Validation Script
# This script validates the deployment of the Multi-Service Platform

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="multi-service-platform"
ISTIO_NAMESPACE="istio-system"
INGRESS_NAMESPACE="ingress-nginx"
CERT_MANAGER_NAMESPACE="cert-manager"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_namespace() {
    local ns=$1
    log_info "Checking namespace: $ns"
    
    if kubectl get namespace $ns &> /dev/null; then
        log_success "Namespace $ns exists"
        return 0
    else
        log_error "Namespace $ns does not exist"
        return 1
    fi
}

check_pods() {
    local ns=$1
    log_info "Checking pods in namespace: $ns"
    
    local not_ready=$(kubectl get pods -n $ns --no-headers | grep -v Running | grep -v Completed | wc -l)
    local total=$(kubectl get pods -n $ns --no-headers | wc -l)
    
    if [ $not_ready -eq 0 ]; then
        log_success "All $total pods are running in $ns"
        return 0
    else
        log_warning "$not_ready out of $total pods are not ready in $ns"
        kubectl get pods -n $ns | grep -v Running | grep -v Completed
        return 1
    fi
}

check_services() {
    local ns=$1
    log_info "Checking services in namespace: $ns"
    
    local services=(
        "api-gateway-service"
        "authentication-service"
        "ecommerce-service"
        "payment-service"
        "taxi-service"
        "hotel-service"
        "advertisement-service"
        "notification-service"
        "file-service"
        "search-service"
    )
    
    local failed=0
    for service in "${services[@]}"; do
        if kubectl get service $service -n $ns &> /dev/null; then
            local endpoints=$(kubectl get endpoints $service -n $ns -o jsonpath='{.subsets[*].addresses[*].ip}' | wc -w)
            if [ $endpoints -gt 0 ]; then
                log_success "Service $service has $endpoints endpoints"
            else
                log_warning "Service $service has no endpoints"
                failed=$((failed + 1))
            fi
        else
            log_error "Service $service does not exist"
            failed=$((failed + 1))
        fi
    done
    
    return $failed
}

check_deployments() {
    local ns=$1
    log_info "Checking deployments in namespace: $ns"
    
    local deployments=$(kubectl get deployments -n $ns --no-headers | wc -l)
    local ready_deployments=$(kubectl get deployments -n $ns --no-headers | awk '$2==$4 {print $1}' | wc -l)
    
    if [ $deployments -eq $ready_deployments ]; then
        log_success "All $deployments deployments are ready in $ns"
        return 0
    else
        log_warning "$((deployments - ready_deployments)) out of $deployments deployments are not ready in $ns"
        kubectl get deployments -n $ns
        return 1
    fi
}

check_hpa() {
    local ns=$1
    log_info "Checking Horizontal Pod Autoscalers in namespace: $ns"
    
    local hpas=$(kubectl get hpa -n $ns --no-headers 2>/dev/null | wc -l)
    if [ $hpas -gt 0 ]; then
        log_success "$hpas HPA resources found in $ns"
        kubectl get hpa -n $ns
        return 0
    else
        log_warning "No HPA resources found in $ns"
        return 1
    fi
}

check_ingress() {
    local ns=$1
    log_info "Checking ingress resources in namespace: $ns"
    
    local ingresses=$(kubectl get ingress -n $ns --no-headers 2>/dev/null | wc -l)
    if [ $ingresses -gt 0 ]; then
        log_success "$ingresses ingress resources found in $ns"
        kubectl get ingress -n $ns
        return 0
    else
        log_warning "No ingress resources found in $ns"
        return 1
    fi
}

check_certificates() {
    local ns=$1
    log_info "Checking SSL certificates in namespace: $ns"
    
    if kubectl get certificates -n $ns &> /dev/null; then
        local certs=$(kubectl get certificates -n $ns --no-headers | wc -l)
        local ready_certs=$(kubectl get certificates -n $ns --no-headers | grep True | wc -l)
        
        if [ $certs -eq $ready_certs ]; then
            log_success "All $certs certificates are ready in $ns"
        else
            log_warning "$((certs - ready_certs)) out of $certs certificates are not ready in $ns"
            kubectl get certificates -n $ns
        fi
        return 0
    else
        log_warning "No certificates found in $ns"
        return 1
    fi
}

check_istio_installation() {
    log_info "Checking Istio installation"
    
    if kubectl get namespace $ISTIO_NAMESPACE &> /dev/null; then
        if kubectl get deployment istiod -n $ISTIO_NAMESPACE &> /dev/null; then
            local ready=$(kubectl get deployment istiod -n $ISTIO_NAMESPACE -o jsonpath='{.status.readyReplicas}')
            local desired=$(kubectl get deployment istiod -n $ISTIO_NAMESPACE -o jsonpath='{.spec.replicas}')
            
            if [ "$ready" = "$desired" ]; then
                log_success "Istio control plane is ready ($ready/$desired replicas)"
            else
                log_warning "Istio control plane is not fully ready ($ready/$desired replicas)"
            fi
        else
            log_error "Istio control plane (istiod) not found"
            return 1
        fi
        
        # Check ingress gateway
        if kubectl get deployment istio-ingressgateway -n $ISTIO_NAMESPACE &> /dev/null; then
            log_success "Istio ingress gateway is deployed"
        else
            log_warning "Istio ingress gateway not found"
        fi
        
        return 0
    else
        log_error "Istio namespace does not exist"
        return 1
    fi
}

check_istio_configuration() {
    local ns=$1
    log_info "Checking Istio configuration in namespace: $ns"
    
    # Check gateways
    local gateways=$(kubectl get gateway -n $ns --no-headers 2>/dev/null | wc -l)
    if [ $gateways -gt 0 ]; then
        log_success "$gateways Istio gateways found"
    else
        log_warning "No Istio gateways found"
    fi
    
    # Check virtual services
    local vs=$(kubectl get virtualservice -n $ns --no-headers 2>/dev/null | wc -l)
    if [ $vs -gt 0 ]; then
        log_success "$vs Istio virtual services found"
    else
        log_warning "No Istio virtual services found"
    fi
    
    # Check destination rules
    local dr=$(kubectl get destinationrule -n $ns --no-headers 2>/dev/null | wc -l)
    if [ $dr -gt 0 ]; then
        log_success "$dr Istio destination rules found"
    else
        log_warning "No Istio destination rules found"
    fi
    
    # Check authorization policies
    local ap=$(kubectl get authorizationpolicy -n $ns --no-headers 2>/dev/null | wc -l)
    if [ $ap -gt 0 ]; then
        log_success "$ap Istio authorization policies found"
    else
        log_warning "No Istio authorization policies found"
    fi
    
    return 0
}

check_metrics_server() {
    log_info "Checking Metrics Server"
    
    if kubectl get deployment metrics-server -n kube-system &> /dev/null; then
        local ready=$(kubectl get deployment metrics-server -n kube-system -o jsonpath='{.status.readyReplicas}')
        local desired=$(kubectl get deployment metrics-server -n kube-system -o jsonpath='{.spec.replicas}')
        
        if [ "$ready" = "$desired" ]; then
            log_success "Metrics Server is ready ($ready/$desired replicas)"
            return 0
        else
            log_warning "Metrics Server is not fully ready ($ready/$desired replicas)"
            return 1
        fi
    else
        log_error "Metrics Server not found"
        return 1
    fi
}

check_ingress_controller() {
    log_info "Checking NGINX Ingress Controller"
    
    if kubectl get namespace $INGRESS_NAMESPACE &> /dev/null; then
        if kubectl get deployment ingress-nginx-controller -n $INGRESS_NAMESPACE &> /dev/null; then
            local ready=$(kubectl get deployment ingress-nginx-controller -n $INGRESS_NAMESPACE -o jsonpath='{.status.readyReplicas}')
            local desired=$(kubectl get deployment ingress-nginx-controller -n $INGRESS_NAMESPACE -o jsonpath='{.spec.replicas}')
            
            if [ "$ready" = "$desired" ]; then
                log_success "NGINX Ingress Controller is ready ($ready/$desired replicas)"
                return 0
            else
                log_warning "NGINX Ingress Controller is not fully ready ($ready/$desired replicas)"
                return 1
            fi
        else
            log_error "NGINX Ingress Controller deployment not found"
            return 1
        fi
    else
        log_error "NGINX Ingress Controller namespace does not exist"
        return 1
    fi
}

check_cert_manager() {
    log_info "Checking Cert-Manager"
    
    if kubectl get namespace $CERT_MANAGER_NAMESPACE &> /dev/null; then
        if kubectl get deployment cert-manager -n $CERT_MANAGER_NAMESPACE &> /dev/null; then
            local ready=$(kubectl get deployment cert-manager -n $CERT_MANAGER_NAMESPACE -o jsonpath='{.status.readyReplicas}')
            local desired=$(kubectl get deployment cert-manager -n $CERT_MANAGER_NAMESPACE -o jsonpath='{.spec.replicas}')
            
            if [ "$ready" = "$desired" ]; then
                log_success "Cert-Manager is ready ($ready/$desired replicas)"
            else
                log_warning "Cert-Manager is not fully ready ($ready/$desired replicas)"
            fi
        else
            log_error "Cert-Manager deployment not found"
            return 1
        fi
        
        # Check cluster issuers
        local issuers=$(kubectl get clusterissuer --no-headers 2>/dev/null | wc -l)
        if [ $issuers -gt 0 ]; then
            log_success "$issuers cluster issuers found"
        else
            log_warning "No cluster issuers found"
        fi
        
        return 0
    else
        log_error "Cert-Manager namespace does not exist"
        return 1
    fi
}

test_service_connectivity() {
    local ns=$1
    log_info "Testing service connectivity in namespace: $ns"
    
    # Get a pod to test from
    local test_pod=$(kubectl get pods -n $ns -l app=api-gateway -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    
    if [ -z "$test_pod" ]; then
        log_warning "No API Gateway pod found for connectivity testing"
        return 1
    fi
    
    local services=(
        "authentication-service:3001"
        "ecommerce-service:3002"
        "payment-service:3003"
    )
    
    local failed=0
    for service in "${services[@]}"; do
        local service_name=$(echo $service | cut -d: -f1)
        local port=$(echo $service | cut -d: -f2)
        
        if kubectl exec $test_pod -n $ns -- curl -s --max-time 5 http://$service_name:$port/health &> /dev/null; then
            log_success "Service $service_name is reachable"
        else
            log_warning "Service $service_name is not reachable"
            failed=$((failed + 1))
        fi
    done
    
    return $failed
}

generate_report() {
    log_info "Generating validation report..."
    
    echo ""
    echo "=================================="
    echo "KUBERNETES DEPLOYMENT VALIDATION"
    echo "=================================="
    echo "Timestamp: $(date)"
    echo ""
    
    # Summary
    local total_checks=0
    local passed_checks=0
    
    echo "INFRASTRUCTURE COMPONENTS:"
    echo "--------------------------"
    
    # Check namespaces
    total_checks=$((total_checks + 4))
    check_namespace $NAMESPACE && passed_checks=$((passed_checks + 1))
    check_namespace $ISTIO_NAMESPACE && passed_checks=$((passed_checks + 1))
    check_namespace $INGRESS_NAMESPACE && passed_checks=$((passed_checks + 1))
    check_namespace $CERT_MANAGER_NAMESPACE && passed_checks=$((passed_checks + 1))
    
    echo ""
    
    # Check infrastructure
    total_checks=$((total_checks + 4))
    check_istio_installation && passed_checks=$((passed_checks + 1))
    check_ingress_controller && passed_checks=$((passed_checks + 1))
    check_cert_manager && passed_checks=$((passed_checks + 1))
    check_metrics_server && passed_checks=$((passed_checks + 1))
    
    echo ""
    echo "APPLICATION COMPONENTS:"
    echo "-----------------------"
    
    # Check application
    total_checks=$((total_checks + 4))
    check_pods $NAMESPACE && passed_checks=$((passed_checks + 1))
    check_deployments $NAMESPACE && passed_checks=$((passed_checks + 1))
    check_services $NAMESPACE && passed_checks=$((passed_checks + 1))
    check_hpa $NAMESPACE && passed_checks=$((passed_checks + 1))
    
    echo ""
    echo "NETWORKING AND SECURITY:"
    echo "------------------------"
    
    # Check networking
    total_checks=$((total_checks + 3))
    check_ingress $NAMESPACE && passed_checks=$((passed_checks + 1))
    check_certificates $NAMESPACE && passed_checks=$((passed_checks + 1))
    check_istio_configuration $NAMESPACE && passed_checks=$((passed_checks + 1))
    
    echo ""
    echo "CONNECTIVITY TESTS:"
    echo "-------------------"
    
    # Test connectivity
    total_checks=$((total_checks + 1))
    test_service_connectivity $NAMESPACE && passed_checks=$((passed_checks + 1))
    
    echo ""
    echo "=================================="
    echo "VALIDATION SUMMARY"
    echo "=================================="
    echo "Total Checks: $total_checks"
    echo "Passed: $passed_checks"
    echo "Failed: $((total_checks - passed_checks))"
    echo "Success Rate: $(( passed_checks * 100 / total_checks ))%"
    echo ""
    
    if [ $passed_checks -eq $total_checks ]; then
        log_success "All validation checks passed! Deployment is healthy."
        return 0
    else
        log_warning "Some validation checks failed. Please review the issues above."
        return 1
    fi
}

show_useful_commands() {
    echo ""
    echo "USEFUL COMMANDS:"
    echo "=================="
    echo ""
    echo "# Check all pods"
    echo "kubectl get pods -n $NAMESPACE"
    echo ""
    echo "# Check services and endpoints"
    echo "kubectl get svc,endpoints -n $NAMESPACE"
    echo ""
    echo "# Check ingress and certificates"
    echo "kubectl get ingress,certificates -n $NAMESPACE"
    echo ""
    echo "# Check HPA status"
    echo "kubectl get hpa -n $NAMESPACE"
    echo ""
    echo "# Check Istio configuration"
    echo "kubectl get gateway,virtualservice,destinationrule -n $NAMESPACE"
    echo ""
    echo "# View logs of a service"
    echo "kubectl logs -f deployment/api-gateway -n $NAMESPACE"
    echo ""
    echo "# Port forward for local testing"
    echo "kubectl port-forward service/api-gateway-service 8080:3000 -n $NAMESPACE"
    echo ""
    echo "# Check Istio proxy status"
    echo "istioctl proxy-status"
    echo ""
    echo "# Analyze Istio configuration"
    echo "istioctl analyze -n $NAMESPACE"
}

# Main function
main() {
    log_info "Starting Kubernetes deployment validation..."
    
    # Check if kubectl is available
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    # Check cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Generate validation report
    if generate_report; then
        show_useful_commands
        exit 0
    else
        show_useful_commands
        exit 1
    fi
}

# Run main function
main "$@"