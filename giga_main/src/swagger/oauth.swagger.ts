/**
 * @swagger
 * components:
 *   schemas:
 *     OAuthUser:
 *       type: object
 *       properties:
 *         oauthProvider:
 *           type: string
 *           enum: [google, apple]
 *           description: OAuth provider used for authentication
 *           example: "google"
 *         oauthId:
 *           type: string
 *           description: Unique identifier from OAuth provider
 *           example: "123456789"
 *         email:
 *           type: string
 *           format: email
 *           description: User's email from OAuth provider
 *           example: "user@gmail.com"
 *         firstName:
 *           type: string
 *           description: User's first name from OAuth provider
 *           example: "John"
 *         lastName:
 *           type: string
 *           description: User's last name from OAuth provider
 *           example: "Doe"
 *         profilePicture:
 *           type: string
 *           format: uri
 *           description: User's profile picture URL from OAuth provider
 *           example: "https://lh3.googleusercontent.com/a/..."
 *     
 *     OAuthCallbackResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "OAuth authentication successful"
 *         data:
 *           type: object
 *           properties:
 *             token:
 *               type: string
 *               description: JWT access token
 *               example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *             refreshToken:
 *               type: string
 *               description: JWT refresh token
 *               example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *             user:
 *               $ref: '#/components/schemas/User'
 *             redirectUrl:
 *               type: string
 *               format: uri
 *               description: Frontend URL to redirect after successful OAuth
 *               example: "https://app.giga.com/auth/success"
 *     
 *     OAuthStatusResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             provider:
 *               type: string
 *               enum: [google, apple]
 *               example: "google"
 *             configured:
 *               type: boolean
 *               description: Whether OAuth provider is properly configured
 *               example: true
 *             clientId:
 *               type: string
 *               description: OAuth client ID (masked for security)
 *               example: "123456789-***.apps.googleusercontent.com"
 *             redirectUri:
 *               type: string
 *               format: uri
 *               description: OAuth redirect URI
 *               example: "https://api.giga.com/api/v1/auth/google/callback"
 *             scopes:
 *               type: array
 *               items:
 *                 type: string
 *               description: OAuth scopes requested
 *               example: ["profile", "email"]
 *     
 *     OAuthErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "OAuth authentication failed"
 *         error:
 *           type: string
 *           enum: [OAUTH_ERROR, INVALID_STATE, ACCESS_DENIED, PROVIDER_ERROR]
 *           example: "OAUTH_ERROR"
 *         details:
 *           type: object
 *           properties:
 *             provider:
 *               type: string
 *               enum: [google, apple]
 *               example: "google"
 *             errorCode:
 *               type: string
 *               description: OAuth provider error code
 *               example: "invalid_grant"
 *             errorDescription:
 *               type: string
 *               description: Human-readable error description
 *               example: "The authorization code has expired"
 *     
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: JWT token for authentication
 */

/**
 * @swagger
 * tags:
 *   - name: OAuth Authentication
 *     description: OAuth 2.0 authentication endpoints for Google and Apple
 */

/**
 * @swagger
 * /api/v1/auth/google:
 *   get:
 *     summary: Initiate Google OAuth authentication
 *     description: Redirects user to Google OAuth consent screen to authenticate with their Google account
 *     tags: [OAuth Authentication]
 *     parameters:
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: Optional state parameter for CSRF protection
 *         example: "random-state-string"
 *       - in: query
 *         name: redirect_uri
 *         schema:
 *           type: string
 *           format: uri
 *         description: Optional custom redirect URI after OAuth completion
 *         example: "https://app.giga.com/auth/success"
 *     responses:
 *       302:
 *         description: Redirects to Google OAuth consent screen
 *         headers:
 *           Location:
 *             description: Google OAuth URL
 *             schema:
 *               type: string
 *               example: "https://accounts.google.com/o/oauth2/v2/auth?client_id=..."
 *       400:
 *         description: Bad request - invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OAuthErrorResponse'
 *       500:
 *         description: Internal server error - OAuth configuration issue
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OAuthErrorResponse'
 * 
 * /api/v1/auth/google/callback:
 *   get:
 *     summary: Google OAuth callback
 *     description: Handles the callback from Google OAuth after user authentication. Creates or links user account and returns JWT tokens.
 *     tags: [OAuth Authentication]
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Authorization code from Google
 *         example: "4/0AfJohXn..."
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: State parameter for CSRF protection
 *         example: "random-state-string"
 *       - in: query
 *         name: error
 *         schema:
 *           type: string
 *         description: Error code if OAuth failed
 *         example: "access_denied"
 *     responses:
 *       200:
 *         description: OAuth authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OAuthCallbackResponse'
 *       302:
 *         description: Redirects to frontend with tokens (if redirect_uri provided)
 *         headers:
 *           Location:
 *             description: Frontend redirect URL with tokens
 *             schema:
 *               type: string
 *               example: "https://app.giga.com/auth/success?token=...&refreshToken=..."
 *       400:
 *         description: Bad request - invalid authorization code
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OAuthErrorResponse'
 *       401:
 *         description: Unauthorized - OAuth state validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OAuthErrorResponse'
 *       500:
 *         description: Internal server error - OAuth processing failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OAuthErrorResponse'
 * 
 * /api/v1/auth/apple:
 *   get:
 *     summary: Initiate Apple Sign-In authentication
 *     description: Redirects user to Apple Sign-In consent screen to authenticate with their Apple ID
 *     tags: [OAuth Authentication]
 *     parameters:
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: Optional state parameter for CSRF protection
 *         example: "random-state-string"
 *       - in: query
 *         name: redirect_uri
 *         schema:
 *           type: string
 *           format: uri
 *         description: Optional custom redirect URI after OAuth completion
 *         example: "https://app.giga.com/auth/success"
 *     responses:
 *       302:
 *         description: Redirects to Apple Sign-In consent screen
 *         headers:
 *           Location:
 *             description: Apple Sign-In URL
 *             schema:
 *               type: string
 *               example: "https://appleid.apple.com/auth/authorize?client_id=..."
 *       400:
 *         description: Bad request - invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OAuthErrorResponse'
 *       500:
 *         description: Internal server error - OAuth configuration issue
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OAuthErrorResponse'
 * 
 * /api/v1/auth/apple/callback:
 *   get:
 *     summary: Apple Sign-In callback
 *     description: Handles the callback from Apple Sign-In after user authentication. Creates or links user account and returns JWT tokens.
 *     tags: [OAuth Authentication]
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Authorization code from Apple
 *         example: "c1234567890..."
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: State parameter for CSRF protection
 *         example: "random-state-string"
 *       - in: query
 *         name: id_token
 *         schema:
 *           type: string
 *         description: ID token from Apple (contains user information)
 *         example: "eyJraWQiOiI4NkQ4OEtmIiwiYWxnIjoiUlMyNTYifQ..."
 *       - in: query
 *         name: error
 *         schema:
 *           type: string
 *         description: Error code if OAuth failed
 *         example: "access_denied"
 *     responses:
 *       200:
 *         description: OAuth authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OAuthCallbackResponse'
 *       302:
 *         description: Redirects to frontend with tokens (if redirect_uri provided)
 *         headers:
 *           Location:
 *             description: Frontend redirect URL with tokens
 *             schema:
 *               type: string
 *               example: "https://app.giga.com/auth/success?token=...&refreshToken=..."
 *       400:
 *         description: Bad request - invalid authorization code
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OAuthErrorResponse'
 *       401:
 *         description: Unauthorized - OAuth state validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OAuthErrorResponse'
 *       500:
 *         description: Internal server error - OAuth processing failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OAuthErrorResponse'
 * 
 * /api/v1/auth/status/{provider}:
 *   get:
 *     summary: Get OAuth provider status
 *     description: Returns the configuration status and details for a specific OAuth provider
 *     tags: [OAuth Authentication]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google, apple]
 *         description: OAuth provider to check
 *         example: "google"
 *     responses:
 *       200:
 *         description: OAuth provider status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OAuthStatusResponse'
 *       400:
 *         description: Bad request - invalid provider
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OAuthErrorResponse'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Internal server error
 * 
 * /api/v1/auth/oauth/link:
 *   post:
 *     summary: Link existing account to OAuth
 *     description: Links an existing user account to an OAuth provider (Google or Apple)
 *     tags: [OAuth Authentication]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider
 *               - oauthId
 *               - email
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [google, apple]
 *                 description: OAuth provider to link
 *                 example: "google"
 *               oauthId:
 *                 type: string
 *                 description: OAuth provider user ID
 *                 example: "123456789"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email from OAuth provider
 *                 example: "user@gmail.com"
 *               firstName:
 *                 type: string
 *                 description: User's first name from OAuth provider
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 description: User's last name from OAuth provider
 *                 example: "Doe"
 *               profilePicture:
 *                 type: string
 *                 format: uri
 *                 description: User's profile picture URL from OAuth provider
 *                 example: "https://lh3.googleusercontent.com/a/..."
 *     responses:
 *       200:
 *         description: Account linked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Account linked to Google successfully"
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OAuthErrorResponse'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       409:
 *         description: Conflict - OAuth account already linked to another user
 *       500:
 *         description: Internal server error
 * 
 * /api/v1/auth/oauth/unlink:
 *   post:
 *     summary: Unlink account from OAuth
 *     description: Unlinks the current user account from an OAuth provider
 *     tags: [OAuth Authentication]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [google, apple]
 *                 description: OAuth provider to unlink
 *                 example: "google"
 *     responses:
 *       200:
 *         description: Account unlinked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Account unlinked from Google successfully"
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       404:
 *         description: OAuth provider not linked to account
 *       500:
 *         description: Internal server error
 */
