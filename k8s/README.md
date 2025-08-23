# Kubernetes Deployment Guide

This directory contains Kubernetes manifests and Helm charts for deploying the Multi-Service Platform.

## Directory Structure

```
k8s/
├── charts/                     # Helm charts
│   └── multi-service-platform/ # Main platform chart
├── manifests/                  # Raw Kubernetes manifests
├── istio/                      # Istio service mesh configuration
├── values/                     # Environment-specific values
│   ├── production/
│   └── staging/
└── scripts/                    # Deployment scripts
```

## Prerequisites

Before deploying, ensure you have:

1. **Kubernetes cluster** (v1.24+)
2. **kubectl** configured to access your cluster
3. **Helm** (v3.8+)
4. **istioctl** (if using Istio service mesh)
5. **Docker images** built and pushed to your registry

## Quick Start

### 1. Deploy Infrastructure Components

```bash
# Deploy metrics server, ingress controller, and cert-manager
kubectl apply -f k8s/manifests/metrics-server.yaml
kubectl apply -f k8s/manifests/ingress-nginx-controller.yaml
kubectl apply -f k8s/manifests/cert-manager.yaml
```

### 2. Deploy Platform Services

Using the deployment script (recommended):

```bash
# For production
ENVIRONMENT=production ./k8s/scripts/deploy-platform.sh

# For staging
ENVIRONMENT=staging ./k8s/scripts/deploy-platform.sh

# With Istio disabled
ISTIO_ENABLED=false ./k8s/scripts/deploy-platform.sh
```

Using Helm directly:

```bash
# Add required repositories
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Create namespace
kubectl create namespace multi-service-platform

# Install platform
helm install platform k8s/charts/multi-service-platform \
  --namespace multi-service-platform \
  --values k8s/values/production/values.yaml
```

## Configuration

### Environment Variables

Update the following files with your actual values:

- `k8s/charts/multi-service-platform/templates/secret.yaml`
- `k8s/values/production/values.yaml`
- `k8s/values/staging/values.yaml`

### Required Secrets

Replace the base64-encoded placeholder values in secrets with actual values:

```bash
# JWT Secret
echo -n "your-actual-jwt-secret" | base64

# Database passwords
echo -n "your-database-password" | base64

# External service API keys
echo -n "your-stripe-secret-key" | base64
echo -n "your-sendgrid-api-key" | base64
```

### SSL Certificates

The deployment uses cert-manager with Let's Encrypt for automatic SSL certificates. Update the email address in:

- `k8s/manifests/cert-manager.yaml`

For custom certificates, create a TLS secret:

```bash
kubectl create secret tls platform-tls \
  --cert=path/to/tls.crt \
  --key=path/to/tls.key \
  --namespace multi-service-platform
```

## Service Mesh (Istio)

### Installation

1. Install Istio CLI:
```bash
curl -L https://istio.io/downloadIstio | sh -
export PATH=$PWD/istio-*/bin:$PATH
```

2. Deploy Istio:
```bash
istioctl install -f k8s/istio/istio-installation.yaml -y
```

3. Enable injection:
```bash
kubectl label namespace multi-service-platform istio-injection=enabled
```

4. Apply configurations:
```bash
kubectl apply -f k8s/istio/gateway.yaml
kubectl apply -f k8s/istio/destination-rules.yaml
kubectl apply -f k8s/istio/security-policies.yaml
```

### Features Enabled

- **mTLS**: Automatic mutual TLS between services
- **Traffic Management**: Load balancing, circuit breakers, retries
- **Security Policies**: Authorization and authentication
- **Observability**: Distributed tracing and metrics

## Horizontal Pod Autoscaling

HPA is configured for all services based on CPU and memory metrics:

```bash
# View HPA status
kubectl get hpa -n multi-service-platform

# Describe specific HPA
kubectl describe hpa api-gateway-hpa -n multi-service-platform
```

### Custom Metrics

To use custom metrics (e.g., request rate, queue length):

1. Install Prometheus Adapter
2. Configure custom metrics in HPA manifests
3. Update ServiceMonitor configurations

## Monitoring and Observability

### Prometheus Integration

ServiceMonitor resources are created for each service to enable Prometheus scraping:

```bash
# View service monitors
kubectl get servicemonitor -n monitoring
```

### Grafana Dashboards

Import the provided dashboards from `monitoring/grafana/dashboards/` for:

- Service performance metrics
- Infrastructure monitoring
- Business metrics

### Distributed Tracing

With Istio enabled, distributed tracing is automatically configured:

```bash
# Access Jaeger UI
kubectl port-forward -n istio-system svc/tracing 16686:80
```

## Scaling

### Manual Scaling

```bash
# Scale a specific service
kubectl scale deployment ecommerce-service --replicas=5 -n multi-service-platform
```

### Cluster Autoscaling

For cloud providers, enable cluster autoscaling to automatically add/remove nodes:

```bash
# AWS EKS example
eksctl create nodegroup --cluster=your-cluster --name=autoscaling-nodes \
  --node-type=m5.large --nodes=3 --nodes-min=1 --nodes-max=10 \
  --asg-access --external-dns-access --full-ecr-access
```

## Backup and Disaster Recovery

### Database Backups

Configure automated backups for PostgreSQL:

```bash
# Create backup job
kubectl create job --from=cronjob/postgres-backup manual-backup-$(date +%Y%m%d%H%M%S) -n multi-service-platform
```

### Configuration Backups

```bash
# Backup all configurations
kubectl get all,configmap,secret,pvc -n multi-service-platform -o yaml > platform-backup.yaml
```

## Troubleshooting

### Common Issues

1. **Pods not starting**: Check resource limits and node capacity
```bash
kubectl describe pod <pod-name> -n multi-service-platform
kubectl top nodes
```

2. **Service connectivity**: Verify service discovery and network policies
```bash
kubectl get svc -n multi-service-platform
kubectl get networkpolicy -n multi-service-platform
```

3. **Ingress not working**: Check ingress controller and DNS configuration
```bash
kubectl get ingress -n multi-service-platform
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
```

4. **Certificate issues**: Check cert-manager logs
```bash
kubectl logs -n cert-manager deployment/cert-manager
kubectl describe certificate platform-tls -n multi-service-platform
```

### Debug Commands

```bash
# Check pod logs
kubectl logs -f deployment/api-gateway -n multi-service-platform

# Execute commands in pods
kubectl exec -it deployment/api-gateway -n multi-service-platform -- /bin/sh

# Port forward for local testing
kubectl port-forward svc/api-gateway-service 3000:3000 -n multi-service-platform

# Check resource usage
kubectl top pods -n multi-service-platform
kubectl top nodes
```

## Security Considerations

### Network Policies

Network policies are enabled in production to restrict pod-to-pod communication:

```bash
# View network policies
kubectl get networkpolicy -n multi-service-platform
```

### RBAC

Service accounts have minimal required permissions:

```bash
# View service accounts and roles
kubectl get sa,role,rolebinding -n multi-service-platform
```

### Pod Security Standards

Pods run with security contexts and non-root users where possible.

### Secrets Management

Consider using external secret management solutions like:

- AWS Secrets Manager
- Azure Key Vault
- HashiCorp Vault
- Kubernetes External Secrets Operator

## Performance Optimization

### Resource Requests and Limits

Properly configured in values files based on:
- Historical usage patterns
- Load testing results
- Business requirements

### Caching

Redis is configured with persistence and replication for high availability.

### Database Optimization

- Read replicas for PostgreSQL
- Connection pooling
- Proper indexing strategies

## Maintenance

### Updates

```bash
# Update Helm chart
helm upgrade platform k8s/charts/multi-service-platform \
  --namespace multi-service-platform \
  --values k8s/values/production/values.yaml

# Rolling restart of services
kubectl rollout restart deployment/api-gateway -n multi-service-platform
```

### Health Checks

All services include liveness and readiness probes for automatic health monitoring.

## Support

For issues and questions:

1. Check the troubleshooting section above
2. Review service logs and metrics
3. Consult the main project documentation
4. Contact the platform team