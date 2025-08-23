// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface IValidationError {
  field: string;
  message: string;
  value?: any;
  code?: string;
  path?: string[];
}

export interface IValidationResult {
  isValid: boolean;
  errors: IValidationError[];
  warnings?: IValidationError[];
  sanitizedData?: any;
}

export interface IValidationRule {
  field: string;
  rules: string[];
  messages?: Record<string, string>;
  custom?: (value: any, data: any) => boolean | string;
}

export interface IValidationSchema {
  [field: string]: IValidationRule;
}

export interface IValidationOptions {
  strict?: boolean;
  allowUnknown?: boolean;
  abortEarly?: boolean;
  stripUnknown?: boolean;
  convert?: boolean;
  presence?: 'optional' | 'required' | 'forbidden';
}

export interface IFieldValidation {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date' | 'email' | 'url' | 'phone';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => boolean | string;
  message?: string;
}

export interface IValidationSchemaDefinition {
  [field: string]: IFieldValidation;
}

export interface IValidationContext {
  data: any;
  originalData?: any;
  user?: any;
  options?: IValidationOptions;
}

export interface IValidationFunction {
  (value: any, context: IValidationContext): boolean | string | Promise<boolean | string>;
}

export interface IValidationMiddleware {
  validate: (schema: IValidationSchemaDefinition) => (req: any, res: any, next: any) => void;
  sanitize: (schema: IValidationSchemaDefinition) => (req: any, res: any, next: any) => void;
  validateAndSanitize: (schema: IValidationSchemaDefinition) => (req: any, res: any, next: any) => void;
}

export interface IValidationErrorResponse {
  success: false;
  message: string;
  error: 'VALIDATION_ERROR';
  details: {
    errors: IValidationError[];
    warnings?: IValidationError[];
    fieldCount: number;
    errorCount: number;
    warningCount: number;
  };
}

export interface IValidationSuccessResponse<T = any> {
  success: true;
  data: T;
  sanitizedData?: T;
}

export type IValidationResponse<T = any> = IValidationSuccessResponse<T> | IValidationErrorResponse;

export interface IAsyncValidationResult {
  isValid: boolean;
  errors: IValidationError[];
  warnings?: IValidationError[];
  sanitizedData?: any;
  asyncErrors?: Promise<IValidationError[]>;
}

export interface IValidationCache {
  key: string;
  result: IValidationResult;
  timestamp: number;
  ttl: number;
}

export interface IValidationMetrics {
  totalValidations: number;
  successfulValidations: number;
  failedValidations: number;
  averageValidationTime: number;
  validationErrorsByField: Record<string, number>;
  validationErrorsByType: Record<string, number>;
  cacheHitRate: number;
}

export interface IGetValidationMetricsResponse {
  success: boolean;
  data: IValidationMetrics;
}

export interface IUpdateValidationConfigRequest {
  strict?: boolean;
  allowUnknown?: boolean;
  abortEarly?: boolean;
  stripUnknown?: boolean;
  convert?: boolean;
  presence?: 'optional' | 'required' | 'forbidden';
  cacheEnabled?: boolean;
  cacheTTL?: number;
  maxCacheSize?: number;
}

export interface IUpdateValidationConfigResponse {
  success: boolean;
  message: string;
  data: {
    config: IUpdateValidationConfigRequest;
    updatedAt: Date;
  };
}

export interface IValidationTestRequest {
  schema: IValidationSchemaDefinition;
  data: any;
  options?: IValidationOptions;
}

export interface IValidationTestResponse {
  success: boolean;
  data: {
    result: IValidationResult;
    executionTime: number;
    memoryUsage: number;
    cacheHit: boolean;
  };
}

export interface IValidationBenchmarkRequest {
  schema: IValidationSchemaDefinition;
  testData: any[];
  iterations: number;
  options?: IValidationOptions;
}

export interface IValidationBenchmarkResponse {
  success: boolean;
  data: {
    totalTime: number;
    averageTime: number;
    minTime: number;
    maxTime: number;
    totalMemory: number;
    averageMemory: number;
    iterations: number;
    successRate: number;
    errorRate: number;
    performance: 'excellent' | 'good' | 'average' | 'poor' | 'very_poor';
  };
}

export interface IValidationProfile {
  name: string;
  schema: IValidationSchemaDefinition;
  options: IValidationOptions;
  description?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
  lastUsed?: Date;
  performance: {
    averageTime: number;
    successRate: number;
    errorRate: number;
  };
}

export interface ICreateValidationProfileRequest {
  name: string;
  schema: IValidationSchemaDefinition;
  options?: IValidationOptions;
  description?: string;
  tags?: string[];
}

export interface ICreateValidationProfileResponse {
  success: boolean;
  message: string;
  data: {
    profile: IValidationProfile;
  };
}

export interface IUpdateValidationProfileRequest {
  name?: string;
  schema?: IValidationSchemaDefinition;
  options?: IValidationOptions;
  description?: string;
  tags?: string[];
}

export interface IUpdateValidationProfileResponse {
  success: boolean;
  message: string;
  data: {
    profile: IValidationProfile;
  };
}

export interface IDeleteValidationProfileRequest {
  profileId: string;
}

export interface IDeleteValidationProfileResponse {
  success: boolean;
  message: string;
}

export interface IGetValidationProfilesResponse {
  success: boolean;
  data: {
    profiles: IValidationProfile[];
    total: number;
    pagination: {
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

export interface IGetValidationProfileResponse {
  success: boolean;
  data: {
    profile: IValidationProfile;
  };
}

export interface IValidationProfileSearchRequest {
  query?: string;
  tags?: string[];
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'usageCount' | 'performance';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface IValidationProfileSearchResponse {
  success: boolean;
  data: {
    profiles: IValidationProfile[];
    total: number;
    pagination: {
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

export interface IValidationProfileImportRequest {
  profiles: Array<{
    name: string;
    schema: IValidationSchemaDefinition;
    options?: IValidationOptions;
    description?: string;
    tags?: string[];
  }>;
  overwrite?: boolean;
}

export interface IValidationProfileImportResponse {
  success: boolean;
  message: string;
  data: {
    imported: number;
    updated: number;
    failed: number;
    errors?: string[];
  };
}

export interface IValidationProfileExportRequest {
  profileIds?: string[];
  format?: 'json' | 'yaml' | 'xml';
  includeMetadata?: boolean;
}

export interface IValidationProfileExportResponse {
  success: boolean;
  data: {
    content: string;
    format: string;
    filename: string;
    size: number;
    profilesCount: number;
  };
}
