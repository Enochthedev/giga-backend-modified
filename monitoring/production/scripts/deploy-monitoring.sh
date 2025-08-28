#!/bin/bash

# Production Monitoring Deployment Script
# This script deploys the complete monitoring stack for production

set -e

# Configuration
MONITORING_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENVIRONMENT="production"
NAMESPACE="monitoring"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        error "Docker is not running. Please start Docker and try again."
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose >/dev/null 2>&1; then
        error "Docker Compose is not installed. Please install it and try again."
    fi
    
    # Check if kubectl is available (for Kubernetes deployment)
    if command -v kubectl >/dev/null 2>&1; then
        log "kubectl found - Kubernetes deployment available"
    else
        warn "kubectl not found - only Docker deployment available"
    fi
    
    log "Prerequisites check completed"
}

# Create monitoring network
create_network() {
    log "Creating monitoring network..."
    
    if ! docker network ls | grep -q monitoring; then
        docker network create monitoring
        log "Monitoring network created"
    else
        log "Monitoring network already exists"
    fi
}

# Deploy with Docker Compose
deploy_docker() {
    log "Deploying monitoring stack with Docker Compose..."
    
    cd "$MONITORING_DIR"
    
    # Create necessary directories
    mkdir -p data/{prometheus,grafana,alertmanager,loki}
    
    # Set proper permissions
    sudo chown -R 472:472 data/grafana  # Grafana user
    sudo chown -R 65534:65534 data/prometheus  # Nobody user
    sudo chown -R 65534:65534 data/alertmanager  # Nobody user
    
    # Deploy the stack
    docker-compose -f docker-compose.production.yml up -d
    
    log "Monitoring stack deployed successfully"
}

# Deploy with Kubernetes
deploy_kubernetes() {
    log "Deploying monitoring stack with Kubernetes..."
    
    # Create namespace
    kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
    
    # Deploy Prometheus
    kubectl apply -f k8s/prometheus/ -n $NAMESPACE
    
    # Deploy Grafana
    kubectl apply -f k8s/grafana/ -n $NAMESPACE
    
    # Deploy Alertmanager
    kubectl apply -f k8s/alertmanager/ -n $NAMESPACE
    
    # Deploy exporters
    kubectl apply -f k8s/exporters/ -n $NAMESPACE
    
    log "Kubernetes monitoring stack deployed successfully"
}

# Configure Grafana datasources and dashboards
configure_grafana() {
    log "Configuring Grafana..."
    
    # Wait for Grafana to be ready
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:3000/api/health >/dev/null 2>&1; then
            log "Grafana is ready"
            break
        fi
        
        log "Waiting for Grafana to be ready... (attempt $attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        error "Grafana failed to start within expected time"
    fi
    
    # Import dashboards
    log "Importing Grafana dashboards..."
    
    # Production Overview Dashboard
    curl -X POST \
        -H "Content-Type: application/json" \
        -d @grafana/dashboards/production-overview.json \
        http://admin:secure_admin_password@localhost:3000/api/dashboards/db
    
    # Business Metrics Dashboard
    curl -X POST \
        -H "Content-Type: application/json" \
        -d @grafana/dashboards/business-metrics.json \
        http://admin:secure_admin_password@localhost:3000/api/dashboards/db
    
    # Performance Optimization Dashboard
    curl -X POST \
        -H "Content-Type: application/json" \
        -d @performance/optimization-dashboard.json \
        http://admin:secure_admin_password@localhost:3000/api/dashboards/db
    
    log "Grafana configuration completed"
}

# Validate deployment
validate_deployment() {
    log "Validating monitoring deployment..."
    
    # Check Prometheus
    if curl -s http://localhost:9090/-/healthy >/dev/null 2>&1; then
        log "✓ Prometheus is healthy"
    else
        error "✗ Prometheus is not responding"
    fi
    
    # Check Alertmanager
    if curl -s http://localhost:9093/-/healthy >/dev/null 2>&1; then
        log "✓ Alertmanager is healthy"
    else
        error "✗ Alertmanager is not responding"
    fi
    
    # Check Grafana
    if curl -s http://localhost:3000/api/health >/dev/null 2>&1; then
        log "✓ Grafana is healthy"
    else
        error "✗ Grafana is not responding"
    fi
    
    # Check exporters
    local exporters=("node-exporter:9100" "blackbox-exporter:9115")
    
    for exporter in "${exporters[@]}"; do
        local name=$(echo $exporter | cut -d: -f1)
        local port=$(echo $exporter | cut -d: -f2)
        
        if curl -s http://localhost:$port/metrics >/dev/null 2>&1; then
            log "✓ $name is healthy"
        else
            warn "✗ $name is not responding"
        fi
    done
    
    log "Deployment validation completed"
}

# Setup alerting
setup_alerting() {
    log "Setting up alerting..."
    
    # Test Alertmanager configuration
    if curl -s -X POST http://localhost:9093/-/reload >/dev/null 2>&1; then
        log "✓ Alertmanager configuration reloaded"
    else
        warn "✗ Failed to reload Alertmanager configuration"
    fi
    
    # Test Prometheus rules
    if curl -s -X POST http://localhost:9090/-/reload >/dev/null 2>&1; then
        log "✓ Prometheus configuration reloaded"
    else
        warn "✗ Failed to reload Prometheus configuration"
    fi
    
    log "Alerting setup completed"
}

# Main deployment function
main() {
    log "Starting production monitoring deployment..."
    
    check_prerequisites
    create_network
    
    # Choose deployment method
    if [[ "${1:-docker}" == "kubernetes" ]] && command -v kubectl >/dev/null 2>&1; then
        deploy_kubernetes
    else
        deploy_docker
    fi
    
    configure_grafana
    validate_deployment
    setup_alerting
    
    log "Production monitoring deployment completed successfully!"
    log ""
    log "Access URLs:"
    log "  Prometheus: http://localhost:9090"
    log "  Grafana: http://localhost:3000 (admin/secure_admin_password)"
    log "  Alertmanager: http://localhost:9093"
    log ""
    log "Next steps:"
    log "  1. Configure SSL certificates for production access"
    log "  2. Set up external authentication (LDAP/OAuth)"
    log "  3. Configure notification channels in Alertmanager"
    log "  4. Review and customize alerting rules"
    log "  5. Set up log retention policies"
}

# Run main function
main "$@"