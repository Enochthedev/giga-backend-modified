# User Authentication & Data Structure Summary

## Current Authentication Endpoints

### User Authentication
- **POST** `/api/v1/users` - User registration (signup)
- **POST** `/api/v1/auth/login` - User login with email/password
- **POST** `/api/v1/auth/logout` - User logout (requires authentication)

### Admin Authentication
- **POST** `/admin` - Admin login
- **POST** `/admin/create` - Create admin
- **POST** `/admin/createSubAdmin` - Create sub-admin

### OAuth Authentication (NEW)
- **GET** `/api/v1/auth/google` - Initiate Google OAuth login
- **GET** `/api/v1/auth/google/callback` - Google OAuth callback
- **GET** `/api/v1/auth/apple` - Initiate Apple OAuth login
- **GET** `/api/v1/auth/apple/callback` - Apple OAuth callback
- **GET** `/api/v1/auth/status/:provider` - Check OAuth provider status

## User Data Structure

### Core User Fields (Required)
```typescript
{
  firstName: string,        // Required
  lastName: string,         // Optional
  otherNames: string,       // Optional
  userName: string,         // Required, unique
  email: string,           // Required, unique, validated
  address: string,         // Required
  zipCode: number,         // Required
  phoneNumber: number,     // Required, unique
  password?: string,       // Required for email/password users, optional for OAuth
}
```

### Authentication Fields
```typescript
{
  // Email/Password Authentication
  password?: string,                    // Hashed with bcrypt, min 8 chars
  
  // OAuth Authentication (NEW)
  oauthProvider?: 'google' | 'apple',   // OAuth provider if using social login
  oauthId?: string,                     // Unique ID from OAuth provider
  oauthAccessToken?: string,            // Current OAuth access token
  oauthRefreshToken?: string,           // OAuth refresh token
  
  // Email Verification
  emailVerificationToken: string,       // 6-character verification code
  emailVerificationExpires: Date,       // 7-day expiration
  isEmailVerified: boolean,             // Auto-true for OAuth users
}
```

### Profile & Service Fields
```typescript
{
  // Profile Information
  profilePicture: string,               // Cloudinary URL
  gender: string,                       // Optional
  country: string,                      // Optional
  bodyWeight: number,                   // Optional (from Figma design)
  areaOfInterest: string,              // Optional (from Figma design)
  ageGroup: string,                     // Optional (from Figma design)
  
  // Taxi Service Integration
  taxiProfile?: ObjectId,               // Reference to taxi profile
  taxiProfileType: 'TaxiDriver' | 'TaxiCustomer', // Default: 'TaxiCustomer'
  
  // Ratings & Reviews
  ratings: number[],                    // Array of rating numbers
  averageRating: number,                // Auto-calculated average
  
  // Payment Integration
  creditCard?: string,                  // Credit card token reference
}
```

### System Fields
```typescript
{
  createdAt: Date,                      // Auto-generated timestamp
  updatedAt: Date,                      // Auto-updated timestamp
}
```

## Authentication Methods

### 1. Email/Password Authentication
- **Registration**: User provides email, password, and profile information
- **Login**: User provides email and password
- **Password Requirements**: Minimum 8 characters, hashed with bcrypt
- **Email Verification**: Required, 7-day expiration token

### 2. Google OAuth Authentication (NEW)
- **Initiation**: User redirected to Google OAuth consent screen
- **Data Retrieved**: Profile name, email, unique Google ID
- **User Creation**: Automatic user creation with Google profile data
- **Email Verification**: Automatically verified (Google handles this)

### 3. Apple OAuth Authentication (NEW)
- **Initiation**: User redirected to Apple Sign In
- **Data Retrieved**: Profile name, email (if provided), unique Apple ID
- **User Creation**: Automatic user creation with Apple profile data
- **Email Verification**: Automatically verified (Apple handles this)

## Login Credentials

### Email/Password Users
- **Email**: User's email address (unique)
- **Password**: User's chosen password (min 8 chars)

### OAuth Users
- **Provider**: Google or Apple
- **OAuth ID**: Unique identifier from the OAuth provider
- **No Password Required**: Authentication handled by OAuth provider

## Database Handling Per Microservice

### Main Service (`giga_main`)
- **Database**: MongoDB (Mongoose ODM)
- **Connection**: `MONGODB_URL` environment variable
- **Models**: User, Admin, SubAdmin, Token
- **Features**: Full CRUD, authentication, OAuth, email verification

### Advertisement Service
- **Database**: PostgreSQL
- **Connection**: Direct connection pool
- **Features**: Ad management, impressions, clicks

### Other Microservices
- **Hotel Service**: No database connection visible
- **Payment Service**: No database connection visible
- **Ecommerce Service**: No database connection visible
- **Taxi Services**: MongoDB (based on model files)

### Common Database Layer
- **Shared PostgreSQL**: Connection pool in `common/src/db.ts`
- **Redis**: Rate limiting and caching
- **Connection**: `DATABASE_URL` environment variable

## Security Features

### JWT Authentication
- **Access Token**: 15-minute expiration
- **Refresh Token**: 7-day expiration
- **Secrets**: `JWT_SECRET` and `REFRESH_SECRET` environment variables

### Password Security
- **Hashing**: bcrypt with salt rounds
- **Requirements**: Minimum 8 characters
- **Storage**: Never stored in plain text

### OAuth Security
- **Token Storage**: Secure storage in database
- **Token Refresh**: Automatic token renewal
- **Provider Validation**: Verified OAuth providers only

### Role-Based Access Control (RBAC)
- **Roles**: admin, subadmin, driver, vendor, customer
- **Middleware**: `checkRole()` function for route protection
- **Validation**: Role verification on protected routes

## Session Management

### Login Flow
1. User provides credentials (email/password or OAuth)
2. Backend validates credentials
3. JWT tokens generated and returned
4. Frontend stores tokens securely

### Logout Flow (NEW)
1. User requests logout
2. Backend clears OAuth tokens (if applicable)
3. Frontend removes stored tokens
4. User session terminated

### Token Management
- **Storage**: Frontend stores tokens (localStorage, sessionStorage, or secure cookies)
- **Usage**: Include in Authorization header: `Bearer {token}`
- **Refresh**: Use refresh token to get new access token
- **Expiration**: Handle token expiration gracefully

## Environment Variables Required

```bash
# Database
MONGODB_URL=mongodb://mongo:27017/giga
DATABASE_URL=postgres://postgres:postgres@postgres:5432/postgres

# JWT
JWT_SECRET=your-super-secret-jwt-key
REFRESH_SECRET=your-super-secret-refresh-key

# OAuth (NEW)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
APPLE_CLIENT_ID=your-apple-client-id
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY_PATH=path/to/apple/private/key.p8

# Frontend
FRONTEND_URL=http://localhost:3000
```

## Next Steps for Implementation

1. **Install Dependencies**: Run `npm install` to get OAuth packages
2. **Configure OAuth**: Set up Google and Apple OAuth applications
3. **Environment Setup**: Add OAuth environment variables
4. **Testing**: Test OAuth endpoints and authentication flow
5. **Frontend Integration**: Update frontend to handle OAuth redirects
6. **Production Deployment**: Update OAuth callback URLs for production
