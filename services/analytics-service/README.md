# Analytics Service

A comprehensive analytics and business intelligence service that provides event tracking, real-time analytics dashboards, A/B testing framework, and business intelligence reporting capabilities.

## Features

### 📊 Event Tracking
- Real-time event ingestion with batch processing
- Support for multiple event types (page views, user actions, transactions)
- Flexible event properties and metadata
- Session and user tracking

### 🚀 Real-time Analytics
- Live dashboard with key metrics
- Real-time user activity monitoring
- Performance metrics and KPIs
- Custom analytics queries

### 🧪 A/B Testing & Feature Flags
- Feature flag management with conditions and rollout percentages
- A/B test creation and management
- Statistical analysis of test results
- User segmentation and targeting

### 📈 Business Intelligence
- Revenue and performance metrics
- Conversion funnel analysis
- Key Performance Indicators (KPIs)
- Automated report generation
- Custom dashboard creation

### 🏗️ Technical Features
- ClickHouse for high-performance analytics storage
- Redis for caching and real-time data
- Batch processing for optimal performance
- RESTful API with comprehensive validation
- TypeScript for type safety
- Comprehensive test coverage

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Apps   │───▶│  Analytics API  │───▶│   ClickHouse    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │                         │
                              ▼                         │
                       ┌─────────────────┐              │
                       │     Redis       │              │
                       │   (Caching)     │              │
                       └─────────────────┘              │
                              │                         │
                              ▼                         ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Dashboard     │    │   Reports &     │
                       │   Service       │    │   Analytics     │
                       └─────────────────┘    └─────────────────┘
```

## Installation

### Prerequisites
- Node.js 18+
- ClickHouse database
- Redis server
- Docker (optional)

### Local Development

1. **Clone and install dependencies:**
   ```bash
   cd services/analytics-service
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start ClickHouse and Redis:**
   ```bash
   # Using Docker
   docker run -d --name clickhouse-server -p 8123:8123 clickhouse/clickhouse-server
   docker run -d --name redis -p 6379:6379 redis:alpine
   ```

4. **Run the service:**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm run build
   npm start
   ```

### Docker Deployment

```bash
# Build the image
docker build -t analytics-service .

# Run the container
docker run -d \
  --name analytics-service \
  -p 3007:3007 \
  -e CLICKHOUSE_HOST=clickhouse-server \
  -e REDIS_URL=redis://redis:6379 \
  analytics-service
```

## API Documentation

### Event Tracking

#### Track Single Event
```http
POST /api/analytics/track
Content-Type: application/json

{
  "eventName": "page_view",
  "properties": {
    "page": "/home",
    "title": "Homepage"
  },
  "userId": "user123",
  "sessionId": "session456"
}
```

#### Track Multiple Events
```http
POST /api/analytics/track/batch
Content-Type: application/json

{
  "events": [
    {
      "eventName": "page_view",
      "properties": { "page": "/home" },
      "userId": "user123"
    },
    {
      "eventName": "button_click",
      "properties": { "button": "signup" },
      "userId": "user123"
    }
  ]
}
```

### Analytics Queries

#### Query Analytics Data
```http
POST /api/analytics/query
Content-Type: application/json

{
  "eventTypes": ["page_view", "user_action"],
  "dateFrom": "2023-01-01T00:00:00Z",
  "dateTo": "2023-12-31T23:59:59Z",
  "groupBy": ["event_name"],
  "aggregations": ["count", "unique"],
  "limit": 100
}
```

#### Get Real-time Metrics
```http
GET /api/analytics/metrics/realtime
```

### Feature Flags

#### Evaluate Feature Flag
```http
POST /api/feature-flags/flags/new_feature/evaluate
Content-Type: application/json

{
  "userId": "user123",
  "attributes": {
    "country": "US",
    "plan": "premium"
  }
}
```

#### Create Feature Flag
```http
POST /api/feature-flags/flags
Content-Type: application/json

{
  "name": "New Feature",
  "key": "new_feature",
  "type": "boolean",
  "isEnabled": true,
  "value": true,
  "rolloutPercentage": 50,
  "createdBy": "admin"
}
```

### A/B Testing

#### Create A/B Test
```http
POST /api/feature-flags/ab-tests
Content-Type: application/json

{
  "name": "Homepage Redesign",
  "status": "running",
  "variants": [
    {
      "id": "control",
      "name": "Control",
      "allocation": 50,
      "config": { "layout": "original" },
      "isControl": true
    },
    {
      "id": "variant_a",
      "name": "New Design",
      "allocation": 50,
      "config": { "layout": "new" }
    }
  ],
  "metrics": [
    {
      "id": "conversion",
      "name": "Conversion Rate",
      "type": "conversion",
      "aggregation": "rate",
      "isPrimary": true
    }
  ],
  "createdBy": "admin"
}
```

### Dashboard

#### Get Real-time Dashboard
```http
GET /api/dashboard/realtime
```

#### Create Custom Dashboard
```http
POST /api/dashboard
Content-Type: application/json

{
  "name": "Sales Dashboard",
  "description": "Revenue and conversion metrics",
  "widgets": [
    {
      "type": "metric",
      "title": "Total Revenue",
      "query": {
        "eventTypes": ["transaction"],
        "aggregations": ["sum"]
      },
      "config": {
        "format": "currency"
      }
    }
  ],
  "createdBy": "admin"
}
```

#### Get Business Intelligence Reports
```http
GET /api/dashboard/bi/revenue?startDate=2023-01-01&endDate=2023-12-31
GET /api/dashboard/bi/performance?startDate=2023-01-01&endDate=2023-12-31
GET /api/dashboard/bi/kpis?category=revenue
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3007` |
| `NODE_ENV` | Environment | `development` |
| `CLICKHOUSE_HOST` | ClickHouse host | `localhost:8123` |
| `CLICKHOUSE_USERNAME` | ClickHouse username | `default` |
| `CLICKHOUSE_PASSWORD` | ClickHouse password | `` |
| `CLICKHOUSE_DATABASE` | ClickHouse database | `analytics` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` |
| `JWT_SECRET` | JWT secret key | Required |
| `ANALYTICS_BATCH_SIZE` | Event batch size | `1000` |
| `ANALYTICS_FLUSH_INTERVAL` | Batch flush interval (ms) | `30000` |
| `FEATURE_FLAGS_CACHE_TTL` | Flag cache TTL (seconds) | `300` |
| `LOG_LEVEL` | Logging level | `info` |

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- analytics.service.test.ts
```

## Performance Considerations

### Event Ingestion
- Events are batched for optimal ClickHouse performance
- Configurable batch size and flush intervals
- Asynchronous processing to avoid blocking API responses

### Caching Strategy
- Redis caching for frequently accessed data
- Configurable TTL for different data types
- Cache invalidation on data updates

### Query Optimization
- Proper ClickHouse table partitioning by date
- Optimized column ordering for query performance
- TTL policies for data retention

## Monitoring and Observability

### Health Checks
- `/health` endpoint for service health
- Database connection monitoring
- Memory and performance metrics

### Logging
- Structured JSON logging with Winston
- Configurable log levels
- Request/response logging
- Error tracking and alerting

### Metrics
- Real-time performance metrics
- Business KPIs and dashboards
- A/B test statistical analysis
- Custom analytics queries

## Security

### Authentication
- JWT token-based authentication
- Role-based access control
- API rate limiting

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- Secure data storage practices
- GDPR compliance features

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.