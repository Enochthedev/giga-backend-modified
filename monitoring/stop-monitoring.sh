#!/bin/bash

# Stop Monitoring Infrastructure
# This script stops all monitoring services

set -e

echo "🛑 Stopping Multi-Service Monitoring Infrastructure..."

# Stop monitoring stack
docker-compose -f monitoring/docker-compose.monitoring.yml down

echo "🧹 Cleaning up..."

# Optional: Remove volumes (uncomment if you want to clean all data)
# echo "⚠️  Removing all monitoring data..."
# docker-compose -f monitoring/docker-compose.monitoring.yml down -v

echo "✅ Monitoring infrastructure stopped successfully!"
echo ""
echo "💡 To restart monitoring, run: ./monitoring/start-monitoring.sh"
echo "🗑️  To remove all monitoring data, run: docker-compose -f monitoring/docker-compose.monitoring.yml down -v"