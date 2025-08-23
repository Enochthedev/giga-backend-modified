/**
 * @swagger
 * components:
 *   schemas:
 *     EnhancedUserProfile:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - phoneNumber
 *       properties:
 *         username:
 *           type: string
 *           description: Unique username for the user
 *           example: "john_doe"
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: "john.doe@example.com"
 *         phoneNumber:
 *           type: string
 *           description: User's phone number
 *           example: "+1234567890"
 *         password:
 *           type: string
 *           description: User's password (required for signup)
 *           example: "SecurePassword123!"
 *         firstName:
 *           type: string
 *           description: User's first name
 *           example: "John"
 *         lastName:
 *           type: string
 *           description: User's last name
 *           example: "Doe"
 *         country:
 *           type: string
 *           description: User's country
 *           example: "United States"
 *         address:
 *           type: string
 *           description: User's full address
 *           example: "123 Main Street, Apt 4B"
 *         street:
 *           type: string
 *           description: User's street address
 *           example: "123 Main Street"
 *         city:
 *           type: string
 *           description: User's city
 *           example: "New York"
 *         zipCode:
 *           type: string
 *           description: User's ZIP/postal code
 *           example: "10001"
 *         gender:
 *           type: string
 *           enum: [male, female, other, prefer_not_to_say]
 *           description: User's gender
 *           example: "male"
 *         weight:
 *           type: number
 *           description: User's weight in kilograms
 *           example: 75.5
 *         maritalStatus:
 *           type: string
 *           enum: [single, married, divorced, widowed, separated, in_relationship]
 *           description: User's marital status
 *           example: "single"
 *         ageGroup:
 *           type: string
 *           enum: [18-24, 25-34, 35-44, 45-54, 55-64, 65+]
 *           description: User's age group
 *           example: "25-34"
 *         areaOfInterest:
 *           type: array
 *           items:
 *             type: string
 *           description: Areas of interest for the user
 *           example: ["technology", "sports", "music", "travel"]
 *         profilePicture:
 *           type: string
 *           format: uri
 *           description: URL to user's profile picture
 *           example: "https://res.cloudinary.com/cloud-name/image/upload/v1234567890/user-profiles/profile-123.jpg"
 *         dateOfBirth:
 *           type: string
 *           format: date
 *           description: User's date of birth
 *           example: "1990-05-15"
 *         bio:
 *           type: string
 *           description: User's biography or description
 *           example: "Passionate developer and tech enthusiast"
 *         occupation:
 *           type: string
 *           description: User's occupation or job title
 *           example: "Software Engineer"
 *         company:
 *           type: string
 *           description: User's company or organization
 *           example: "Tech Corp"
 *         website:
 *           type: string
 *           format: uri
 *           description: User's personal website
 *           example: "https://johndoe.com"
 *         socialMedia:
 *           type: object
 *           description: User's social media profiles
 *           properties:
 *             linkedin:
 *               type: string
 *               format: uri
 *               example: "https://linkedin.com/in/johndoe"
 *             twitter:
 *               type: string
 *               format: uri
 *               example: "https://twitter.com/johndoe"
 *             instagram:
 *               type: string
 *               format: uri
 *               example: "https://instagram.com/johndoe"
 *             facebook:
 *               type: string
 *               format: uri
 *               example: "https://facebook.com/johndoe"
 *         preferences:
 *           type: object
 *           description: User's preferences and settings
 *           properties:
 *             language:
 *               type: string
 *               enum: [en, es, fr, de, it, pt, ru, zh, ja, ko]
 *               example: "en"
 *             timezone:
 *               type: string
 *               example: "America/New_York"
 *             notifications:
 *               type: object
 *               properties:
 *                 email:
 *                   type: boolean
 *                   example: true
 *                 sms:
 *                   type: boolean
 *                   example: false
 *                 push:
 *                   type: boolean
 *                   example: true
 *             privacy:
 *               type: object
 *               properties:
 *                 profileVisibility:
 *                   type: string
 *                   enum: [public, friends, private]
 *                   example: "public"
 *                 showEmail:
 *                   type: boolean
 *                   example: false
 *                 showPhone:
 *                   type: boolean
 *                   example: false
 *         isEmailVerified:
 *           type: boolean
 *           description: Whether user's email is verified
 *           example: false
 *         isPhoneVerified:
 *           type: boolean
 *           description: Whether user's phone is verified
 *           example: false
 *         isProfileComplete:
 *           type: boolean
 *           description: Whether user's profile is complete
 *           example: false
 *         lastActive:
 *           type: string
 *           format: date-time
 *           description: When user was last active
 *           example: "2024-01-15T10:30:00Z"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When user account was created
 *           example: "2024-01-15T10:30:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When user profile was last updated
 *           example: "2024-01-15T10:30:00Z"
 *     
 *     CreateUserRequest:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - phoneNumber
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           minLength: 3
 *           maxLength: 30
 *           pattern: "^[a-zA-Z0-9_]+$"
 *           description: Unique username (3-30 characters, alphanumeric + underscore)
 *           example: "john_doe"
 *         email:
 *           type: string
 *           format: email
 *           description: Valid email address
 *           example: "john.doe@example.com"
 *         phoneNumber:
 *           type: string
 *           pattern: "^\\+[1-9]\\d{1,14}$"
 *           description: Phone number in international format
 *           example: "+1234567890"
 *         password:
 *           type: string
 *           minLength: 8
 *           description: Password (minimum 8 characters)
 *           example: "SecurePassword123!"
 *         firstName:
 *           type: string
 *           maxLength: 50
 *           example: "John"
 *         lastName:
 *           type: string
 *           maxLength: 50
 *           example: "Doe"
 *         country:
 *           type: string
 *           maxLength: 100
 *           example: "United States"
 *         address:
 *           type: string
 *           maxLength: 200
 *           example: "123 Main Street, Apt 4B"
 *         street:
 *           type: string
 *           maxLength: 100
 *           example: "123 Main Street"
 *         city:
 *           type: string
 *           maxLength: 100
 *           example: "New York"
 *         zipCode:
 *           type: string
 *           maxLength: 20
 *           example: "10001"
 *         gender:
 *           type: string
 *           enum: [male, female, other, prefer_not_to_say]
 *           example: "male"
 *         weight:
 *           type: number
 *           minimum: 20
 *           maximum: 300
 *           description: Weight in kilograms
 *           example: 75.5
 *         maritalStatus:
 *           type: string
 *           enum: [single, married, divorced, widowed, separated, in_relationship]
 *           example: "single"
 *         ageGroup:
 *           type: string
 *           enum: [18-24, 25-34, 35-44, 45-54, 55-64, 65+]
 *           example: "25-34"
 *         areaOfInterest:
 *           type: array
 *           items:
 *             type: string
 *           maxItems: 10
 *           example: ["technology", "sports", "music"]
 *         dateOfBirth:
 *           type: string
 *           format: date
 *           description: Must be at least 18 years ago
 *           example: "1990-05-15"
 *         bio:
 *           type: string
 *           maxLength: 500
 *           example: "Passionate developer and tech enthusiast"
 *         occupation:
 *           type: string
 *           maxLength: 100
 *           example: "Software Engineer"
 *         company:
 *           type: string
 *           maxLength: 100
 *           example: "Tech Corp"
 *         website:
 *           type: string
 *           format: uri
 *           example: "https://johndoe.com"
 *         socialMedia:
 *           type: object
 *           properties:
 *             linkedin:
 *               type: string
 *               format: uri
 *               example: "https://linkedin.com/in/johndoe"
 *             twitter:
 *               type: string
 *               format: uri
 *               example: "https://twitter.com/johndoe"
 *             instagram:
 *               type: string
 *               format: uri
 *               example: "https://instagram.com/johndoe"
 *             facebook:
 *               type: string
 *               format: uri
 *               example: "https://facebook.com/johndoe"
 *         preferences:
 *           type: object
 *           properties:
 *             language:
 *               type: string
 *               enum: [en, es, fr, de, it, pt, ru, zh, ja, ko]
 *               example: "en"
 *             timezone:
 *               type: string
 *               example: "America/New_York"
 *             notifications:
 *               type: object
 *               properties:
 *                 email:
 *                   type: boolean
 *                   example: true
 *                 sms:
 *                   type: boolean
 *                   example: false
 *                 push:
 *                   type: boolean
 *                   example: true
 *             privacy:
 *               type: object
 *               properties:
 *                 profileVisibility:
 *                   type: string
 *                   enum: [public, friends, private]
 *                   example: "public"
 *                 showEmail:
 *                   type: boolean
 *                   example: false
 *                 showPhone:
 *                   type: boolean
 *                   example: false
 *     
 *     UpdateUserProfileRequest:
 *       type: object
 *       properties:
 *         firstName:
 *           type: string
 *           maxLength: 50
 *           example: "John"
 *         lastName:
 *           type: string
 *           maxLength: 50
 *           example: "Doe"
 *         country:
 *           type: string
 *           maxLength: 100
 *           example: "United States"
 *         address:
 *           type: string
 *           maxLength: 200
 *           example: "123 Main Street, Apt 4B"
 *         street:
 *           type: string
 *           maxLength: 100
 *           example: "123 Main Street"
 *         city:
 *           type: string
 *           maxLength: 100
 *           example: "New York"
 *         zipCode:
 *           type: string
 *           maxLength: 20
 *           example: "10001"
 *         gender:
 *           type: string
 *           enum: [male, female, other, prefer_not_to_say]
 *           example: "male"
 *         weight:
 *           type: number
 *           minimum: 20
 *           maximum: 300
 *           description: Weight in kilograms
 *           example: 75.5
 *         maritalStatus:
 *           type: string
 *           enum: [single, married, divorced, widowed, separated, in_relationship]
 *           example: "single"
 *         ageGroup:
 *           type: string
 *           enum: [18-24, 25-34, 35-44, 45-54, 55-64, 65+]
 *           example: "25-34"
 *         areaOfInterest:
 *           type: array
 *           items:
 *             type: string
 *           maxItems: 10
 *           example: ["technology", "sports", "music"]
 *         dateOfBirth:
 *           type: string
 *           format: date
 *           description: Must be at least 18 years ago
 *           example: "1990-05-15"
 *         bio:
 *           type: string
 *           maxLength: 500
 *           example: "Passionate developer and tech enthusiast"
 *         occupation:
 *           type: string
 *           maxLength: 100
 *           example: "Software Engineer"
 *         company:
 *           type: string
 *           maxLength: 100
 *           example: "Tech Corp"
 *         website:
 *           type: string
 *           format: uri
 *           example: "https://johndoe.com"
 *         socialMedia:
 *           type: object
 *           properties:
 *             linkedin:
 *               type: string
 *               format: uri
 *               example: "https://linkedin.com/in/johndoe"
 *             twitter:
 *               type: string
 *               format: uri
 *               example: "https://twitter.com/johndoe"
 *             instagram:
 *               type: string
 *               format: uri
 *               example: "https://instagram.com/johndoe"
 *             facebook:
 *               type: string
 *               format: uri
 *               example: "https://facebook.com/johndoe"
 *         preferences:
 *           type: object
 *           properties:
 *             language:
 *               type: string
 *               enum: [en, es, fr, de, it, pt, ru, zh, ja, ko]
 *               example: "en"
 *             timezone:
 *               type: string
 *               example: "America/New_York"
 *             notifications:
 *               type: object
 *               properties:
 *                 email:
 *                   type: boolean
 *                   example: true
 *                 sms:
 *                   type: boolean
 *                   example: false
 *                 push:
 *                   type: boolean
 *                   example: true
 *             privacy:
 *               type: object
 *               properties:
 *                 profileVisibility:
 *                   type: string
 *                   enum: [public, friends, private]
 *                   example: "public"
 *                 showEmail:
 *                   type: boolean
 *                   example: false
 *                 showPhone:
 *                   type: boolean
 *                   example: false
 *     
 *     UpdateProfilePictureRequest:
 *       type: object
 *       required:
 *         - profilePicture
 *       properties:
 *         profilePicture:
 *           type: string
 *           format: binary
 *           description: New profile picture file (JPG, PNG, GIF, WebP)
 *         cropOptions:
 *           type: object
 *           description: Optional cropping options
 *           properties:
 *             x:
 *               type: number
 *               description: X coordinate for cropping
 *               example: 100
 *             y:
 *               type: number
 *               description: Y coordinate for cropping
 *               example: 100
 *             width:
 *               type: number
 *               description: Width for cropping
 *               example: 400
 *             height:
 *               type: number
 *               description: Height for cropping
 *               example: 400
 *         stripMetadata:
 *           type: boolean
 *           description: Whether to strip metadata from the image
 *           example: true
 *     
 *     UserProfileResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "User profile retrieved successfully"
 *         data:
 *           $ref: '#/components/schemas/EnhancedUserProfile'
 *     
 *     UserListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Users retrieved successfully"
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/EnhancedUserProfile'
 *         pagination:
 *           type: object
 *           properties:
 *             page:
 *               type: number
 *               example: 1
 *             limit:
 *               type: number
 *               example: 10
 *             total:
 *               type: number
 *               example: 100
 *             totalPages:
 *               type: number
 *               example: 10
 *             hasNext:
 *               type: boolean
 *               example: true
 *             hasPrev:
 *               type: boolean
 *               example: false
 *     
 *     ProfileCompletionResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             completionPercentage:
 *               type: number
 *               minimum: 0
 *               maximum: 100
 *               description: Profile completion percentage
 *               example: 75
 *             completedFields:
 *               type: array
 *               items:
 *                 type: string
 *               description: List of completed field names
 *               example: ["username", "email", "firstName", "lastName"]
 *             missingFields:
 *               type: array
 *               items:
 *                 type: string
 *               description: List of missing field names
 *               example: ["country", "city", "bio", "profilePicture"]
 *             requiredFields:
 *               type: array
 *               items:
 *                 type: string
 *               description: List of required field names
 *               example: ["username", "email", "phoneNumber"]
 *             optionalFields:
 *               type: array
 *               items:
 *                 type: string
 *               description: List of optional field names
 *               example: ["firstName", "lastName", "country", "city"]
 *             recommendations:
 *               type: array
 *               items:
 *                 type: string
 *               description: Suggestions to improve profile completion
 *               example: ["Add a profile picture to make your profile more personal", "Fill in your bio to tell others about yourself"]
 *     
 *     UserSearchRequest:
 *       type: object
 *       properties:
 *         query:
 *           type: string
 *           description: Search query for username, email, or name
 *           example: "john"
 *         country:
 *           type: string
 *           description: Filter by country
 *           example: "United States"
 *         city:
 *           type: string
 *           description: Filter by city
 *           example: "New York"
 *         gender:
 *           type: string
 *           enum: [male, female, other, prefer_not_to_say]
 *           description: Filter by gender
 *           example: "male"
 *         ageGroup:
 *           type: string
 *           enum: [18-24, 25-34, 35-44, 45-54, 55-64, 65+]
 *           description: Filter by age group
 *           example: "25-34"
 *         areaOfInterest:
 *           type: array
 *           items:
 *             type: string
 *           description: Filter by areas of interest
 *           example: ["technology", "sports"]
 *         maritalStatus:
 *           type: string
 *           enum: [single, married, divorced, widowed, separated, in_relationship]
 *           description: Filter by marital status
 *           example: "single"
 *         isProfileComplete:
 *           type: boolean
 *           description: Filter by profile completion status
 *           example: true
 *         sortBy:
 *           type: string
 *           enum: [username, createdAt, lastActive, profileCompletion]
 *           description: Sort field
 *           example: "createdAt"
 *         sortOrder:
 *           type: string
 *           enum: [asc, desc]
 *           description: Sort order
 *           example: "desc"
 *         page:
 *           type: number
 *           minimum: 1
 *           description: Page number
 *           example: 1
 *         limit:
 *           type: number
 *           minimum: 1
 *           maximum: 100
 *           description: Number of results per page
 *           example: 10
 *     
 *     UserStatsResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             totalUsers:
 *               type: number
 *               example: 1000
 *             activeUsers:
 *               type: number
 *               description: Users active in last 30 days
 *               example: 750
 *             newUsersThisMonth:
 *               type: number
 *               example: 150
 *             profileCompletionStats:
 *               type: object
 *               properties:
 *                 complete:
 *                   type: number
 *                   example: 600
 *                 partial:
 *                   type: number
 *                   example: 300
 *                 incomplete:
 *                   type: number
 *                   example: 100
 *             demographics:
 *               type: object
 *               properties:
 *                 gender:
 *                   type: object
 *                   properties:
 *                     male:
 *                       type: number
 *                       example: 450
 *                     female:
 *                       type: number
 *                       example: 400
 *                     other:
 *                       type: number
 *                       example: 100
 *                     prefer_not_to_say:
 *                       type: number
 *                       example: 50
 *                 ageGroups:
 *                   type: object
 *                   properties:
 *                     "18-24":
 *                       type: number
 *                       example: 200
 *                     "25-34":
 *                       type: number
 *                       example: 300
 *                     "35-44":
 *                       type: number
 *                       example: 250
 *                     "45-54":
 *                       type: number
 *                       example: 150
 *                     "55-64":
 *                       type: number
 *                       example: 70
 *                     "65+":
 *                       type: number
 *                       example: 30
 *                 topCountries:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       country:
 *                         type: string
 *                         example: "United States"
 *                       count:
 *                         type: number
 *                         example: 300
 *                       percentage:
 *                         type: number
 *                         example: 30
 *                 topCities:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       city:
 *                         type: string
 *                         example: "New York"
 *                       count:
 *                         type: number
 *                         example: 100
 *                       percentage:
 *                         type: number
 *                         example: 10
 *             topInterests:
 *               type: array
 *               items:
 *                     type: object
 *                     properties:
 *                       interest:
 *                         type: string
 *                         example: "technology"
 *                       count:
 *                         type: number
 *                         example: 400
 *                       percentage:
 *                         type: number
 *                         example: 40
 *     
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Operation failed"
 *         error:
 *           type: string
 *           example: "VALIDATION_ERROR"
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
 *   - name: User Profile
 *     description: Enhanced user profile management with comprehensive fields
 */

/**
 * @swagger
 * /api/v1/users/profile:
 *   get:
 *     summary: Get current user profile
 *     description: Retrieves the complete profile of the currently authenticated user
 *     tags: [User Profile]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfileResponse'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       404:
 *         description: User profile not found
 *       500:
 *         description: Internal server error
 * 
 *   put:
 *     summary: Update user profile
 *     description: Updates the profile of the currently authenticated user with enhanced fields
 *     tags: [User Profile]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserProfileRequest'
 *           example:
 *             firstName: "John"
 *             lastName: "Doe"
 *             country: "United States"
 *             city: "New York"
 *             bio: "Passionate developer and tech enthusiast"
 *             occupation: "Software Engineer"
 *             areaOfInterest: ["technology", "sports", "music"]
 *     responses:
 *       200:
 *         description: User profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfileResponse'
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Internal server error
 * 
 * /api/v1/users/profile/picture:
 *   post:
 *     summary: Update profile picture
 *     description: Updates the user's profile picture with optional cropping and metadata stripping
 *     tags: [User Profile]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfilePictureRequest'
 *           example:
 *             profilePicture: "(binary)"
 *             cropOptions:
 *               x: 100
 *               y: 100
 *               width: 400
 *               height: 400
 *             stripMetadata: true
 *     responses:
 *       200:
 *         description: Profile picture updated successfully
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
 *                   example: "Profile picture updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     profilePicture:
 *                       type: string
 *                       format: uri
 *                       example: "https://res.cloudinary.com/cloud-name/image/upload/v1234567890/user-profiles/profile-123.jpg"
 *                     publicId:
 *                       type: string
 *                       example: "user-profiles/profile-123"
 *                     metadataStripped:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       413:
 *         description: File too large
 *       415:
 *         description: Unsupported file type
 *       500:
 *         description: Internal server error
 * 
 * /api/v1/users/profile/completion:
 *   get:
 *     summary: Get profile completion status
 *     description: Returns detailed information about the user's profile completion status
 *     tags: [User Profile]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Profile completion status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProfileCompletionResponse'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Internal server error
 * 
 * /api/v1/users/search:
 *   get:
 *     summary: Search users
 *     description: Search for users based on various criteria including enhanced profile fields
 *     tags: [User Profile]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Search query for username, email, or name
 *         example: "john"
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: Filter by country
 *         example: "United States"
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city
 *         example: "New York"
 *       - in: query
 *         name: gender
 *         schema:
 *           type: string
 *           enum: [male, female, other, prefer_not_to_say]
 *         description: Filter by gender
 *         example: "male"
 *       - in: query
 *         name: ageGroup
 *         schema:
 *           type: string
 *           enum: [18-24, 25-34, 35-44, 45-54, 55-64, 65+]
 *         description: Filter by age group
 *         example: "25-34"
 *       - in: query
 *         name: areaOfInterest
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Filter by areas of interest
 *         example: ["technology", "sports"]
 *       - in: query
 *         name: maritalStatus
 *         schema:
 *           type: string
 *           enum: [single, married, divorced, widowed, separated, in_relationship]
 *         description: Filter by marital status
 *         example: "single"
 *       - in: query
 *         name: isProfileComplete
 *         schema:
 *           type: boolean
 *         description: Filter by profile completion status
 *         example: true
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [username, createdAt, lastActive, profileCompletion]
 *         description: Sort field
 *         example: "createdAt"
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *         example: "desc"
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           minimum: 1
 *         description: Page number
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 100
 *         description: Number of results per page
 *         example: 10
 *     responses:
 *       200:
 *         description: Users found successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserListResponse'
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Internal server error
 * 
 * /api/v1/users/stats:
 *   get:
 *     summary: Get user statistics
 *     description: Returns comprehensive statistics about users including demographics and profile completion
 *     tags: [User Profile]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserStatsResponse'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Internal server error
 * 
 * /api/v1/users/{userId}:
 *   get:
 *     summary: Get user by ID
 *     description: Retrieves a specific user's profile by ID (with privacy settings applied)
 *     tags: [User Profile]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to retrieve
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfileResponse'
 *       400:
 *         description: Bad request - invalid user ID
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 * 
 * /api/v1/users/profile/export:
 *   get:
 *     summary: Export user profile data
 *     description: Exports the user's profile data in various formats (JSON, CSV, PDF)
 *     tags: [User Profile]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv, pdf]
 *         description: Export format
 *         example: "json"
 *       - in: query
 *         name: includePrivate
 *         schema:
 *           type: boolean
 *         description: Include private fields in export
 *         example: false
 *     responses:
 *       200:
 *         description: Profile data exported successfully
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
 *                   example: "Profile data exported successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     downloadUrl:
 *                       type: string
 *                       format: uri
 *                       example: "https://api.example.com/downloads/profile-export-123.json"
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-16T10:30:00Z"
 *                     format:
 *                       type: string
 *                       example: "json"
 *                     size:
 *                       type: number
 *                       example: 2048
 *       400:
 *         description: Bad request - invalid format
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Internal server error
 */
