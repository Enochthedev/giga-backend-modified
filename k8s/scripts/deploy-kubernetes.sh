#!/bin/bash

# Kubernetes Deployment Script for Multi-Service Platform
# This script deploys the entire platform to Kubernetes with Istio service mesh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="multi-service-platform"
ISTIO_NAMESPACE="istio-system"
MONITORING_NAMESPACE="monitoring"
HELM_RELEASE_NAME="multi-service-platform"
CHART_PATH="./k8s/charts/multi-service-platform"

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

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed. Please install kubectl first."
        exit 1
    fi
    
    # Check if helm is installed
    if ! command -v helm &> /dev/null; then
        log_error "Helm is not installed. Please install Helm first."
        exit 1
    fi
    
    # Check if istioctl is installed
    if ! command -v istioctl &> /dev/null; then
        log_error "istioctl is not installed. Please install Istio CLI first."
        exit 1
    fi
    
    # Check cluster connectivity
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

install_istio() {
    log_info "Installing Istio service mesh..."
    
    # Create istio-system namespace
    kubectl create namespace $ISTIO_NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
    
    # Install Istio with custom configuration
    istioctl install -f k8s/istio/enhanced-istio-installation.yaml -y
    
    # Wait for Istio to be ready
    kubectl wait --for=condition=available --timeout=300s deployment/istiod -n $ISTIO_NAMESPACE
    
    log_success "Istio installed successfully"
}

install_ingress_controller() {
    log_info "Installing NGINX Ingress Controller..."
    
    # Apply NGINX Ingress Controller
    kubectl apply -f k8s/manifests/11-ingress-controller.yaml
    
    # Wait for ingress controller to be ready
    kubectl wait --namespace ingress-nginx \
        --for=condition=ready pod \
        --selector=app.kubernetes.io/component=controller \
        --timeout=300s
    
    log_success "NGINX Ingress Controller installed successfully"
}

install_cert_manager() {
    log_info "Installing Cert-Manager for SSL certificates..."
    
    # Install cert-manager CRDs
    kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.2/cert-manager.crds.yaml
    
    # Apply cert-manager
    kubectl apply -f k8s/manifests/12-cert-manager.yaml
    
    # Wait for cert-manager to be ready
    kubectl wait --for=condition=available --timeout=300s deployment/cert-manager -n cert-manager
    
    log_success "Cert-Manager installed successfully"
}

install_metrics_server() {
    log_info "Installing Metrics Server for HPA..."
    
    # Apply metrics server
    kubectl apply -f k8s/manifests/14-metrics-server.yaml
    
    # Wait for metrics server to be ready
    kubectl wait --for=condition=available --timeout=300s deployment/metrics-server -n kube-system
    
    log_success "Metrics Server installed successfully"
}

create_namespaces() {
    log_info "Creating namespaces..."
    
    # Apply namespace configuration
    kubectl apply -f k8s/manifests/00-namespace.yaml
    
    log_success "Namespaces created successfully"
}

deploy_infrastructure() {
    log_info "Deploying infrastructure components..."
    
    # Apply RBAC
    kubectl apply -f k8s/manifests/01-rbac.yaml
    
    # Apply ConfigMaps and Secrets
    kubectl apply -f k8s/manifests/02-configmap.yaml
    kubectl apply -f k8s/manifests/03-secrets.yaml
    
    log_success "Infrastructure components deployed successfully"
}

deploy_services() {
    log_info "Deploying application services..."
    
    # Deploy core services
    kubectl apply -f k8s/manifests/04-api-gateway.yaml
    kubectl apply -f k8s/manifests/05-authentication-service.yaml
    kubectl apply -f k8s/manifests/06-ecommerce-service.yaml
    kubectl apply -f k8s/manifests/07-payment-service.yaml
    kubectl apply -f k8s/manifests/08-all-services.yaml
    kubectl apply -f k8s/manifests/09-platform-services.yaml
    kubectl apply -f k8s/manifests/10-support-services.yaml
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/api-gateway -n $NAMESPACE
    kubectl wait --for=condition=available --timeout=300s deployment/authentication-service -n $NAMESPACE
    kubectl wait --for=condition=available --timeout=300s deployment/ecommerce-service -n $NAMESPACE
    kubectl wait --for=condition=available --timeout=300s deployment/payment-service -n $NAMESPACE
    
    log_success "Application services deployed successfully"
}

deploy_hpa() {
    log_info "Deploying Horizontal Pod Autoscalers..."
    
    # Apply HPA configurations
    kubectl apply -f k8s/manifests/15-hpa-configurations.yaml
    kubectl apply -f k8s/manifests/16-pod-disruption-budgets.yaml
    
    log_success "HPA configurations deployed successfully"
}

deploy_istio_configuration() {
    log_info "Deploying Istio configuration..."
    
    # Apply Istio Gateway and VirtualService configurations
    kubectl apply -f k8s/istio/gateway-configuration.yaml
    kubectl apply -f k8s/istio/virtual-services.yaml
    kubectl apply -f k8s/istio/destination-rules-enhanced.yaml
    kubectl apply -f k8s/istio/security-policies-enhanced.yaml
    
    log_success "Istio configuration deployed successfully"
}

deploy_ingress() {
    log_info "Deploying Ingress routes..."
    
    # Apply ingress configurations
    kubectl apply -f k8s/manifests/13-ingress-routes.yaml
    
    log_success "Ingress routes deployed successfully"
}

deploy_with_helm() {
    log_info "Deploying with Helm..."
    
    # Add required Helm repositories
    helm repo add bitnami https://charts.bitnami.com/bitnami
    helm repo update
    
    # Install or upgrade the Helm release
    helm upgrade --install $HELM_RELEASE_NAME $CHART_PATH \
        --namespace $NAMESPACE \
        --create-namespace \
        --timeout 600s \
        --wait
    
    log_success "Helm deployment completed successfully"
}

verify_deployment() {
    log_info "Verifying deployment..."
    
    # Check pod status
    kubectl get pods -n $NAMESPACE
    
    # Check service status
    kubectl get services -n $NAMESPACE
    
    # Check ingress status
    kubectl get ingress -n $NAMESPACE
    
    # Check HPA status
    kubectl get hpa -n $NAMESPACE
    
    # Check Istio configuration
    kubectl get gateway,virtualservice,destinationrule -n $NAMESPACE
    
    log_success "Deployment verification completed"
}

cleanup() {
    log_warning "Cleaning up previous deployment..."
    
    # Delete existing resources (optional)
    kubectl delete namespace $NAMESPACE --ignore-not-found=true
    
    # Wait for namespace deletion
    kubectl wait --for=delete namespace/$NAMESPACE --timeout=300s || true
    
    log_success "Cleanup completed"
}

show_access_info() {
    log_info "Deployment completed! Access information:"
    echo ""
    echo "API Gateway: https://api.yourplatform.com/api/v1/"
    echo "Admin Dashboard: https://admin.yourplatform.com/admin/"
    echo "WebSocket Endpoint: wss://ws.yourplatform.com/"
    echo ""
    echo "To get the external IP of the load balancer:"
    echo "kubectl get service istio-ingressgateway -n istio-system"
    echo ""
    echo "To check the status of all services:"
    echo "kubectl get all -n $NAMESPACE"
    echo ""
    echo "To view logs of a specific service:"
    echo "kubectl logs -f deployment/api-gateway -n $NAMESPACE"
}

# Main deployment function
main() {
    log_info "Starting Kubernetes deployment for Multi-Service Platform"
    
    # Parse command line arguments
    DEPLOY_METHOD="manifests"
    SKIP_ISTIO=false
    SKIP_CLEANUP=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --helm)
                DEPLOY_METHOD="helm"
                shift
                ;;
            --skip-istio)
                SKIP_ISTIO=true
                shift
                ;;
            --skip-cleanup)
                SKIP_CLEANUP=true
                shift
                ;;
            --cleanup-only)
                cleanup
                exit 0
                ;;
            -h|--help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --helm           Deploy using Helm charts"
                echo "  --skip-istio     Skip Istio installation"
                echo "  --skip-cleanup   Skip cleanup of existing resources"
                echo "  --cleanup-only   Only perform cleanup and exit"
                echo "  -h, --help       Show this help message"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Check prerequisites
    check_prerequisites
    
    # Cleanup if requested
    if [ "$SKIP_CLEANUP" = false ]; then
        cleanup
    fi
    
    # Install Istio if not skipped
    if [ "$SKIP_ISTIO" = false ]; then
        install_istio
    fi
    
    # Install infrastructure components
    install_ingress_controller
    install_cert_manager
    install_metrics_server
    
    # Deploy based on method
    if [ "$DEPLOY_METHOD" = "helm" ]; then
        deploy_with_helm
    else
        create_namespaces
        deploy_infrastructure
        deploy_services
        deploy_hpa
        deploy_ingress
    fi
    
    # Deploy Istio configuration if Istio is installed
    if [ "$SKIP_ISTIO" = false ]; then
        deploy_istio_configuration
    fi
    
    # Verify deployment
    verify_deployment
    
    # Show access information
    show_access_info
    
    log_success "Deployment completed successfully!"
}

# Run main function
main "$@"