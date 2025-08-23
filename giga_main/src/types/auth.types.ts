// ============================================================================
// AUTHENTICATION TYPES
// ============================================================================

import { IUser } from './user.types';

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

export interface IChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface IChangePasswordResponse {
  success: boolean;
  message: string;
}

export interface IResetPasswordRequest {
  email: string;
  resetToken: string;
  newPassword: string;
  confirmPassword: string;
}

export interface IResetPasswordResponse {
  success: boolean;
  message: string;
}

export interface IRequestPasswordResetRequest {
  email: string;
}

export interface IRequestPasswordResetResponse {
  success: boolean;
  message: string;
  data: {
    resetToken: string;
    expiresAt: Date;
  };
}

export interface IValidateTokenRequest {
  token: string;
  type: 'access' | 'refresh';
}

export interface IValidateTokenResponse {
  success: boolean;
  data: {
    isValid: boolean;
    user?: IUser;
    expiresAt?: Date;
  };
}

export interface IJWTPayload {
  userId: string;
  email: string;
  username: string;
  role: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

export interface IAuthMiddleware {
  authenticate: (req: any, res: any, next: any) => void;
  authorize: (roles: string[]) => (req: any, res: any, next: any) => void;
  optionalAuth: (req: any, res: any, next: any) => void;
}

export interface ISecurityConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshTokenExpiresIn: string;
  bcryptRounds: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  passwordPolicy: IPasswordPolicy;
}

export interface IPasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventCommonPasswords: boolean;
  preventUserInfo: boolean;
}

export interface ILoginAttempt {
  email: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  timestamp: Date;
  attempts: number;
}

export interface IAccountLockout {
  email: string;
  ipAddress: string;
  lockedAt: Date;
  expiresAt: Date;
  reason: string;
  attempts: number;
}

export interface ISession {
  sessionId: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  expiresAt: Date;
  lastActive: Date;
  isActive: boolean;
}

export interface IRevokeSessionRequest {
  sessionId?: string;
  allSessions?: boolean;
}

export interface IRevokeSessionResponse {
  success: boolean;
  message: string;
  data: {
    revokedSessions: number;
  };
}

export interface IGetSessionsResponse {
  success: boolean;
  data: {
    sessions: ISession[];
    total: number;
    active: number;
  };
}

export interface IUpdateSessionRequest {
  sessionId: string;
  isActive?: boolean;
  lastActive?: Date;
}

export interface IUpdateSessionResponse {
  success: boolean;
  message: string;
  data: {
    session: ISession;
  };
}

export interface IAuthAuditLog {
  userId: string;
  action: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
  details?: any;
  metadata?: Record<string, any>;
}

export interface IGetAuditLogsRequest {
  userId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  success?: boolean;
  page?: number;
  limit?: number;
}

export interface IGetAuditLogsResponse {
  success: boolean;
  data: {
    logs: IAuthAuditLog[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface IAuthStats {
  totalUsers: number;
  activeUsers: number;
  totalSessions: number;
  activeSessions: number;
  failedLoginAttempts: number;
  lockedAccounts: number;
  passwordResets: number;
  emailVerifications: number;
}

export interface IGetAuthStatsResponse {
  success: boolean;
  data: IAuthStats;
}

export interface IUpdateSecurityConfigRequest {
  jwtExpiresIn?: string;
  refreshTokenExpiresIn?: string;
  bcryptRounds?: number;
  maxLoginAttempts?: number;
  lockoutDuration?: number;
  passwordPolicy?: Partial<IPasswordPolicy>;
}

export interface IUpdateSecurityConfigResponse {
  success: boolean;
  message: string;
  data: {
    config: ISecurityConfig;
    updatedAt: Date;
  };
}

export interface IValidatePasswordRequest {
  password: string;
  userId?: string;
  email?: string;
  username?: string;
}

export interface IValidatePasswordResponse {
  success: boolean;
  data: {
    isValid: boolean;
    score: number;
    feedback: string[];
    suggestions: string[];
  };
}

export interface IGeneratePasswordRequest {
  length?: number;
  includeUppercase?: boolean;
  includeLowercase?: boolean;
  includeNumbers?: boolean;
  includeSpecialChars?: boolean;
  excludeSimilar?: boolean;
  excludeAmbiguous?: boolean;
}

export interface IGeneratePasswordResponse {
  success: boolean;
  data: {
    password: string;
    strength: 'weak' | 'medium' | 'strong' | 'very_strong';
    score: number;
    entropy: number;
  };
}

export interface ICheckPasswordBreachRequest {
  password: string;
}

export interface ICheckPasswordBreachResponse {
  success: boolean;
  data: {
    breached: boolean;
    count: number;
    severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
    recommendations: string[];
  };
}

export interface IEnable2FARequest {
  method: 'totp' | 'sms' | 'email';
  phoneNumber?: string;
  email?: string;
}

export interface IEnable2FAResponse {
  success: boolean;
  message: string;
  data: {
    secret?: string;
    qrCode?: string;
    backupCodes: string[];
    method: string;
    enabledAt: Date;
  };
}

export interface IVerify2FARequest {
  code: string;
  method: 'totp' | 'sms' | 'email';
}

export interface IVerify2FAResponse {
  success: boolean;
  message: string;
  data: {
    verified: boolean;
    method: string;
    verifiedAt: Date;
  };
}

export interface IDisable2FARequest {
  code: string;
  method: 'totp' | 'sms' | 'email';
}

export interface IDisable2FAResponse {
  success: boolean;
  message: string;
  data: {
    disabled: boolean;
    method: string;
    disabledAt: Date;
  };
}

export interface IGenerateBackupCodesRequest {
  count?: number;
}

export interface IGenerateBackupCodesResponse {
  success: boolean;
  message: string;
  data: {
    backupCodes: string[];
    generatedAt: Date;
    expiresAt: Date;
  };
}

export interface IVerifyBackupCodeRequest {
  code: string;
}

export interface IVerifyBackupCodeResponse {
  success: boolean;
  message: string;
  data: {
    verified: boolean;
    remainingCodes: number;
    verifiedAt: Date;
  };
}

export interface I2FAStatus {
  enabled: boolean;
  methods: Array<{
    type: 'totp' | 'sms' | 'email';
    enabled: boolean;
    lastUsed?: Date;
  }>;
  backupCodes: {
    count: number;
    lastGenerated?: Date;
    expiresAt?: Date;
  };
}

export interface IGet2FAStatusResponse {
  success: boolean;
  data: I2FAStatus;
}

export interface IUpdate2FAPreferencesRequest {
  require2FA: boolean;
  allowedMethods: Array<'totp' | 'sms' | 'email'>;
  backupCodeCount: number;
  backupCodeExpiry: number;
}

export interface IUpdate2FAPreferencesResponse {
  success: boolean;
  message: string;
  data: {
    preferences: IUpdate2FAPreferencesRequest;
    updatedAt: Date;
  };
}
