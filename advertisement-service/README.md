# Advertisement Service

A comprehensive microservice for managing advertisement campaigns, targeting, analytics, and payment integration in the Giga platform.

## Features

### Core Functionality
- **Campaign Management**: Create, update, and manage advertising campaigns
- **Advertisement Management**: CRUD operations for individual advertisements
- **Ad Groups**: Organize advertisements within campaigns
- **Targeting System**: Advanced targeting based on demographics, location, interests, and device
- **Ad Serving**: Intelligent ad serving with targeting logic
- **Analytics & Reporting**: Comprehensive analytics and performance metrics
- **Payment Integration**: Billing and payment processing for ad campaigns

### Advanced Features
- **Real-time Analytics**: Live campaign performance monitoring
- **Budget Management**: Campaign and daily budget controls
- **Click Tracking**: Detailed click and impression tracking
- **Performance Optimization**: Bid optimization and performance analysis
- **Multi-format Ads**: Support for banner, video, native, and popup ads

## Architecture

The service follows a layered architecture:
- **Controllers**: Handle HTTP requests and responses
- **Services**: Business logic and data processing
- **Database**: PostgreSQL with optimized schema
- **Middleware**: Authentication, validation, and error handling

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- Redis (optional, for caching)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp env.example .env
# Edit .env with your configuration
```

3. Initialize database:
```bash
npm run migrate
```

4. Build and start:
```bash
npm run build
npm start
```

### Development

```bash
npm run dev  # Start with hot reload
npm test     # Run tests
npm run lint # Run linting
```

## API Documentation

Visit `/docs` endpoint for comprehensive Swagger documentation.

## Main Endpoints

### Campaigns
- `POST /api/campaigns` - Create campaign
- `GET /api/campaigns` - List campaigns
- `GET /api/campaigns/:id` - Get campaign details
- `PUT /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Delete campaign
- `PATCH /api/campaigns/:id/status` - Update campaign status
- `POST /api/campaigns/:id/fund` - Fund campaign

### Advertisements
- `POST /api/advertisements` - Create advertisement
- `GET /api/advertisements` - List advertisements
- `POST /api/advertisements/serve` - Serve targeted ad
- `GET /api/advertisements/:id/click` - Handle ad click
- `GET /api/advertisements/:id/impression` - Record impression

### Analytics
- `GET /api/analytics/campaigns/:id` - Campaign analytics
- `GET /api/analytics/advertisers/:id` - Advertiser analytics
- `GET /api/analytics/dashboard/:id` - Dashboard metrics
- `GET /api/analytics/realtime/:id` - Real-time metrics

## Legacy Routes (Backward Compatibility)
- `GET /health` – health check
- `GET /ads` – list ads (redirects to new API)
- `GET /ads/{id}` – get ad by id
- `GET /ads/serve` – serve an ad using the built-in algorithm
- `POST /ads` – create an ad (vendor role required)
- `PUT /ads/{id}` – update an ad
- `DELETE /ads/{id}` – remove ad (admin or subadmin)

## Database Schema

### Core Tables
- `campaigns` - Campaign information and settings
- `ad_groups` - Ad group organization within campaigns
- `advertisements` - Individual advertisement details
- `targeting_criteria` - Targeting rules and parameters
- `ad_events` - Click, impression, and conversion tracking
- `campaign_spending` - Daily spending and performance metrics
- `ad_transactions` - Payment and billing transactions
- `advertisers` - Advertiser account information

## Authentication

The service uses JWT-based authentication:
- Include `Authorization: Bearer <token>` header
- Supports role-based access control (advertiser, admin)
- Optional authentication for ad serving endpoints

## Payment Integration

Integrates with the payment service for:
- Campaign funding
- Automatic billing based on ad spend
- Refund processing
- Balance management

## Analytics & Reporting

Comprehensive analytics including:
- **Performance Metrics**: CTR, CPC, CPM, conversion rates
- **Real-time Data**: Live campaign performance
- **Historical Analysis**: Trend analysis and comparisons
- **Custom Reports**: Flexible date ranges and grouping

## Targeting System

Advanced targeting capabilities:
- **Demographics**: Age, gender targeting
- **Geographic**: Location-based targeting
- **Behavioral**: Interest and behavior targeting
- **Technical**: Device and platform targeting
- **Custom**: Flexible criteria with operators

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## Environment Variables

### Required
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret

### Optional
- `PORT` - Service port (default: 4003)
- `NODE_ENV` - Environment mode
- `PAYMENT_SERVICE_URL` - Payment service endpoint
- `REDIS_URL` - Redis connection for caching
- `ALLOWED_ORIGINS` - CORS allowed origins

## Development
```bash
npm run build
npm start
# or for development
npm run dev
```
