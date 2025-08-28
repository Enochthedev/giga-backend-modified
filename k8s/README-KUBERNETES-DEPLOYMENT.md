# Kubernetes Deployment Guide

This guide provides comprehensive instructions for deploying the Multi-Service Platform to Kubernetes with Istio service mesh, horizontal pod autoscaling, and SSL termination.

## Overview

The deployment includes:
- **Kubernetes Manifests**: Complete YAML configurations for all services
- **Helm Charts**: Templated deployment with configurable values
- **Istio Service Mesh**: Advanced traffic management, security, and observability
- **Horizontal Pod Autoscaling**: Automatic scaling based on CPU, memory, and custom metrics
- **SSL Termination**: Automatic SSL certificate management with Let's Encrypt
- **Ingress Controllers**: NGINX ingress with advanced routing and security

## Prerequisites

### Required Tools
```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install Istio CLI
curl -L https://istio.io/downloadIstio | sh -
export PATH=$PWD/istio-*/bin:$PATH
```

### Kubernetes Cluster Requirements
- Kubernetes 1.24+
- At least 3 worker nodes (recommended)
- 8GB+ RAM per node
- LoadBalancer support (cloud provider or MetalLB)
- StorageClass for persistent volumes

## Deployment Methods

### Method 1: Automated Script Deployment (Recommended)

```bash
# Deploy everything with Istio
./k8s/scripts/deploy-kubernetes.sh

# Deploy with Helm
./k8s/scripts/deploy-kubernetes.sh --helm

# Deploy without Istio
./k8s/scripts/deploy-kubernetes.sh --skip-istio

# Cleanup existing deployment
./k8s/scripts/deploy-kubernetes.sh --cleanup-only
```

### Method 2: Manual Deployment

#### Step 1: Install Infrastructure Components

```bash
# Install Istio
kubectl create namespace istio-system
istioctl install -f k8s/istio/enhanced-istio-installation.yaml -y

# Install NGINX Ingress Controller
kubectl apply -f k8s/manifests/11-ingress-controller.yaml

# Install Cert-Manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.2/cert-manager.crds.yaml
kubectl apply -f k8s/manifests/12-cert-manager.yaml

# Install Metrics Server
kubectl apply -f k8s/manifests/14-metrics-server.yaml
```

#### Step 2: Deploy Application

```bash
# Create namespaces and RBAC
kubectl apply -f k8s/manifests/00-namespace.yaml
kubectl apply -f k8s/manifests/01-rbac.yaml

# Deploy configuration
kubectl apply -f k8s/manifests/02-configmap.yaml
kubectl apply -f k8s/manifests/03-secrets.yaml

# Deploy services
kubectl apply -f k8s/manifests/04-api-gateway.yaml
kubectl apply -f k8s/manifests/05-authentication-service.yaml
kubectl apply -f k8s/manifests/06-ecommerce-service.yaml
kubectl apply -f k8s/manifests/07-payment-service.yaml
kubectl apply -f k8s/manifests/08-all-services.yaml
kubectl apply -f k8s/manifests/09-platform-services.yaml
kubectl apply -f k8s/manifests/10-support-services.yaml

# Deploy autoscaling
kubectl apply -f k8s/manifests/15-hpa-configurations.yaml
kubectl apply -f k8s/manifests/16-pod-disruption-budgets.yaml

# Deploy ingress
kubectl apply -f k8s/manifests/13-ingress-routes.yaml
```

#### Step 3: Configure Istio Service Mesh

```bash
# Deploy Istio configuration
kubectl apply -f k8s/istio/gateway-configuration.yaml
kubectl apply -f k8s/istio/virtual-services.yaml
kubectl apply -f k8s/istio/destination-rules-enhanced.yaml
kubectl apply -f k8s/istio/security-policies-enhanced.yaml
```

### Method 3: Helm Deployment

```bash
# Add required repositories
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Install with default values
helm install multi-service-platform ./k8s/charts/multi-service-platform \
  --namespace multi-service-platform \
  --create-namespace

# Install with custom values
helm install multi-service-platform ./k8s/charts/multi-service-platform \
  --namespace multi-service-platform \
  --create-namespace \
  --values ./k8s/values/production/values.yaml
```

## Configuration

### Environment-Specific Values

#### Production (`k8s/values/production/values.yaml`)
```yaml
app:
  environment: production

security:
  jwtSecret: "production-jwt-secret"
  corsOrigin: "https://yourplatform.com"

ingress:
  enabled: true
  hosts:
    - host: api.yourplatform.com

postgresql:
  enabled: true
  auth:
    postgresPassword: "secure-production-password"

istio:
  enabled: true
```

#### Staging (`k8s/values/staging/values.yaml`)
```yaml
app:
  environment: staging

security:
  jwtSecret: "staging-jwt-secret"
  corsOrigin: "*"

ingress:
  enabled: true
  hosts:
    - host: api-staging.yourplatform.com
```

### Custom Configuration

Update the following files for your environment:

1. **Domain Names**: Update `k8s/manifests/13-ingress-routes.yaml`
2. **SSL Certificates**: Update email in `k8s/manifests/12-cert-manager.yaml`
3. **Database Passwords**: Update `k8s/manifests/03-secrets.yaml`
4. **External API Keys**: Update secrets for Stripe, SendGrid, etc.

## Service Mesh Features

### Traffic Management

#### Canary Deployments
```yaml
# Example: 90% to v1, 10% to canary
- destination:
    host: authentication-service
    subset: v1
  weight: 90
- destination:
    host: authentication-service
    subset: canary
  weight: 10
```

#### Circuit Breaker
```yaml
circuitBreaker:
  consecutiveGatewayErrors: 5
  consecutive5xxErrors: 5
  interval: 30s
  baseEjectionTime: 30s
  maxEjectionPercent: 50
```

#### Retry Policy
```yaml
retries:
  attempts: 3
  perTryTimeout: 10s
  retryOn: 5xx,reset,connect-failure,refused-stream
```

### Security Features

#### Mutual TLS (mTLS)
- Automatic mTLS between all services
- Strict mode enforced by default
- Certificate rotation handled by Istio

#### Authorization Policies
- Default deny-all policy
- Service-specific access controls
- JWT token validation
- Role-based access control

## Horizontal Pod Autoscaling

### Metrics-Based Scaling

#### CPU and Memory
```yaml
metrics:
- type: Resource
  resource:
    name: cpu
    target:
      type: Utilization
      averageUtilization: 70
- type: Resource
  resource:
    name: memory
    target:
      type: Utilization
      averageUtilization: 80
```

#### Custom Metrics
```yaml
- type: Pods
  pods:
    metric:
      name: http_requests_per_second
    target:
      type: AverageValue
      averageValue: "100"
```

### Scaling Behavior
```yaml
behavior:
  scaleDown:
    stabilizationWindowSeconds: 300
    policies:
    - type: Percent
      value: 10
      periodSeconds: 60
  scaleUp:
    stabilizationWindowSeconds: 60
    policies:
    - type: Percent
      value: 50
      periodSeconds: 60
```

## SSL and Ingress Configuration

### Automatic SSL Certificates
- Let's Encrypt integration via Cert-Manager
- Automatic certificate renewal
- Multiple domain support
- Wildcard certificate support

### Security Headers
```yaml
nginx.ingress.kubernetes.io/configuration-snippet: |
  more_set_headers "X-Frame-Options: DENY";
  more_set_headers "X-Content-Type-Options: nosniff";
  more_set_headers "X-XSS-Protection: 1; mode=block";
  more_set_headers "Content-Security-Policy: default-src 'self'";
```

### Rate Limiting
```yaml
nginx.ingress.kubernetes.io/rate-limit: "100"
nginx.ingress.kubernetes.io/rate-limit-window: "1m"
```

## Monitoring and Observability

### Metrics Collection
- Prometheus metrics from all services
- Istio service mesh metrics
- Custom business metrics
- HPA metrics for scaling decisions

### Distributed Tracing
- Jaeger integration
- Request tracing across services
- Performance analysis
- Error tracking

### Logging
- Centralized logging with ELK stack
- Structured JSON logs
- Request correlation IDs
- Security audit logs

## Troubleshooting

### Common Issues

#### Pods Not Starting
```bash
# Check pod status
kubectl get pods -n multi-service-platform

# Check pod logs
kubectl logs -f deployment/api-gateway -n multi-service-platform

# Describe pod for events
kubectl describe pod <pod-name> -n multi-service-platform
```

#### Service Discovery Issues
```bash
# Check service endpoints
kubectl get endpoints -n multi-service-platform

# Test service connectivity
kubectl exec -it <pod-name> -n multi-service-platform -- curl http://authentication-service:3001/health
```

#### Istio Configuration Issues
```bash
# Check Istio configuration
istioctl analyze -n multi-service-platform

# Check proxy configuration
istioctl proxy-config cluster <pod-name> -n multi-service-platform

# Check security policies
kubectl get authorizationpolicy -n multi-service-platform
```

#### SSL Certificate Issues
```bash
# Check certificate status
kubectl get certificate -n multi-service-platform

# Check cert-manager logs
kubectl logs -f deployment/cert-manager -n cert-manager

# Check certificate details
kubectl describe certificate platform-tls -n multi-service-platform
```

### Debugging Commands

```bash
# Check all resources
kubectl get all -n multi-service-platform

# Check HPA status
kubectl get hpa -n multi-service-platform

# Check ingress status
kubectl get ingress -n multi-service-platform

# Check Istio resources
kubectl get gateway,virtualservice,destinationrule -n multi-service-platform

# Check security policies
kubectl get peerauthentication,authorizationpolicy -n multi-service-platform

# Port forward for local testing
kubectl port-forward service/api-gateway-service 8080:3000 -n multi-service-platform
```

## Scaling and Performance

### Resource Requests and Limits
```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

### Pod Disruption Budgets
```yaml
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: api-gateway
```

### Node Affinity
```yaml
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
    - weight: 100
      podAffinityTerm:
        labelSelector:
          matchExpressions:
          - key: app.kubernetes.io/name
            operator: In
            values:
            - multi-service-platform
        topologyKey: kubernetes.io/hostname
```

## Security Best Practices

### Network Policies
- Istio authorization policies
- Namespace isolation
- Service-to-service communication control

### Secret Management
- Kubernetes secrets for sensitive data
- External secret management integration
- Secret rotation procedures

### Image Security
- Use minimal base images
- Regular security scanning
- Non-root user execution
- Read-only root filesystem

## Backup and Disaster Recovery

### Database Backups
```bash
# PostgreSQL backup
kubectl exec -it postgresql-0 -n multi-service-platform -- pg_dump -U platform_user platform_db > backup.sql
```

### Configuration Backups
```bash
# Export all configurations
kubectl get all,configmap,secret,pvc -n multi-service-platform -o yaml > platform-backup.yaml
```

### Disaster Recovery Plan
1. Backup persistent data
2. Export Kubernetes configurations
3. Document external dependencies
4. Test recovery procedures
5. Maintain infrastructure as code

## Maintenance

### Updates and Upgrades
```bash
# Update Helm deployment
helm upgrade multi-service-platform ./k8s/charts/multi-service-platform \
  --namespace multi-service-platform

# Rolling update deployment
kubectl rollout restart deployment/api-gateway -n multi-service-platform

# Check rollout status
kubectl rollout status deployment/api-gateway -n multi-service-platform
```

### Health Checks
```bash
# Check cluster health
kubectl get nodes
kubectl get pods --all-namespaces

# Check service health
kubectl get endpoints -n multi-service-platform

# Check Istio health
istioctl proxy-status
```

This comprehensive Kubernetes deployment provides enterprise-grade features including service mesh, autoscaling, SSL termination, and advanced security policies for the multi-service platform.