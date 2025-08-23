#!/bin/bash

# Start Monitoring Infrastructure
# This script starts all monitoring services for the multi-service architecture

set -e

echo "🚀 Starting Multi-Service Monitoring Infrastructure..."

# Create necessary directories
mkdir -p logs
mkdir -p monitoring/prometheus/data
mkdir -p monitoring/grafana/data
mkdir -p monitoring/elasticsearch/data
mkdir -p monitoring/alertmanager/data

# Set permissions
chmod -R 755 monitoring/

echo "📊 Starting monitoring services with Docker Compose..."

# Start monitoring stack
docker-compose -f monitoring/docker-compose.monitoring.yml up -d

echo "⏳ Waiting for services to be ready..."

# Wait for Elasticsearch
echo "Waiting for Elasticsearch..."
until curl -s http://localhost:9200/_cluster/health | grep -q '"status":"yellow\|green"'; do
  echo "Elasticsearch is not ready yet..."
  sleep 5
done
echo "✅ Elasticsearch is ready"

# Wait for Prometheus
echo "Waiting for Prometheus..."
until curl -s http://localhost:9090/-/ready | grep -q "Prometheus is Ready"; do
  echo "Prometheus is not ready yet..."
  sleep 5
done
echo "✅ Prometheus is ready"

# Wait for Grafana
echo "Waiting for Grafana..."
until curl -s http://localhost:3000/api/health | grep -q '"database":"ok"'; do
  echo "Grafana is not ready yet..."
  sleep 5
done
echo "✅ Grafana is ready"

# Wait for Jaeger
echo "Waiting for Jaeger..."
until curl -s http://localhost:16686/ > /dev/null; do
  echo "Jaeger is not ready yet..."
  sleep 5
done
echo "✅ Jaeger is ready"

echo ""
echo "🎉 Monitoring infrastructure is ready!"
echo ""
echo "📊 Access URLs:"
echo "  Grafana:      http://localhost:3000 (admin/admin123)"
echo "  Prometheus:   http://localhost:9090"
echo "  Kibana:       http://localhost:5601"
echo "  Jaeger:       http://localhost:16686"
echo "  AlertManager: http://localhost:9093"
echo ""
echo "📈 Metrics endpoints for services should be available at:"
echo "  API Gateway:         http://localhost:8000/metrics"
echo "  Authentication:      http://localhost:8001/metrics"
echo "  Payment Service:     http://localhost:8002/metrics"
echo "  Notification:        http://localhost:8003/metrics"
echo "  Search Service:      http://localhost:8004/metrics"
echo "  File Service:        http://localhost:8005/metrics"
echo "  Analytics Service:   http://localhost:8006/metrics"
echo ""
echo "🔍 To view logs in Kibana:"
echo "  1. Go to http://localhost:5601"
echo "  2. Create index patterns for: logs-*, errors-*, requests-*"
echo "  3. Use the Discover tab to explore logs"
echo ""
echo "📊 To view metrics in Grafana:"
echo "  1. Go to http://localhost:3000"
echo "  2. Login with admin/admin123"
echo "  3. Dashboards are pre-configured and available"
echo ""
echo "🚨 To configure alerts:"
echo "  1. Update monitoring/alertmanager/alertmanager.yml with your notification settings"
echo "  2. Restart AlertManager: docker-compose -f monitoring/docker-compose.monitoring.yml restart alertmanager"
echo ""

# Create Kibana index patterns automatically
echo "🔧 Setting up Kibana index patterns..."
sleep 10  # Give Kibana more time to fully start

# Create index patterns
curl -X POST "localhost:5601/api/saved_objects/index-pattern/logs-*" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "attributes": {
      "title": "logs-*",
      "timeFieldName": "@timestamp"
    }
  }' 2>/dev/null || echo "Index pattern logs-* may already exist"

curl -X POST "localhost:5601/api/saved_objects/index-pattern/errors-*" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "attributes": {
      "title": "errors-*",
      "timeFieldName": "@timestamp"
    }
  }' 2>/dev/null || echo "Index pattern errors-* may already exist"

curl -X POST "localhost:5601/api/saved_objects/index-pattern/requests-*" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "attributes": {
      "title": "requests-*",
      "timeFieldName": "@timestamp"
    }
  }' 2>/dev/null || echo "Index pattern requests-* may already exist"

echo "✅ Kibana index patterns configured"

echo ""
echo "🎯 Monitoring setup complete! All services are running and configured."
echo "📚 Check the README.md for detailed usage instructions."