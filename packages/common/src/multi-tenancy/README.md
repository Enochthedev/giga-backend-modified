# Multi-Tenancy Implementation

This module provides comprehensive multi-tenancy support for the microservices architecture, enabling tenant isolation, context management, and database partitioning.

## Features

- **Tenant Context Management**: Thread-safe tenant context using AsyncLocalStorage
- **Database Partitioning**: Support for schema-based, database-based, and table-prefix partitioning strategies
- **Tenant Service**: Complete CRUD operations for tenant management
- **Middleware Integration**: Express middleware for automatic tenant resolution
- **Feature Flags**: Tenant-specific feature enablement
- **Audit Logging**: Comprehensive tenant activity tracking

## Quick Start

### 1. Initialize Multi-Tenancy

```typescript
import { dbPartitionManager, TenantService } from '@common/multi-tenancy';

// Initialize database partitioning
await dbPartitionManager.initialize({
  host: 'localhost',
  port: 5432,
  database: 'myapp_db',
  username: 'postgres',
  password: 'password'
}, 'schema'); // Use schema-based partitioning

// Initialize tenant service
const tenantService = new TenantService(databaseConnection, cacheService);
```

### 2. Add Tenant Middleware

```typescript
import { tenantMiddleware, requireTenant, requireFeature } from '@common/multi-tenancy';

const app = express();

// Add tenant resolution middleware
app.use('/api', tenantMiddleware(tenantService));

// Protect routes that require tenant context
app.use('/api/products', requireTenant());

// Protect routes that require specific features
app.use('/api/ecommerce', requireFeature('ecommerce'));
```

### 3. Use Tenant Context in Services

```typescript
import { tenantContext, dbPartitionManager } from '@common/multi-tenancy';

class ProductService {
  async getProducts() {
    // Get current tenant
    const tenant = tenantContext.getCurrentTenant();
    
    // Execute tenant-specific database query
    const result = await dbPartitionManager.query(
      'SELECT * FROM products WHERE status = $1',
      ['active']
    );
    
    return result.rows;
  }
}
```

## Tenant Resolution Strategies

The middleware supports multiple tenant resolution strategies:

1. **Subdomain-based**: `tenant1.myapp.com`
2. **Custom domain**: `tenant1.com`
3. **Header-based**: `X-Tenant-ID: tenant1`
4. **Query parameter**: `?tenant=tenant1`
5. **JWT token claim**: Extract from authentication token

## Database Partitioning Strategies

### Schema-based Partitioning (Recommended)

Each tenant gets its own database schema:

```sql
-- Tenant 1 data
tenant_123.users
tenant_123.products
tenant_123.orders

-- Tenant 2 data
tenant_456.users
tenant_456.products
tenant_456.orders
```

### Database-based Partitioning

Each tenant gets its own database:

```sql
-- Tenant 1 database
tenant_123_db.users
tenant_123_db.products

-- Tenant 2 database
tenant_456_db.users
tenant_456_db.products
```

### Table Prefix Partitioning

Tables are prefixed with tenant ID:

```sql
-- Shared database with prefixed tables
tenant_123_users
tenant_123_products
tenant_456_users
tenant_456_products
```

## Tenant Management

### Creating a Tenant

```typescript
const tenant = await tenantService.createTenant({
  name: 'Acme Corp',
  subdomain: 'acme',
  region: 'US',
  timezone: 'America/New_York',
  currency: 'USD',
  locale: 'en-US',
  settings: {
    features: {
      ecommerce: true,
      taxi: false,
      hotel: true,
      advertisements: true
    },
    limits: {
      maxUsers: 1000,
      maxTransactions: 10000,
      storageLimit: 5 * 1024 * 1024 * 1024 // 5GB
    }
  }
});
```

### Updating Tenant Settings

```typescript
await tenantService.updateTenant(tenantId, {
  settings: {
    features: {
      taxi: true // Enable taxi feature
    },
    limits: {
      maxUsers: 2000 // Increase user limit
    }
  }
});
```

## Feature Flags

Control feature availability per tenant:

```typescript
// Check if feature is enabled
if (tenantContext.isFeatureEnabled('ecommerce')) {
  // Ecommerce functionality
}

// Middleware to require feature
app.use('/api/taxi', requireFeature('taxi'));
```

## Security Considerations

1. **Data Isolation**: Each tenant's data is completely isolated
2. **Access Control**: Tenant context is required for all operations
3. **Audit Logging**: All tenant operations are logged
4. **Resource Limits**: Configurable limits per tenant
5. **Schema Validation**: Tenant data is validated before operations

## Performance Optimization

1. **Connection Pooling**: Separate connection pools per tenant
2. **Caching**: Tenant information is cached for performance
3. **Lazy Loading**: Tenant connections are created on-demand
4. **Query Optimization**: Tenant-specific query optimizations

## Monitoring and Analytics

Track tenant usage and performance:

```typescript
// Get tenant statistics
const stats = await dbPartitionManager.getTenantStats(tenantId);

// Track tenant metrics
await tenantAnalytics.track(tenantId, 'api_request', {
  endpoint: '/api/products',
  responseTime: 150,
  statusCode: 200
});
```

## Migration and Maintenance

### Schema Migrations

```typescript
// Migrate all tenants
const tenants = await tenantService.getAllTenants();
for (const tenant of tenants) {
  await dbPartitionManager.migrateTenantSchema(tenant.id, migrations);
}
```

### Tenant Cleanup

```typescript
// Soft delete tenant
await tenantService.deleteTenant(tenantId);

// Hard delete tenant data
await dbPartitionManager.dropTenantPartition(tenantId);
```

## Best Practices

1. **Always use tenant context**: Never access data without tenant context
2. **Validate tenant access**: Check feature flags and limits
3. **Handle tenant not found**: Gracefully handle missing tenants
4. **Monitor resource usage**: Track tenant resource consumption
5. **Regular backups**: Backup tenant data regularly
6. **Test isolation**: Ensure complete data isolation between tenants

## Troubleshooting

### Common Issues

1. **No tenant context**: Ensure tenant middleware is applied
2. **Database connection errors**: Check tenant database configuration
3. **Feature not available**: Verify feature is enabled for tenant
4. **Performance issues**: Check connection pool settings and caching

### Debug Mode

Enable debug logging:

```typescript
process.env.DEBUG_TENANCY = 'true';
```

This will log all tenant operations and database queries for debugging.