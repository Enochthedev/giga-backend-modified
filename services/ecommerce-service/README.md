# E-commerce Service

A microservice responsible for product management, inventory, orders, and e-commerce functionality in the Giga platform.

## Features

- **Product Management**: Create, update, and manage products
- **Inventory Management**: Track stock levels and availability
- **Order Processing**: Handle order creation, status updates, and fulfillment
- **Shopping Cart**: User shopping cart management
- **Category Management**: Product categorization and organization
- **Search & Filtering**: Product search with advanced filtering
- **Review & Ratings**: Product reviews and rating system
- **Discount Management**: Coupons, promotions, and pricing rules
- **Analytics**: Sales and product performance metrics
- **Multi-vendor Support**: Support for multiple vendors/sellers

## Prerequisites

- Node.js 18+
- PostgreSQL 12+
- Redis (for caching and sessions)
- Elasticsearch (for search functionality)
- npm or yarn

## Local Development Setup

### 1. Install Dependencies

```bash
cd services/ecommerce-service
pnpm install
```

### 2. Environment Configuration

Create a `.env` file in the service directory:

```bash
# Service Configuration
PORT=8002
NODE_ENV=development
SERVICE_NAME=ecommerce-service

# Database Configuration
DATABASE_URL=postgresql://postgres:password@localhost:5432/ecommerce_db

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
REDIS_DB=1

# Elasticsearch Configuration
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_INDEX=ecommerce_products

# Authentication Service URL
AUTH_SERVICE_URL=http://localhost:8001

# Payment Service URL
PAYMENT_SERVICE_URL=http://localhost:8005

# Notification Service URL
NOTIFICATION_SERVICE_URL=http://localhost:8006

# File Service URL
FILE_SERVICE_URL=http://localhost:8008

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h

# File Upload Configuration
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,webp
UPLOAD_DIR=./uploads

# Pagination
DEFAULT_PAGE_SIZE=20
MAX_PAGE_SIZE=100

# Cache Configuration
CACHE_TTL=3600
ENABLE_CACHE=true

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 3. Database Setup

Ensure PostgreSQL is running and create the database:

```sql
CREATE DATABASE ecommerce_db;
```

Run migrations:

```bash
pnpm run migrate
```

### 4. Start the Service

```bash
# Development mode with auto-reload
pnpm run dev

# Production mode
pnpm run build
pnpm start
```

The service will be available at `http://localhost:8002`

### 5. Health Check

```bash
curl http://localhost:8002/health
```

## API Endpoints

### Health & Status
- `GET /health` - Service health status
- `GET /status` - Detailed service status
- `GET /metrics` - Prometheus metrics

### Product Management
- `GET /products` - List all products with pagination
- `GET /products/:id` - Get product by ID
- `POST /products` - Create new product
- `PUT /products/:id` - Update product
- `DELETE /products/:id` - Delete product
- `GET /products/search` - Search products
- `GET /products/category/:categoryId` - Get products by category
- `GET /products/vendor/:vendorId` - Get products by vendor

### Category Management
- `GET /categories` - List all categories
- `GET /categories/:id` - Get category by ID
- `POST /categories` - Create new category
- `PUT /categories/:id` - Update category
- `DELETE /categories/:id` - Delete category
- `GET /categories/:id/products` - Get products in category

### Inventory Management
- `GET /inventory` - List inventory status
- `GET /inventory/:productId` - Get inventory for product
- `PUT /inventory/:productId` - Update inventory
- `POST /inventory/bulk-update` - Bulk update inventory
- `GET /inventory/low-stock` - Get low stock products

### Order Management
- `GET /orders` - List orders (with pagination)
- `GET /orders/:id` - Get order by ID
- `POST /orders` - Create new order
- `PUT /orders/:id/status` - Update order status
- `GET /orders/user/:userId` - Get user orders
- `GET /orders/vendor/:vendorId` - Get vendor orders
- `POST /orders/:id/cancel` - Cancel order

### Shopping Cart
- `GET /cart` - Get user's shopping cart
- `POST /cart/items` - Add item to cart
- `PUT /cart/items/:itemId` - Update cart item
- `DELETE /cart/items/:itemId` - Remove item from cart
- `POST /cart/clear` - Clear shopping cart
- `POST /cart/checkout` - Checkout cart

### Reviews & Ratings
- `GET /products/:productId/reviews` - Get product reviews
- `POST /products/:productId/reviews` - Add product review
- `PUT /reviews/:id` - Update review
- `DELETE /reviews/:id` - Delete review
- `GET /products/:productId/rating` - Get product rating

### Discounts & Promotions
- `GET /discounts` - List available discounts
- `GET /discounts/:code` - Get discount by code
- `POST /discounts` - Create new discount
- `PUT /discounts/:id` - Update discount
- `DELETE /discounts/:id` - Delete discount

### Vendor Management
- `GET /vendors` - List all vendors
- `GET /vendors/:id` - Get vendor by ID
- `POST /vendors` - Create new vendor
- `PUT /vendors/:id` - Update vendor
- `DELETE /vendors/:id` - Delete vendor
- `GET /vendors/:id/products` - Get vendor products

## Docker Setup

### Using Docker Compose (Recommended)

The service is included in the main `docker-compose.dev.yml`:

```bash
# From project root
docker-compose -f docker-compose.dev.yml up ecommerce-service
```

### Standalone Docker

```bash
# Build the image
docker build -t giga-ecommerce-service .

# Run the container
docker run -d \
  --name ecommerce-service \
  -p 8002:8002 \
  -e DATABASE_URL=postgresql://postgres:password@host.docker.internal:5432/ecommerce_db \
  -e REDIS_URL=redis://host.docker.internal:6379 \
  -e ELASTICSEARCH_URL=http://host.docker.internal:9200 \
  -e AUTH_SERVICE_URL=http://host.docker.internal:8001 \
  giga-ecommerce-service
```

## Database Schema

### Core Tables

- **products**: Product information and metadata
- **categories**: Product categories and hierarchy
- **inventory**: Stock levels and availability
- **orders**: Order details and status
- **order_items**: Individual items in orders
- **shopping_carts**: User shopping carts
- **cart_items**: Items in shopping carts
- **reviews**: Product reviews and ratings
- **vendors**: Vendor/seller information
- **discounts**: Promotional codes and discounts

### Relationships

- Products belong to categories
- Products have inventory records
- Orders contain multiple order items
- Users have shopping carts
- Products can have multiple reviews
- Vendors sell multiple products

## Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm run test:watch

# Run tests with coverage
pnpm run test:coverage

# Run specific test suites
pnpm run test:unit
pnpm run test:integration
pnpm run test:e2e
```

## Monitoring

### Metrics

The service exposes comprehensive metrics:

- **Product Metrics**: Product count, category distribution
- **Order Metrics**: Order count, revenue, conversion rate
- **Inventory Metrics**: Stock levels, low stock alerts
- **Performance Metrics**: Response times, error rates
- **Business Metrics**: Top products, popular categories

### Health Checks

- **Database Connection**: PostgreSQL connectivity
- **Redis Connection**: Cache service availability
- **Elasticsearch**: Search service health
- **External Services**: Auth, payment, notification services

## Security

### Authentication & Authorization

- JWT token validation
- Role-based access control
- Vendor-specific permissions
- Admin-only operations

### Data Validation

- Input sanitization
- SQL injection prevention
- File upload validation
- Rate limiting

### Required Roles

- `user` - Basic shopping and ordering
- `vendor` - Product and inventory management
- `admin` - Full system access
- `moderator` - Content moderation

## Performance

### Caching Strategy

- **Product Cache**: Cache frequently accessed products
- **Category Cache**: Cache category hierarchies
- **Search Cache**: Cache search results
- **User Cache**: Cache user preferences and cart

### Optimization

- **Database Indexing**: Optimized queries
- **Connection Pooling**: Efficient database connections
- **Async Processing**: Non-blocking operations
- **Lazy Loading**: Load data on demand

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure PostgreSQL is running
   - Check DATABASE_URL format
   - Verify database exists

2. **Redis Connection Error**
   - Ensure Redis is running
   - Check REDIS_URL format
   - Verify Redis is accessible

3. **Elasticsearch Connection Error**
   - Ensure Elasticsearch is running
   - Check ELASTICSEARCH_URL
   - Verify index exists

4. **File Upload Issues**
   - Check upload directory permissions
   - Verify file size limits
   - Check allowed file types

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug
NODE_ENV=development
```

### Logs

Check service logs for detailed information:

```bash
# If running locally
pnpm run dev

# If running in Docker
docker logs ecommerce-service
```

## Development

### Project Structure

```
src/
├── app.ts                 # Main application entry point
├── config/                # Configuration management
├── controllers/           # Request handlers
├── middleware/            # Express middleware
├── models/                # Data models
├── routes/                # API route definitions
├── services/              # Business logic
├── utils/                 # Utility functions
├── types/                 # TypeScript type definitions
└── tests/                 # Test files
```

### Adding New Features

1. Define data models in `src/models/`
2. Implement business logic in `src/services/`
3. Create controllers in `src/controllers/`
4. Add routes in `src/routes/`
5. Write tests
6. Update documentation

### Code Standards

- Follow TypeScript best practices
- Use async/await for asynchronous operations
- Implement proper error handling
- Add comprehensive logging
- Write unit and integration tests
- Follow REST API conventions

## Business Logic

### Order Processing Flow

1. **Cart Validation**: Check item availability
2. **Price Calculation**: Apply discounts and taxes
3. **Inventory Check**: Verify stock levels
4. **Payment Processing**: Handle payment via payment service
5. **Order Creation**: Create order record
6. **Inventory Update**: Reduce stock levels
7. **Notification**: Send confirmation via notification service

### Inventory Management

- **Real-time Updates**: Immediate stock level updates
- **Low Stock Alerts**: Notify when stock is low
- **Reservation System**: Reserve stock during checkout
- **Backorder Support**: Handle out-of-stock scenarios

## Contributing

1. Follow the project's coding standards
2. Write tests for new features
3. Update documentation as needed
4. Ensure all tests pass
5. Submit pull requests for review

## License

MIT License - see LICENSE file for details
