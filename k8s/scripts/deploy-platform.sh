#!/bin/bash

# Multi-Service Platform Kubernetes Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE=${NAMESPACE:-multi-service-platform}
ENVIRONMENT=${ENVIRONMENT:-production}
HELM_RELEASE_NAME=${HELM_RELEASE_NAME:-platform}
ISTIO_ENABLED=${ISTIO_ENABLED:-true}

echo -e "${GREEN}Starting Multi-Service Platform Deployment${NC}"
echo "Environment: $ENVIRONMENT"
echo "Namespace: $NAMESPACE"
echo "Istio Enabled: $ISTIO_ENABLED"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"
if ! command_exists kubectl; then
    echo -e "${RED}kubectl is not installed${NC}"
    exit 1
fi

if ! command_exists helm; then
    echo -e "${RED}helm is not installed${NC}"
    exit 1
fi

# Check if cluster is accessible
if ! kubectl cluster-info >/dev/null 2>&1; then
    echo -e "${RED}Cannot connect to Kubernetes cluster${NC}"
    exit 1
fi

echo -e "${GREEN}Prerequisites check passed${NC}"

# Create namespace if it doesn't exist
echo -e "${YELLOW}Creating namespace...${NC}"
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Install infrastructure components
echo -e "${YELLOW}Installing infrastructure components...${NC}"

# Install metrics server
echo "Installing metrics server..."
kubectl apply -f k8s/manifests/metrics-server.yaml

# Install ingress controller
echo "Installing NGINX ingress controller..."
kubectl apply -f k8s/manifests/ingress-nginx-controller.yaml

# Install cert-manager
echo "Installing cert-manager..."
kubectl apply -f k8s/manifests/cert-manager.yaml

# Wait for cert-manager to be ready
echo "Waiting for cert-manager to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/cert-manager -n cert-manager

# Install Istio if enabled
if [ "$ISTIO_ENABLED" = "true" ]; then
    echo -e "${YELLOW}Installing Istio...${NC}"
    
    # Check if istioctl is available
    if ! command_exists istioctl; then
        echo -e "${RED}istioctl is not installed. Please install Istio CLI first.${NC}"
        echo "Visit: https://istio.io/latest/docs/setup/getting-started/"
        exit 1
    fi
    
    # Install Istio
    istioctl install -f k8s/istio/istio-installation.yaml -y
    
    # Enable Istio injection for the namespace
    kubectl label namespace $NAMESPACE istio-injection=enabled --overwrite
    
    # Apply Istio configurations
    echo "Applying Istio configurations..."
    kubectl apply -f k8s/istio/gateway.yaml
    kubectl apply -f k8s/istio/destination-rules.yaml
    kubectl apply -f k8s/istio/security-policies.yaml
fi

# Add Helm repositories
echo -e "${YELLOW}Adding Helm repositories...${NC}"
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Install platform using Helm
echo -e "${YELLOW}Installing platform services...${NC}"

# Determine values file based on environment
VALUES_FILE="k8s/charts/multi-service-platform/values.yaml"
if [ "$ENVIRONMENT" = "staging" ]; then
    VALUES_FILE="k8s/values/staging/values.yaml"
elif [ "$ENVIRONMENT" = "production" ]; then
    VALUES_FILE="k8s/values/production/values.yaml"
fi

# Install or upgrade the platform
helm upgrade --install $HELM_RELEASE_NAME k8s/charts/multi-service-platform \
    --namespace $NAMESPACE \
    --values $VALUES_FILE \
    --timeout 10m \
    --wait

echo -e "${GREEN}Platform deployment completed successfully!${NC}"

# Display deployment status
echo -e "${YELLOW}Deployment Status:${NC}"
kubectl get pods -n $NAMESPACE
kubectl get services -n $NAMESPACE
kubectl get ingress -n $NAMESPACE

# Display access information
echo -e "${GREEN}Access Information:${NC}"
if [ "$ISTIO_ENABLED" = "true" ]; then
    GATEWAY_IP=$(kubectl get svc istio-ingressgateway -n istio-system -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
    if [ -n "$GATEWAY_IP" ]; then
        echo "Istio Gateway IP: $GATEWAY_IP"
        echo "Add this to your DNS or /etc/hosts file:"
        echo "$GATEWAY_IP api.yourplatform.com"
    fi
else
    INGRESS_IP=$(kubectl get svc ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
    if [ -n "$INGRESS_IP" ]; then
        echo "Ingress IP: $INGRESS_IP"
        echo "Add this to your DNS or /etc/hosts file:"
        echo "$INGRESS_IP api.yourplatform.com"
    fi
fi

echo -e "${GREEN}Deployment script completed!${NC}"