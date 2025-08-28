#!/bin/bash

# Multi-Service Platform Startup Script
# This script provides easy ways to start different configurations of the platform

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

show_help() {
    echo "Multi-Service Platform Startup Script"
    echo ""
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  essential     Start core services only (minimal resource usage)"
    echo "  full          Start all services including monitoring"
    echo "  search        Start core services + search functionality"
    echo "  admin         Start core services + admin panel"
    echo "  monitoring    Start core services + monitoring stack"
    echo "  infra         Start infrastructure services only (databases, cache, etc.)"
    echo "  stop          Stop all services"
    echo "  restart       Restart all services"
    echo "  logs          Show logs for all services"
    echo "  status        Show status of all services"
    echo "  clean         Stop services and remove volumes (WARNING: deletes data)"
    echo "  help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 essential    # Start minimal services for development"
    echo "  $0 full         # Start everything including monitoring"
    echo "  $0 stop         # Stop all services"
    echo "  $0 clean        # Reset everything (deletes data)"
    echo ""
    echo "Service Ports:"
    echo "  API Gateway:        http://localhost:3000"
    echo "  Authentication:     http://localhost:3001"
    echo "  E-commerce:         http://localhost:3002"
    echo "  Payment:            http://localhost:3003"
    echo "  Taxi:               http://localhost:3004"
    echo "  Hotel:              http://localhost:3005"
    echo "  Advertisement:      http://localhost:3006"
    echo "  Notification:       http://localhost:3007"
    echo "  File Service:       http://localhost:3008"
    echo "  Search:             http://localhost:3009"
    echo "  Admin:              http://localhost:3010"
    echo "  Analytics:          http://localhost:3011"
    echo "  Messaging:          http://localhost:3012"
    echo ""
    echo "Infrastructure:"
    echo "  PostgreSQL:         localhost:5432"
    echo "  Redis:              localhost:6379"
    echo "  RabbitMQ:           localhost:5672 (Management: http://localhost:15672)"
    echo "  Elasticsearch:      http://localhost:9200"
    echo "  Prometheus:         http://localhost:9090"
    echo "  Grafana:            http://localhost:3100"
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker is not running. Please start Docker first."
        exit 1
    fi
}

start_essential() {
    log_info "Starting essential services (core functionality)..."
    docker-compose up -d \
        postgres redis rabbitmq \
        api-gateway authentication-service \
        ecommerce-service payment-service \
        taxi-service hotel-service \
        advertisement-service notification-service \
        file-service
    
    log_success "Essential services started successfully!"
    show_service_urls "essential"
}

start_full() {
    log_info "Starting all services including monitoring..."
    docker-compose --profile full up -d
    
    log_success "All services started successfully!"
    show_service_urls "full"
}

start_search() {
    log_info "Starting core services with search functionality..."
    docker-compose --profile search up -d
    
    log_success "Services with search started successfully!"
    show_service_urls "search"
}

start_admin() {
    log_info "Starting core services with admin panel..."
    docker-compose --profile admin up -d
    
    log_success "Services with admin panel started successfully!"
    show_service_urls "admin"
}

start_monitoring() {
    log_info "Starting core services with monitoring..."
    docker-compose --profile monitoring up -d
    
    log_success "Services with monitoring started successfully!"
    show_service_urls "monitoring"
}

start_infra() {
    log_info "Starting infrastructure services only..."
    docker-compose up -d postgres redis rabbitmq elasticsearch
    
    log_success "Infrastructure services started successfully!"
    show_infrastructure_urls
}

stop_services() {
    log_info "Stopping all services..."
    docker-compose --profile full down
    
    log_success "All services stopped successfully!"
}

restart_services() {
    log_info "Restarting all services..."
    docker-compose --profile full restart
    
    log_success "All services restarted successfully!"
}

show_logs() {
    log_info "Showing logs for all services..."
    docker-compose --profile full logs -f
}

show_status() {
    log_info "Service status:"
    docker-compose --profile full ps
}

clean_environment() {
    log_warning "This will stop all services and delete all data!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Stopping services and removing volumes..."
        docker-compose --profile full down -v
        docker system prune -f
        log_success "Environment cleaned successfully!"
    else
        log_info "Operation cancelled."
    fi
}

show_service_urls() {
    local profile=$1
    echo ""
    log_success "Services are starting up. Please wait a moment for all services to be ready."
    echo ""
    echo "🌐 Service URLs:"
    echo "  API Gateway:        http://localhost:3000"
    echo "  Authentication:     http://localhost:3001/health"
    echo "  E-commerce:         http://localhost:3002/health"
    echo "  Payment:            http://localhost:3003/health"
    echo "  Taxi:               http://localhost:3004/health"
    echo "  Hotel:              http://localhost:3005/health"
    echo "  Advertisement:      http://localhost:3006/health"
    echo "  Notification:       http://localhost:3007/health"
    echo "  File Service:       http://localhost:3008/health"
    
    if [[ "$profile" == "search" || "$profile" == "full" ]]; then
        echo "  Search:             http://localhost:3009/health"
    fi
    
    if [[ "$profile" == "admin" || "$profile" == "full" ]]; then
        echo "  Admin:              http://localhost:3010/health"
    fi
    
    if [[ "$profile" == "full" ]]; then
        echo "  Analytics:          http://localhost:3011/health"
        echo "  Messaging:          http://localhost:3012/health"
    fi
    
    echo ""
    show_infrastructure_urls
    
    if [[ "$profile" == "monitoring" || "$profile" == "full" ]]; then
        echo ""
        echo "📊 Monitoring:"
        echo "  Prometheus:         http://localhost:9090"
        echo "  Grafana:            http://localhost:3100 (admin/admin123)"
    fi
    
    echo ""
    echo "💡 Tips:"
    echo "  - Check service health: curl http://localhost:3000/health"
    echo "  - View logs: $0 logs"
    echo "  - Check status: $0 status"
    echo "  - Stop services: $0 stop"
}

show_infrastructure_urls() {
    echo ""
    echo "🗄️  Infrastructure:"
    echo "  PostgreSQL:         localhost:5432 (postgres/password)"
    echo "  Redis:              localhost:6379"
    echo "  RabbitMQ:           localhost:5672"
    echo "  RabbitMQ Management: http://localhost:15672 (admin/password)"
    echo "  Elasticsearch:      http://localhost:9200"
}

wait_for_services() {
    log_info "Waiting for services to be ready..."
    
    # Wait for core services
    local services=("3000" "3001" "3002" "3003")
    for port in "${services[@]}"; do
        while ! curl -s http://localhost:$port/health > /dev/null 2>&1; do
            echo -n "."
            sleep 2
        done
    done
    
    echo ""
    log_success "Core services are ready!"
}

# Main script logic
case "${1:-help}" in
    essential)
        check_docker
        start_essential
        ;;
    full)
        check_docker
        start_full
        ;;
    search)
        check_docker
        start_search
        ;;
    admin)
        check_docker
        start_admin
        ;;
    monitoring)
        check_docker
        start_monitoring
        ;;
    infra)
        check_docker
        start_infra
        ;;
    stop)
        check_docker
        stop_services
        ;;
    restart)
        check_docker
        restart_services
        ;;
    logs)
        check_docker
        show_logs
        ;;
    status)
        check_docker
        show_status
        ;;
    clean)
        check_docker
        clean_environment
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Unknown option: $1"
        echo ""
        show_help
        exit 1
        ;;
esac