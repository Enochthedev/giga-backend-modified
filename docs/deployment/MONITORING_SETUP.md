# Multi-Service Monitoring Setup

This document provides a comprehensive guide for the monitoring and observability infrastructure implemented for the multi-service architecture.

## 🏗️ Overview

The monitoring setup includes:

- **Centralized Logging** with ELK Stack (Elasticsearch, Logstash, Kibana)
- **Metrics Collection** with Prometheus and Grafana
- **Distributed Tracing** with Jaeger
- **Alerting** with AlertManager
- **Health Monitoring** for all services

## 🚀 Quick Start

### 1. Start Monitoring Infrastructure

```bash
# Start all monitoring services
./monitoring/start-monitoring.sh

# Test the setup
./monitoring/test-monitoring.sh
```

### 2. Access Monitoring UIs

| Service | URL | Credentials |
|---------|-----|-------------|
| Grafana | http://localhost:3000 | admin/admin123 |
| Prometheus | http://localhost:9090 | - |
| Kibana | http://localhost:5601 | - |
| Jaeger | http://localhost:16686 | - |
| AlertManager | http://localhost:9093 | - |

### 3. Integrate Services

Add monitoring to your services using the common package:

```typescript
import { setupMonitoring, metricsMiddleware, requestTrackingMiddleware } from '@giga/common';

const { logger, tracingService, config } = setupMonitoring('your-service-name');

app.use(requestTrackingMiddleware(config));
app.get('/metrics', metricsMiddleware());
```

## 📊 Features

### Metrics Collection
- HTTP request metrics (rate, duration, errors)
- Business metrics (payments, orders, registrations)
- System metrics (CPU, memory, disk)
- Database metrics (connections, query duration)
- Queue metrics (length, processing time)

### Centralized Logging
- Structured JSON logging
- Correlation ID tracking
- Error aggregation
- Request/response logging
- Business event logging

### Distributed Tracing
- End-to-end request tracing
- Database operation tracing
- External service call tracing
- Message queue tracing
- Performance bottleneck identification

### Alerting
- Service health alerts
- Performance threshold alerts
- Business metric alerts
- Infrastructure alerts
- Multi-channel notifications (email, Slack)

## 📈 Pre-configured Dashboards

### System Overview Dashboard
- Service health status
- Request rates and error rates
- Response time percentiles
- System resource usage
- Database and queue metrics

### Business Metrics Dashboard
- Payment transaction rates and success rates
- User registration trends
- Order processing metrics
- File upload statistics
- Search query analytics

## 🚨 Alert Rules

### Critical Alerts
- Service down (1 minute)
- High error rate (>10% for 5 minutes)
- High memory usage (>90% for 5 minutes)
- Disk space low (<10%)
- Payment failure rate high (>5% for 3 minutes)

### Warning Alerts
- High response time (>1 second for 5 minutes)
- High CPU usage (>80% for 5 minutes)
- Database connection pool high (>80% for 2 minutes)
- Authentication failure rate high (>20% for 5 minutes)

## 🔧 Configuration

### Adding New Services

1. **Update Prometheus configuration** (`monitoring/prometheus.yml`):
```yaml
- job_name: 'new-service'
  static_configs:
    - targets: ['new-service:8080']
  metrics_path: '/metrics'
```

2. **Add service to monitoring** in your service code:
```typescript
import { setupMonitoring } from '@giga/common';
const { logger, tracingService, config } = setupMonitoring('new-service');
```

3. **Restart monitoring stack**:
```bash
docker-compose -f monitoring/docker-compose.monitoring.yml restart prometheus
```

### Custom Metrics

Add business-specific metrics:

```typescript
import { Counter, Histogram } from 'prom-client';

const customMetric = new Counter({
  name: 'custom_operations_total',
  help: 'Total custom operations',
  labelNames: ['operation', 'status']
});

customMetric.inc({ operation: 'process', status: 'success' });
```

### Custom Alerts

Add new alert rules to `monitoring/prometheus/rules/service-alerts.yml`:

```yaml
- alert: CustomAlert
  expr: custom_operations_total{status="failed"} > 10
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High failure rate for custom operations"
```

## 🔍 Troubleshooting

### Common Issues

1. **Services not appearing in Prometheus**
   - Verify `/metrics` endpoint is exposed
   - Check network connectivity
   - Review Prometheus configuration

2. **Logs not in Kibana**
   - Check Logstash processing
   - Verify log format
   - Ensure index patterns exist

3. **No traces in Jaeger**
   - Verify tracing initialization
   - Check Jaeger connectivity
   - Ensure proper instrumentation

### Health Checks

```bash
# Check all services
docker-compose -f monitoring/docker-compose.monitoring.yml ps

# Test endpoints
curl http://localhost:9090/-/ready  # Prometheus
curl http://localhost:9200/_cluster/health  # Elasticsearch
curl http://localhost:3000/api/health  # Grafana
```

## 📚 Best Practices

### Logging
- Use structured JSON format
- Include correlation IDs
- Log at appropriate levels
- Avoid sensitive data

### Metrics
- Use descriptive names
- Add relevant labels
- Monitor both technical and business metrics
- Set up meaningful alerts

### Tracing
- Trace critical user journeys
- Add meaningful span names
- Include relevant attributes
- Monitor sampling rates

## 🔒 Security

### Production Considerations
- Change default passwords
- Use TLS for external access
- Implement authentication
- Restrict network access
- Set up proper retention policies

### Data Privacy
- Avoid logging PII
- Implement data anonymization
- Set up log retention policies
- Use secure communication channels

## 📈 Scaling

### High-Volume Environments
- Use Elasticsearch cluster
- Implement Prometheus federation
- Use log sampling
- Configure proper retention
- Monitor resource usage

## 🤝 Contributing

When adding monitoring features:
1. Update documentation
2. Add appropriate tests
3. Update dashboards
4. Add relevant alerts
5. Follow naming conventions

## 📞 Support

For monitoring issues:
1. Check troubleshooting guide
2. Review service logs
3. Verify configurations
4. Test connectivity
5. Consult tool documentation

---

For detailed setup instructions, see [monitoring/README.md](monitoring/README.md)