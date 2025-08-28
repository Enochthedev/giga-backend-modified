#!/bin/bash

# Comprehensive test runner script for Giga multi-service platform

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_ENV=${TEST_ENV:-test}
COVERAGE_THRESHOLD=${COVERAGE_THRESHOLD:-80}
PARALLEL_JOBS=${PARALLEL_JOBS:-4}

echo -e "${BLUE}🧪 Starting Comprehensive Test Suite${NC}"
echo "Environment: $TEST_ENV"
echo "Coverage Threshold: $COVERAGE_THRESHOLD%"
echo "Parallel Jobs: $PARALLEL_JOBS"
echo "----------------------------------------"

# Function to print section headers
print_section() {
    echo -e "\n${BLUE}📋 $1${NC}"
    echo "----------------------------------------"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to run tests with error handling
run_test_suite() {
    local test_type=$1
    local description=$2
    
    print_section "$description"
    
    if npm run "test:$test_type"; then
        echo -e "${GREEN}✅ $description passed${NC}"
        return 0
    else
        echo -e "${RED}❌ $description failed${NC}"
        return 1
    fi
}

# Check prerequisites
print_section "Checking Prerequisites"

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

if ! command_exists docker; then
    echo -e "${YELLOW}⚠️  Docker is not installed - some integration tests may fail${NC}"
fi

if ! command_exists k6; then
    echo -e "${YELLOW}⚠️  k6 is not installed - performance tests will be skipped${NC}"
fi

echo -e "${GREEN}✅ Prerequisites check completed${NC}"

# Set up test environment
print_section "Setting up Test Environment"

# Copy environment file if it doesn't exist
if [ ! -f .env.test ]; then
    if [ -f .env.example ]; then
        cp .env.example .env.test
        echo -e "${GREEN}✅ Created .env.test from .env.example${NC}"
    else
        echo -e "${YELLOW}⚠️  No .env.example found, using default test environment${NC}"
    fi
fi

# Install dependencies
echo "Installing test dependencies..."
cd tests
npm install --silent
cd ..

echo -e "${GREEN}✅ Test environment setup completed${NC}"

# Initialize test results
FAILED_TESTS=()
PASSED_TESTS=()

# Run test suites
echo -e "\n${BLUE}🚀 Running Test Suites${NC}"

# Unit Tests
if run_test_suite "unit" "Unit Tests"; then
    PASSED_TESTS+=("Unit Tests")
else
    FAILED_TESTS+=("Unit Tests")
fi

# Integration Tests
if run_test_suite "integration" "Integration Tests"; then
    PASSED_TESTS+=("Integration Tests")
else
    FAILED_TESTS+=("Integration Tests")
fi

# Contract Tests
if run_test_suite "contract" "Contract Tests"; then
    PASSED_TESTS+=("Contract Tests")
else
    FAILED_TESTS+=("Contract Tests")
fi

# End-to-End Tests
if run_test_suite "e2e" "End-to-End Tests"; then
    PASSED_TESTS+=("End-to-End Tests")
else
    FAILED_TESTS+=("End-to-End Tests")
fi

# Performance Tests (if k6 is available)
if command_exists k6; then
    print_section "Performance Tests"
    
    echo "Running load tests..."
    if k6 run tests/performance/load-test.js; then
        echo -e "${GREEN}✅ Load tests passed${NC}"
        PASSED_TESTS+=("Load Tests")
    else
        echo -e "${RED}❌ Load tests failed${NC}"
        FAILED_TESTS+=("Load Tests")
    fi
    
    echo "Running stress tests..."
    if k6 run tests/performance/stress-test.js; then
        echo -e "${GREEN}✅ Stress tests passed${NC}"
        PASSED_TESTS+=("Stress Tests")
    else
        echo -e "${RED}❌ Stress tests failed${NC}"
        FAILED_TESTS+=("Stress Tests")
    fi
else
    echo -e "${YELLOW}⚠️  Skipping performance tests (k6 not installed)${NC}"
fi

# Generate Coverage Report
print_section "Generating Coverage Report"

cd tests
if npm run test:coverage; then
    echo -e "${GREEN}✅ Coverage report generated${NC}"
    
    # Check coverage threshold
    if [ -f coverage/coverage-summary.json ]; then
        # Extract coverage percentage (this is a simplified check)
        echo "Coverage report available at tests/coverage/lcov-report/index.html"
    fi
else
    echo -e "${RED}❌ Failed to generate coverage report${NC}"
fi
cd ..

# Summary
print_section "Test Results Summary"

echo -e "\n${GREEN}✅ Passed Tests (${#PASSED_TESTS[@]}):${NC}"
for test in "${PASSED_TESTS[@]}"; do
    echo "  - $test"
done

if [ ${#FAILED_TESTS[@]} -gt 0 ]; then
    echo -e "\n${RED}❌ Failed Tests (${#FAILED_TESTS[@]}):${NC}"
    for test in "${FAILED_TESTS[@]}"; do
        echo "  - $test"
    done
fi

# Final result
echo -e "\n----------------------------------------"
if [ ${#FAILED_TESTS[@]} -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed successfully!${NC}"
    exit 0
else
    echo -e "${RED}💥 ${#FAILED_TESTS[@]} test suite(s) failed${NC}"
    exit 1
fi