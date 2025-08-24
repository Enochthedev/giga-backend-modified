# Ecommerce Backend Service

A comprehensive ecommerce backend service built with Node.js, TypeScript, and PostgreSQL. This service provides product catalog management, shopping cart functionality, order processing, and vendor management capabilities.

## Features

### Core Functionality
- **Product Management**: Complete CRUD operations for products with variants, categories, and inventory tracking
- **Shopping Cart**: Session-based cart management for both authenticated and guest users
- **Order Processing**: Full order lifecycle management with payment integration
- **Category Management**: Hierarchical category structure with tree operations
- **Inventory Management**: Real-time inventory tracking with reservations and adjustments
- **Vendor Support**: Multi-vendor marketplace capabilities

### Technical Features
- **TypeScript**: Full type safety with strict configuration
- **PostgreSQL**: Robust relational database with proper indexing
- **Validation**: Comprehensive input validation using Zod schemas
- **Authentication**: JWT-based authentication with role-based access control
- **API Documentation**: Auto-generated Swagger/OpenAPI documentation
- **Error Handling**: Centralized error handling with proper HTTP status codes
- **Security**: Rate limiting, CORS, helmet security headers
- **Testing**: Unit tests with Jest and comprehensive test coverage

## API Endpoints

### Products
- `GET /api/products/search` - Search products with filters and pagination
- `POST /api/products` - Create new product (vendor/admin)
- `GET /api/products/:id` - Get product details
- `PUT /api/products/:id` - Update product (vendor/admin)
- `DELETE /api/products/:id` - Delete product (vendor/admin)
- `GET /api/products/vendor/me` - Get vendor's products

### Shopping Cart
- `GET /api/cart` - Get or create cart
- `POST /api/cart/guest-session` - Create guest session
- `POST /api/cart/merge` - Merge guest cart with user cart
- `POST /api/cart/:cartId/items` - Add item to cart
- `PUT /api/cart/:cartId/items/:itemId` - Update cart item
- `DELETE /api/cart/:cartId/items/:itemId` - Remove cart item
- `POST /api/cart/:cartId/clear` - Clear cart
- `GET /api/cart/:cartId/summary` - Get cart summary

### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get order details
- `PUT /api/orders/:id` - Update order (admin/vendor)
- `GET /api/orders/user/me` - Get user's orders
- `GET /api/orders/search` - Search orders (admin)
- `GET /api/orders/summary` - Get order statistics

### Categories
- `GET /api/categories/tree` - Get category tree
- `POST /api/categories` - Create category (admin)
- `GET /api/categories/:id` - Get category details
- `PUT /api/categories/:id` - Update category (admin)
- `DELETE /api/categories/:id` - Delete category (admin)
- `GET /api/categories/search` - Search categories
- `GET /api/categories/:id/path` - Get category breadcrumb

## Installation & Setup

### Prerequisites
- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn

### Environment Variables
Copy `.env.example` to `.env` and configure:

```bash
# Server Configuration
PORT=4000
NODE_ENV=development

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/ecommerce_db
DATABASE_POOL_SIZE=10

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h

# Payment Service Configuration
PAYMENT_SERVICE_URL=http://localhost:3001
PAYMENT_SERVICE_API_KEY=payment-service-api-key
```

### Installation Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Database Setup**
   ```bash
   # Create database
   createdb ecommerce_db
   
   # Run migrations
   npm run migrate
   ```

3. **Development**
   ```bash
   # Start development server
   npm run dev
   
   # Run tests
   npm test
   ```

4. **Production**
   ```bash
   # Build application
   npm run build
   
   # Start production server
   npm start
   ```

## API Documentation

Once the server is running, visit:
- **Swagger UI**: `http://localhost:4000/docs`
- **Health Check**: `http://localhost:4000/health`

Run with Docker via root `docker-compose`.
Uses PostgreSQL via `DATABASE_URL` environment variable.
