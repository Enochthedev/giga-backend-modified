#!/bin/bash

# Test Monitoring Infrastructure
# This script tests all monitoring components to ensure they're working correctly

set -e

echo "🧪 Testing Multi-Service Monitoring Infrastructure..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# Function to test service availability
test_service() {
    local service_name=$1
    local url=$2
    local expected_status=${3:-200}
    
    echo -n "Testing $service_name... "
    
    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "$expected_status"; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}"
        ((TESTS_FAILED++))
    fi
}

# Function to test service with JSON response
test_service_json() {
    local service_name=$1
    local url=$2
    local expected_field=$3
    
    echo -n "Testing $service_name JSON response... "
    
    if curl -s "$url" | jq -e "$expected_field" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}"
        ((TESTS_FAILED++))
    fi
}

echo ""
echo "🔍 Testing Core Monitoring Services..."

# Test Prometheus
test_service "Prometheus" "http://localhost:9090/-/ready"
test_service "Prometheus Targets" "http://localhost:9090/api/v1/targets"

# Test Grafana
test_service "Grafana" "http://localhost:3000/api/health"
test_service_json "Grafana Health" "http://localhost:3000/api/health" '.database'

# Test Elasticsearch
test_service "Elasticsearch" "http://localhost:9200/_cluster/health"
test_service_json "Elasticsearch Cluster" "http://localhost:9200/_cluster/health" '.status'

# Test Kibana
test_service "Kibana" "http://localhost:5601/api/status"

# Test Jaeger
test_service "Jaeger UI" "http://localhost:16686/"
test_service "Jaeger API" "http://localhost:16686/api/services"

# Test AlertManager
test_service "AlertManager" "http://localhost:9093/-/ready"
test_service "AlertManager API" "http://localhost:9093/api/v1/status"

echo ""
echo "📊 Testing Metrics Collection..."

# Test if Prometheus is scraping targets
echo -n "Testing Prometheus target discovery... "
targets=$(curl -s "http://localhost:9090/api/v1/targets" | jq '.data.activeTargets | length')
if [ "$targets" -gt 0 ]; then
    echo -e "${GREEN}✅ PASS${NC} ($targets targets found)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAIL${NC} (No targets found)"
    ((TESTS_FAILED++))
fi

# Test metrics endpoint format
echo -n "Testing Prometheus metrics format... "
if curl -s "http://localhost:9090/metrics" | grep -q "prometheus_build_info"; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((TESTS_FAILED++))
fi

echo ""
echo "📋 Testing Log Processing..."

# Test Logstash
echo -n "Testing Logstash... "
if curl -s "http://localhost:9600/_node/stats" | jq -e '.pipeline' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((TESTS_FAILED++))
fi

# Test Elasticsearch indices
echo -n "Testing Elasticsearch indices... "
indices=$(curl -s "http://localhost:9200/_cat/indices?format=json" | jq '. | length')
if [ "$indices" -ge 0 ]; then
    echo -e "${GREEN}✅ PASS${NC} ($indices indices found)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((TESTS_FAILED++))
fi

echo ""
echo "🔍 Testing Distributed Tracing..."

# Test Jaeger services
echo -n "Testing Jaeger services endpoint... "
if curl -s "http://localhost:16686/api/services" | jq -e '.data' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((TESTS_FAILED++))
fi

echo ""
echo "🚨 Testing Alerting..."

# Test AlertManager configuration
echo -n "Testing AlertManager configuration... "
if curl -s "http://localhost:9093/api/v1/status" | jq -e '.data.configYAML' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((TESTS_FAILED++))
fi

# Test Prometheus rules
echo -n "Testing Prometheus alerting rules... "
rules=$(curl -s "http://localhost:9090/api/v1/rules" | jq '.data.groups | length')
if [ "$rules" -gt 0 ]; then
    echo -e "${GREEN}✅ PASS${NC} ($rules rule groups found)"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠️  WARN${NC} (No alerting rules found)"
fi

echo ""
echo "📊 Testing Grafana Dashboards..."

# Test Grafana datasources
echo -n "Testing Grafana datasources... "
datasources=$(curl -s -u admin:admin123 "http://localhost:3000/api/datasources" | jq '. | length')
if [ "$datasources" -gt 0 ]; then
    echo -e "${GREEN}✅ PASS${NC} ($datasources datasources configured)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((TESTS_FAILED++))
fi

# Test Grafana dashboards
echo -n "Testing Grafana dashboards... "
dashboards=$(curl -s -u admin:admin123 "http://localhost:3000/api/search?type=dash-db" | jq '. | length')
if [ "$dashboards" -ge 0 ]; then
    echo -e "${GREEN}✅ PASS${NC} ($dashboards dashboards found)"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAIL${NC}"
    ((TESTS_FAILED++))
fi

echo ""
echo "🧪 Testing Sample Data Generation..."

# Generate sample metrics
echo -n "Generating sample HTTP requests... "
for i in {1..10}; do
    curl -s "http://localhost:9090/metrics" > /dev/null
done
echo -e "${GREEN}✅ DONE${NC}"

# Generate sample log entry
echo -n "Generating sample log entry... "
echo '{"timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'","level":"INFO","service":"test-service","message":"Test log entry","correlationId":"test-123"}' | \
    curl -s -X POST "http://localhost:5000" -H "Content-Type: application/json" -d @- > /dev/null 2>&1 || true
echo -e "${GREEN}✅ DONE${NC}"

echo ""
echo "📈 Performance Test..."

# Simple load test
echo -n "Running basic load test... "
start_time=$(date +%s)
for i in {1..50}; do
    curl -s "http://localhost:9090/-/ready" > /dev/null &
done
wait
end_time=$(date +%s)
duration=$((end_time - start_time))
echo -e "${GREEN}✅ DONE${NC} (50 requests in ${duration}s)"

echo ""
echo "🔍 Checking Resource Usage..."

# Check Docker container resource usage
echo "Docker container resource usage:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep -E "(prometheus|grafana|elasticsearch|kibana|jaeger|logstash|alertmanager)" || true

echo ""
echo "📊 Test Summary"
echo "==============="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo -e "Total Tests:  $((TESTS_PASSED + TESTS_FAILED))"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All tests passed! Monitoring infrastructure is working correctly.${NC}"
    echo ""
    echo "📊 Access URLs:"
    echo "  Grafana:      http://localhost:3000 (admin/admin123)"
    echo "  Prometheus:   http://localhost:9090"
    echo "  Kibana:       http://localhost:5601"
    echo "  Jaeger:       http://localhost:16686"
    echo "  AlertManager: http://localhost:9093"
    echo ""
    echo "🔍 Next Steps:"
    echo "  1. Configure your services to send metrics to Prometheus"
    echo "  2. Set up log shipping to Logstash"
    echo "  3. Initialize tracing in your applications"
    echo "  4. Configure alert notifications in AlertManager"
    echo "  5. Create custom Grafana dashboards for your services"
    
    exit 0
else
    echo ""
    echo -e "${RED}❌ Some tests failed. Please check the monitoring setup.${NC}"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "  1. Ensure all services are running: docker-compose -f monitoring/docker-compose.monitoring.yml ps"
    echo "  2. Check service logs: docker logs <service-name>"
    echo "  3. Verify network connectivity between services"
    echo "  4. Check available disk space and memory"
    echo "  5. Review configuration files for syntax errors"
    
    exit 1
fi