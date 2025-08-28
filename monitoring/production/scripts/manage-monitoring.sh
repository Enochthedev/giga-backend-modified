#!/bin/bash

# Production Monitoring Management Script
# This script provides management operations for the monitoring stack

set -e

# Configuration
MONITORING_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$MONITORING_DIR/docker-compose.production.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"; }
warn() { echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"; }
error() { echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"; exit 1; }
info() { echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"; }

# Show usage
show_usage() {
    echo "Usage: $0 {start|stop|restart|status|logs|backup|restore|update|health}"
    echo ""
    echo "Commands:"
    echo "  start     - Start the monitoring stack"
    echo "  stop      - Stop the monitoring stack"
    echo "  restart   - Restart the monitoring stack"
    echo "  status    - Show status of all services"
    echo "  logs      - Show logs for all services"
    echo "  backup    - Backup monitoring data"
    echo "  restore   - Restore monitoring data from backup"
    echo "  update    - Update monitoring stack images"
    echo "  health    - Perform health checks"
    echo "  cleanup   - Clean up old data and logs"
    echo ""
}

# Start monitoring stack
start_monitoring() {
    log "Starting monitoring stack..."
    cd "$MONITORING_DIR"
    docker-compose -f docker-compose.production.yml up -d
    log "Monitoring stack started successfully"
}

# Stop monitoring stack
stop_monitoring() {
    log "Stopping monitoring stack..."
    cd "$MONITORING_DIR"
    docker-compose -f docker-compose.production.yml down
    log "Monitoring stack stopped successfully"
}

# Restart monitoring stack
restart_monitoring() {
    log "Restarting monitoring stack..."
    stop_monitoring
    sleep 5
    start_monitoring
}

# Show status of all services
show_status() {
    log "Checking monitoring stack status..."
    cd "$MONITORING_DIR"
    docker-compose -f docker-compose.production.yml ps
}

# Show logs
show_logs() {
    local service=${1:-}
    cd "$MONITORING_DIR"
    
    if [[ -n "$service" ]]; then
        log "Showing logs for $service..."
        docker-compose -f docker-compose.production.yml logs -f "$service"
    else
        log "Showing logs for all services..."
        docker-compose -f docker-compose.production.yml logs -f
    fi
}

# Backup monitoring data
backup_data() {
    local backup_dir="backups/$(date +%Y%m%d_%H%M%S)"
    
    log "Creating backup in $backup_dir..."
    mkdir -p "$backup_dir"
    
    # Backup Prometheus data
    if docker ps | grep -q prometheus-prod; then
        log "Backing up Prometheus data..."
        docker exec prometheus-prod tar czf - /prometheus | cat > "$backup_dir/prometheus_data.tar.gz"
    fi
    
    # Backup Grafana data
    if docker ps | grep -q grafana-prod; then
        log "Backing up Grafana data..."
        docker exec grafana-prod tar czf - /var/lib/grafana | cat > "$backup_dir/grafana_data.tar.gz"
    fi
    
    # Backup Alertmanager data
    if docker ps | grep -q alertmanager-prod; then
        log "Backing up Alertmanager data..."
        docker exec alertmanager-prod tar czf - /alertmanager | cat > "$backup_dir/alertmanager_data.tar.gz"
    fi
    
    # Backup configurations
    log "Backing up configurations..."
    tar czf "$backup_dir/configs.tar.gz" \
        prometheus-production.yml \
        alertmanager-production.yml \
        rules/ \
        grafana/ \
        synthetic/
    
    log "Backup completed: $backup_dir"
}

# Restore monitoring data
restore_data() {
    local backup_dir=${1:-}
    
    if [[ -z "$backup_dir" ]]; then
        error "Please specify backup directory: $0 restore <backup_directory>"
    fi
    
    if [[ ! -d "$backup_dir" ]]; then
        error "Backup directory not found: $backup_dir"
    fi
    
    log "Restoring from backup: $backup_dir"
    
    # Stop services before restore
    stop_monitoring
    
    # Restore Prometheus data
    if [[ -f "$backup_dir/prometheus_data.tar.gz" ]]; then
        log "Restoring Prometheus data..."
        docker run --rm -v prometheus-data:/prometheus -v "$PWD/$backup_dir":/backup alpine \
            sh -c "cd /prometheus && tar xzf /backup/prometheus_data.tar.gz --strip-components=1"
    fi
    
    # Restore Grafana data
    if [[ -f "$backup_dir/grafana_data.tar.gz" ]]; then
        log "Restoring Grafana data..."
        docker run --rm -v grafana-data:/var/lib/grafana -v "$PWD/$backup_dir":/backup alpine \
            sh -c "cd /var/lib/grafana && tar xzf /backup/grafana_data.tar.gz --strip-components=3"
    fi
    
    # Restore configurations
    if [[ -f "$backup_dir/configs.tar.gz" ]]; then
        log "Restoring configurations..."
        tar xzf "$backup_dir/configs.tar.gz"
    fi
    
    # Start services after restore
    start_monitoring
    
    log "Restore completed successfully"
}

# Update monitoring stack
update_stack() {
    log "Updating monitoring stack images..."
    cd "$MONITORING_DIR"
    
    # Pull latest images
    docker-compose -f docker-compose.production.yml pull
    
    # Restart with new images
    docker-compose -f docker-compose.production.yml up -d
    
    # Clean up old images
    docker image prune -f
    
    log "Update completed successfully"
}

# Perform health checks
health_check() {
    log "Performing health checks..."
    
    local services=(
        "Prometheus:http://localhost:9090/-/healthy"
        "Alertmanager:http://localhost:9093/-/healthy"
        "Grafana:http://localhost:3000/api/health"
        "Node Exporter:http://localhost:9100/metrics"
        "Blackbox Exporter:http://localhost:9115/metrics"
    )
    
    local failed=0
    
    for service_info in "${services[@]}"; do
        local name=$(echo "$service_info" | cut -d: -f1)
        local url=$(echo "$service_info" | cut -d: -f2-)
        
        if curl -s --max-time 10 "$url" >/dev/null 2>&1; then
            log "✓ $name is healthy"
        else
            error "✗ $name is not responding"
            ((failed++))
        fi
    done
    
    # Check disk space
    local disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [[ $disk_usage -gt 80 ]]; then
        warn "Disk usage is high: ${disk_usage}%"
        ((failed++))
    else
        log "✓ Disk usage is acceptable: ${disk_usage}%"
    fi
    
    # Check memory usage
    local mem_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    if [[ $mem_usage -gt 80 ]]; then
        warn "Memory usage is high: ${mem_usage}%"
        ((failed++))
    else
        log "✓ Memory usage is acceptable: ${mem_usage}%"
    fi
    
    if [[ $failed -eq 0 ]]; then
        log "All health checks passed"
    else
        warn "$failed health checks failed"
        return 1
    fi
}

# Cleanup old data and logs
cleanup() {
    log "Cleaning up old data and logs..."
    
    # Clean up Docker
    docker system prune -f
    
    # Clean up old backups (keep last 7 days)
    if [[ -d "backups" ]]; then
        find backups/ -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true
        log "Old backups cleaned up"
    fi
    
    # Clean up old logs
    if [[ -d "logs" ]]; then
        find logs/ -name "*.log" -mtime +30 -delete 2>/dev/null || true
        log "Old logs cleaned up"
    fi
    
    log "Cleanup completed"
}

# Main function
main() {
    local command=${1:-}
    
    case "$command" in
        start)
            start_monitoring
            ;;
        stop)
            stop_monitoring
            ;;
        restart)
            restart_monitoring
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs "$2"
            ;;
        backup)
            backup_data
            ;;
        restore)
            restore_data "$2"
            ;;
        update)
            update_stack
            ;;
        health)
            health_check
            ;;
        cleanup)
            cleanup
            ;;
        *)
            show_usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"