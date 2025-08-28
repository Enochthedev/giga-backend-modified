#!/usr/bin/env node

/**
 * Script to generate OpenAPI specifications for remaining services
 * This ensures all services have comprehensive API documentation
 */

const fs = require('fs');
const path = require('path');

const apiDocsDir = path.join(__dirname, '..', 'docs', 'api');

// Ensure API docs directory exists
if (!fs.existsSync(apiDocsDir)) {
    fs.mkdirSync(apiDocsDir, { recursive: true });
}

// Taxi Service API Specification
const taxiServiceSpec = `openapi: 3.0.3
info:
  title: Taxi Service API
  description: |
    Ride booking and management service with real-time tracking.
    Supports driver management, ride matching, and location tracking similar to Uber.
  version: 1.0.0
  contact:
    name: Platform Team
    email: platform@company.com

servers:
  - url: http://localhost:3004
    description: Development server
  - url: https://api-staging.company.com/taxi
    description: Staging server
  - url: https://api.company.com/taxi
    description: Production server

security:
  - BearerAuth: []

paths:
  /health:
    get:
      summary: Health check endpoint
      tags: [Health]
      security: []
      responses:
        '200':
          description: Service is healthy
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HealthResponse'

  /rides:
    post:
      summary: Request a ride
      tags: [Rides]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RideRequest'
      responses:
        '201':
          description: Ride requested successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Ride'

    get:
      summary: Get user's ride history
      tags: [Rides]
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
      responses:
        '200':
          description: Ride history retrieved
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RideHistoryResponse'

  /rides/{rideId}:
    get:
      summary: Get ride details
      tags: [Rides]
      parameters:
        - name: rideId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Ride details retrieved
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RideDetails'

  /rides/{rideId}/cancel:
    post:
      summary: Cancel a ride
      tags: [Rides]
      parameters:
        - name: rideId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Ride cancelled successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Ride'

  /drivers:
    post:
      summary: Register as driver
      tags: [Drivers]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/DriverRegistrationRequest'
      responses:
        '201':
          description: Driver registered successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Driver'

  /drivers/profile:
    get:
      summary: Get driver profile
      tags: [Drivers]
      responses:
        '200':
          description: Driver profile retrieved
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Driver'

  /drivers/location:
    post:
      summary: Update driver location
      tags: [Drivers]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LocationUpdate'
      responses:
        '200':
          description: Location updated successfully

  /drivers/status:
    post:
      summary: Update driver availability status
      tags: [Drivers]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/DriverStatusUpdate'
      responses:
        '200':
          description: Status updated successfully

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    HealthResponse:
      type: object
      properties:
        status:
          type: string
          example: "healthy"
        timestamp:
          type: string
          format: date-time
        version:
          type: string
          example: "1.0.0"

    RideRequest:
      type: object
      required:
        - pickupLocation
        - dropoffLocation
        - rideType
      properties:
        pickupLocation:
          $ref: '#/components/schemas/Location'
        dropoffLocation:
          $ref: '#/components/schemas/Location'
        rideType:
          type: string
          enum: [economy, premium, luxury]
          example: "economy"
        scheduledTime:
          type: string
          format: date-time
        notes:
          type: string
          example: "Please call when you arrive"

    Ride:
      type: object
      properties:
        id:
          type: string
          example: "ride_123456"
        userId:
          type: string
          example: "user_123456"
        driverId:
          type: string
          example: "driver_123456"
        status:
          type: string
          enum: [requested, matched, pickup, in_progress, completed, cancelled]
          example: "matched"
        pickupLocation:
          $ref: '#/components/schemas/Location'
        dropoffLocation:
          $ref: '#/components/schemas/Location'
        rideType:
          type: string
          example: "economy"
        estimatedFare:
          type: number
          example: 15.50
        actualFare:
          type: number
          example: 16.25
        distance:
          type: number
          example: 5.2
        duration:
          type: integer
          example: 18
        createdAt:
          type: string
          format: date-time
        completedAt:
          type: string
          format: date-time

    Location:
      type: object
      required:
        - latitude
        - longitude
      properties:
        latitude:
          type: number
          example: 40.7128
        longitude:
          type: number
          example: -74.0060
        address:
          type: string
          example: "123 Main St, New York, NY 10001"

    Driver:
      type: object
      properties:
        id:
          type: string
          example: "driver_123456"
        userId:
          type: string
          example: "user_123456"
        licenseNumber:
          type: string
          example: "DL123456789"
        vehicleInfo:
          $ref: '#/components/schemas/Vehicle'
        rating:
          type: number
          example: 4.8
        totalRides:
          type: integer
          example: 1250
        status:
          type: string
          enum: [offline, available, busy]
          example: "available"
        currentLocation:
          $ref: '#/components/schemas/Location'

    Vehicle:
      type: object
      properties:
        make:
          type: string
          example: "Toyota"
        model:
          type: string
          example: "Camry"
        year:
          type: integer
          example: 2020
        color:
          type: string
          example: "Silver"
        licensePlate:
          type: string
          example: "ABC123"

    DriverRegistrationRequest:
      type: object
      required:
        - licenseNumber
        - vehicleInfo
      properties:
        licenseNumber:
          type: string
          example: "DL123456789"
        vehicleInfo:
          $ref: '#/components/schemas/Vehicle'

    LocationUpdate:
      type: object
      required:
        - latitude
        - longitude
      properties:
        latitude:
          type: number
          example: 40.7128
        longitude:
          type: number
          example: -74.0060

    DriverStatusUpdate:
      type: object
      required:
        - status
      properties:
        status:
          type: string
          enum: [offline, available, busy]
          example: "available"

    RideDetails:
      allOf:
        - $ref: '#/components/schemas/Ride'
        - type: object
          properties:
            driver:
              $ref: '#/components/schemas/Driver'
            route:
              type: array
              items:
                $ref: '#/components/schemas/Location'

    RideHistoryResponse:
      type: object
      properties:
        rides:
          type: array
          items:
            $ref: '#/components/schemas/Ride'
        pagination:
          type: object
          properties:
            page:
              type: integer
            limit:
              type: integer
            total:
              type: integer
            totalPages:
              type: integer

tags:
  - name: Health
    description: Service health endpoints
  - name: Rides
    description: Ride booking and management
  - name: Drivers
    description: Driver management and operations`;

// Hotel Service API Specification
const hotelServiceSpec = `openapi: 3.0.3
info:
  title: Hotel Service API
  description: |
    Property booking and management service.
    Supports property listings, booking management, and reviews similar to Airbnb.
  version: 1.0.0

servers:
  - url: http://localhost:3005
    description: Development server

security:
  - BearerAuth: []

paths:
  /health:
    get:
      summary: Health check endpoint
      tags: [Health]
      security: []
      responses:
        '200':
          description: Service is healthy

  /properties:
    get:
      summary: Search properties
      tags: [Properties]
      security: []
      parameters:
        - name: location
          in: query
          schema:
            type: string
        - name: checkIn
          in: query
          schema:
            type: string
            format: date
        - name: checkOut
          in: query
          schema:
            type: string
            format: date
        - name: guests
          in: query
          schema:
            type: integer
            default: 1
        - name: minPrice
          in: query
          schema:
            type: number
        - name: maxPrice
          in: query
          schema:
            type: number
      responses:
        '200':
          description: Properties retrieved successfully

    post:
      summary: Create new property listing
      tags: [Properties]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreatePropertyRequest'
      responses:
        '201':
          description: Property created successfully

  /properties/{propertyId}:
    get:
      summary: Get property details
      tags: [Properties]
      security: []
      parameters:
        - name: propertyId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Property details retrieved

  /bookings:
    post:
      summary: Create booking
      tags: [Bookings]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateBookingRequest'
      responses:
        '201':
          description: Booking created successfully

    get:
      summary: Get user bookings
      tags: [Bookings]
      responses:
        '200':
          description: Bookings retrieved successfully

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    CreatePropertyRequest:
      type: object
      required:
        - title
        - description
        - location
        - pricePerNight
        - maxGuests
      properties:
        title:
          type: string
        description:
          type: string
        location:
          type: object
        pricePerNight:
          type: number
        maxGuests:
          type: integer

    CreateBookingRequest:
      type: object
      required:
        - propertyId
        - checkIn
        - checkOut
        - guests
      properties:
        propertyId:
          type: string
        checkIn:
          type: string
          format: date
        checkOut:
          type: string
          format: date
        guests:
          type: integer

tags:
  - name: Health
  - name: Properties
  - name: Bookings`;

// File Service API Specification
const fileServiceSpec = `openapi: 3.0.3
info:
  title: File Service API
  description: File upload, storage, and media processing service
  version: 1.0.0

servers:
  - url: http://localhost:3006
    description: Development server

security:
  - BearerAuth: []

paths:
  /health:
    get:
      summary: Health check endpoint
      tags: [Health]
      security: []
      responses:
        '200':
          description: Service is healthy

  /upload:
    post:
      summary: Upload file
      tags: [Files]
      requestBody:
        required: true
        content:
          multipart/form-data:
            schema:
              type: object
              properties:
                file:
                  type: string
                  format: binary
                category:
                  type: string
                  enum: [profile, product, document]
      responses:
        '201':
          description: File uploaded successfully

  /files/{fileId}:
    get:
      summary: Get file details
      tags: [Files]
      parameters:
        - name: fileId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: File details retrieved

    delete:
      summary: Delete file
      tags: [Files]
      parameters:
        - name: fileId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: File deleted successfully

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

tags:
  - name: Health
  - name: Files`;

// Write all the API specifications
const specs = [
    { filename: 'taxi-service.yaml', content: taxiServiceSpec },
    { filename: 'hotel-service.yaml', content: hotelServiceSpec },
    { filename: 'file-service.yaml', content: fileServiceSpec }
];

specs.forEach(spec => {
    const filePath = path.join(apiDocsDir, spec.filename);
    fs.writeFileSync(filePath, spec.content);
    console.log(`Generated ${spec.filename}`);
});

// Generate remaining service specs (simplified versions)
const remainingServices = [
    'search-service',
    'notification-service',
    'analytics-service',
    'advertisement-service',
    'admin-service'
];

remainingServices.forEach(serviceName => {
    const port = 3007 + remainingServices.indexOf(serviceName);
    const simpleSpec = `openapi: 3.0.3
info:
  title: ${serviceName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} API
  description: ${serviceName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} for the multi-service platform
  version: 1.0.0

servers:
  - url: http://localhost:${port}
    description: Development server

security:
  - BearerAuth: []

paths:
  /health:
    get:
      summary: Health check endpoint
      tags: [Health]
      security: []
      responses:
        '200':
          description: Service is healthy
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    example: "healthy"
                  timestamp:
                    type: string
                    format: date-time
                  version:
                    type: string
                    example: "1.0.0"

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

tags:
  - name: Health
    description: Service health endpoints`;

    const filePath = path.join(apiDocsDir, `${serviceName}.yaml`);
    fs.writeFileSync(filePath, simpleSpec);
    console.log(`Generated ${serviceName}.yaml`);
});

console.log('\nAll API specifications generated successfully!');
console.log('\nTo view the documentation:');
console.log('1. Visit https://editor.swagger.io/');
console.log('2. Load any of the YAML files from docs/api/');
console.log('3. Or use swagger-ui-express in your services');