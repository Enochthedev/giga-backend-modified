# Production Deployment Guide

This guide provides comprehensive instructions for deploying the Multi-Service Platform to production environments. It covers Docker Swarm, Kubernetes, and cloud deployment strategies.

## 🎯 Deployment Options Overview

| Method | Complexity | Scalability | Management | Best For |
|--------|------------|-------------|------------|----------|
| **Docker Swarm** | Low | Medium | Easy | Small to medium deployments |
| **Kubernetes** | High | High | Complex | Large scale, enterprise |
| **Cloud Services** | Medium | High | Managed | Cloud-native deployments |
| **VM/Bare Metal** | Medium | Low | Manual | Legacy infrastructure |

## 🐳 Docker Swarm Deployment (Recommended for Most)

### Prerequisites

- Docker Engine 20.10+
- Docker Swarm cluster initialized
- Load balancer (nginx, HAProxy, or cloud LB)
- SSL certificates
- Monitoring solution

### 1. Initialize Docker Swarm

```bash
# On manager node
docker swarm init --advertise-addr <MANAGER-IP>

# On worker nodes (run the join command from init output)
docker swarm join --token <TOKEN> <MANAGER-IP>:2377

# Verify cluster
docker node ls
```

### 2. Create Production Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  # Infrastructure Services
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: multi_service_platform
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - backend
    secrets:
      - postgres_password
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.role == manager
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 1G
          cpus: '0.5'

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass_file /run/secrets/redis_password
    volumes:
      - redis_data:/data
    networks:
      - backend
    secrets:
      - redis_password
    deploy:
      replicas: 1
      resources:
        limits:
          memory: 512M
          cpus: '0.5'

  rabbitmq:
    image: rabbitmq:3-management-alpine
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS_FILE: /run/secrets/rabbitmq_password
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    networks:
      - backend
    secrets:
      - rabbitmq_password
    deploy:
      replicas: 1
      resources:
        limits:
          memory: 1G
          cpus: '0.5'

  # Core Services
  api-gateway:
    image: your-registry.com/multi-service-platform/api-gateway:${VERSION:-latest}
    environment:
      NODE_ENV: production
      PORT: 3000
      REDIS_URL: redis://redis:6379
      REDIS_PASSWORD_FILE: /run/secrets/redis_password
    networks:
      - frontend
      - backend
    secrets:
      - redis_password
      - jwt_secret
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'

  authentication-service:
    image: your-registry.com/multi-service-platform/authentication-service:${VERSION:-latest}
    environment:
      NODE_ENV: production
      PORT: 3001
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: auth_db
      DB_USER: postgres
      DB_PASSWORD_FILE: /run/secrets/postgres_password
      REDIS_URL: redis://redis:6379
      REDIS_PASSWORD_FILE: /run/secrets/redis_password
      JWT_SECRET_FILE: /run/secrets/jwt_secret
    networks:
      - backend
    secrets:
      - postgres_password
      - redis_password
      - jwt_secret
    deploy:
      replicas: 2
      update_config:
        parallelism: 1
        delay: 10s
      resources:
        limits:
          memory: 512M
          cpus: '0.5'

  # Load Balancer
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    networks:
      - frontend
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 128M
          cpus: '0.25'

# Secrets
secrets:
  postgres_password:
    external: true
  redis_password:
    external: true
  rabbitmq_password:
    external: true
  jwt_secret:
    external: true

# Networks
networks:
  frontend:
    driver: overlay
    attachable: true
  backend:
    driver: overlay
    internal: true

# Volumes
volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  rabbitmq_data:
    driver: local
```

### 3. Create Secrets

```bash
# Create secrets
echo "your-secure-postgres-password" | docker secret create postgres_password -
echo "your-secure-redis-password" | docker secret create redis_password -
echo "your-secure-rabbitmq-password" | docker secret create rabbitmq_password -
echo "your-super-secure-jwt-secret-key" | docker secret create jwt_secret -

# Verify secrets
docker secret ls
```

### 4. Deploy Stack

```bash
# Deploy the stack
docker stack deploy -c docker-compose.prod.yml platform

# Check deployment
docker stack services platform
docker stack ps platform

# View logs
docker service logs platform_api-gateway
```

### 5. Configure Load Balancer

```nginx
# nginx/nginx.conf
upstream api_gateway {
    server platform_api-gateway:3000;
}

upstream auth_service {
    server platform_authentication-service:3001;
}

server {
    listen 80;
    server_name api.yourplatform.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourplatform.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

    # API Gateway
    location / {
        proxy_pass http://api_gateway;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Direct service access (optional)
    location /auth/ {
        proxy_pass http://auth_service/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## ☸️ Kubernetes Deployment (Enterprise Scale)

### Prerequisites

- Kubernetes cluster 1.24+
- kubectl configured
- Helm 3.0+
- Ingress controller (nginx, traefik)
- Cert-manager for SSL
- Monitoring stack (Prometheus, Grafana)

### 1. Quick Deployment with Helm

```bash
# Add Helm repositories
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Deploy with Helm
helm install platform ./k8s/charts/multi-service-platform/ \
  --namespace multi-service-platform \
  --create-namespace \
  --values ./k8s/values/production/values.yaml
```

### 2. Manual Kubernetes Deployment

```bash
# Deploy infrastructure
kubectl apply -f k8s/manifests/00-namespace.yaml
kubectl apply -f k8s/manifests/01-rbac.yaml
kubectl apply -f k8s/manifests/02-configmap.yaml
kubectl apply -f k8s/manifests/03-secrets.yaml

# Deploy services
kubectl apply -f k8s/manifests/04-api-gateway.yaml
kubectl apply -f k8s/manifests/05-authentication-service.yaml
# ... continue with other services

# Deploy ingress and SSL
kubectl apply -f k8s/manifests/12-cert-manager.yaml
kubectl apply -f k8s/manifests/13-ingress-routes.yaml

# Deploy monitoring
kubectl apply -f k8s/manifests/15-hpa-configurations.yaml
```

### 3. Production Values Configuration

```yaml
# k8s/values/production/values.yaml
global:
  imageRegistry: "your-registry.com"
  imagePullSecrets:
    - name: registry-secret

app:
  environment: production

security:
  jwtSecret: "your-production-jwt-secret"
  corsOrigin: "https://yourapp.com"

ingress:
  enabled: true
  className: "nginx"
  hosts:
    - host: api.yourplatform.com
  tls:
    - secretName: platform-tls
      hosts:
        - api.yourplatform.com

postgresql:
  enabled: true
  auth:
    postgresPassword: "secure-production-password"
  primary:
    persistence:
      enabled: true
      size: 100Gi
      storageClass: "fast-ssd"
    resources:
      requests:
        memory: "2Gi"
        cpu: "1000m"
      limits:
        memory: "4Gi"
        cpu: "2000m"

redis:
  enabled: true
  auth:
    enabled: true
    password: "secure-redis-password"
  master:
    persistence:
      enabled: true
      size: 20Gi
    resources:
      requests:
        memory: "512Mi"
        cpu: "500m"
      limits:
        memory: "1Gi"
        cpu: "1000m"

# Service configurations
apiGateway:
  replicaCount: 3
  resources:
    requests:
      memory: "256Mi"
      cpu: "250m"
    limits:
      memory: "512Mi"
      cpu: "500m"
  autoscaling:
    enabled: true
    minReplicas: 3
    maxReplicas: 10
    targetCPUUtilizationPercentage: 70

authenticationService:
  replicaCount: 2
  resources:
    requests:
      memory: "256Mi"
      cpu: "250m"
    limits:
      memory: "512Mi"
      cpu: "500m"
```

### 4. Deploy with Istio Service Mesh

```bash
# Install Istio
istioctl install -f k8s/istio/enhanced-istio-installation.yaml -y

# Deploy Istio configuration
kubectl apply -f k8s/istio/gateway-configuration.yaml
kubectl apply -f k8s/istio/virtual-services.yaml
kubectl apply -f k8s/istio/destination-rules-enhanced.yaml
kubectl apply -f k8s/istio/security-policies-enhanced.yaml
```

## ☁️ Cloud Deployment Strategies

### AWS Deployment

#### Option 1: ECS with Fargate

```yaml
# ecs-task-definition.json
{
  "family": "multi-service-platform",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "api-gateway",
      "image": "your-account.dkr.ecr.region.amazonaws.com/api-gateway:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/multi-service-platform",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### Option 2: EKS (Kubernetes on AWS)

```bash
# Create EKS cluster
eksctl create cluster \
  --name multi-service-platform \
  --version 1.24 \
  --region us-east-1 \
  --nodegroup-name standard-workers \
  --node-type m5.large \
  --nodes 3 \
  --nodes-min 1 \
  --nodes-max 10 \
  --managed

# Deploy application
kubectl apply -f k8s/manifests/
```

### Google Cloud Platform

```bash
# Create GKE cluster
gcloud container clusters create multi-service-platform \
  --zone us-central1-a \
  --num-nodes 3 \
  --enable-autoscaling \
  --min-nodes 1 \
  --max-nodes 10 \
  --machine-type n1-standard-2

# Deploy application
kubectl apply -f k8s/manifests/
```

### Azure

```bash
# Create AKS cluster
az aks create \
  --resource-group myResourceGroup \
  --name multi-service-platform \
  --node-count 3 \
  --enable-addons monitoring \
  --generate-ssh-keys

# Deploy application
kubectl apply -f k8s/manifests/
```

## 🔒 Security Configuration

### 1. SSL/TLS Configuration

```bash
# Generate SSL certificates with Let's Encrypt
certbot certonly --standalone -d api.yourplatform.com

# Or use cert-manager in Kubernetes
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.2/cert-manager.yaml
```

### 2. Secrets Management

#### Docker Swarm
```bash
# Use Docker secrets
echo "secret-value" | docker secret create secret-name -
```

#### Kubernetes
```bash
# Create secrets
kubectl create secret generic platform-secrets \
  --from-literal=jwt-secret=your-jwt-secret \
  --from-literal=postgres-password=your-postgres-password
```

#### Cloud Secrets
```bash
# AWS Secrets Manager
aws secretsmanager create-secret \
  --name platform/jwt-secret \
  --secret-string "your-jwt-secret"

# Google Secret Manager
gcloud secrets create jwt-secret --data-file=-

# Azure Key Vault
az keyvault secret set \
  --vault-name your-keyvault \
  --name jwt-secret \
  --value "your-jwt-secret"
```

### 3. Network Security

```yaml
# Kubernetes Network Policy
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: platform-network-policy
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: multi-service-platform
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app.kubernetes.io/name: multi-service-platform
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to:
    - podSelector:
        matchLabels:
          app.kubernetes.io/name: multi-service-platform
```

## 📊 Monitoring & Observability

### 1. Prometheus & Grafana Setup

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'platform-services'
    static_configs:
      - targets: ['api-gateway:3000', 'authentication-service:3001']
    metrics_path: /metrics
    scrape_interval: 30s

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

### 2. Logging Configuration

```yaml
# logging/fluentd.conf
<source>
  @type forward
  port 24224
  bind 0.0.0.0
</source>

<match platform.**>
  @type elasticsearch
  host elasticsearch
  port 9200
  index_name platform-logs
  type_name _doc
</match>
```

### 3. Health Checks & Alerts

```yaml
# alerting/rules.yml
groups:
- name: platform.rules
  rules:
  - alert: ServiceDown
    expr: up == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Service {{ $labels.instance }} is down"

  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "High error rate on {{ $labels.instance }}"
```

## 🚀 CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Build and push Docker images
      run: |
        docker build -t ${{ secrets.REGISTRY }}/api-gateway:${{ github.sha }} ./services/api-gateway
        docker push ${{ secrets.REGISTRY }}/api-gateway:${{ github.sha }}
    
    - name: Deploy to Kubernetes
      run: |
        kubectl set image deployment/api-gateway api-gateway=${{ secrets.REGISTRY }}/api-gateway:${{ github.sha }}
        kubectl rollout status deployment/api-gateway
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - build
  - deploy

build:
  stage: build
  script:
    - docker build -t $CI_REGISTRY_IMAGE/api-gateway:$CI_COMMIT_SHA ./services/api-gateway
    - docker push $CI_REGISTRY_IMAGE/api-gateway:$CI_COMMIT_SHA

deploy:
  stage: deploy
  script:
    - kubectl set image deployment/api-gateway api-gateway=$CI_REGISTRY_IMAGE/api-gateway:$CI_COMMIT_SHA
    - kubectl rollout status deployment/api-gateway
  only:
    - main
```

## 🔧 Database Management

### 1. Database Migrations

```bash
# Run migrations in production
kubectl exec -it deployment/authentication-service -- pnpm run migrate

# Or with Docker Swarm
docker exec $(docker ps -q -f name=platform_authentication-service) pnpm run migrate
```

### 2. Database Backups

```bash
# PostgreSQL backup script
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
docker exec postgres pg_dump -U postgres multi_service_platform > $BACKUP_DIR/backup_$DATE.sql

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/backup_$DATE.sql s3://your-backup-bucket/

# Cleanup old backups (keep last 7 days)
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
```

### 3. Database Scaling

```yaml
# PostgreSQL with read replicas
postgres-primary:
  image: postgres:15
  environment:
    POSTGRES_REPLICATION_MODE: master
    POSTGRES_REPLICATION_USER: replicator
    POSTGRES_REPLICATION_PASSWORD: replicator_password

postgres-replica:
  image: postgres:15
  environment:
    POSTGRES_REPLICATION_MODE: slave
    POSTGRES_REPLICATION_USER: replicator
    POSTGRES_REPLICATION_PASSWORD: replicator_password
    POSTGRES_MASTER_HOST: postgres-primary
```

## 📈 Performance Optimization

### 1. Resource Allocation

```yaml
# Kubernetes resource requests and limits
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

### 2. Horizontal Pod Autoscaling

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### 3. Caching Strategy

```yaml
# Redis cluster for high availability
redis-cluster:
  image: redis:7-alpine
  command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf
  deploy:
    replicas: 6
```

## 🔄 Disaster Recovery

### 1. Backup Strategy

```bash
# Automated backup script
#!/bin/bash
# backup.sh

# Database backup
kubectl exec deployment/postgres -- pg_dump -U postgres multi_service_platform | gzip > db_backup_$(date +%Y%m%d).sql.gz

# File storage backup
kubectl exec deployment/file-service -- tar -czf - /app/uploads | aws s3 cp - s3://backup-bucket/uploads_$(date +%Y%m%d).tar.gz

# Configuration backup
kubectl get all,configmap,secret -o yaml > k8s_backup_$(date +%Y%m%d).yaml
```

### 2. Recovery Procedures

```bash
# Database recovery
gunzip -c db_backup_20231201.sql.gz | kubectl exec -i deployment/postgres -- psql -U postgres multi_service_platform

# File storage recovery
aws s3 cp s3://backup-bucket/uploads_20231201.tar.gz - | kubectl exec -i deployment/file-service -- tar -xzf - -C /app/

# Service recovery
kubectl apply -f k8s_backup_20231201.yaml
```

## 📋 Production Checklist

### Pre-Deployment

- [ ] SSL certificates configured
- [ ] Secrets properly managed
- [ ] Database migrations tested
- [ ] Load balancer configured
- [ ] Monitoring stack deployed
- [ ] Backup procedures tested
- [ ] Security scanning completed
- [ ] Performance testing done

### Post-Deployment

- [ ] Health checks passing
- [ ] Monitoring alerts configured
- [ ] Log aggregation working
- [ ] Backup jobs scheduled
- [ ] SSL certificates auto-renewal
- [ ] Performance metrics baseline
- [ ] Security monitoring active
- [ ] Documentation updated

### Ongoing Maintenance

- [ ] Regular security updates
- [ ] Database maintenance
- [ ] Log rotation configured
- [ ] Capacity planning
- [ ] Disaster recovery testing
- [ ] Performance optimization
- [ ] Cost optimization
- [ ] Team training

## 🆘 Troubleshooting Production Issues

### Common Issues

#### 1. Service Discovery Problems
```bash
# Check DNS resolution
kubectl exec -it pod-name -- nslookup service-name

# Check service endpoints
kubectl get endpoints
```

#### 2. Database Connection Issues
```bash
# Check database connectivity
kubectl exec -it deployment/postgres -- psql -U postgres -c "SELECT 1"

# Check connection pool
kubectl logs deployment/authentication-service | grep "database"
```

#### 3. Memory/CPU Issues
```bash
# Check resource usage
kubectl top pods
kubectl top nodes

# Check for OOMKilled pods
kubectl get pods | grep OOMKilled
```

#### 4. SSL/TLS Issues
```bash
# Check certificate validity
openssl s_client -connect api.yourplatform.com:443 -servername api.yourplatform.com

# Check cert-manager status
kubectl get certificates
kubectl describe certificate platform-tls
```

### Emergency Procedures

#### 1. Scale Down/Up Services
```bash
# Scale down problematic service
kubectl scale deployment api-gateway --replicas=0

# Scale up after fix
kubectl scale deployment api-gateway --replicas=3
```

#### 2. Rollback Deployment
```bash
# Rollback to previous version
kubectl rollout undo deployment/api-gateway

# Check rollout status
kubectl rollout status deployment/api-gateway
```

#### 3. Emergency Maintenance Mode
```bash
# Enable maintenance mode (nginx config)
location / {
    return 503 "Service temporarily unavailable";
}
```

## 📞 Support & Escalation

### Monitoring Contacts

- **Level 1**: Development team (response: 15 minutes)
- **Level 2**: DevOps team (response: 30 minutes)
- **Level 3**: Architecture team (response: 1 hour)

### Critical Issue Response

1. **Immediate**: Page on-call engineer
2. **5 minutes**: Assess impact and severity
3. **15 minutes**: Implement immediate mitigation
4. **30 minutes**: Root cause analysis
5. **1 hour**: Permanent fix deployment
6. **24 hours**: Post-mortem report

---

**Production deployment complete! 🚀**

Your multi-service platform is now ready for enterprise-scale production workloads.