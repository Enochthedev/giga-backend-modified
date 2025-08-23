#!/bin/bash

# Multi-Service Platform Deployment Validation Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE=${NAMESPACE:-multi-service-platform}
TIMEOUT=${TIMEOUT:-300}

echo -e "${BLUE}Multi-Service Platform Deployment Validation${NC}"
echo "Namespace: $NAMESPACE"
echo "Timeout: ${TIMEOUT}s"
echo ""

# Function to check if all pods are ready
check_pods_ready() {
    local service=$1
    echo -n "Checking $service pods... "
    
    if kubectl get deployment $service -n $NAMESPACE >/dev/null 2>&1; then
        local ready=$(kubectl get deployment $service -n $NAMESPACE -o jsonpath='{.status.readyReplicas}')
        local desired=$(kubectl get deployment $service -n $NAMESPACE -o jsonpath='{.spec.replicas}')
        
        if [ "$ready" = "$desired" ] && [ "$ready" != "" ]; then
            echo -e "${GREEN}✓ $ready/$desired ready${NC}"
            return 0
        else
            echo -e "${RED}✗ $ready/$desired ready${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠ Not deployed${NC}"
        return 1
    fi
}

# Function to check service endpoints
check_service_endpoints() {
    local service=$1
    local port=$2
    echo -n "Checking $service service endpoints... "
    
    if kubectl get service $service-service -n $NAMESPACE >/dev/null 2>&1; then
        local endpoints=$(kubectl get endpoints $service-service -n $NAMESPACE -o jsonpath='{.subsets[0].addresses[*].ip}' | wc -w)
        if [ "$endpoints" -gt 0 ]; then
            echo -e "${GREEN}✓ $endpoints endpoints${NC}"
            return 0
        else
            echo -e "${RED}✗ No endpoints${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠ Service not found${NC}"
        return 1
    fi
}

# Function to check health endpoints
check_health_endpoint() {
    local service=$1
    local port=$2
    echo -n "Checking $service health endpoint... "
    
    # Port forward and check health
    kubectl port-forward svc/$service-service $port:$port -n $NAMESPACE >/dev/null 2>&1 &
    local pf_pid=$!
    sleep 2
    
    if curl -s -f http://localhost:$port/health >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Healthy${NC}"
        kill $pf_pid 2>/dev/null || true
        return 0
    else
        echo -e "${RED}✗ Unhealthy${NC}"
        kill $pf_pid 2>/dev/null || true
        return 1
    fi
}

# Function to check HPA status
check_hpa() {
    local service=$1
    echo -n "Checking $service HPA... "
    
    if kubectl get hpa $service-hpa -n $NAMESPACE >/dev/null 2>&1; then
        local current=$(kubectl get hpa $service-hpa -n $NAMESPACE -o jsonpath='{.status.currentReplicas}')
        local desired=$(kubectl get hpa $service-hpa -n $NAMESPACE -o jsonpath='{.status.desiredReplicas}')
        echo -e "${GREEN}✓ $current/$desired replicas${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠ HPA not configured${NC}"
        return 1
    fi
}

# Function to check ingress
check_ingress() {
    echo -n "Checking ingress configuration... "
    
    if kubectl get ingress -n $NAMESPACE >/dev/null 2>&1; then
        local ingress_count=$(kubectl get ingress -n $NAMESPACE --no-headers | wc -l)
        if [ "$ingress_count" -gt 0 ]; then
            echo -e "${GREEN}✓ $ingress_count ingress rules${NC}"
            return 0
        else
            echo -e "${RED}✗ No ingress rules${NC}"
            return 1
        fi
    else
        echo -e "${RED}✗ Ingress not found${NC}"
        return 1
    fi
}

# Function to check certificates
check_certificates() {
    echo -n "Checking SSL certificates... "
    
    if kubectl get certificate -n $NAMESPACE >/dev/null 2>&1; then
        local ready_certs=$(kubectl get certificate -n $NAMESPACE -o jsonpath='{.items[?(@.status.conditions[0].type=="Ready")].metadata.name}' | wc -w)
        local total_certs=$(kubectl get certificate -n $NAMESPACE --no-headers | wc -l)
        
        if [ "$ready_certs" = "$total_certs" ] && [ "$total_certs" -gt 0 ]; then
            echo -e "${GREEN}✓ $ready_certs/$total_certs certificates ready${NC}"
            return 0
        else
            echo -e "${RED}✗ $ready_certs/$total_certs certificates ready${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠ No certificates configured${NC}"
        return 1
    fi
}

# Function to check database connectivity
check_database_connectivity() {
    echo -n "Checking database connectivity... "
    
    # Check if PostgreSQL is accessible
    if kubectl exec -n $NAMESPACE deployment/postgres -- pg_isready -U platform_user >/dev/null 2>&1; then
        echo -e "${GREEN}✓ PostgreSQL accessible${NC}"
    else
        echo -e "${RED}✗ PostgreSQL not accessible${NC}"
        return 1
    fi
    
    # Check Redis
    if kubectl exec -n $NAMESPACE deployment/redis -- redis-cli ping >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Redis accessible${NC}"
    else
        echo -e "${RED}✗ Redis not accessible${NC}"
        return 1
    fi
    
    return 0
}

# Function to check Istio configuration
check_istio() {
    echo -n "Checking Istio configuration... "
    
    if kubectl get namespace istio-system >/dev/null 2>&1; then
        if kubectl get gateway -n $NAMESPACE >/dev/null 2>&1; then
            local gateways=$(kubectl get gateway -n $NAMESPACE --no-headers | wc -l)
            echo -e "${GREEN}✓ Istio configured with $gateways gateways${NC}"
            return 0
        else
            echo -e "${YELLOW}⚠ Istio installed but no gateways configured${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠ Istio not installed${NC}"
        return 1
    fi
}

# Main validation
echo -e "${BLUE}=== Pod Status ===${NC}"
services=("api-gateway" "authentication-service" "ecommerce-service" "payment-service" "taxi-service" "hotel-service" "advertisement-service" "notification-service" "file-service" "search-service")
pod_failures=0

for service in "${services[@]}"; do
    if ! check_pods_ready "$service"; then
        ((pod_failures++))
    fi
done

echo ""
echo -e "${BLUE}=== Service Endpoints ===${NC}"
endpoint_failures=0

for service in "${services[@]}"; do
    if ! check_service_endpoints "$service"; then
        ((endpoint_failures++))
    fi
done

echo ""
echo -e "${BLUE}=== Infrastructure Services ===${NC}"
infra_failures=0

# Check infrastructure services
infra_services=("postgres" "redis" "rabbitmq" "elasticsearch")
for service in "${infra_services[@]}"; do
    if ! check_pods_ready "$service"; then
        ((infra_failures++))
    fi
done

echo ""
echo -e "${BLUE}=== HPA Status ===${NC}"
hpa_failures=0

for service in "${services[@]}"; do
    if ! check_hpa "$service"; then
        ((hpa_failures++))
    fi
done

echo ""
echo -e "${BLUE}=== Network Configuration ===${NC}"
network_failures=0

if ! check_ingress; then
    ((network_failures++))
fi

if ! check_certificates; then
    ((network_failures++))
fi

echo ""
echo -e "${BLUE}=== Database Connectivity ===${NC}"
db_failures=0

if ! check_database_connectivity; then
    ((db_failures++))
fi

echo ""
echo -e "${BLUE}=== Service Mesh ===${NC}"
istio_failures=0

if ! check_istio; then
    ((istio_failures++))
fi

# Summary
echo ""
echo -e "${BLUE}=== Validation Summary ===${NC}"
total_failures=$((pod_failures + endpoint_failures + infra_failures + hpa_failures + network_failures + db_failures + istio_failures))

echo "Pod Status: $((${#services[@]} - pod_failures))/${#services[@]} services ready"
echo "Service Endpoints: $((${#services[@]} - endpoint_failures))/${#services[@]} services have endpoints"
echo "Infrastructure: $((${#infra_services[@]} - infra_failures))/${#infra_services[@]} infrastructure services ready"
echo "HPA Configuration: $((${#services[@]} - hpa_failures))/${#services[@]} services have HPA"
echo "Network Configuration: $((2 - network_failures))/2 network components ready"
echo "Database Connectivity: $((2 - db_failures))/2 databases accessible"
echo "Service Mesh: $((1 - istio_failures))/1 service mesh components ready"

echo ""
if [ $total_failures -eq 0 ]; then
    echo -e "${GREEN}✅ All validation checks passed!${NC}"
    echo -e "${GREEN}Platform is ready for use.${NC}"
    exit 0
else
    echo -e "${RED}❌ $total_failures validation checks failed.${NC}"
    echo -e "${RED}Please review the issues above before using the platform.${NC}"
    
    echo ""
    echo -e "${YELLOW}Troubleshooting commands:${NC}"
    echo "kubectl get pods -n $NAMESPACE"
    echo "kubectl get svc -n $NAMESPACE"
    echo "kubectl get ingress -n $NAMESPACE"
    echo "kubectl describe pod <pod-name> -n $NAMESPACE"
    echo "kubectl logs <pod-name> -n $NAMESPACE"
    
    exit 1
fi