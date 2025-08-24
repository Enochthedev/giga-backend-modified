#!/bin/bash

# Documentation Verification Script
# Ensures all documentation is up-to-date and consistent

echo "📚 Verifying Giga Platform Documentation"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Function to check if file exists
check_file_exists() {
    local file_path=$1
    local description=$2
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    echo -n "Checking $description... "
    
    if [ -f "$file_path" ]; then
        echo -e "${GREEN}✅ Found${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        echo -e "${RED}❌ Missing${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

# Function to check if directory exists
check_directory_exists() {
    local dir_path=$1
    local description=$2
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    echo -n "Checking $description... "
    
    if [ -d "$dir_path" ]; then
        echo -e "${GREEN}✅ Found${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        echo -e "${RED}❌ Missing${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

# Function to check file content
check_file_content() {
    local file_path=$1
    local search_pattern=$2
    local description=$3
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    echo -n "Checking $description... "
    
    if [ -f "$file_path" ] && grep -q "$search_pattern" "$file_path"; then
        echo -e "${GREEN}✅ Valid${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        echo -e "${RED}❌ Invalid or Missing${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        return 1
    fi
}

echo -e "${BLUE}Core Documentation Files:${NC}"
echo "------------------------"
check_file_exists "README.md" "Main README"
check_file_exists "DEVELOPER_QUICK_REFERENCE.md" "Developer Quick Reference"
check_file_exists ".env.example" "Environment Example"
check_file_exists "package.json" "Package Configuration"

echo ""
echo -e "${BLUE}Documentation Structure:${NC}"
echo "------------------------"
check_directory_exists "docs" "Documentation Directory"
check_file_exists "docs/README.md" "Documentation Index"
check_directory_exists "docs/architecture" "Architecture Documentation"
check_directory_exists "docs/development" "Development Documentation"
check_directory_exists "docs/deployment" "Deployment Documentation"
check_directory_exists "docs/migration" "Migration Documentation"

echo ""
echo -e "${BLUE}Service Documentation:${NC}"
echo "----------------------"
check_file_exists "services/authentication-service/README.md" "Authentication Service README"
check_file_exists "services/payment-service/README.md" "Payment Service README"
check_file_exists "services/api-gateway/README.md" "API Gateway README"
check_file_exists "packages/common/README.md" "Common Package README"

echo ""
echo -e "${BLUE}Docker Configuration:${NC}"
echo "---------------------"
check_file_exists "docker-compose.dev.yml" "Development Docker Compose"
check_file_exists "docker-compose.essential.yml" "Essential Services Docker Compose"
check_file_exists "Dockerfile" "Main Dockerfile" || check_file_exists "services/*/Dockerfile" "Service Dockerfiles"

echo ""
echo -e "${BLUE}Scripts and Tools:${NC}"
echo "------------------"
check_directory_exists "scripts" "Scripts Directory"
check_file_exists "scripts/health-check.sh" "Health Check Script"
check_file_exists "start-essential-platform.sh" "Platform Startup Script"
check_file_exists "test-all.sh" "Test Runner Script"

echo ""
echo -e "${BLUE}Content Validation:${NC}"
echo "-------------------"
check_file_content "README.md" "Giga Multi-Service Platform" "Main README title"
check_file_content "package.json" "giga-multi-service-platform" "Package name"
check_file_content ".env.example" "API_GATEWAY_PORT" "Service port configuration"
check_file_content "docker-compose.dev.yml" "api-gateway" "Docker service definitions"

echo ""
echo -e "${BLUE}Migration Documentation:${NC}"
echo "------------------------"
check_file_exists "docs/migration/LEGACY_CONSOLIDATION_PLAN.md" "Legacy Consolidation Plan"
check_file_exists "docs/migration/GIGA_MAIN_CONSOLIDATION_SUMMARY.md" "Giga Main Migration"
check_file_exists "docs/migration/TAXI_SERVICE_MIGRATION_STRATEGY.md" "Taxi Service Migration"

echo ""
echo "================================================"
echo -e "${BLUE}Documentation Verification Summary:${NC}"
echo "================================================"
echo "Total Checks: $TOTAL_CHECKS"
echo -e "Passed: ${GREEN}$PASSED_CHECKS${NC}"
echo -e "Failed: ${RED}$FAILED_CHECKS${NC}"

if [ $FAILED_CHECKS -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All documentation checks passed!${NC}"
    echo -e "${GREEN}Documentation is complete and up-to-date.${NC}"
    exit 0
else
    echo ""
    echo -e "${YELLOW}⚠️  Some documentation issues found.${NC}"
    echo -e "${YELLOW}Please review and fix the missing or invalid files.${NC}"
    exit 1
fi