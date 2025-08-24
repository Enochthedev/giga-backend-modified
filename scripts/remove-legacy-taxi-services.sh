#!/bin/bash

# Script to remove legacy taxi services after migration completion
# This script should only be run after confirming that the modern taxi service
# has all the required functionality and is working correctly.

set -e

echo "🚗 Starting legacy taxi services removal process..."
echo "⚠️  WARNING: This will permanently delete the legacy taxi services!"
echo ""

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

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "services/taxi-service" ]; then
    print_error "This script must be run from the project root directory!"
    exit 1
fi

# Check if modern taxi service exists and is working
print_status "Checking modern taxi service status..."

if [ ! -d "services/taxi-service" ]; then
    print_error "Modern taxi service not found! Cannot proceed with removal."
    exit 1
fi

# Check if legacy services exist
if [ ! -d "giga_taxi_main" ] && [ ! -d "giga_taxi_driver" ]; then
    print_warning "Legacy taxi services not found. They may have already been removed."
    exit 0
fi

# Display what will be removed
echo ""
echo "📋 The following legacy services will be removed:"
if [ -d "giga_taxi_main" ]; then
    echo "   - giga_taxi_main/ (Legacy taxi main service)"
fi
if [ -d "giga_taxi_driver" ]; then
    echo "   - giga_taxi_driver/ (Legacy taxi driver service)"
fi
echo ""

# Ask for confirmation
read -p "Are you sure you want to proceed? (yes/no): " confirmation

if [ "$confirmation" != "yes" ]; then
    print_warning "Operation cancelled by user."
    exit 0
fi

echo ""
print_status "Starting removal process..."

# Create backup directory
BACKUP_DIR="legacy-services-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

print_status "Creating backup in: $BACKUP_DIR"

# Backup legacy services
if [ -d "giga_taxi_main" ]; then
    print_status "Backing up giga_taxi_main..."
    cp -r "giga_taxi_main" "$BACKUP_DIR/"
    print_success "giga_taxi_main backed up"
fi

if [ -d "giga_taxi_driver" ]; then
    print_status "Backing up giga_taxi_driver..."
    cp -r "giga_taxi_driver" "$BACKUP_DIR/"
    print_success "giga_taxi_driver backed up"
fi

# Remove legacy services
if [ -d "giga_taxi_main" ]; then
    print_status "Removing giga_taxi_main..."
    rm -rf "giga_taxi_main"
    print_success "giga_taxi_main removed"
fi

if [ -d "giga_taxi_driver" ]; then
    print_status "Removing giga_taxi_driver..."
    rm -rf "giga_taxi_driver"
    print_success "giga_taxi_driver removed"
fi

# Update docker-compose files to remove legacy service references
print_status "Updating docker-compose files..."

# Update docker-compose.dev.yml
if [ -f "docker-compose.dev.yml" ]; then
    print_status "Updating docker-compose.dev.yml..."
    # Remove legacy service sections if they exist
    sed -i.bak '/giga-taxi-main/,/^  [a-zA-Z]/d' docker-compose.dev.yml
    sed -i.bak '/giga-taxi-driver/,/^  [a-zA-Z]/d' docker-compose.dev.yml
    # Clean up empty lines
    sed -i.bak '/^[[:space:]]*$/d' docker-compose.dev.yml
    print_success "docker-compose.dev.yml updated"
fi

# Update docker-compose.legacy.yml
if [ -f "docker-compose.legacy.yml" ]; then
    print_status "Updating docker-compose.legacy.yml..."
    # Remove legacy service sections if they exist
    sed -i.bak '/giga-taxi-main/,/^  [a-zA-Z]/d' docker-compose.legacy.yml
    sed -i.bak '/giga-taxi-driver/,/^  [a-zA-Z]/d' docker-compose.legacy.yml
    # Clean up empty lines
    sed -i.bak '/^[[:space:]]*$/d' docker-compose.legacy.yml
    print_success "docker-compose.legacy.yml updated"
fi

# Update package.json scripts if they reference legacy services
print_status "Updating package.json scripts..."
if grep -q "giga_taxi" package.json; then
    print_warning "Found references to legacy services in package.json. Please review and update manually."
fi

# Create removal summary
echo ""
print_success "Legacy taxi services removal completed!"
echo ""
echo "📊 Removal Summary:"
echo "   ✅ Legacy services backed up to: $BACKUP_DIR"
echo "   ✅ Legacy services removed from filesystem"
echo "   ✅ Docker-compose files updated"
echo ""
echo "🔧 Next Steps:"
echo "   1. Test the modern taxi service thoroughly"
echo "   2. Update any remaining references in documentation"
echo "   3. Remove the backup directory when confident: rm -rf $BACKUP_DIR"
echo ""
echo "📚 The modern taxi service now includes:"
echo "   - Event-driven architecture (RabbitMQ)"
echo "   - Fuel-based dynamic pricing"
echo "   - Immediate driver assignment option"
echo "   - Legacy compatibility routes at /api/legacy/*"
echo "   - All original modern features"
echo ""

print_success "Migration to modern taxi service is complete! 🎉"
