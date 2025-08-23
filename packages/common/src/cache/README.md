# Redis Caching System

A comprehensive Redis-based caching solution for the multi-service architecture, providing API response caching, session management, real-time data caching, and intelligent cache invalidation.

## Features

- **Redis Client**: Flexible Redis client supporting single instance, Sentinel, and Cluster modes
- **API Response Caching**: Middleware for caching HTTP responses with TTL and conditional caching
- **Session Management**: Redis-based session store for Express.js applications
- **Real-time Caching**: Specialized caching for driver locations and inventory data
- **Cache Invalidation**: Intelligent invalidation strategies with event-driven patterns
- **Monitoring**: Comprehensive Redis monitoring and health checks
- **Performance**: Optimized for high-throughput applications

## Quick Start

### 1. Initialize Redis Connection

```typescript
import { CacheInitializer } from '@giga/common';

// Initialize Redis with environment configuration
await CacheInitializer.initialize();
```

### 2. Use API Response Caching

```typescript
import express from 'express';
import { cacheMiddleware, CacheSettings } from '@giga/common';

const app = express();

// Cache product listings for 5 minutes
app.get('/api/products', 
  cacheMiddleware({
    ttl: CacheSettings.TTL.MEDIUM,
    tags: ['products'],
  }),
  getProducts
);
```

### 3. Set Up Session Store

```typescript
import session from 'express-session';
import { RedisSessionStore } from '@giga/common';

app.use(session({
  store: new RedisSessionStore({
    prefix: 'sess:',
    ttl: 86400, // 24 hours
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}));
```

### 4. Real-time Data Caching

```typescript
import { realtimeCache } from '@giga/common';

// Update driver location
await realtimeCache.updateDriverLocation('driver123', {
  latitude: 40.7128,
  longitude: -74.0060,
  timestamp: Date.now(),
});

// Find nearby drivers
const nearbyDrivers = await realtimeCache.findNearbyDrivers(
  40.7128, -74.0060, 5 // 5km radius
);
```

## Configuration

### Environment Variables

Create a `.env` file with Redis configuration:

```bash
# Basic Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=0
REDIS_KEY_PREFIX=app:

# High Availability (Sentinel)
REDIS_SENTINELS=[{"host":"sentinel1","port":26379}]
REDIS_SENTINEL_NAME=mymaster

# Cluster Configuration
REDIS_CLUSTER_NODES=[{"host":"node1","port":7000}]

# Cache Settings
CACHE_DEFAULT_TTL=300
CACHE_SESSION_TTL=86400
```

### Redis Modes

#### Single Instance (Development)
```typescript
import { CacheConfigFactory } from '@giga/common';

const config = CacheConfigFactory.forDevelopment();
```

#### Sentinel (High Availability)
```typescript
const config = CacheConfigFactory.forProduction();
```

#### Cluster (Horizontal Scaling)
```typescript
const config = CacheConfigFactory.forCluster();
```

## API Reference

### RedisClient

Basic Redis operations with automatic JSON serialization:

```typescript
import { getRedisClient } from '@giga/common';

const redis = getRedisClient();

// Basic operations
await redis.set('key', { data: 'value' }, 300); // 5 minutes TTL
const value = await redis.get('key');
await redis.del('key');

// Hash operations
await redis.hset('user:123', 'name', 'John Doe');
const name = await redis.hget('user:123', 'name');

// List operations
await redis.lpush('queue', 'item1', 'item2');
const item = await redis.rpop('queue');

// Set operations
await redis.sadd('tags', 'redis', 'cache', 'performance');
const isMember = await redis.sismember('tags', 'redis');
```

### Cache Middleware

HTTP response caching with flexible configuration:

```typescript
import { cacheMiddleware } from '@giga/common';

// Basic caching
app.get('/api/data', cacheMiddleware(), handler);

// Advanced configuration
app.get('/api/products', cacheMiddleware({
  ttl: 300,                    // 5 minutes
  tags: ['products'],          // For invalidation
  varyBy: ['authorization'],   // Vary cache by headers
  keyGenerator: (req) => `products:${req.query.category}`,
  condition: (req, res) => res.statusCode === 200,
  skipCache: (req) => req.headers['cache-control'] === 'no-cache',
}), handler);
```

### Session Management

Redis-based session storage:

```typescript
import { RedisSessionStore, sessionManager } from '@giga/common';

// Session store
const store = new RedisSessionStore({
  prefix: 'sess:',
  ttl: 86400,
});

// Session management utilities
await sessionManager.addUserSession('user123', 'session456');
const sessions = await sessionManager.getUserSessions('user123');
await sessionManager.destroyUserSessions('user123');
```

### Real-time Caching

Specialized caching for location and inventory data:

```typescript
import { realtimeCache } from '@giga/common';

// Driver location management
await realtimeCache.updateDriverLocation('driver123', {
  latitude: 40.7128,
  longitude: -74.0060,
  heading: 45,
  speed: 30,
  timestamp: Date.now(),
});

const location = await realtimeCache.getDriverLocation('driver123');
const nearbyDrivers = await realtimeCache.findNearbyDrivers(40.7128, -74.0060, 5);

// Inventory management
await realtimeCache.updateInventory('product123', {
  productId: 'product123',
  quantity: 100,
  reserved: 5,
  available: 95,
  lastUpdated: Date.now(),
});

const success = await realtimeCache.reserveInventory('product123', 2);
await realtimeCache.releaseReservation('product123', 1);
```

### Cache Invalidation

Event-driven cache invalidation:

```typescript
import { invalidationManager, InvalidationStrategies } from '@giga/common';

// Register invalidation rules
invalidationManager.registerRules(InvalidationStrategies.getAllRules());

// Trigger invalidation
await invalidationManager.invalidate({
  type: 'product.updated',
  entityId: 'product123',
  entityType: 'product',
  data: { name: 'Updated Product' },
  timestamp: Date.now(),
});

// Manual invalidation
import { cacheInvalidator } from '@giga/common';

await cacheInvalidator.invalidatePattern('api:GET:/api/products*');
await cacheInvalidator.invalidateByTags(['products', 'search']);
```

### Method Caching

Decorator for caching method results:

```typescript
import { cacheable } from '@giga/common';

class ProductService {
  @cacheable({ ttl: 3600 })
  async getExpensiveData(id: string): Promise<any> {
    // Expensive operation
    return await this.calculateComplexData(id);
  }
}
```

## Monitoring

### Health Checks

```typescript
import { redisMonitor } from '@giga/common';

// Start monitoring
redisMonitor.startMonitoring(30000); // Every 30 seconds

// Listen for events
redisMonitor.on('metrics', (metrics) => {
  console.log('Redis metrics:', metrics);
});

redisMonitor.on('alert', (alert) => {
  console.log('Redis alert:', alert);
});

redisMonitor.on('health', (health) => {
  if (health.status !== 'healthy') {
    console.log('Redis health issues:', health.issues);
  }
});

// Manual health check
const health = await redisMonitor.checkHealth();
console.log('Redis status:', health.status);
```

### Performance Testing

```typescript
const results = await redisMonitor.performanceTest(1000);
console.log('Performance results:', results);
// {
//   setOperations: 1000,
//   getOperations: 1000,
//   avgSetTime: 0.5,
//   avgGetTime: 0.3,
//   totalTime: 850
// }
```

## Deployment

### Docker Compose

Start Redis with the provided configuration:

```bash
# Single instance
docker-compose up -d redis

# High availability with Sentinel
docker-compose -f docker-compose.redis.yml up -d

# Start with script
REDIS_MODE=sentinel ./scripts/start-redis.sh
```

### Production Considerations

1. **Memory Management**: Configure `maxmemory` and `maxmemory-policy`
2. **Persistence**: Enable AOF for data durability
3. **Security**: Use strong passwords and network isolation
4. **Monitoring**: Set up alerts for memory usage, hit ratio, and connection count
5. **Backup**: Regular backups of Redis data
6. **Scaling**: Use Redis Cluster for horizontal scaling

### High Availability Setup

```yaml
# docker-compose.redis.yml
services:
  redis-master:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    
  redis-replica-1:
    image: redis:7-alpine
    command: redis-server --slaveof redis-master 6379
    
  redis-sentinel-1:
    image: redis:7-alpine
    command: redis-sentinel /etc/redis/sentinel.conf
```

## Best Practices

### Cache Key Design

```typescript
// Good: Hierarchical and descriptive
const key = `api:GET:/api/products/${productId}:v1`;

// Bad: Flat and unclear
const key = `prod123cache`;
```

### TTL Strategy

```typescript
// Different TTLs for different data types
const TTL = {
  STATIC_DATA: 86400,    // 24 hours
  DYNAMIC_DATA: 300,     // 5 minutes
  USER_SESSION: 1800,    // 30 minutes
  REAL_TIME: 60,         // 1 minute
};
```

### Error Handling

```typescript
try {
  const data = await redis.get(key);
  return data || await fetchFromDatabase();
} catch (error) {
  logger.error('Cache error:', error);
  return await fetchFromDatabase(); // Fallback
}
```

### Cache Warming

```typescript
// Warm cache during application startup
await warmingManager.warmCache([
  {
    key: 'popular:products',
    dataProvider: () => productService.getPopularProducts(),
    ttl: 3600,
  },
]);
```

## Troubleshooting

### Common Issues

1. **Connection Timeouts**: Check network connectivity and Redis server status
2. **Memory Issues**: Monitor memory usage and configure appropriate limits
3. **Slow Performance**: Check slow log and optimize queries
4. **Cache Misses**: Review TTL settings and invalidation strategies

### Debug Mode

Enable debug logging:

```bash
CACHE_DEBUG_LOGGING=true
```

### Health Check Endpoints

```typescript
app.get('/health/redis', async (req, res) => {
  const health = await redisMonitor.checkHealth();
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});
```

## Examples

See the `examples/` directory for complete integration examples:

- [Service Integration](./examples/service-integration.ts)
- [E-commerce Caching](./examples/ecommerce-caching.ts)
- [Real-time Features](./examples/realtime-features.ts)

## Contributing

1. Follow the coding standards in `.kiro/steering/coding-standards.md`
2. Add tests for new features
3. Update documentation
4. Ensure backward compatibility

## License

This caching system is part of the Giga Backend project.