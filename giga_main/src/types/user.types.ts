// ============================================================================
// USER TYPES
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
