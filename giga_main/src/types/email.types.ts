// ============================================================================
// EMAIL TYPES
// ============================================================================

export interface ISendOTPRequest {
  email: string;
  phoneNumber: string;
  purpose: OTPPurpose;
  template?: string;
}

export interface ISendOTPResponse {
  success: boolean;
  message: string;
  data: {
    otpId: string;
    expiresAt: Date;
    purpose: OTPPurpose;
    email: string;
    phoneNumber: string;
    remainingAttempts: number;
  };
}

export interface IVerifyOTPRequest {
  otpId: string;
  otp: string;
  purpose: OTPPurpose;
}

export interface IVerifyOTPResponse {
  success: boolean;
  message: string;
  data: {
    verified: boolean;
    purpose: OTPPurpose;
    email: string;
    phoneNumber: string;
    verifiedAt: Date;
  };
}

export interface IResendOTPRequest {
  otpId: string;
  reason: OTPResendReason;
}

export interface IResendOTPResponse {
  success: boolean;
  message: string;
  data: {
    newOtpId: string;
    expiresAt: Date;
    remainingAttempts: number;
  };
}

export enum OTPPurpose {
  SIGNUP = 'signup',
  PASSWORD_RESET = 'password_reset',
  PHONE_VERIFICATION = 'phone_verification'
}

export enum OTPResendReason {
  EXPIRED = 'expired',
  NOT_RECEIVED = 'not_received',
  INVALID = 'invalid'
}

export interface ISendVerificationEmailRequest {
  email: string;
  verificationToken: string;
  template?: string;
  redirectUrl?: string;
}

export interface ISendVerificationEmailResponse {
  success: boolean;
  message: string;
  data: {
    email: string;
    verificationToken: string;
    sentAt: Date;
    expiresAt: Date;
  };
}

export interface ISendWelcomeEmailRequest {
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  template?: string;
  welcomeMessage?: string;
  nextSteps?: string[];
}

export interface ISendWelcomeEmailResponse {
  success: boolean;
  message: string;
  data: {
    email: string;
    username: string;
    sentAt: Date;
  };
}

export interface ISendCustomEmailRequest {
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  content: string;
  isHtml?: boolean;
  attachments?: IEmailAttachment[];
  template?: string;
  templateData?: Record<string, any>;
}

export interface ISendCustomEmailResponse {
  success: boolean;
  message: string;
  data: {
    messageId: string;
    to: string;
    subject: string;
    sentAt: Date;
    attachments?: string[];
  };
}

export interface IEmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType: string;
}

export interface IEmailTemplate {
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
  category: EmailTemplateCategory;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum EmailTemplateCategory {
  WELCOME = 'welcome',
  VERIFICATION = 'verification',
  NOTIFICATION = 'notification',
  MARKETING = 'marketing',
  CUSTOM = 'custom'
}

export interface IMailerStatusResponse {
  success: boolean;
  data: {
    service: string;
    isConfigured: boolean;
    canSend: boolean;
    lastTest?: Date;
    dailyQuota?: {
      limit: number;
      used: number;
      remaining: number;
    };
    supportedFeatures: string[];
  };
}

export interface IOTPValidationError {
  success: false;
  message: string;
  error: 'INVALID_OTP' | 'EXPIRED_OTP' | 'MAX_ATTEMPTS_EXCEEDED' | 'INVALID_PURPOSE';
  details?: {
    otpId: string;
    remainingAttempts: number;
    expiresAt: Date;
  };
}

export interface IEmailError {
  success: false;
  message: string;
  error: 'INVALID_EMAIL' | 'TEMPLATE_NOT_FOUND' | 'SERVICE_UNAVAILABLE' | 'QUOTA_EXCEEDED';
  details?: any;
}
