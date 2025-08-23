// ============================================================================
// CORE USER TYPES
// ============================================================================

export interface IUser {
  _id: string;
  username: string;
  email: string;
  phoneNumber: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  country?: string;
  address?: string;
  street?: string;
  city?: string;
  zipCode?: string;
  gender?: UserGender;
  weight?: number;
  maritalStatus?: MaritalStatus;
  ageGroup?: AgeGroup;
  areaOfInterest?: string[];
  profilePicture?: string;
  dateOfBirth?: string;
  bio?: string;
  occupation?: string;
  company?: string;
  website?: string;
  socialMedia?: ISocialMedia;
  preferences?: IUserPreferences;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isProfileComplete: boolean;
  lastActive: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateUser {
  username: string;
  email: string;
  phoneNumber: string;
  password: string;
  firstName?: string;
  lastName?: string;
  country?: string;
  address?: string;
  street?: string;
  city?: string;
  zipCode?: string;
  gender?: UserGender;
  weight?: number;
  maritalStatus?: MaritalStatus;
  ageGroup?: AgeGroup;
  areaOfInterest?: string[];
  dateOfBirth?: string;
  bio?: string;
  occupation?: string;
  company?: string;
  website?: string;
  socialMedia?: ISocialMedia;
  preferences?: IUserPreferences;
}

export interface IUpdateUser {
  firstName?: string;
  lastName?: string;
  country?: string;
  address?: string;
  street?: string;
  city?: string;
  zipCode?: string;
  gender?: UserGender;
  weight?: number;
  maritalStatus?: MaritalStatus;
  ageGroup?: AgeGroup;
  areaOfInterest?: string[];
  dateOfBirth?: string;
  bio?: string;
  occupation?: string;
  company?: string;
  website?: string;
  socialMedia?: ISocialMedia;
  preferences?: IUserPreferences;
}

// ============================================================================
// ENUM TYPES
// ============================================================================

export enum UserGender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
  PREFER_NOT_TO_SAY = 'prefer_not_to_say'
}

export enum MaritalStatus {
  SINGLE = 'single',
  MARRIED = 'married',
  DIVORCED = 'divorced',
  WIDOWED = 'widowed',
  SEPARATED = 'separated',
  IN_RELATIONSHIP = 'in_relationship'
}

export enum AgeGroup {
  AGE_18_24 = '18-24',
  AGE_25_34 = '25-34',
  AGE_35_44 = '35-44',
  AGE_45_54 = '45-54',
  AGE_55_64 = '55-64',
  AGE_65_PLUS = '65+'
}

export enum ProfileVisibility {
  PUBLIC = 'public',
  FRIENDS = 'friends',
  PRIVATE = 'private'
}

export enum Language {
  EN = 'en',
  ES = 'es',
  FR = 'fr',
  DE = 'de',
  IT = 'it',
  PT = 'pt',
  RU = 'ru',
  ZH = 'zh',
  JA = 'ja',
  KO = 'ko'
}

// ============================================================================
// COMPLEX TYPES
// ============================================================================

export interface ISocialMedia {
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  facebook?: string;
}

export interface IUserPreferences {
  language?: Language;
  timezone?: string;
  notifications?: INotificationPreferences;
  privacy?: IPrivacyPreferences;
}

export interface INotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
}

export interface IPrivacyPreferences {
  profileVisibility: ProfileVisibility;
  showEmail: boolean;
  showPhone: boolean;
}

// ============================================================================
// AUTHENTICATION TYPES
// ============================================================================

export interface ILoginRequest {
  email: string;
  password: string;
}

export interface ILoginResponse {
  success: boolean;
  message: string;
  data: {
    user: IUser;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export interface ILogoutRequest {
  refreshToken: string;
}

export interface ILogoutResponse {
  success: boolean;
  message: string;
}

export interface IRefreshTokenRequest {
  refreshToken: string;
}

export interface IRefreshTokenResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

// ============================================================================
// OTP TYPES
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

// ============================================================================
// EMAIL TYPES
// ============================================================================

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

// ============================================================================
// FILE UPLOAD TYPES
// ============================================================================

export interface IFileUploadRequest {
  file: Express.Multer.File;
  folder?: string;
  stripMetadata?: boolean;
  stripExif?: boolean;
  stripGps?: boolean;
  transformation?: ICloudinaryTransformation;
}

export interface IMultipleFileUploadRequest {
  files: Express.Multer.File[];
  folder?: string;
  stripMetadata?: boolean;
  stripExif?: boolean;
  stripGps?: boolean;
  transformation?: ICloudinaryTransformation;
}

export interface IFileUploadResponse {
  success: boolean;
  message: string;
  data: {
    url: string;
    publicId: string;
    format: string;
    bytes: number;
    width: number;
    height: number;
    metadataStripped: boolean;
    secureUrl: string;
  };
}

export interface IMultipleFileUploadResponse {
  success: boolean;
  message: string;
  data: IFileUploadResponse['data'][];
  summary: {
    total: number;
    successful: number;
    failed: number;
    metadataStripped: number;
  };
}

export interface ICloudinaryTransformation {
  width?: number;
  height?: number;
  crop?: string;
  quality?: string;
  format?: string;
  gravity?: string;
  radius?: number;
  effect?: string;
  overlay?: string;
  underlay?: string;
  strip?: string;
}

export interface IFileMetadataResponse {
  success: boolean;
  data: {
    exif?: {
      gps?: {
        latitude: number;
        longitude: number;
      };
      camera?: string;
      dateTime?: Date;
    };
    imageMetadata?: {
      format: string;
      colorspace: string;
      channels: number;
    };
    faces?: Array<{
      confidence: number;
      boundingBox: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    }>;
    colors?: Array<{
      red: number;
      green: number;
      blue: number;
      percentage: number;
    }>;
    perceptualHash?: string;
    accessibility?: {
      colorblindAccessibilityScore: number;
      contrastScore: number;
    };
    qualityAnalysis?: {
      qualityScore: number;
      sharpness: number;
      noise: number;
    };
  };
}

export interface IMetadataStrippingRequest {
  publicId: string;
  stripExif?: boolean;
  stripGps?: boolean;
}

export interface IFileUpdateRequest {
  publicId: string;
  transformation: ICloudinaryTransformation;
}

export interface IFileDeleteResponse {
  success: boolean;
  message: string;
  data: {
    publicId: string;
    result: string;
  };
}

export interface IUploadWidgetConfig {
  cloudName: string;
  folder?: string;
  transformation?: ICloudinaryTransformation;
  maxFileSize?: number;
  allowedFormats?: string[];
}

// ============================================================================
// PROFILE PICTURE TYPES
// ============================================================================

export interface IUpdateProfilePictureRequest {
  profilePicture: Express.Multer.File;
  cropOptions?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  stripMetadata?: boolean;
}

export interface IProfilePictureResponse {
  success: boolean;
  message: string;
  data: {
    profilePicture: string;
    publicId: string;
    metadataStripped: boolean;
  };
}

// ============================================================================
// PROFILE COMPLETION TYPES
// ============================================================================

export interface IProfileCompletionResponse {
  success: boolean;
  data: {
    completionPercentage: number;
    completedFields: string[];
    missingFields: string[];
    requiredFields: string[];
    optionalFields: string[];
    recommendations: string[];
  };
}

// ============================================================================
// USER SEARCH TYPES
// ============================================================================

export interface IUserSearchRequest {
  query?: string;
  country?: string;
  city?: string;
  gender?: UserGender;
  ageGroup?: AgeGroup;
  areaOfInterest?: string[];
  maritalStatus?: MaritalStatus;
  isProfileComplete?: boolean;
  sortBy?: UserSortField;
  sortOrder?: SortOrder;
  page?: number;
  limit?: number;
}

export enum UserSortField {
  USERNAME = 'username',
  CREATED_AT = 'createdAt',
  LAST_ACTIVE = 'lastActive',
  PROFILE_COMPLETION = 'profileCompletion'
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

export interface IUserListResponse {
  success: boolean;
  message: string;
  data: IUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ============================================================================
// USER STATISTICS TYPES
// ============================================================================

export interface IUserStatsResponse {
  success: boolean;
  data: {
    totalUsers: number;
    activeUsers: number;
    newUsersThisMonth: number;
    profileCompletionStats: {
      complete: number;
      partial: number;
      incomplete: number;
    };
    demographics: {
      gender: Record<UserGender, number>;
      ageGroups: Record<AgeGroup, number>;
      topCountries: Array<{
        country: string;
        count: number;
        percentage: number;
      }>;
      topCities: Array<{
        city: string;
        count: number;
        percentage: number;
      }>;
    };
    topInterests: Array<{
      interest: string;
      count: number;
      percentage: number;
    }>;
  };
}

// ============================================================================
// OAuth TYPES
// ============================================================================

export interface IOAuthUser {
  provider: OAuthProvider;
  providerId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  profilePicture?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export enum OAuthProvider {
  GOOGLE = 'google',
  APPLE = 'apple'
}

export interface IOAuthCallbackResponse {
  success: boolean;
  message: string;
  data: {
    user: IUser;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    isNewUser: boolean;
  };
}

export interface IOAuthStatusResponse {
  success: boolean;
  data: {
    linkedProviders: OAuthProvider[];
    canLink: OAuthProvider[];
  };
}

export interface IOAuthLinkRequest {
  provider: OAuthProvider;
  accessToken: string;
}

export interface IOAuthUnlinkRequest {
  provider: OAuthProvider;
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface IApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  details?: any;
}

export interface IErrorResponse {
  success: false;
  message: string;
  error: string;
  details?: any;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface IValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface IValidationResult {
  isValid: boolean;
  errors: IValidationError[];
}

// ============================================================================
// PAGINATION TYPES
// ============================================================================

export interface IPaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: SortOrder;
}

export interface IPaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireFields<T, K extends keyof T> = T & { [P in K]-?: T[P] };

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type NonNullableFields<T, K extends keyof T> = T & { [P in K]: NonNullable<T[P]> };

// ============================================================================
// EXPRESS EXTENSIONS
// ============================================================================

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      file?: Express.Multer.File;
      files?: Express.Multer.File[];
    }
  }
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

// Core types
export * from './user.types';
export * from './auth.types';
export * from './email.types';
export * from './upload.types';
export * from './oauth.types';
export * from './validation.types';
