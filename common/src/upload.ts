import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import logger from './logger';

export interface UploadOptions {
  folder?: string;
  allowedFormats?: string[];
  maxFileSize?: number; // in bytes
  transformation?: any;
  publicId?: string;
  stripMetadata?: boolean; // NEW: Option to strip metadata
  stripExif?: boolean;     // NEW: Option to strip EXIF data specifically
  stripGps?: boolean;      // NEW: Option to strip GPS coordinates
}

export interface UploadResult {
  success: boolean;
  url?: string;
  publicId?: string;
  error?: string;
  format?: string;
  size?: number;
  metadataStripped?: boolean; // NEW: Indicates if metadata was stripped
}

export interface UploadProgress {
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  url?: string;
  error?: string;
}

class UploadService {
  private isConfigured = false;

  constructor() {
    this.initializeCloudinary();
  }

  private initializeCloudinary() {
    try {
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const apiKey = process.env.CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;

      if (!cloudName || !apiKey || !apiSecret) {
        logger.warn('Cloudinary configuration not found. Upload service will be disabled.');
        return;
      }

      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });

      this.isConfigured = true;
      logger.info('Cloudinary initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Cloudinary:', error);
      this.isConfigured = false;
    }
  }

  private getMetadataStrippingTransformations(options: UploadOptions): any[] {
    const transformations: any[] = [];
    
    if (options.stripMetadata || options.stripExif) {
      // Strip EXIF data and other metadata
      transformations.push({
        strip: 'all' // Removes all metadata including EXIF, GPS, color profile, etc.
      });
    } else if (options.stripGps) {
      // Strip only GPS coordinates while preserving other metadata
      transformations.push({
        strip: 'gps' // Removes only GPS coordinates
      });
    }

    // Add any additional transformations
    if (options.transformation) {
      if (Array.isArray(options.transformation)) {
        transformations.push(...options.transformation);
      } else {
        transformations.push(options.transformation);
      }
    }

    return transformations;
  }

  async uploadFile(
    file: Buffer | string | Readable,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Upload service not configured',
      };
    }

    try {
      const transformations = this.getMetadataStrippingTransformations(options);
      
      const uploadOptions = {
        folder: options.folder || 'giga-uploads',
        allowed_formats: options.allowedFormats || ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        max_file_size: options.maxFileSize || 10 * 1024 * 1024, // 10MB default
        transformation: transformations.length > 0 ? transformations : undefined,
        public_id: options.publicId,
        resource_type: 'auto',
        // NEW: Metadata stripping options
        strip: options.stripMetadata ? 'all' : (options.stripGps ? 'gps' : undefined),
      };

      let result;
      if (Buffer.isBuffer(file)) {
        // Upload buffer
        result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(file);
        });
      } else if (typeof file === 'string') {
        // Upload from URL
        result = await cloudinary.uploader.upload(file, uploadOptions);
      } else {
        // Upload stream
        result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          file.pipe(uploadStream);
        });
      }

      const metadataStripped = options.stripMetadata || options.stripExif || options.stripGps;

      return {
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        size: result.bytes,
        metadataStripped,
      };
    } catch (error) {
      logger.error('File upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  async uploadMultipleFiles(
    files: (Buffer | string | Readable)[],
    options: UploadOptions = {}
  ): Promise<UploadResult[]> {
    const uploadPromises = files.map(file => this.uploadFile(file, options));
    return Promise.all(uploadPromises);
  }

  async uploadWithProgress(
    file: Buffer | string | Readable,
    options: UploadOptions = {},
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Upload service not configured',
      };
    }

    try {
      const transformations = this.getMetadataStrippingTransformations(options);
      
      const uploadOptions = {
        folder: options.folder || 'giga-uploads',
        allowed_formats: options.allowedFormats || ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        max_file_size: options.maxFileSize || 10 * 1024 * 1024,
        transformation: transformations.length > 0 ? transformations : undefined,
        public_id: options.publicId,
        resource_type: 'auto',
        strip: options.stripMetadata ? 'all' : (options.stripGps ? 'gps' : undefined),
      };

      // Simulate progress for small files
      if (onProgress) {
        onProgress({ progress: 0, status: 'uploading' });
        
        // Simulate progress updates
        const progressInterval = setInterval(() => {
          onProgress({ progress: Math.random() * 90, status: 'uploading' });
        }, 100);

        setTimeout(() => {
          clearInterval(progressInterval);
          onProgress({ progress: 100, status: 'completed' });
        }, 1000);
      }

      const result = await this.uploadFile(file, options);

      if (result.success && onProgress) {
        onProgress({ 
          progress: 100, 
          status: 'completed', 
          url: result.url 
        });
      }

      return result;
    } catch (error) {
      if (onProgress) {
        onProgress({ 
          progress: 0, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Upload failed' 
        });
      }
      throw error;
    }
  }

  // NEW: Method to strip metadata from existing files
  async stripMetadataFromExistingFile(publicId: string, options: { stripExif?: boolean; stripGps?: boolean } = {}): Promise<UploadResult> {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Upload service not configured',
      };
    }

    try {
      const transformations = [];
      
      if (options.stripExif) {
        transformations.push({ strip: 'all' });
      } else if (options.stripGps) {
        transformations.push({ strip: 'gps' });
      }

      if (transformations.length === 0) {
        return {
          success: false,
          error: 'No metadata stripping options specified',
        };
      }

      const result = await cloudinary.uploader.explicit(publicId, {
        type: 'upload',
        transformation: transformations,
      });

      return {
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        size: result.bytes,
        metadataStripped: true,
      };
    } catch (error) {
      logger.error('Metadata stripping failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Metadata stripping failed',
      };
    }
  }

  // NEW: Method to check what metadata exists in a file
  async getFileMetadata(publicId: string): Promise<any> {
    if (!this.isConfigured) {
      logger.error('Upload service not configured');
      return null;
    }

    try {
      const result = await cloudinary.api.resource(publicId, {
        fields: 'exif,image_metadata,faces,colors,phash,accessibility,quality_analysis'
      });
      
      return {
        exif: result.exif,
        imageMetadata: result.image_metadata,
        faces: result.faces,
        colors: result.colors,
        perceptualHash: result.phash,
        accessibility: result.accessibility,
        qualityAnalysis: result.quality_analysis,
      };
    } catch (error) {
      logger.error('Failed to get file metadata:', error);
      return null;
    }
  }

  async deleteFile(publicId: string): Promise<boolean> {
    if (!this.isConfigured) {
      logger.error('Upload service not configured');
      return false;
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId);
      logger.info(`File deleted successfully: ${publicId}`);
      return result.result === 'ok';
    } catch (error) {
      logger.error('File deletion failed:', error);
      return false;
    }
  }

  async deleteMultipleFiles(publicIds: string[]): Promise<boolean[]> {
    const deletePromises = publicIds.map(publicId => this.deleteFile(publicId));
    return Promise.all(deletePromises);
  }

  async getFileInfo(publicId: string): Promise<any> {
    if (!this.isConfigured) {
      logger.error('Upload service not configured');
      return null;
    }

    try {
      const result = await cloudinary.api.resource(publicId);
      return result;
    } catch (error) {
      logger.error('Failed to get file info:', error);
      return null;
    }
  }

  async updateFile(
    publicId: string,
    transformation: any
  ): Promise<UploadResult> {
    if (!this.isConfigured) {
      return {
        success: false,
        error: 'Upload service not configured',
      };
    }

    try {
      const result = await cloudinary.uploader.explicit(publicId, {
        type: 'upload',
        transformation: transformation,
      });

      return {
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        size: result.bytes,
      };
    } catch (error) {
      logger.error('File update failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Update failed',
      };
    }
  }

  generateUploadSignature(folder: string = 'giga-uploads'): string {
    if (!this.isConfigured) {
      throw new Error('Upload service not configured');
    }

    const timestamp = Math.round(new Date().getTime() / 1000);
    const params = {
      timestamp,
      folder,
    };

    return cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET!);
  }

  getUploadWidgetConfig(folder: string = 'giga-uploads') {
    if (!this.isConfigured) {
      throw new Error('Upload service not configured');
    }

    return {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || 'giga-uploads',
      folder,
      sources: ['local', 'camera', 'url'],
      multiple: true,
      maxFiles: 10,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      // NEW: Metadata stripping options for widget
      transformation: {
        strip: 'all' // Default to stripping all metadata for security
      }
    };
  }

  isConfigured(): boolean {
    return this.isConfigured;
  }

  getStatus(): { configured: boolean; cloudName?: string } {
    if (!this.isConfigured) {
      return { configured: false };
    }

    return {
      configured: true,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    };
  }
}

export default new UploadService();
