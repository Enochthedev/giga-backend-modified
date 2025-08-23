# Multi-Service Monitoring Infrastructure

This directory contains the complete monitoring and observability setup for the multi-service architecture, including centralized logging, metrics collection, distributed tracing, and alerting.

## 🏗️ Architecture Overview

The monitoring infrastructure consists of:

- **ELK Stack** (Elasticsearch, Logstash, Kibana) for centralized logging
- **Prometheus** for metrics collection
- **Grafana** for dashboards and visualization
- **Jaeger** for distributed tracing
- **AlertManager** for alerting and notifications

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose installed
- At least 4GB of available RAM
- Ports 3000, 5601, 9090, 9093, 9200, 16686 available

### Start Monitoring Infrastructure

```bash
# Make scripts executable
chmod +x monitoring/start-monitoring.sh monitoring/stop-monitoring.sh

# Start all monitoring services
./monitoring/start-monitoring.sh
```

### Stop Monitoring Infrastructure

```bash
# Stop all services
./monitoring/stop-monitoring.sh

# Stop and remove all data
docker-compose -f monitoring/docker-compose.monitoring.yml down -v
```

## 📊 Service URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| Grafana | http://localhost:3000 | admin/admin123 |
| Prometheus | http://localhost:9090 | - |
| Kibana | http://localhost:5601 | - |
| Jaeger | http://localhost:16686 | - |
| AlertManager | http://localhost:9093 | - |

## 📈 Metrics Collection

### Service Metrics Endpoints

Each service should expose metrics at `/metrics` endpoint:

```
API Gateway:         http://localhost:8000/metrics
Authentication:      http://localhost:8001/metrics
Payment Service:     http://localhost:8002/metrics
Notification:        http://localhost:8003/metrics
Search Service:      http://localhost:8004/metrics
File Service:        http://localhost:8005/metrics
Analytics Service:   http://localhost:8006/metrics
```

### Adding Metrics to Your Service

1. **Install dependencies** in your service:
```bash
npm install prom-client @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
```

2. **Use the common monitoring package**:
```typescript
import { setupMonitoring, metricsMiddleware, requestTrackingMiddleware } from '@common/monitoring';

const app = express();
const { logger, tracingService, config } = setupMonitoring('your-service-name');

// Add monitoring middleware
app.use(requestTrackingMiddleware(config));
app.get('/metrics', metricsMiddleware());
app.get('/health', healthCheckMiddleware(config));
```

3. **Track business metrics**:
```typescript
import { paymentTransactionsTotal, ordersTotal } from '@common/monitoring';

// Track payment transactions
paymentTransactionsTotal.inc({
  status: 'success',
  gateway: 'stripe',
  currency: 'USD'
});

// Track orders
ordersTotal.inc({
  status: 'completed',
  service: 'ecommerce'
});
```

## 📋 Logging

### Log Formats

All services should use structured JSON logging:

```typescript
import { createLogger } from '@common/monitoring';

const logger = createLogger('your-service-name');

// Structured logging
logger.info('User created successfully', {
  userId: '12345',
  email: 'user@example.com',
  correlationId: req.correlationId
});

// Error logging
logger.error('Payment processing failed', {
  error: error,
  paymentId: 'pay_123',
  userId: '12345'
});
```

### Log Indices in Elasticsearch

- `logs-*` - General application logs
- `errors-*` - Error logs only
- `requests-*` - HTTP request logs
- `{service-name}-*` - Service-specific logs

### Viewing Logs in Kibana

1. Go to http://localhost:5601
2. Navigate to "Discover"
3. Select the appropriate index pattern
4. Use filters to search logs:
   - `level: ERROR` - Show only errors
   - `service: payment-service` - Show logs from specific service
   - `correlationId: "abc123"` - Trace specific request

## 🔍 Distributed Tracing

### Viewing Traces in Jaeger

1. Go to http://localhost:16686
2. Select service from dropdown
3. Click "Find Traces"
4. Click on individual traces to see detailed spans

### Adding Tracing to Your Code

```typescript
import { createTracingService } from '@common/monitoring';

const tracingService = createTracingService({
  serviceName: 'your-service-name'
});

// Trace async operations
const result = await tracingService.traceFunction(
  'process-payment',
  async () => {
    return await processPayment(paymentData);
  },
  {
    attributes: {
      'payment.amount': amount,
      'payment.currency': currency
    }
  }
);

// Trace database operations
const users = await tracingService.traceDatabaseOperation(
  'SELECT',
  'users',
  () => db.query('SELECT * FROM users WHERE active = true'),
  'SELECT * FROM users WHERE active = true'
);
```

## 📊 Dashboards

### Pre-configured Grafana Dashboards

1. **System Overview** - Service health, request rates, error rates
2. **Business Metrics** - Payment transactions, user registrations, orders

### Creating Custom Dashboards

1. Go to Grafana (http://localhost:3000)
2. Click "+" → "Dashboard"
3. Add panels with Prometheus queries:

```promql
# Request rate by service
sum(rate(http_requests_total[5m])) by (service)

# Error rate percentage
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100

# Response time 95th percentile
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (service, le))
```

## 🚨 Alerting

### Configured Alerts

- **Service Down** - When any service is unreachable
- **High Error Rate** - When error rate exceeds 10%
- **High Response Time** - When 95th percentile exceeds 1 second
- **High Memory Usage** - When memory usage exceeds 90%
- **High CPU Usage** - When CPU usage exceeds 80%
- **Payment Failure Rate** - When payment failures exceed 5%

### Configuring Notifications

Edit `monitoring/alertmanager/alertmanager.yml`:

```yaml
receivers:
  - name: 'critical-alerts'
    email_configs:
      - to: 'your-team@company.com'
        subject: 'CRITICAL: {{ .GroupLabels.alertname }}'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#alerts'
```

### Testing Alerts

```bash
# Simulate high error rate
curl -X POST http://localhost:9093/api/v1/alerts \
  -H "Content-Type: application/json" \
  -d '[{
    "labels": {
      "alertname": "TestAlert",
      "severity": "warning"
    },
    "annotations": {
      "summary": "Test alert"
    }
  }]'
```

## 🔧 Configuration

### Prometheus Configuration

Edit `monitoring/prometheus.yml` to add new services:

```yaml
scrape_configs:
  - job_name: 'new-service'
    static_configs:
      - targets: ['new-service:8080']
    metrics_path: '/metrics'
    scrape_interval: 10s
```

### Logstash Configuration

Edit `monitoring/logstash/config/logstash.conf` to customize log processing:

```ruby
filter {
  if [service] == "payment-service" {
    # Special processing for payment logs
    mutate {
      add_field => { "log_category" => "financial" }
    }
  }
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Services not appearing in Prometheus**
   - Check if service is exposing `/metrics` endpoint
   - Verify network connectivity between Prometheus and service
   - Check Prometheus logs: `docker logs prometheus`

2. **Logs not appearing in Kibana**
   - Verify Logstash is processing logs: `docker logs logstash`
   - Check if index patterns are created in Kibana
   - Ensure services are sending logs to Logstash port 5044

3. **Traces not appearing in Jaeger**
   - Verify tracing is initialized in service
   - Check Jaeger agent connectivity
   - Ensure JAEGER_ENDPOINT environment variable is set

4. **High resource usage**
   - Reduce Elasticsearch heap size in docker-compose
   - Decrease Prometheus retention time
   - Limit log retention in Logstash

### Checking Service Health

```bash
# Check all monitoring services
docker-compose -f monitoring/docker-compose.monitoring.yml ps

# Check specific service logs
docker logs elasticsearch
docker logs prometheus
docker logs grafana
docker logs jaeger

# Check service endpoints
curl http://localhost:9090/-/ready  # Prometheus
curl http://localhost:9200/_cluster/health  # Elasticsearch
curl http://localhost:3000/api/health  # Grafana
```

## 📚 Best Practices

### Logging Best Practices

1. **Use structured logging** with consistent field names
2. **Include correlation IDs** for request tracing
3. **Log at appropriate levels** (DEBUG, INFO, WARN, ERROR)
4. **Avoid logging sensitive data** (passwords, tokens, PII)
5. **Use consistent timestamp formats** (ISO 8601)

### Metrics Best Practices

1. **Use descriptive metric names** with consistent naming conventions
2. **Add relevant labels** but avoid high cardinality
3. **Track both technical and business metrics**
4. **Set up alerts for critical metrics**
5. **Monitor resource usage** (CPU, memory, disk)

### Tracing Best Practices

1. **Trace critical user journeys** end-to-end
2. **Add meaningful span names** and attributes
3. **Trace external service calls** and database operations
4. **Use correlation IDs** to link logs and traces
5. **Monitor trace sampling** to control overhead

## 🔒 Security Considerations

1. **Network Security**
   - Use internal networks for service communication
   - Restrict external access to monitoring UIs
   - Use TLS for production deployments

2. **Data Privacy**
   - Avoid logging sensitive information
   - Implement log retention policies
   - Use data anonymization where needed

3. **Access Control**
   - Change default passwords
   - Implement role-based access control
   - Use authentication for monitoring UIs

## 📈 Scaling Considerations

### For High-Volume Environments

1. **Elasticsearch Cluster**
   - Use multiple Elasticsearch nodes
   - Configure proper sharding and replication
   - Implement index lifecycle management

2. **Prometheus Federation**
   - Use Prometheus federation for multiple clusters
   - Implement long-term storage with Thanos
   - Use recording rules for expensive queries

3. **Log Sampling**
   - Implement log sampling for high-volume services
   - Use structured logging with appropriate levels
   - Consider using log aggregation before shipping

## 🤝 Contributing

When adding new monitoring features:

1. Update this README with new configurations
2. Add appropriate tests for monitoring code
3. Update Grafana dashboards if needed
4. Document new metrics and their purpose
5. Add alerts for critical new metrics

## 📞 Support

For monitoring-related issues:

1. Check the troubleshooting section above
2. Review service logs for errors
3. Verify configuration files
4. Check network connectivity between services
5. Consult the official documentation for each tool