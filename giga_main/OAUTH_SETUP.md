# OAuth Authentication Setup Guide

This guide explains how to set up Google and Apple OAuth authentication for the Giga Backend.

## Environment Variables Required

Add these environment variables to your `.env` file:

```bash
# Frontend URL for OAuth redirects
FRONTEND_URL=http://localhost:3000

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/google/callback

# Apple OAuth Configuration
APPLE_CLIENT_ID=your-apple-client-id
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY_PATH=path/to/your/apple/private/key.p8
APPLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/apple/callback
```

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client IDs
5. Set application type to "Web application"
6. Add authorized redirect URIs:
   - `http://localhost:3000/api/v1/auth/google/callback` (development)
   - `https://yourdomain.com/api/v1/auth/google/callback` (production)
7. Copy Client ID and Client Secret to your `.env` file

## Apple OAuth Setup

1. Go to [Apple Developer Console](https://developer.apple.com/)
2. Create an App ID with Sign In with Apple capability
3. Create a Services ID for web authentication
4. Create a private key for Sign In with Apple
5. Download the private key (.p8 file)
6. Note down:
   - Client ID (Services ID)
   - Team ID
   - Key ID
   - Private key path
7. Add all values to your `.env` file

## OAuth Endpoints

### Google OAuth
- **Initiate Login**: `GET /api/v1/auth/google`
- **Callback**: `GET /api/v1/auth/google/callback`

### Apple OAuth
- **Initiate Login**: `GET /api/v1/auth/apple`
- **Callback**: `GET /api/v1/auth/apple/callback`

### OAuth Status Check
- **Check Provider Status**: `GET /api/v1/auth/status/:provider`

## Authentication Flow

1. User clicks "Login with Google/Apple"
2. Frontend redirects to `/api/v1/auth/google` or `/api/v1/auth/apple`
3. User authenticates with OAuth provider
4. Provider redirects to callback URL with authorization code
5. Backend exchanges code for access token
6. Backend creates/updates user and generates JWT tokens
7. User is redirected to frontend with tokens in URL parameters
8. Frontend stores tokens and user is logged in

## User Data Structure

### OAuth User Fields
- `oauthProvider`: 'google' or 'apple'
- `oauthId`: Unique ID from OAuth provider
- `oauthAccessToken`: Current access token
- `oauthRefreshToken`: Refresh token for token renewal
- `isEmailVerified`: Automatically set to true for OAuth users

### Required Fields for OAuth Users
- `firstName`, `lastName`, `email` (from OAuth provider)
- `userName` (auto-generated as `{provider}_{oauthId}`)
- `address`, `zipCode`, `phoneNumber` (set to defaults)

### Optional Fields for OAuth Users
- `password` (not required for OAuth users)
- `emailVerificationToken` (auto-generated)
- `emailVerificationExpires` (7 days from creation)

## Security Features

- OAuth tokens are stored securely in database
- JWT tokens with 15-minute expiration
- Refresh tokens with 7-day expiration
- Automatic email verification for OAuth users
- Token revocation on logout

## Testing OAuth

1. Set up environment variables
2. Install dependencies: `npm install`
3. Start the server: `npm start`
4. Test OAuth endpoints:
   - Visit `/api/v1/auth/google` to initiate Google login
   - Check OAuth status: `/api/v1/auth/status/google`

## Troubleshooting

### Common Issues
1. **Invalid redirect URI**: Ensure callback URLs match exactly in OAuth provider settings
2. **Missing environment variables**: Check all required OAuth variables are set
3. **CORS issues**: Ensure frontend URL is properly configured
4. **Database connection**: Verify MongoDB connection is working

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` in your environment.
