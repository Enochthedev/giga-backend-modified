import { z } from 'zod';

/**
 * Validation schemas for authentication endpoints
 */

// Email validation
const emailSchema = z.string()
    .email('Invalid email format')
    .min(1, 'Email is required')
    .max(255, 'Email cannot exceed 255 characters')
    .transform(email => email.toLowerCase());

// Password validation
const passwordSchema = z.string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    );

// Name validation
const nameSchema = z.string()
    .min(2, 'Name must be at least 2 characters long')
    .max(50, 'Name cannot exceed 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes');

// Phone validation (optional)
const phoneSchema = z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .optional();

// Date validation - keep as string for input, transform in service layer
const dateSchema = z.string()
    .refine(date => !isNaN(Date.parse(date)), 'Invalid date format')
    .optional();

// UUID validation
const uuidSchema = z.string().uuid('Invalid UUID format');

// Register schema
export const registerSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    firstName: nameSchema,
    lastName: nameSchema,
    phone: phoneSchema,
    dateOfBirth: dateSchema
});

// Login schema
export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required')
});

// Refresh token schema
export const refreshTokenSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required')
});

// Logout schema
export const logoutSchema = z.object({
    refreshToken: z.string().min(1, 'Refresh token is required')
});

// Change password schema
export const changePasswordSchema = z.object({
    userId: uuidSchema.optional(), // In production, this would come from JWT
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Password confirmation is required')
}).refine(data => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
});

// Verify token schema
export const verifyTokenSchema = z.object({
    token: z.string().min(1, 'Token is required')
});

// Forgot password schema
export const forgotPasswordSchema = z.object({
    email: emailSchema
});

// Reset password schema
export const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Password confirmation is required')
}).refine(data => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
});

// Verify email schema
export const verifyEmailSchema = z.object({
    token: z.string().min(1, 'Verification token is required')
});

// Resend verification schema
export const resendVerificationSchema = z.object({
    email: emailSchema
});

// OAuth callback schema
export const oauthCallbackSchema = z.object({
    provider: z.enum(['google', 'facebook'], {
        errorMap: () => ({ message: 'Provider must be either google or facebook' })
    }),
    code: z.string().min(1, 'Authorization code is required'),
    state: z.string().optional()
});

// Export all schemas
export const authValidationSchemas = {
    register: registerSchema,
    login: loginSchema,
    refreshToken: refreshTokenSchema,
    logout: logoutSchema,
    changePassword: changePasswordSchema,
    verifyToken: verifyTokenSchema,
    forgotPassword: forgotPasswordSchema,
    resetPassword: resetPasswordSchema,
    verifyEmail: verifyEmailSchema,
    resendVerification: resendVerificationSchema,
    oauthCallback: oauthCallbackSchema
};

// Export type inference helpers
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type VerifyTokenInput = z.infer<typeof verifyTokenSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type OAuthCallbackInput = z.infer<typeof oauthCallbackSchema>;