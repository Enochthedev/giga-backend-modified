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

export interface IFileUploadProgress {
  fileId: string;
  filename: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface IBatchUploadOptions {
  maxConcurrent: number;
  retryAttempts: number;
  retryDelay: number;
  onProgress?: (progress: IFileUploadProgress) => void;
}

export interface IFileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileInfo: {
    size: number;
    format: string;
    dimensions?: {
      width: number;
      height: number;
    };
    hasMetadata: boolean;
    metadataTypes: string[];
  };
}

export interface ICloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  uploadPreset?: string;
  folder?: string;
  allowedFormats: string[];
  maxFileSize: number;
  defaultTransformations: ICloudinaryTransformation;
  metadataStripping: {
    enabled: boolean;
    stripExif: boolean;
    stripGps: boolean;
    stripAll: boolean;
  };
}
