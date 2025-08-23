# Enhanced Taxi Service

A comprehensive taxi service with advanced features including dynamic pricing, driver rating system, ride analytics, and route optimization.

## Features

### Core Features
- **Driver Management**: Registration, verification, and profile management
- **Ride Booking**: Real-time ride matching and booking system
- **Real-time Tracking**: WebSocket-based location tracking
- **Vehicle Management**: Multi-vehicle type support

### Advanced Features (New)
- **Dynamic Pricing**: Surge pricing, demand-based pricing, promotional offers
- **Rating & Feedback System**: Comprehensive driver and passenger rating system
- **Analytics Dashboard**: Detailed analytics for drivers, passengers, and system administrators
- **Route Optimization**: AI-powered route optimization with traffic data
- **Performance Metrics**: Driver performance tracking and improvement suggestions

## API Endpoints

### Driver Management
- `POST /api/drivers/register` - Register a new driver
- `GET /api/drivers/:driverId` - Get driver profile
- `PUT /api/drivers/:driverId/status` - Update driver status
- `PUT /api/drivers/:driverId/location` - Update driver location
- `GET /api/drivers/available` - Find available drivers

### Ride Management
- `POST /api/rides/request` - Request a ride
- `POST /api/rides/:rideId/accept` - Accept a ride (driver)
- `PUT /api/rides/:rideId/start` - Start a ride
- `PUT /api/rides/:rideId/complete` - Complete a ride
- `POST /api/rides/:rideId/cancel` - Cancel a ride
- `GET /api/rides/:rideId` - Get ride details

### Dynamic Pricing
- `POST /api/pricing/calculate` - Calculate dynamic fare estimate
- `GET /api/pricing/promotions` - Get active promotional offers
- `POST /api/pricing/surge-areas` - Add surge area (admin)
- `DELETE /api/pricing/surge-areas/:areaName` - Remove surge area (admin)
- `POST /api/pricing/promotions` - Add promotional offer (admin)

### Rating & Feedback
- `POST /api/ratings/rides/:rideId` - Submit a rating for a ride
- `GET /api/ratings/drivers/:driverId/feedback` - Get driver feedback analytics
- `GET /api/ratings/drivers/:driverId/performance` - Get driver performance metrics
- `GET /api/ratings/:entityId/trends` - Get rating trends over time
- `GET /api/ratings/:entityId/summary` - Get rating summary

### Analytics
- `GET /api/analytics/:entityId/rides` - Get ride history with filters
- `GET /api/analytics/drivers/:driverId` - Get comprehensive driver analytics
- `GET /api/analytics/passengers/:customerId` - Get passenger analytics
- `GET /api/analytics/drivers/:driverId/dashboard` - Get driver dashboard summary
- `GET /api/analytics/:entityId/export` - Export ride data (CSV)

### Route Optimization
- `POST /api/routes/optimize` - Get optimized route between two points
- `POST /api/routes/multi-stop` - Optimize multi-stop route
- `POST /api/routes/eta` - Calculate ETA with real-time traffic
- `POST /api/routes/optimal-pickup` - Find optimal pickup point
- `POST /api/routes/traffic` - Get traffic information for a route

## Environment Variables

```bash
# Server Configuration
PORT=3005
NODE_ENV=development

# Database Configuration
MONGODB_URL=mongodb://localhost:27017/taxi_service

# External APIs
GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
MAPBOX_API_KEY=your-mapbox-api-key-here
TOMTOM_API_KEY=your-tomtom-api-key-here
WEATHER_API_KEY=your-weather-api-key-here

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h

# RabbitMQ Configuration
RABBITMQ_URL=amqp://localhost:5672

# Redis Configuration
REDIS_URL=redis://localhost:6379
```

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd services/taxi-service
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

4. **Start the service**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm run build
   npm start
   ```

## Dynamic Pricing System

### Surge Pricing
The system automatically applies surge pricing based on:
- **Demand/Supply Ratio**: Higher prices when demand exceeds supply
- **Time of Day**: Rush hour and late-night multipliers
- **Weather Conditions**: Increased rates during bad weather
- **Special Events**: Manual surge areas for events

### Promotional Offers
Support for various promotional campaigns:
- **Percentage Discounts**: e.g., 20% off rides
- **Fixed Amount Discounts**: e.g., $5 off rides over $20
- **Vehicle Type Specific**: Promotions for specific vehicle types
- **Usage Limits**: Control total usage per promotion

### Example Pricing Calculation
```javascript
// Base fare calculation
const baseFare = 2.50;
const distanceFare = distance * perKmRate;
const timeFare = duration > 1800 ? (duration - 1800) * 0.002 : 0;

// Apply multipliers
let totalFare = (baseFare + distanceFare + timeFare) * 
                surgeMultiplier * 
                demandMultiplier * 
                weatherMultiplier * 
                timeOfDayMultiplier;

// Apply discounts
totalFare -= promotionalDiscount;
```

## Rating & Feedback System

### Rating Submission
- **5-Star Rating System**: Both drivers and passengers can rate each other
- **Review Comments**: Optional text reviews
- **Tag System**: Predefined tags for quick feedback (e.g., "friendly", "professional")

### Performance Metrics
The system calculates comprehensive performance metrics:
- **Average Rating**: Weighted average of all ratings
- **Completion Rate**: Percentage of rides completed vs. cancelled
- **Response Time**: Average time to accept ride requests
- **Customer Satisfaction**: Based on passenger ratings and feedback

### Performance Score Calculation
```javascript
const performanceScore = (
    ratingScore * 0.3 +           // 30% weight
    completionScore * 0.25 +      // 25% weight
    acceptanceScore * 0.2 +       // 20% weight
    cancellationScore * 0.15 +    // 15% weight (penalty)
    responseTimeScore * 0.1       // 10% weight
);
```

## Analytics Dashboard

### Driver Analytics
- **Earnings Tracking**: Daily, weekly, monthly earnings
- **Ride Statistics**: Total rides, completion rates, cancellations
- **Performance Trends**: Rating trends over time
- **Peak Hours Analysis**: Identify most profitable hours
- **Customer Insights**: Repeat customers, popular routes

### Passenger Analytics
- **Spending Analysis**: Total spending, average ride cost
- **Usage Patterns**: Preferred times, vehicle types
- **Location Insights**: Most common pickup/dropoff locations
- **Driver Preferences**: Favorite drivers, rating patterns

### System Analytics (Admin)
- **Revenue Tracking**: Total revenue, trends, forecasting
- **Operational Metrics**: Active drivers, ride volumes
- **Performance Monitoring**: System health, response times
- **Geographic Analysis**: Popular routes, hotspots

## Route Optimization

### Features
- **Multi-Provider Support**: Google Maps, Mapbox, TomTom APIs
- **Real-time Traffic**: Live traffic data integration
- **Multi-stop Optimization**: Traveling salesman problem solver
- **Alternative Routes**: Multiple route options with trade-offs
- **Optimal Pickup Points**: Find best pickup locations to minimize total time

### Route Optimization Algorithm
```javascript
// For small number of stops (≤8): Brute force optimization
// For larger sets: Nearest neighbor heuristic with local optimization

const optimizeRoute = async (origin, destinations) => {
    if (destinations.length <= 8) {
        return bruteForceOptimization(origin, destinations);
    } else {
        return nearestNeighborOptimization(origin, destinations);
    }
};
```

## Testing

Run the test suite:
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- pricing.service.test.ts
```

## Performance Considerations

### Caching Strategy
- **Route Caching**: Cache frequently requested routes
- **Pricing Calculations**: Cache surge multipliers and promotional offers
- **Analytics Data**: Cache dashboard data with appropriate TTL

### Database Optimization
- **Geospatial Indexes**: Optimized for location-based queries
- **Compound Indexes**: For complex analytics queries
- **Read Replicas**: Separate read/write operations for analytics

### Rate Limiting
- **API Rate Limits**: Prevent abuse of external mapping APIs
- **User Rate Limits**: Prevent spam requests
- **Surge Protection**: Prevent rapid surge area changes

## Monitoring & Logging

### Key Metrics to Monitor
- **Response Times**: API endpoint performance
- **Error Rates**: Failed requests and their causes
- **External API Usage**: Mapping service quotas and costs
- **Database Performance**: Query execution times
- **Business Metrics**: Rides per hour, revenue per ride

### Logging Strategy
- **Structured Logging**: JSON format for easy parsing
- **Request Tracing**: Correlation IDs for request tracking
- **Performance Logging**: Slow query and API call logging
- **Business Event Logging**: Ride lifecycle events

## Security Considerations

### Data Protection
- **PII Encryption**: Encrypt sensitive personal information
- **Location Privacy**: Anonymize historical location data
- **Payment Security**: PCI DSS compliance for payment data

### API Security
- **Authentication**: JWT-based authentication
- **Authorization**: Role-based access control
- **Rate Limiting**: Prevent abuse and DDoS attacks
- **Input Validation**: Sanitize all user inputs

## Deployment

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3005
CMD ["npm", "start"]
```

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: taxi-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: taxi-service
  template:
    metadata:
      labels:
        app: taxi-service
    spec:
      containers:
      - name: taxi-service
        image: taxi-service:latest
        ports:
        - containerPort: 3005
        env:
        - name: MONGODB_URL
          valueFrom:
            secretKeyRef:
              name: taxi-secrets
              key: mongodb-url
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.