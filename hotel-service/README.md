# Hotel Service

A comprehensive microservice for hotel booking and property management functionality, supporting Airbnb-style accommodations with property owner dashboards and booking management.

## Features

### Core Functionality
- **Property Management**: Create, update, and manage hotel properties and accommodations
- **Room Management**: Manage room types, pricing, and availability
- **Booking System**: Complete booking workflow with date validation and availability checking
- **Property Search**: Advanced search with filters, location-based search, and pagination
- **Property Owner Dashboard**: APIs for property owners to manage their listings and bookings

### Business Features
- **Multi-property Types**: Support for hotels, apartments, houses, villas, resorts, and hostels
- **Availability Management**: Real-time room availability checking and booking conflicts prevention
- **Pricing System**: Flexible pricing with base rates, taxes, and fees calculation
- **Booking Lifecycle**: Complete booking management from creation to check-out
- **Cancellation System**: Policy-based cancellation with time restrictions
- **Review System**: Property reviews and ratings (database schema ready)

### Technical Features
- **RESTful APIs**: Comprehensive REST API with OpenAPI/Swagger documentation
- **Database Design**: PostgreSQL with proper indexing and relationships
- **Authentication**: JWT-based authentication with role-based access control
- **Validation**: Request validation using Joi schemas
- **Error Handling**: Comprehensive error handling with proper HTTP status codes
- **Logging**: Structured logging with Winston
- **Security**: Helmet, CORS, rate limiting, and input sanitization

## API Documentation

The service provides REST APIs for:

### Properties
- `POST /api/properties` - Create new property
- `GET /api/properties/search` - Search properties with filters
- `GET /api/properties/my` - Get owner's properties
- `GET /api/properties/{id}` - Get property details
- `PUT /api/properties/{id}` - Update property
- `DELETE /api/properties/{id}` - Delete property
- `GET /api/properties/{id}/availability` - Check room availability
- `GET /api/properties/{propertyId}/bookings` - Get property bookings (owner only)

### Rooms
- `POST /api/properties/{propertyId}/rooms` - Create room
- `GET /api/properties/{propertyId}/rooms` - Get property rooms
- `GET /api/rooms/{id}` - Get room details
- `PUT /api/rooms/{id}` - Update room
- `DELETE /api/rooms/{id}` - Delete room
- `GET /api/rooms/{id}/availability` - Check room availability

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings/my` - Get user's bookings
- `GET /api/bookings/{id}` - Get booking details
- `PATCH /api/bookings/{id}/status` - Update booking status
- `POST /api/bookings/{id}/cancel` - Cancel booking
- `PATCH /api/bookings/{id}/payment` - Update payment status (internal)

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 12+
- Redis (for caching, optional)

### Installation

1. Install dependencies:
```bash
cd hotel-service
npm install
```

2. Set up environment variables:
```bash
cp env.example .env
# Edit .env with your configuration
```

3. Set up the database:
```bash
# Create database
createdb hotel_service

# Run migrations
npm run migrate
```

4. Start the service:
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

The service will be available at `http://localhost:4001`

### Development

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint

# Build for production
npm run build
```

## API Documentation

Visit `http://localhost:4001/docs` for interactive Swagger API documentation.

## Database Schema

The service uses PostgreSQL with the following main entities:

- **property_owners**: Property owner information and verification status
- **properties**: Property listings with location, amenities, and metadata
- **rooms**: Room types, pricing, and availability within properties
- **room_availability**: Daily availability and pricing calendar
- **bookings**: Booking records with guest information and payment status
- **property_reviews**: Property reviews and ratings system

## Environment Variables

Key environment variables (see `env.example` for complete list):

```bash
# Server
PORT=4001
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hotel_service
DB_USER=postgres
DB_PASSWORD=password

# Authentication
JWT_SECRET=your-secret-key

# External Services
PAYMENT_SERVICE_URL=http://localhost:3003
NOTIFICATION_SERVICE_URL=http://localhost:3004
```

## Integration

### Payment Service Integration
The hotel service integrates with the payment service for:
- Processing booking payments
- Handling refunds for cancellations
- Managing property owner payouts

### Notification Service Integration
Sends notifications for:
- Booking confirmations
- Booking cancellations
- Check-in reminders
- Property owner notifications

## Testing

The service includes comprehensive tests:

```bash
# Run all tests
npm test

# Run specific test file
npm test -- property.service.test.ts

# Run tests with coverage
npm test -- --coverage
```

## Architecture

The service follows clean architecture principles:

```
src/
├── controllers/     # HTTP request handlers
├── services/        # Business logic layer
├── database/        # Database connection and migrations
├── middleware/      # Express middleware
├── routes/          # API route definitions
├── types/           # TypeScript type definitions
├── validation/      # Request validation schemas
├── utils/           # Utility functions
└── tests/           # Test files
```

## Error Handling

The service provides consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "checkInDate",
        "message": "Check-in date is required"
      }
    ]
  }
}
```

## Security

Security measures implemented:
- JWT authentication for protected endpoints
- Input validation and sanitization
- Rate limiting to prevent abuse
- CORS configuration
- Helmet for security headers
- SQL injection prevention with parameterized queries

## Performance

Performance optimizations:
- Database indexing on frequently queried fields
- Connection pooling for database connections
- Pagination for large result sets
- Efficient spatial queries for location-based search

## Monitoring

The service provides:
- Health check endpoint (`/health`)
- Structured logging with correlation IDs
- Request/response logging
- Error tracking and alerting

## Contributing

1. Follow the coding standards defined in `.kiro/steering/coding-standards.md`
2. Write tests for new features
3. Update API documentation
4. Ensure all tests pass before submitting
