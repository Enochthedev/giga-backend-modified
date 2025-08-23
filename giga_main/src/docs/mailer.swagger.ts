/**
 * @swagger
 * components:
 *   schemas:
 *     SendOTPRequest:
 *       type: object
 *       required:
 *         - email
 *         - phoneNumber
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: "user@example.com"
 *         phoneNumber:
 *           type: string
 *           description: User's phone number
 *           example: "+1234567890"
 *         purpose:
 *           type: string
 *           enum: [signup, password_reset, phone_verification]
 *           description: Purpose of the OTP
 *           example: "signup"
 *         template:
 *           type: string
 *           description: Custom email template to use
 *           example: "custom-otp-template"
 *     
 *     SendOTPResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "OTP sent successfully"
 *         data:
 *           type: object
 *           properties:
 *             otpId:
 *               type: string
 *               description: Unique identifier for the OTP
 *               example: "otp_1234567890abcdef"
 *             expiresAt:
 *               type: string
 *               format: date-time
 *               description: When the OTP expires
 *               example: "2024-01-15T11:00:00Z"
 *             purpose:
 *               type: string
 *               example: "signup"
 *             email:
 *               type: string
 *               example: "user@example.com"
 *             phoneNumber:
 *               type: string
 *               example: "+1234567890"
 *             remainingAttempts:
 *               type: number
 *               description: Number of verification attempts remaining
 *               example: 3
 *     
 *     VerifyOTPRequest:
 *       type: object
 *       required:
 *         - otpId
 *         - otp
 *       properties:
 *         otpId:
 *           type: string
 *           description: OTP identifier received from send OTP
 *           example: "otp_1234567890abcdef"
 *         otp:
 *           type: string
 *           description: The OTP code to verify
 *           example: "123456"
 *         purpose:
 *           type: string
 *           enum: [signup, password_reset, phone_verification]
 *           description: Purpose of the OTP verification
 *           example: "signup"
 *     
 *     VerifyOTPResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "OTP verified successfully"
 *         data:
 *           type: object
 *           properties:
 *             verified:
 *               type: boolean
 *               example: true
 *             purpose:
 *               type: string
 *               example: "signup"
 *             email:
 *               type: string
 *               example: "user@example.com"
 *             phoneNumber:
 *               type: string
 *               example: "+1234567890"
 *             verifiedAt:
 *               type: string
 *               format: date-time
 *               example: "2024-01-15T10:35:00Z"
 *     
 *     ResendOTPRequest:
 *       type: object
 *       required:
 *         - otpId
 *       properties:
 *         otpId:
 *           type: string
 *           description: OTP identifier to resend
 *           example: "otp_1234567890abcdef"
 *         reason:
 *           type: string
 *           enum: [expired, not_received, invalid]
 *           description: Reason for resending OTP
 *           example: "expired"
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
 *         data:
 *           type: object
 *           properties:
 *             newOtpId:
 *               type: string
 *               description: New OTP identifier
 *               example: "otp_0987654321fedcba"
 *             expiresAt:
 *               type: string
 *               format: date-time
 *               example: "2024-01-15T11:05:00Z"
 *             remainingAttempts:
 *               type: number
 *               example: 3
 *     
 *     SendVerificationEmailRequest:
 *       type: object
 *       required:
 *         - email
 *         - verificationToken
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: "user@example.com"
 *         verificationToken:
 *           type: string
 *           description: Email verification token
 *           example: "verification_token_1234567890abcdef"
 *         template:
 *           type: string
 *           description: Custom email template to use
 *           example: "custom-verification-template"
 *         redirectUrl:
 *           type: string
 *           format: uri
 *           description: URL to redirect after verification
 *           example: "https://app.example.com/verify-email"
 *     
 *     SendVerificationEmailResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Verification email sent successfully"
 *         data:
 *           type: object
 *           properties:
 *             email:
 *               type: string
 *               example: "user@example.com"
 *             verificationToken:
 *               type: string
 *               example: "verification_token_1234567890abcdef"
 *             sentAt:
 *               type: string
 *               format: date-time
 *               example: "2024-01-15T10:30:00Z"
 *             expiresAt:
 *               type: string
 *               format: date-time
 *               example: "2024-01-16T10:30:00Z"
 *     
 *     SendWelcomeEmailRequest:
 *       type: object
 *       required:
 *         - email
 *         - username
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *           example: "user@example.com"
 *         username:
 *           type: string
 *           description: User's username
 *           example: "john_doe"
 *         firstName:
 *           type: string
 *           description: User's first name
 *           example: "John"
 *         lastName:
 *           type: string
 *           description: User's last name
 *           example: "Doe"
 *         template:
 *           type: string
 *           description: Custom welcome email template
 *           example: "custom-welcome-template"
 *         welcomeMessage:
 *           type: string
 *           description: Custom welcome message
 *           example: "Welcome to our platform!"
 *         nextSteps:
 *           type: array
 *           items:
 *             type: string
 *           description: List of next steps for the user
 *           example: ["Complete your profile", "Upload a profile picture", "Explore features"]
 *     
 *     SendWelcomeEmailResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Welcome email sent successfully"
 *         data:
 *           type: object
 *           properties:
 *             email:
 *               type: string
 *               example: "user@example.com"
 *             username:
 *               type: string
 *               example: "john_doe"
 *             sentAt:
 *               type: string
 *               format: date-time
 *               example: "2024-01-15T10:30:00Z"
 *     
 *     SendCustomEmailRequest:
 *       type: object
 *       required:
 *         - to
 *         - subject
 *         - content
 *       properties:
 *         to:
 *           type: string
 *           format: email
 *           description: Recipient email address
 *           example: "user@example.com"
 *         cc:
 *           type: array
 *           items:
 *             type: string
 *             format: email
 *           description: CC recipients
 *           example: ["cc1@example.com", "cc2@example.com"]
 *         bcc:
 *           type: array
 *           items:
 *             type: string
 *             format: email
 *           description: BCC recipients
 *           example: ["bcc1@example.com", "bcc2@example.com"]
 *         subject:
 *           type: string
 *           description: Email subject
 *           example: "Important Update"
 *         content:
 *           type: string
 *           description: Email content (HTML or plain text)
 *           example: "<h1>Hello!</h1><p>This is a custom email.</p>"
 *         isHtml:
 *           type: boolean
 *           description: Whether content is HTML
 *           example: true
 *         attachments:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               filename:
 *                 type: string
 *                 example: "document.pdf"
 *               content:
 *                 type: string
 *                 format: binary
 *                 description: File content as base64 or buffer
 *               contentType:
 *                 type: string
 *                 example: "application/pdf"
 *         template:
 *           type: string
 *           description: Email template to use
 *           example: "custom-template"
 *         templateData:
 *           type: object
 *           description: Data to inject into template
 *           example:
 *             userName: "John Doe"
 *             companyName: "Example Corp"
 *     
 *     SendCustomEmailResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Custom email sent successfully"
 *         data:
 *           type: object
 *           properties:
 *             messageId:
 *               type: string
 *               description: Email service message ID
 *               example: "msg_1234567890abcdef"
 *             to:
 *               type: string
 *               example: "user@example.com"
 *             subject:
 *               type: string
 *               example: "Important Update"
 *             sentAt:
 *               type: string
 *               format: date-time
 *               example: "2024-01-15T10:30:00Z"
 *             attachments:
 *               type: array
 *               items:
 *                 type: string
 *               description: Names of attached files
 *               example: ["document.pdf"]
 *     
 *     EmailTemplate:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Template name
 *           example: "welcome-email"
 *         subject:
 *           type: string
 *           description: Email subject template
 *           example: "Welcome to {{platformName}}, {{firstName}}!"
 *         htmlContent:
 *           type: string
 *           description: HTML content template
 *           example: "<h1>Welcome {{firstName}}!</h1><p>We're excited to have you on {{platformName}}.</p>"
 *         textContent:
 *           type: string
 *           description: Plain text content template
 *           example: "Welcome {{firstName}}! We're excited to have you on {{platformName}}."
 *         variables:
 *           type: array
 *           items:
 *             type: string
 *           description: Available template variables
 *           example: ["{{firstName}}", "{{platformName}}", "{{signupDate}}"]
 *         category:
 *           type: string
 *           enum: [welcome, verification, notification, marketing, custom]
 *           description: Template category
 *           example: "welcome"
 *         isActive:
 *           type: boolean
 *           description: Whether template is active
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:30:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-15T10:30:00Z"
 *     
 *     MailerStatusResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             service:
 *               type: string
 *               description: Email service being used
 *               example: "gmail"
 *             isConfigured:
 *               type: boolean
 *               description: Whether mailer is properly configured
 *               example: true
 *             canSend:
 *               type: boolean
 *               description: Whether mailer can send emails
 *               example: true
 *             lastTest:
 *               type: string
 *               format: date-time
 *               description: Last successful test email
 *               example: "2024-01-15T10:30:00Z"
 *             dailyQuota:
 *               type: object
 *               properties:
 *                 limit:
 *                   type: number
 *                   description: Daily email limit
 *                   example: 1000
 *                 used:
 *                   type: number
 *                   description: Emails sent today
 *                   example: 150
 *                 remaining:
 *                   type: number
 *                   description: Remaining emails for today
 *                   example: 850
 *             supportedFeatures:
 *               type: array
 *               items:
 *                 type: string
 *               description: Features supported by the email service
 *               example: ["attachments", "templates", "tracking", "scheduling"]
 *     
 *     OTPValidationError:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "OTP validation failed"
 *         error:
 *           type: string
 *           enum: [INVALID_OTP, EXPIRED_OTP, MAX_ATTEMPTS_EXCEEDED, INVALID_PURPOSE]
 *           example: "EXPIRED_OTP"
 *         details:
 *           type: object
 *           properties:
 *             otpId:
 *               type: string
 *               example: "otp_1234567890abcdef"
 *             remainingAttempts:
 *               type: number
 *               example: 2
 *             expiresAt:
 *               type: string
 *               format: date-time
 *               example: "2024-01-15T10:30:00Z"
 *     
 *     EmailError:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Failed to send email"
 *         error:
 *           type: string
 *           enum: [INVALID_EMAIL, TEMPLATE_NOT_FOUND, SERVICE_UNAVAILABLE, QUOTA_EXCEEDED]
 *           example: "INVALID_EMAIL"
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
 *   - name: Email & OTP
 *     description: Email sending and OTP verification endpoints
 */

/**
 * @swagger
 * /api/v1/mailer/otp/send:
 *   post:
 *     summary: Send OTP to user
 *     description: Sends a one-time password (OTP) to the user's email and/or phone number for verification
 *     tags: [Email & OTP]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendOTPRequest'
 *           example:
 *             email: "user@example.com"
 *             phoneNumber: "+1234567890"
 *             purpose: "signup"
 *             template: "default-otp"
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SendOTPResponse'
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmailError'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       429:
 *         description: Too many requests - rate limit exceeded
 *       500:
 *         description: Internal server error - failed to send OTP
 * 
 * /api/v1/mailer/otp/verify:
 *   post:
 *     summary: Verify OTP
 *     description: Verifies the OTP code sent to the user
 *     tags: [Email & OTP]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyOTPRequest'
 *           example:
 *             otpId: "otp_1234567890abcdef"
 *             otp: "123456"
 *             purpose: "signup"
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VerifyOTPResponse'
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OTPValidationError'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       404:
 *         description: OTP not found or expired
 *       429:
 *         description: Too many attempts - rate limit exceeded
 *       500:
 *         description: Internal server error
 * 
 * /api/v1/mailer/otp/resend:
 *   post:
 *     summary: Resend OTP
 *     description: Resends the OTP to the user if the previous one expired or wasn't received
 *     tags: [Email & OTP]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResendOTPRequest'
 *           example:
 *             otpId: "otp_1234567890abcdef"
 *             reason: "expired"
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ResendOTPResponse'
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       404:
 *         description: OTP not found
 *       429:
 *         description: Too many resend attempts
 *       500:
 *         description: Internal server error
 * 
 * /api/v1/mailer/verification/send:
 *   post:
 *     summary: Send email verification
 *     description: Sends an email verification link to the user's email address
 *     tags: [Email & OTP]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendVerificationEmailRequest'
 *           example:
 *             email: "user@example.com"
 *             verificationToken: "verification_token_1234567890abcdef"
 *             template: "default-verification"
 *             redirectUrl: "https://app.example.com/verify-email"
 *     responses:
 *       200:
 *         description: Verification email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SendVerificationEmailResponse'
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmailError'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Internal server error
 * 
 * /api/v1/mailer/welcome/send:
 *   post:
 *     summary: Send welcome email
 *     description: Sends a welcome email to newly registered users
 *     tags: [Email & OTP]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendWelcomeEmailRequest'
 *           example:
 *             email: "user@example.com"
 *             username: "john_doe"
 *             firstName: "John"
 *             lastName: "Doe"
 *             template: "default-welcome"
 *             welcomeMessage: "Welcome to our amazing platform!"
 *             nextSteps: ["Complete your profile", "Upload a profile picture"]
 *     responses:
 *       200:
 *         description: Welcome email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SendWelcomeEmailResponse'
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Internal server error
 * 
 * /api/v1/mailer/custom/send:
 *   post:
 *     summary: Send custom email
 *     description: Sends a custom email with custom content and optional attachments
 *     tags: [Email & OTP]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendCustomEmailRequest'
 *           example:
 *             to: "user@example.com"
 *             subject: "Important Update"
 *             content: "<h1>Hello!</h1><p>This is a custom email.</p>"
 *             isHtml: true
 *             template: "custom-template"
 *             templateData:
 *               userName: "John Doe"
 *               companyName: "Example Corp"
 *     responses:
 *       200:
 *         description: Custom email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SendCustomEmailResponse'
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       413:
 *         description: Payload too large - attachments too big
 *       500:
 *         description: Internal server error
 * 
 * /api/v1/mailer/templates:
 *   get:
 *     summary: Get email templates
 *     description: Retrieves available email templates for customization
 *     tags: [Email & OTP]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [welcome, verification, notification, marketing, custom]
 *         description: Filter templates by category
 *         example: "welcome"
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *         example: true
 *     responses:
 *       200:
 *         description: Email templates retrieved successfully
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
 *                     $ref: '#/components/schemas/EmailTemplate'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Internal server error
 * 
 * /api/v1/mailer/templates/{templateName}:
 *   get:
 *     summary: Get specific email template
 *     description: Retrieves a specific email template by name
 *     tags: [Email & OTP]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: templateName
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the template to retrieve
 *         example: "welcome-email"
 *     responses:
 *       200:
 *         description: Email template retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/EmailTemplate'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       404:
 *         description: Template not found
 *       500:
 *         description: Internal server error
 * 
 * /api/v1/mailer/status:
 *   get:
 *     summary: Get mailer status
 *     description: Returns the current status and configuration of the mailer service
 *     tags: [Email & OTP]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Mailer status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MailerStatusResponse'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Internal server error
 * 
 * /api/v1/mailer/test:
 *   post:
 *     summary: Send test email
 *     description: Sends a test email to verify the mailer configuration
 *     tags: [Email & OTP]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - to
 *             properties:
 *               to:
 *                 type: string
 *                 format: email
 *                 description: Email address to send test email to
 *                 example: "test@example.com"
 *               template:
 *                 type: string
 *                 description: Template to use for test email
 *                 example: "test-template"
 *     responses:
 *       200:
 *         description: Test email sent successfully
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
 *                   example: "Test email sent successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     messageId:
 *                       type: string
 *                       example: "msg_1234567890abcdef"
 *                     to:
 *                       type: string
 *                       example: "test@example.com"
 *                     sentAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:00Z"
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Internal server error
 */
