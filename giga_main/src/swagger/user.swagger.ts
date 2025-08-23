/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - email
 *         - userName
 *         - firstName
 *         - lastName
 *         - phoneNumber
 *         - country
 *         - address
 *         - street
 *         - city
 *         - zipCode
 *         - gender
 *         - weight
 *         - maritalStatus
 *         - ageGroup
 *         - areaOfInterest
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: "user@example.com"
 *         userName:
 *           type: string
 *           minLength: 3
 *           maxLength: 30
 *           description: Unique username
 *           example: "john_doe"
 *         firstName:
 *           type: string
 *           minLength: 1
 *           maxLength: 50
 *           description: User's first name
 *           example: "John"
 *         lastName:
 *           type: string
 *           minLength: 1
 *           maxLength: 50
 *           description: User's last name
 *           example: "Doe"
 *         otherNames:
 *           type: string
 *           maxLength: 100
 *           description: User's other names
 *           example: "Michael"
 *         phoneNumber:
 *           type: string
 *           pattern: '^\+[1-9]\d{1,14}$'
 *           description: User's phone number in E.164 format
 *           example: "+1234567890"
 *         country:
 *           type: string
 *           description: User's country
 *           example: "United States"
 *         address:
 *           type: string
 *           description: User's full address
 *           example: "123 Main Street"
 *         street:
 *           type: string
 *           description: User's street name
 *           example: "Main Street"
 *         city:
 *           type: string
 *           description: User's city
 *           example: "New York"
 *         zipCode:
 *           type: string
 *           description: User's zip/postal code
 *           example: "10001"
 *         gender:
 *           type: string
 *           enum: [male, female, prefer-not-to-say]
 *           description: User's gender
 *           example: "male"
 *         weight:
 *           type: number
 *           minimum: 20
 *           maximum: 300
 *           description: User's weight in kg
 *           example: 70
 *         maritalStatus:
 *           type: string
 *           enum: [single, married, divorced, widowed, prefer-not-to-say]
 *           description: User's marital status
 *           example: "single"
 *         ageGroup:
 *           type: string
 *           enum: [18-24, 25-34, 35-44, 45-54, 55+]
 *           description: User's age group
 *           example: "25-34"
 *         areaOfInterest:
 *           type: string
 *           description: User's area of interest
 *           example: "Technology"
 *         profilePicture:
 *           type: string
 *           format: uri
 *           description: URL to user's profile picture
 *           example: "https://example.com/profile.jpg"
 *         password:
 *           type: string
 *           minLength: 8
 *           description: User's password (required for non-OAuth users)
 *           example: "securePassword123"
 *     
 *     CreateUserRequest:
 *       type: object
 *       allOf:
 *         - $ref: '#/components/schemas/User'
 *     
 *     CreateUserResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "User created successfully. Please verify your phone number with the OTP sent to your email."
 *         data:
 *           $ref: '#/components/schemas/User'
 *     
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "user@example.com"
 *         password:
 *           type: string
 *           example: "password123"
 *     
 *     LoginResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Login successful"
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
 *     
 *     OTPVerificationRequest:
 *       type: object
 *       required:
 *         - email
 *         - otp
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "user@example.com"
 *         otp:
 *           type: string
 *           pattern: '^[0-9]{6}$'
 *           description: 6-digit OTP code
 *           example: "123456"
 *     
 *     OTPVerificationResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Phone number verified successfully"
 *         data:
 *           type: object
 *           properties:
 *             user:
 *               $ref: '#/components/schemas/User'
 *     
 *     ResendOTPRequest:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "user@example.com"
 *     
 *     ResendOTPResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "OTP resent successfully"
 *     
 *     UpdateProfileRequest:
 *       type: object
 *       properties:
 *         firstName:
 *           type: string
 *           minLength: 1
 *           maxLength: 50
 *           example: "John"
 *         lastName:
 *           type: string
 *           minLength: 1
 *           maxLength: 50
 *           example: "Doe"
 *         otherNames:
 *           type: string
 *           maxLength: 100
 *           example: "Michael"
 *         country:
 *           type: string
 *           example: "United States"
 *         address:
 *           type: string
 *           example: "123 Main Street"
 *         street:
 *           type: string
 *           example: "Main Street"
 *         city:
 *           type: string
 *           example: "New York"
 *         zipCode:
 *           type: string
 *           example: "10001"
 *         gender:
 *           type: string
 *           enum: [male, female, prefer-not-to-say]
 *           example: "male"
 *         weight:
 *           type: number
 *           minimum: 20
 *           maximum: 300
 *           example: 70
 *         maritalStatus:
 *           type: string
 *           enum: [single, married, divorced, widowed, prefer-not-to-say]
 *           example: "single"
 *         ageGroup:
 *           type: string
 *           enum: [18-24, 25-34, 35-44, 45-54, 55+]
 *           example: "25-34"
 *         areaOfInterest:
 *           type: string
 *           example: "Technology"
 *         profilePicture:
 *           type: string
 *           format: uri
 *           example: "https://example.com/profile.jpg"
 *     
 *     UpdateProfileResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Profile updated successfully"
 *         data:
 *           $ref: '#/components/schemas/User'
 *     
 *     LogoutResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Logout successful"
 *     
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Error description"
 *         error:
 *           type: string
 *           example: "ERROR_CODE"
 *         details:
 *           type: object
 *           description: Additional error information
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
 *   - name: Authentication
 *     description: User authentication and authorization endpoints
 *   - name: User Management
 *     description: User profile and account management endpoints
 *   - name: OTP Verification
 *     description: Phone number verification using OTP
 */

/**
 * @swagger
 * /api/v1/users:
 *   post:
 *     summary: Create a new user account
 *     description: Creates a new user account with comprehensive profile information. Sends OTP to email for phone verification.
 *     tags: [User Management]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserRequest'
 *           example:
 *             email: "john.doe@example.com"
 *             userName: "john_doe"
 *             firstName: "John"
 *             lastName: "Doe"
 *             phoneNumber: "+1234567890"
 *             country: "United States"
 *             address: "123 Main Street"
 *             street: "Main Street"
 *             city: "New York"
 *             zipCode: "10001"
 *             gender: "male"
 *             weight: 70
 *             maritalStatus: "single"
 *             ageGroup: "25-34"
 *             areaOfInterest: "Technology"
 *             password: "securePassword123"
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateUserResponse'
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Email already taken"
 *               error: "VALIDATION_ERROR"
 *       409:
 *         description: Conflict - email, username, or phone number already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 * 
 * /api/v1/auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticates user with email and password, returns JWT tokens
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             email: "john.doe@example.com"
 *             password: "securePassword123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 * 
 * /api/v1/auth/logout:
 *   post:
 *     summary: User logout
 *     description: Logs out user and clears OAuth tokens if present
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LogoutResponse'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Internal server error
 * 
 * /api/v1/auth/verify-otp:
 *   post:
 *     summary: Verify phone number with OTP
 *     description: Verifies user's phone number using the OTP code sent to their email
 *     tags: [OTP Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OTPVerificationRequest'
 *           example:
 *             email: "john.doe@example.com"
 *             otp: "123456"
 *     responses:
 *       200:
 *         description: Phone number verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OTPVerificationResponse'
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *       409:
 *         description: Phone number already verified
 *       422:
 *         description: Invalid or expired OTP
 *       500:
 *         description: Internal server error
 * 
 * /api/v1/auth/resend-otp:
 *   post:
 *     summary: Resend OTP for phone verification
 *     description: Resends OTP code to user's email for phone number verification
 *     tags: [OTP Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResendOTPRequest'
 *           example:
 *             email: "john.doe@example.com"
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ResendOTPResponse'
 *       400:
 *         description: Bad request - validation error
 *       404:
 *         description: User not found
 *       409:
 *         description: Phone number already verified
 *       429:
 *         description: Too many requests - rate limit exceeded
 *       500:
 *         description: Internal server error
 * 
 * /api/v1/auth/verify-email:
 *   post:
 *     summary: Verify email address
 *     description: Verifies user's email address using verification token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - token
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@example.com"
 *               token:
 *                 type: string
 *                 example: "verification-token-123"
 *     responses:
 *       200:
 *         description: Email verified successfully
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
 *                   example: "Email verified successfully"
 *       400:
 *         description: Bad request - validation error
 *       404:
 *         description: User not found
 *       422:
 *         description: Email verification failed
 *       500:
 *         description: Internal server error
 * 
 * /api/v1/users/profile:
 *   put:
 *     summary: Update user profile
 *     description: Updates user profile information. Only authenticated users can update their own profile.
 *     tags: [User Management]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileRequest'
 *           example:
 *             firstName: "John"
 *             lastName: "Smith"
 *             city: "Los Angeles"
 *             zipCode: "90210"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UpdateProfileResponse'
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 * 
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     description: Retrieves user information by user ID
 *     tags: [User Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 * 
 *   put:
 *     summary: Update user by ID
 *     description: Updates user information by user ID (admin only)
 *     tags: [User Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "507f1f77bcf86cd799439011"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileRequest'
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 * 
 *   delete:
 *     summary: Delete user by ID
 *     description: Deletes user by user ID (admin only)
 *     tags: [User Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 * 
 * /api/v1/users:
 *   get:
 *     summary: Get all users
 *     description: Retrieves list of all users (admin only)
 *     tags: [User Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of users per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for filtering users
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     total:
 *                       type: integer
 *                       example: 100
 *                     pages:
 *                       type: integer
 *                       example: 5
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       403:
 *         description: Forbidden - insufficient permissions
 *       500:
 *         description: Internal server error
 */
