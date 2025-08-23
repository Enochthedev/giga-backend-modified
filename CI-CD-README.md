# CI/CD Pipeline Setup

This document provides a quick start guide for the CI/CD pipeline implementation for the multi-service architecture.

## 🚀 Quick Start

### Prerequisites

1. **GitHub Repository**: Ensure your code is in a GitHub repository
2. **Container Registry**: GitHub Container Registry (ghcr.io) access
3. **Kubernetes Cluster**: Access to staging and production clusters
4. **Helm**: Helm 3.x installed for deployments

### Setup Steps

#### 1. Configure GitHub Secrets

Add the following secrets to your GitHub repository:

```bash
# Container Registry
GITHUB_TOKEN                 # Automatically provided by GitHub

# Optional: External Services
SNYK_TOKEN                   # For advanced security scanning
SLACK_WEBHOOK_URL           # For deployment notifications
CODECOV_TOKEN               # For coverage reporting
```

#### 2. Configure Kubernetes Contexts

Ensure your deployment environment has access to Kubernetes clusters:

```bash
# Staging cluster context
kubectl config use-context staging-cluster

# Production cluster context  
kubectl config use-context production-cluster
```

#### 3. Customize Service Configuration

Update the service lists in the workflow files to match your services:

- `.github/workflows/ci-cd-main.yml`
- `.github/workflows/ci-cd-services.yml`

#### 4. Configure Helm Values

Create environment-specific values files:

```bash
# Staging values
k8s/values/staging/[service-name].yaml

# Production values
k8s/values/production/[service-name].yaml
```

## 📋 Pipeline Overview

### Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci-cd-main.yml` | Push/PR to main services | Build, test, and deploy main services |
| `ci-cd-services.yml` | Push/PR to microservices | Build, test, and deploy microservices |
| `security-scan.yml` | Push/PR/Schedule | Security scanning and compliance |

### Pipeline Stages

1. **Change Detection** - Only process modified services
2. **Lint & Test** - Code quality and unit testing
3. **Security Scan** - Vulnerability and compliance scanning
4. **Build & Push** - Docker image building and registry push
5. **Deploy** - Environment-specific deployment
6. **Validate** - Post-deployment health checks

## 🛠️ Usage

### Automatic Triggers

The pipeline automatically triggers on:

- **Push to `main`**: Production deployment
- **Push to `develop`**: Staging deployment  
- **Pull Requests**: Testing and validation
- **Daily Schedule**: Security scanning

### Manual Operations

#### Deploy Specific Service to Staging
```bash
./scripts/deploy-staging.sh
```

#### Deploy All Services to Production
```bash
./scripts/deploy-production.sh
```

#### Rollback Service
```bash
# Rollback specific service
./scripts/rollback.sh production --service api-gateway

# Rollback all services
./scripts/rollback.sh production

# Dry run (see what would be rolled back)
./scripts/rollback.sh production --dry-run
```

#### Run Smoke Tests
```bash
./scripts/smoke-tests.sh production
```

## 🔧 Configuration

### Service-Specific Configuration

Each service can be configured with:

#### Environment Variables
```yaml
# In k8s/values/[environment]/[service].yaml
env:
  NODE_ENV: production
  LOG_LEVEL: info
  DATABASE_URL: postgresql://...
```

#### Resource Limits
```yaml
resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 500m
    memory: 512Mi
```

#### Scaling Configuration
```yaml
autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
```

### Security Configuration

#### Dependency Scanning
```yaml
# Customize in .github/workflows/security-scan.yml
- name: Run npm audit
  run: npm audit --audit-level=moderate
```

#### Container Scanning
```yaml
# Trivy configuration
- name: Run Trivy scanner
  uses: aquasecurity/trivy-action@master
  with:
    scan-type: 'fs'
    format: 'sarif'
```

## 📊 Monitoring

### Pipeline Status

Monitor pipeline status through:

- **GitHub Actions Tab**: Real-time pipeline execution
- **Status Badges**: Add to README for visibility
- **Notifications**: Slack/email notifications on failure

### Deployment Status

Check deployment status:

```bash
# Check all services in staging
kubectl get pods -n staging

# Check specific service
kubectl get deployment api-gateway -n production

# Check service logs
kubectl logs -f deployment/api-gateway -n production
```

### Health Checks

All services expose health endpoints:

```bash
# Check service health
curl https://api.yourdomain.com/health

# Check all service health
./scripts/smoke-tests.sh production
```

## 🚨 Troubleshooting

### Common Issues

#### Build Failures
```bash
# Check build logs in GitHub Actions
# Common causes:
# - Dependency conflicts
# - TypeScript errors
# - Test failures
# - Resource limits
```

#### Deployment Failures
```bash
# Check deployment status
kubectl describe deployment [service-name] -n [namespace]

# Check pod events
kubectl describe pod [pod-name] -n [namespace]

# Check service logs
kubectl logs [pod-name] -n [namespace]
```

#### Health Check Failures
```bash
# Check service endpoints
kubectl get endpoints [service-name] -n [namespace]

# Port forward for local testing
kubectl port-forward service/[service-name] 8080:80 -n [namespace]

# Test health endpoint
curl http://localhost:8080/health
```

### Debug Commands

#### Pipeline Debugging
```bash
# Re-run failed jobs in GitHub Actions UI
# Enable debug logging by setting secrets:
# ACTIONS_STEP_DEBUG: true
# ACTIONS_RUNNER_DEBUG: true
```

#### Deployment Debugging
```bash
# Check Helm release status
helm status [release-name] -n [namespace]

# Check Helm release history
helm history [release-name] -n [namespace]

# Get Helm values
helm get values [release-name] -n [namespace]
```

## 🔄 Rollback Procedures

### Automatic Rollback

The pipeline includes automatic rollback triggers:

- Health check failures after deployment
- Increased error rates
- Performance degradation
- External dependency failures

### Manual Rollback

#### Quick Rollback
```bash
# Rollback to previous version
./scripts/rollback.sh production --service [service-name]

# Rollback to specific version
./scripts/rollback.sh production --service [service-name] --to-version 2

# List available versions
./scripts/rollback.sh production --service [service-name] --list-versions
```

#### Emergency Rollback
```bash
# Force rollback without confirmation
./scripts/rollback.sh production --force

# Rollback all services
./scripts/rollback.sh production
```

## 📈 Performance Optimization

### Build Performance
- **Parallel Builds**: Services build concurrently
- **Layer Caching**: Docker layer caching enabled
- **Incremental Builds**: Only changed services rebuild

### Deployment Performance
- **Blue-Green Deployments**: Zero-downtime deployments
- **Canary Releases**: Gradual rollout for critical services
- **Resource Optimization**: Right-sized resource allocation

### Pipeline Performance
- **Change Detection**: Only run pipelines for modified services
- **Conditional Execution**: Skip unnecessary stages
- **Artifact Caching**: Reuse build artifacts

## 🔐 Security Best Practices

### Pipeline Security
- **Least Privilege**: Minimal required permissions
- **Secret Management**: Secure credential handling
- **Audit Trails**: Comprehensive logging

### Application Security
- **Dependency Scanning**: Automated vulnerability detection
- **Code Analysis**: Static code analysis
- **Container Scanning**: Image vulnerability scanning
- **Runtime Security**: Security policies and monitoring

## 📚 Additional Resources

### Documentation
- [Complete CI/CD Pipeline Documentation](docs/ci-cd-pipeline.md)
- [Kubernetes Deployment Guide](docs/kubernetes-deployment.md)
- [Security Scanning Guide](docs/security-scanning.md)

### Scripts
- `scripts/deploy-staging.sh` - Staging deployment
- `scripts/deploy-production.sh` - Production deployment
- `scripts/rollback.sh` - Rollback procedures
- `scripts/smoke-tests.sh` - Health validation

### Configuration Files
- `.github/workflows/` - GitHub Actions workflows
- `k8s/charts/` - Helm charts
- `k8s/values/` - Environment-specific values

## 🆘 Support

### Getting Help
- **Documentation**: Check the docs/ directory
- **Issues**: Create GitHub issues for problems
- **Team Chat**: Contact DevOps team for urgent issues

### Maintenance
- **Weekly Reviews**: Pipeline performance analysis
- **Monthly Updates**: Security scan reviews
- **Quarterly Planning**: Architecture improvements

---

**Note**: This CI/CD pipeline is designed for production use with comprehensive security, monitoring, and rollback capabilities. Customize the configuration files to match your specific environment and requirements.