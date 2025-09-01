#!/bin/bash

# Dockerfile Validation Script
# Checks that all Dockerfiles have correct paths for root context builds

echo "🐳 Validating Dockerfiles for Root Context Builds"
echo "================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Function to check Dockerfile paths
check_dockerfile() {
    local service_path=$1
    local service_name=$(basename "$service_path")
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    echo -n "Checking $service_name Dockerfile... "
    
    if [ ! -f "$service_path/Dockerfile" ]; then
        echo -e "${YELLOW}⚠️  No Dockerfile${NC}"
        return 0
    fi
    
    # Check if COPY commands use correct service paths
    local incorrect_copies=$(grep -n "COPY [^/].*package" "$service_path/Dockerfile" | grep -v "services/$service_name" | grep -v "packages/common" | grep -v "tsconfig.json")
    
    if [ -n "$incorrect_copies" ]; then
        echo -e "${RED}❌ Incorrect paths${NC}"
        echo "  Issues found:"
        echo "$incorrect_copies" | sed 's/^/    /'
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    else
        echo -e "${GREEN}✅ Valid${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    fi
}

echo "Checking service Dockerfiles:"
echo "-----------------------------"

# Check all services
for service_dir in services/*/; do
    if [ -d "$service_dir" ]; then
        check_dockerfile "$service_dir"
    fi
done

echo ""
echo "Summary:"
echo "--------"
echo "Total Checks: $TOTAL_CHECKS"
echo -e "Passed: ${GREEN}$PASSED_CHECKS${NC}"
echo -e "Failed: ${RED}$FAILED_CHECKS${NC}"

if [ $FAILED_CHECKS -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All Dockerfiles are correctly configured for root context builds!${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}⚠️  Some Dockerfiles need fixing for root context builds.${NC}"
    echo "Make sure COPY commands use 'services/[service-name]/' prefix for service files."
    exit 1
fi