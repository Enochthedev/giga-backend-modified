// ============================================================================
// OAUTH TYPES
// ============================================================================

import { IUser } from './user.types';

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

export interface IOAuthLinkResponse {
  success: boolean;
  message: string;
  data: {
    provider: OAuthProvider;
    linkedAt: Date;
  };
}

export interface IOAuthUnlinkResponse {
  success: boolean;
  message: string;
  data: {
    provider: OAuthProvider;
    unlinkedAt: Date;
  };
}

export interface IGoogleOAuthProfile {
  id: string;
  emails: Array<{
    value: string;
    verified: boolean;
  }>;
  name: {
    familyName: string;
    givenName: string;
  };
  displayName: string;
  photos: Array<{
    value: string;
  }>;
  provider: 'google';
}

export interface IAppleOAuthProfile {
  sub: string;
  email: string;
  email_verified: string;
  name?: {
    firstName: string;
    lastName: string;
  };
  provider: 'apple';
}

export interface IOAuthStrategy {
  name: string;
  provider: OAuthProvider;
  clientID: string;
  clientSecret: string;
  callbackURL: string;
  scope: string[];
  profileFields: string[];
}

export interface IOAuthConfig {
  google: {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    scope: string[];
  };
  apple: {
    clientID: string;
    teamID: string;
    keyID: string;
    privateKey: string;
    callbackURL: string;
    scope: string[];
  };
  baseURL: string;
  successRedirect: string;
  failureRedirect: string;
}

export interface IOAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
}

export interface IOAuthError {
  error: string;
  error_description?: string;
  error_uri?: string;
}

export interface IOAuthVerificationRequest {
  provider: OAuthProvider;
  code: string;
  state?: string;
}

export interface IOAuthVerificationResponse {
  success: boolean;
  data: {
    profile: IGoogleOAuthProfile | IAppleOAuthProfile;
    tokens: IOAuthTokenResponse;
  };
}

export interface IOAuthUserLink {
  userId: string;
  provider: OAuthProvider;
  providerId: string;
  email: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  profileData: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateOAuthUserRequest {
  provider: OAuthProvider;
  providerId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  profilePicture?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  profileData?: Record<string, any>;
}

export interface IUpdateOAuthUserRequest {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  profileData?: Record<string, any>;
}

export interface IOAuthUserResponse {
  success: boolean;
  data: {
    oauthUser: IOAuthUserLink;
    user: IUser;
  };
}

export interface IOAuthCallbackRequest {
  provider: OAuthProvider;
  code: string;
  state?: string;
  error?: string;
}

export interface IOAuthInitiateRequest {
  provider: OAuthProvider;
  redirectUrl?: string;
  state?: string;
}

export interface IOAuthInitiateResponse {
  success: boolean;
  data: {
    authUrl: string;
    state: string;
    provider: OAuthProvider;
  };
}

export interface IOAuthRefreshRequest {
  provider: OAuthProvider;
  refreshToken: string;
}

export interface IOAuthRefreshResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
    provider: OAuthProvider;
  };
}

export interface IOAuthRevokeRequest {
  provider: OAuthProvider;
  token: string;
  tokenType: 'access' | 'refresh';
}

export interface IOAuthRevokeResponse {
  success: boolean;
  message: string;
}

export interface IOAuthWebhookRequest {
  provider: OAuthProvider;
  event: string;
  data: Record<string, any>;
  signature?: string;
  timestamp?: number;
}

export interface IOAuthWebhookResponse {
  success: boolean;
  message: string;
}

export interface IOAuthMetrics {
  totalOAuthUsers: number;
  oAuthUsersByProvider: Record<OAuthProvider, number>;
  oAuthLoginsToday: number;
  oAuthLoginsThisWeek: number;
  oAuthLoginsThisMonth: number;
  averageOAuthLoginTime: number;
  oAuthSuccessRate: number;
  topOAuthCountries: Array<{
    country: string;
    count: number;
    percentage: number;
  }>;
}

export interface IGetOAuthMetricsResponse {
  success: boolean;
  data: IOAuthMetrics;
}

export interface IOAuthAnalytics {
  dailyLogins: Array<{
    date: string;
    google: number;
    apple: number;
    total: number;
  }>;
  providerComparison: {
    google: {
      totalUsers: number;
      activeUsers: number;
      successRate: number;
      averageLoginTime: number;
    };
    apple: {
      totalUsers: number;
      activeUsers: number;
      successRate: number;
      averageLoginTime: number;
    };
  };
  userRetention: {
    day1: number;
    day7: number;
    day30: number;
    day90: number;
  };
}

export interface IGetOAuthAnalyticsResponse {
  success: boolean;
  data: IOAuthAnalytics;
}
