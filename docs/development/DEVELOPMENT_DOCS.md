# 🚀 Giga Backend - Development Documentation

> **This is a LIVING document that gets updated as we develop new features**
> 
> **Last Updated:** 2024-08-22  
> **Version:** 2.0.0  
> **Status:** Active Development

## 📋 **Table of Contents**

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [API Documentation](#api-documentation)
4. [Database Schema](#database-schema)
5. [Authentication & Security](#authentication--security)
6. [Development Guidelines](#development-guidelines)
7. [Testing Strategy](#testing-strategy)
8. [Deployment](#deployment)
9. [Changelog](#changelog)
10. [Known Issues](#known-issues)
11. [Future Roadmap](#future-roadmap)

---

## 🎯 **Project Overview**

### **What is Giga Backend?**
A microservices-based backend system providing comprehensive user management, authentication, file handling, and business logic for multiple services including taxi, hotel, ecommerce, and advertisement platforms.

### **Core Services**
- **`giga_main`** - User management, authentication, OAuth, OTP verification
- **`common`** - Shared utilities, email, file upload, database connections
- **`advertisement-service`** - Advertisement management
- **`hotel-service`** - Hotel booking and management
- **`payment-service`** - Payment processing
- **`ecommerce-backend`** - E-commerce functionality
- **`giga_taxi_driver`** - Taxi driver management
- **`giga_taxi_main`** - Taxi ride management

---

## 🏗️ **Architecture**

### **Microservices Pattern**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Load Balancer │    │   API Gateway   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  giga_main      │    │ advertisement   │    │   hotel-service │
│  (Auth/Users)   │    │   -service      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ payment-service │    │ ecommerce-      │    │  giga_taxi_*   │
│                 │    │ backend         │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Technology Stack**
- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js
- **Databases:** MongoDB (users), PostgreSQL (ads), Redis (caching)
- **Authentication:** JWT, OAuth 2.0 (Google, Apple)
- **File Storage:** Cloudinary
- **Email:** Nodemailer with multiple providers
- **Documentation:** Swagger/OpenAPI 3.0
- **Testing:** Jest
- **Containerization:** Docker

---

## 📚 **API Documentation**

### **Base URLs**
- **Development:** `http://localhost:3000`
- **Production:** `https://api.giga.com`

### **API Versioning**
All APIs use version `v1` with the pattern: `/api/v1/{service}/{endpoint}`

### **Swagger Documentation**
- **Main API:** `/api-docs`
- **User API:** `/api/v1/docs`
- **Admin API:** `/admin/docs`

---

## 🗄️ **Database Schema**

### **User Model (MongoDB)**
```typescript
interface IUser {
  // Basic Information
  email: string;
  userName: string;
  firstName: string;
  lastName: string;
  otherNames?: string;
  
  // Authentication
  password?: string; // Optional for OAuth users
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  
  // Phone Verification
  phoneNumber: string;
  isPhoneVerified: boolean;
  otpCode?: string;
  otpExpires?: Date;
  
  // Profile Information
  country: string;
  address: string;
  street: string;
  city: string;
  zipCode: string;
  gender: 'male' | 'female' | 'prefer-not-to-say';
  weight: number;
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed' | 'prefer-not-to-say';
  ageGroup: '18-24' | '25-34' | '35-44' | '45-54' | '55+';
  areaOfInterest: string;
  profilePicture?: string;
  
  // OAuth Integration
  oauthProvider?: 'google' | 'apple';
  oauthId?: string;
  oauthAccessToken?: string;
  oauthRefreshToken?: string;
  
  // Business Logic
  creditCard?: string;
  ratings: number[];
  taxiProfile?: string;
  taxiProfileType: 'TaxiCustomer' | 'TaxiDriver';
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

### **Database Connections**
- **MongoDB:** User management, authentication
- **PostgreSQL:** Advertisement data, business logic
- **Redis:** Rate limiting, caching, sessions

---

## 🔐 **Authentication & Security**

### **JWT Tokens**
- **Access Token:** 15 minutes expiry
- **Refresh Token:** 7 days expiry
- **Algorithm:** HS256

### **OAuth 2.0 Providers**
- **Google OAuth:** `/auth/google` → `/auth/google/callback`
- **Apple OAuth:** `/auth/apple` → `/auth/apple/callback`

### **Security Features**
- **Rate Limiting:** Redis-based, configurable per endpoint
- **Input Validation:** Joi schemas for all endpoints
- **Password Security:** Bcrypt hashing (cost factor: 12)
- **CORS:** Configurable origins
- **Helmet:** Security headers
- **Metadata Stripping:** Automatic file metadata removal

---

## 🛠️ **Development Guidelines**

### **Code Style**
- **TypeScript:** Strict mode enabled
- **ESLint:** Airbnb configuration
- **Prettier:** Consistent formatting
- **Conventional Commits:** Standard commit messages

### **File Naming**
- **Controllers:** `*.controller.ts`
- **Services:** `*.service.ts`
- **Models:** `*.model.ts`
- **Routes:** `*.routes.ts`
- **Validations:** `*.validation.ts`
- **Tests:** `*.test.ts`

### **Error Handling**
```typescript
// Use catchAsync wrapper for all async functions
const someFunction = catchAsync(async (req: Request, res: Response) => {
  // Your logic here
  // Errors are automatically caught and formatted
});
```

### **Response Format**
```typescript
// Success Response
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { /* result data */ }
}

// Error Response
{
  "success": false,
  "message": "Error description",
  "error": "Error code",
  "details": { /* additional error info */ }
}
```

---

## 🧪 **Testing Strategy**

### **Test Types**
- **Unit Tests:** Individual functions and methods
- **Integration Tests:** API endpoints and database operations
- **E2E Tests:** Complete user workflows

### **Test Coverage**
- **Target:** >90% code coverage
- **Framework:** Jest with TypeScript support
- **Mocking:** Comprehensive dependency mocking

### **Running Tests**
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- user.service.test.ts
```

---

## 🚀 **Deployment**

### **Environment Variables**
All services require proper `.env` files with:
- Database connections
- OAuth credentials
- Email service configuration
- Cloudinary settings
- JWT secrets

### **Docker Support**
```bash
# Build and run with Docker Compose
docker-compose up --build

# Individual service
docker build -t giga-main ./giga_main
docker run -p 3000:3000 giga-main
```

### **Health Checks**
- **Endpoint:** `/health`
- **Database:** Connection status
- **Services:** External service availability
- **Response Time:** Performance metrics

---

## 📝 **Changelog**

### **Version 2.0.0 (2024-08-22)**
#### **Added**
- ✅ OAuth 2.0 integration (Google & Apple)
- ✅ OTP phone verification system
- ✅ Enhanced user profile with 15+ new fields
- ✅ Advanced file upload with metadata stripping
- ✅ Multi-provider email system
- ✅ Comprehensive validation schemas
- ✅ Environment configuration examples

#### **Changed**
- 🔄 User model structure completely enhanced
- 🔄 Authentication flow improved
- 🔄 File handling security enhanced

#### **Fixed**
- 🐛 TypeScript compilation issues
- 🐛 Missing dependencies
- 🐛 Validation inconsistencies

### **Version 1.0.0 (Previous)**
- Basic user management
- JWT authentication
- MongoDB integration
- Basic CRUD operations

---

## 🐛 **Known Issues**

### **Current Issues**
1. **Swagger Documentation:** New OAuth and OTP routes need Swagger docs
2. **Type Safety:** Some endpoints need better TypeScript interfaces
3. **Test Coverage:** Some edge cases not fully covered

### **Planned Fixes**
- [ ] Add Swagger documentation for all new routes
- [ ] Enhance TypeScript interfaces for better type safety
- [ ] Improve test coverage for edge cases
- [ ] Add API rate limiting documentation

---

## 🗺️ **Future Roadmap**

### **Phase 3 (Next Sprint)**
- [ ] **Swagger Integration** - Complete API documentation
- [ ] **Type Safety** - Enhanced TypeScript interfaces
- [ ] **API Testing** - Postman collections
- [ ] **Performance Monitoring** - Response time tracking

### **Phase 4 (Following Sprint)**
- [ ] **GraphQL Support** - Alternative to REST
- [ ] **WebSocket Integration** - Real-time features
- [ ] **Advanced Caching** - Redis optimization
- [ ] **Microservice Communication** - Service mesh

### **Phase 5 (Long Term)**
- [ ] **Kubernetes Deployment** - Container orchestration
- [ ] **CI/CD Pipeline** - Automated testing and deployment
- [ ] **Monitoring & Alerting** - Production observability
- [ ] **Internationalization** - Multi-language support

---

## 📞 **Support & Contact**

### **Development Team**
- **Lead Developer:** [Your Name]
- **Backend Team:** [Team Members]
- **DevOps:** [DevOps Team]

### **Communication Channels**
- **Slack:** #giga-backend-dev
- **Email:** dev@giga.com
- **GitHub Issues:** [Repository Issues]

### **Documentation Updates**
This document is updated with every major feature addition or change. If you find outdated information, please create an issue or submit a pull request.

---

## 🔄 **Documentation Maintenance**

### **Update Frequency**
- **Major Features:** Immediately after implementation
- **Bug Fixes:** Within 24 hours
- **Minor Changes:** Weekly review
- **Full Review:** Monthly

### **How to Update**
1. Make your code changes
2. Update relevant sections of this document
3. Update the changelog with your changes
4. Update the "Last Updated" date
5. Commit both code and documentation changes

### **Documentation Standards**
- Use clear, concise language
- Include code examples where helpful
- Keep information current and accurate
- Use consistent formatting and structure

---

**📚 This document is the single source of truth for Giga Backend development. Keep it updated! 📚**
