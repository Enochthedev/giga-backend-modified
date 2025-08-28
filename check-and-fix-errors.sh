#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a directory has package.json
has_package_json() {
    [ -f "$1/package.json" ]
}

# Function to run command and capture output
run_check() {
    local service_path=$1
    local check_type=$2
    local command=$3
    
    print_status "Running $check_type check in $service_path"
    
    cd "$service_path" || return 1
    
    # Create log file for this check
    local log_file="../../../logs/${service_path//\//_}_${check_type}.log"
    mkdir -p ../../../logs
    
    # Run the command and capture both stdout and stderr
    if eval "$command" > "$log_file" 2>&1; then
        print_success "$check_type check passed for $service_path"
        return 0
    else
        print_error "$check_type check failed for $service_path"
        echo "Error details saved to: $log_file"
        echo "First 20 lines of error:"
        head -20 "$log_file"
        return 1
    fi
}

# Function to check TypeScript compilation
check_typescript() {
    local service_path=$1
    
    if [ -f "$service_path/tsconfig.json" ]; then
        run_check "$service_path" "TypeScript" "npx tsc --noEmit"
    else
        print_warning "No tsconfig.json found in $service_path, skipping TypeScript check"
    fi
}

# Function to check ESLint
check_eslint() {
    local service_path=$1
    
    if [ -f "$service_path/.eslintrc.js" ] || [ -f "$service_path/.eslintrc.json" ] || [ -f "$service_path/eslint.config.js" ]; then
        run_check "$service_path" "ESLint" "npx eslint src/ --ext .ts,.js"
    else
        print_warning "No ESLint config found in $service_path, skipping ESLint check"
    fi
}

# Function to check build
check_build() {
    local service_path=$1
    
    if has_package_json "$service_path"; then
        # Check if build script exists
        if pnpm run | grep -q "build"; then
            run_check "$service_path" "Build" "pnpm run build"
        else
            print_warning "No build script found in $service_path, skipping build check"
        fi
    fi
}

# Function to check tests
check_tests() {
    local service_path=$1
    
    if has_package_json "$service_path"; then
        # Check if test script exists
        if pnpm run | grep -q "test"; then
            run_check "$service_path" "Tests" "pnpm test"
        else
            print_warning "No test script found in $service_path, skipping test check"
        fi
    fi
}

# Main function to check a service/package
check_service() {
    local service_path=$1
    local service_name=$(basename "$service_path")
    
    print_status "========================================="
    print_status "Checking $service_name"
    print_status "========================================="
    
    if ! has_package_json "$service_path"; then
        print_warning "$service_path does not have package.json, skipping"
        return 0
    fi
    
    # Store original directory
    local original_dir=$(pwd)
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "$service_path/node_modules" ]; then
        print_status "Installing dependencies for $service_name"
        cd "$service_path" || return 1
        pnpm install
        cd "$original_dir" || return 1
    fi
    
    local has_errors=0
    
    # Run checks
    check_typescript "$service_path" || has_errors=1
    check_eslint "$service_path" || has_errors=1
    check_build "$service_path" || has_errors=1
    
    # Return to original directory
    cd "$original_dir" || return 1
    
    if [ $has_errors -eq 0 ]; then
        print_success "All checks passed for $service_name"
    else
        print_error "Some checks failed for $service_name"
    fi
    
    return $has_errors
}

# Main execution
main() {
    print_status "Starting comprehensive error check for all services and packages"
    print_status "This will check TypeScript compilation, ESLint, and build processes"
    
    # Create logs directory
    mkdir -p logs
    
    # Clear previous logs
    rm -f logs/*.log
    
    local total_errors=0
    local services_with_errors=()
    
    # Check packages first (common dependencies)
    print_status "Checking packages..."
    for package_dir in packages/*/; do
        if [ -d "$package_dir" ]; then
            if ! check_service "$package_dir"; then
                total_errors=$((total_errors + 1))
                services_with_errors+=("$package_dir")
            fi
        fi
    done
    
    # Check services
    print_status "Checking services..."
    for service_dir in services/*/; do
        if [ -d "$service_dir" ]; then
            if ! check_service "$service_dir"; then
                total_errors=$((total_errors + 1))
                services_with_errors+=("$service_dir")
            fi
        fi
    done
    
    # Summary
    print_status "========================================="
    print_status "SUMMARY"
    print_status "========================================="
    
    if [ $total_errors -eq 0 ]; then
        print_success "All services and packages passed all checks!"
    else
        print_error "Found errors in $total_errors service(s)/package(s):"
        for service in "${services_with_errors[@]}"; do
            print_error "  - $service"
        done
        
        print_status ""
        print_status "Check the log files in ./logs/ directory for detailed error information"
        print_status "Run this script with --fix flag to attempt automatic fixes"
    fi
    
    return $total_errors
}

# Check if --fix flag is provided
if [ "$1" = "--fix" ]; then
    print_status "Fix mode enabled - will attempt to fix common issues"
    # TODO: Implement fix logic
    print_warning "Fix mode not yet implemented"
fi

# Run main function
main
exit $?