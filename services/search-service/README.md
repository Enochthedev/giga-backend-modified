# Search Service

A comprehensive search service built with Elasticsearch, providing advanced search capabilities, autocomplete functionality, and personalized recommendations using collaborative filtering.

## Features

### Core Search Capabilities
- **Full-text search** with fuzzy matching and relevance scoring
- **Advanced filtering** by category, price range, location, rating, and custom attributes
- **Faceted navigation** with aggregations for categories, types, price ranges, and ratings
- **Geo-spatial search** with distance-based filtering
- **Sorting** by relevance, price, rating, and date
- **Pagination** with configurable page sizes

### Autocomplete & Suggestions
- **Real-time autocomplete** with edge n-gram tokenization
- **Typo correction** using term and phrase suggesters
- **Popular search terms** tracking and suggestions
- **Type-specific suggestions** for products and hotels
- **Fuzzy matching** for handling misspellings

### Recommendation Engine
- **Collaborative filtering** based on user interaction patterns
- **Content-based recommendations** using item similarity
- **Hybrid approach** combining multiple recommendation algorithms
- **User interaction tracking** (views, clicks, purchases, likes, shares)
- **Real-time recommendations** with caching for performance

### Performance & Scalability
- **Redis caching** for search results and recommendations
- **Elasticsearch optimization** with proper indexing and mappings
- **Rate limiting** to prevent abuse
- **Horizontal scaling** support
- **Health monitoring** and logging

## Technology Stack

- **Node.js** with TypeScript
- **Express.js** for REST API
- **Elasticsearch 8.x** for search and analytics
- **Redis** for caching and session storage
- **Docker** for containerization
- **Jest** for testing

## API Endpoints

### Search
- `POST /api/search` - Search documents with filters and facets
- `GET /api/search/autocomplete` - Get autocomplete suggestions
- `GET /api/search/popular-terms` - Get popular search terms

### Recommendations
- `POST /api/search/recommendations` - Get personalized recommendations
- `POST /api/search/interactions` - Record user interactions

### Admin
- `POST /api/search/index` - Index documents (admin only)
- `GET /api/search/health` - Health check

## Installation

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- Elasticsearch 8.x
- Redis 7.x

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd services/search-service
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start dependencies with Docker**
   ```bash
   docker-compose up -d elasticsearch redis kibana
   ```

5. **Run the service**
   ```bash
   npm run dev
   ```

### Docker Deployment

1. **Build and start all services**
   ```bash
   docker-compose up -d
   ```

2. **View logs**
   ```bash
   docker-compose logs -f search-service
   ```

3. **Stop services**
   ```bash
   docker-compose down
   ```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3007` |
| `NODE_ENV` | Environment | `development` |
| `ELASTICSEARCH_URL` | Elasticsearch URL | `http://localhost:9200` |
| `ELASTICSEARCH_USERNAME` | Elasticsearch username | - |
| `ELASTICSEARCH_PASSWORD` | Elasticsearch password | - |
| `ELASTICSEARCH_INDEX_PREFIX` | Index prefix | `search_` |
| `REDIS_URL` | Redis URL | `redis://localhost:6379` |
| `REDIS_PASSWORD` | Redis password | - |
| `REDIS_DB` | Redis database | `0` |
| `LOG_LEVEL` | Logging level | `info` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |

### Elasticsearch Configuration

The service automatically creates indices with optimized mappings:

- **Products Index**: Optimized for product search with attributes like price, brand, SKU
- **Hotels Index**: Optimized for accommodation search with location and amenities
- **User Interactions Index**: Stores user behavior for recommendations

### Redis Configuration

Redis is used for:
- Search result caching (5 minutes TTL)
- Autocomplete suggestions caching (10 minutes TTL)
- Recommendations caching (30 minutes TTL)
- Popular search terms caching (1 hour TTL)

## Usage Examples

### Basic Search
```bash
curl -X POST http://localhost:3007/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "laptop",
    "filters": {
      "type": ["product"],
      "priceRange": {"min": 500, "max": 2000}
    },
    "sort": {"field": "price", "order": "asc"},
    "pagination": {"page": 1, "size": 20},
    "facets": ["category", "brand"]
  }'
```

### Autocomplete
```bash
curl "http://localhost:3007/api/search/autocomplete?q=mac&type=product&limit=5"
```

### Recommendations
```bash
curl -X POST http://localhost:3007/api/search/recommendations \
  -H "Content-Type: application/json" \
  -H "user-id: user-123" \
  -d '{
    "userId": "user-123",
    "type": "product",
    "limit": 10,
    "algorithm": "hybrid"
  }'
```

### Record Interaction
```bash
curl -X POST http://localhost:3007/api/search/interactions \
  -H "Content-Type: application/json" \
  -H "user-id: user-123" \
  -d '{
    "itemId": "product-1",
    "itemType": "product",
    "interactionType": "purchase"
  }'
```

## Testing

### Run Tests
```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test Requirements
- Test Elasticsearch instance (separate from production)
- Test Redis instance (separate database)

## Monitoring

### Health Checks
- Service health: `GET /health`
- Elasticsearch health: `GET /api/search/health`

### Logging
- Structured JSON logging with Winston
- Log levels: error, warn, info, debug
- Request/response logging
- Performance metrics

### Metrics
- Search response times
- Cache hit rates
- Recommendation accuracy
- Error rates

## Performance Optimization

### Search Performance
- Elasticsearch index optimization
- Query result caching
- Efficient aggregations
- Proper field mappings

### Recommendation Performance
- User interaction caching
- Precomputed similarity matrices
- Batch processing for model updates
- Fallback to popular items

### Caching Strategy
- Multi-level caching (Redis + in-memory)
- Cache invalidation on data updates
- TTL-based expiration
- Cache warming for popular queries

## Security

### Authentication & Authorization
- JWT token validation
- Role-based access control
- API key authentication for admin endpoints

### Rate Limiting
- IP-based rate limiting
- User-based rate limiting
- Different limits for different endpoints
- Graceful degradation

### Input Validation
- Request sanitization
- Schema validation with Joi
- SQL injection prevention
- XSS protection

## Troubleshooting

### Common Issues

1. **Elasticsearch Connection Failed**
   - Check Elasticsearch is running
   - Verify connection URL and credentials
   - Check network connectivity

2. **Redis Connection Failed**
   - Check Redis is running
   - Verify connection URL and password
   - Check Redis memory usage

3. **Search Results Empty**
   - Verify indices are created
   - Check document indexing
   - Review search query syntax

4. **Slow Search Performance**
   - Check Elasticsearch cluster health
   - Review query complexity
   - Monitor cache hit rates

### Debug Mode
```bash
LOG_LEVEL=debug npm run dev
```

### Elasticsearch Debugging
Access Kibana at http://localhost:5601 to:
- View index mappings
- Analyze search queries
- Monitor cluster health
- Debug aggregations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details