import { upload } from '../src/upload';
import { createMockBuffer, createMockStream, mockCloudinaryResponse } from './utils/testHelpers';

// Mock cloudinary
const mockCloudinary = {
  v2: {
    config: jest.fn(),
    uploader: {
      upload: jest.fn(),
      upload_stream: jest.fn(),
      destroy: jest.fn(),
      explicit: jest.fn(),
    },
    api: {
      resource: jest.fn(),
    },
    utils: {
      api_sign_request: jest.fn(),
    },
  },
};

jest.mock('cloudinary', () => mockCloudinary);

// Mock the logger
jest.mock('../src/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('Upload Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;
  });

  describe('Configuration', () => {
    it('should initialize with Cloudinary configuration', () => {
      process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
      process.env.CLOUDINARY_API_KEY = 'test-api-key';
      process.env.CLOUDINARY_API_SECRET = 'test-api-secret';

      const newUpload = require('../src/upload').default;
      expect(newUpload.isConfigured()).toBe(true);
    });

    it('should not initialize without Cloudinary configuration', () => {
      const newUpload = require('../src/upload').default;
      expect(newUpload.isConfigured()).toBe(false);
    });
  });

  describe('File Upload', () => {
    beforeEach(() => {
      process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
      process.env.CLOUDINARY_API_KEY = 'test-api-key';
      process.env.CLOUDINARY_API_SECRET = 'test-api-secret';
    });

    it('should upload buffer successfully', async () => {
      const mockBuffer = createMockBuffer();
      mockCloudinary.v2.uploader.upload_stream.mockImplementation((options, callback) => {
        callback(null, mockCloudinaryResponse);
        return { end: jest.fn() };
      });

      const result = await upload.uploadFile(mockBuffer, {
        folder: 'test-folder',
      });

      expect(result.success).toBe(true);
      expect(result.url).toBe(mockCloudinaryResponse.secure_url);
      expect(result.publicId).toBe(mockCloudinaryResponse.public_id);
    });

    it('should upload from URL successfully', async () => {
      const testUrl = 'https://example.com/test.jpg';
      mockCloudinary.v2.uploader.upload.mockResolvedValue(mockCloudinaryResponse);

      const result = await upload.uploadFile(testUrl, {
        folder: 'test-folder',
      });

      expect(result.success).toBe(true);
      expect(result.url).toBe(mockCloudinaryResponse.secure_url);
    });

    it('should upload stream successfully', async () => {
      const mockStream = createMockStream();
      mockCloudinary.v2.uploader.upload_stream.mockImplementation((options, callback) => {
        callback(null, mockCloudinaryResponse);
        return { pipe: jest.fn() };
      });

      const result = await upload.uploadFile(mockStream, {
        folder: 'test-folder',
      });

      expect(result.success).toBe(true);
      expect(result.url).toBe(mockCloudinaryResponse.secure_url);
    });

    it('should fail when service not configured', async () => {
      delete process.env.CLOUDINARY_CLOUD_NAME;
      const newUpload = require('../src/upload').default;

      const mockBuffer = createMockBuffer();
      const result = await newUpload.uploadFile(mockBuffer);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload service not configured');
    });

    it('should handle upload errors gracefully', async () => {
      const mockBuffer = createMockBuffer();
      mockCloudinary.v2.uploader.upload_stream.mockImplementation((options, callback) => {
        callback(new Error('Upload failed'), null);
        return { end: jest.fn() };
      });

      const result = await upload.uploadFile(mockBuffer);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload failed');
    });
  });

  describe('Metadata Stripping', () => {
    beforeEach(() => {
      process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
      process.env.CLOUDINARY_API_KEY = 'test-api-key';
      process.env.CLOUDINARY_API_SECRET = 'test-api-secret';
    });

    it('should strip all metadata when stripMetadata is true', async () => {
      const mockBuffer = createMockBuffer();
      mockCloudinary.v2.uploader.upload_stream.mockImplementation((options, callback) => {
        expect(options.strip).toBe('all');
        callback(null, mockCloudinaryResponse);
        return { end: jest.fn() };
      });

      const result = await upload.uploadFile(mockBuffer, {
        folder: 'test-folder',
        stripMetadata: true,
      });

      expect(result.success).toBe(true);
      expect(result.metadataStripped).toBe(true);
    });

    it('should strip only GPS when stripGps is true', async () => {
      const mockBuffer = createMockBuffer();
      mockCloudinary.v2.uploader.upload_stream.mockImplementation((options, callback) => {
        expect(options.strip).toBe('gps');
        callback(null, mockCloudinaryResponse);
        return { end: jest.fn() };
      });

      const result = await upload.uploadFile(mockBuffer, {
        folder: 'test-folder',
        stripGps: true,
      });

      expect(result.success).toBe(true);
      expect(result.metadataStripped).toBe(true);
    });

    it('should strip EXIF when stripExif is true', async () => {
      const mockBuffer = createMockBuffer();
      mockCloudinary.v2.uploader.upload_stream.mockImplementation((options, callback) => {
        expect(options.strip).toBe('all');
        callback(null, mockCloudinaryResponse);
        return { end: jest.fn() };
      });

      const result = await upload.uploadFile(mockBuffer, {
        folder: 'test-folder',
        stripExif: true,
      });

      expect(result.success).toBe(true);
      expect(result.metadataStripped).toBe(true);
    });

    it('should not strip metadata when no options specified', async () => {
      const mockBuffer = createMockBuffer();
      mockCloudinary.v2.uploader.upload_stream.mockImplementation((options, callback) => {
        expect(options.strip).toBeUndefined();
        callback(null, mockCloudinaryResponse);
        return { end: jest.fn() };
      });

      const result = await upload.uploadFile(mockBuffer, {
        folder: 'test-folder',
      });

      expect(result.success).toBe(true);
      expect(result.metadataStripped).toBe(false);
    });

    it('should combine metadata stripping with custom transformations', async () => {
      const mockBuffer = createMockBuffer();
      const customTransformation = { width: 800, height: 600 };
      
      mockCloudinary.v2.uploader.upload_stream.mockImplementation((options, callback) => {
        expect(options.transformation).toEqual([
          { strip: 'all' },
          customTransformation
        ]);
        callback(null, mockCloudinaryResponse);
        return { end: jest.fn() };
      });

      const result = await upload.uploadFile(mockBuffer, {
        folder: 'test-folder',
        stripMetadata: true,
        transformation: customTransformation,
      });

      expect(result.success).toBe(true);
      expect(result.metadataStripped).toBe(true);
    });
  });

  describe('Multiple File Upload', () => {
    beforeEach(() => {
      process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
      process.env.CLOUDINARY_API_KEY = 'test-api-key';
      process.env.CLOUDINARY_API_SECRET = 'test-api-secret';
    });

    it('should upload multiple files successfully', async () => {
      const files = [createMockBuffer(), createMockBuffer(), createMockBuffer()];
      
      mockCloudinary.v2.uploader.upload_stream.mockImplementation((options, callback) => {
        callback(null, mockCloudinaryResponse);
        return { end: jest.fn() };
      });

      const results = await upload.uploadMultipleFiles(files, {
        folder: 'test-folder',
        stripMetadata: true,
      });

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.metadataStripped).toBe(true);
      });
    });

    it('should handle partial failures gracefully', async () => {
      const files = [createMockBuffer(), createMockBuffer(), createMockBuffer()];
      
      let callCount = 0;
      mockCloudinary.v2.uploader.upload_stream.mockImplementation((options, callback) => {
        callCount++;
        if (callCount === 2) {
          callback(new Error('Upload failed'), null);
        } else {
          callback(null, mockCloudinaryResponse);
        }
        return { end: jest.fn() };
      });

      const results = await upload.uploadMultipleFiles(files, {
        folder: 'test-folder',
      });

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });
  });

  describe('Upload with Progress', () => {
    beforeEach(() => {
      process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
      process.env.CLOUDINARY_API_KEY = 'test-api-key';
      process.env.CLOUDINARY_API_SECRET = 'test-api-secret';
    });

    it('should call progress callback during upload', async () => {
      const mockBuffer = createMockBuffer();
      const progressCallback = jest.fn();
      
      mockCloudinary.v2.uploader.upload_stream.mockImplementation((options, callback) => {
        callback(null, mockCloudinaryResponse);
        return { end: jest.fn() };
      });

      const result = await upload.uploadWithProgress(mockBuffer, {
        folder: 'test-folder',
        stripMetadata: true,
      }, progressCallback);

      expect(progressCallback).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.metadataStripped).toBe(true);
    });

    it('should handle progress callback errors gracefully', async () => {
      const mockBuffer = createMockBuffer();
      const progressCallback = jest.fn().mockImplementation(() => {
        throw new Error('Progress callback error');
      });
      
      mockCloudinary.v2.uploader.upload_stream.mockImplementation((options, callback) => {
        callback(null, mockCloudinaryResponse);
        return { end: jest.fn() };
      });

      const result = await upload.uploadWithProgress(mockBuffer, {
        folder: 'test-folder',
      }, progressCallback);

      expect(result.success).toBe(true);
    });
  });

  describe('Metadata Stripping from Existing Files', () => {
    beforeEach(() => {
      process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
      process.env.CLOUDINARY_API_KEY = 'test-api-key';
      process.env.CLOUDINARY_API_SECRET = 'test-api-secret';
    });

    it('should strip metadata from existing file successfully', async () => {
      const publicId = 'existing-file-id';
      mockCloudinary.v2.uploader.explicit.mockResolvedValue(mockCloudinaryResponse);

      const result = await upload.stripMetadataFromExistingFile(publicId, {
        stripExif: true,
      });

      expect(result.success).toBe(true);
      expect(result.metadataStripped).toBe(true);
      expect(mockCloudinary.v2.uploader.explicit).toHaveBeenCalledWith(publicId, {
        type: 'upload',
        transformation: [{ strip: 'all' }],
      });
    });

    it('should strip only GPS from existing file', async () => {
      const publicId = 'existing-file-id';
      mockCloudinary.v2.uploader.explicit.mockResolvedValue(mockCloudinaryResponse);

      const result = await upload.stripMetadataFromExistingFile(publicId, {
        stripGps: true,
      });

      expect(result.success).toBe(true);
      expect(result.metadataStripped).toBe(true);
      expect(mockCloudinary.v2.uploader.explicit).toHaveBeenCalledWith(publicId, {
        type: 'upload',
        transformation: [{ strip: 'gps' }],
      });
    });

    it('should fail when no stripping options specified', async () => {
      const publicId = 'existing-file-id';

      const result = await upload.stripMetadataFromExistingFile(publicId, {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('No metadata stripping options specified');
    });

    it('should handle stripping errors gracefully', async () => {
      const publicId = 'existing-file-id';
      mockCloudinary.v2.uploader.explicit.mockRejectedValue(new Error('Stripping failed'));

      const result = await upload.stripMetadataFromExistingFile(publicId, {
        stripExif: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Stripping failed');
    });
  });

  describe('File Metadata Inspection', () => {
    beforeEach(() => {
      process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
      process.env.CLOUDINARY_API_KEY = 'test-api-key';
      process.env.CLOUDINARY_API_SECRET = 'test-api-secret';
    });

    it('should get file metadata successfully', async () => {
      const publicId = 'test-file-id';
      const mockMetadata = {
        exif: { gps: { latitude: 40.7128, longitude: -74.0060 } },
        image_metadata: { format: 'JPEG' },
        faces: [{ confidence: 0.95 }],
        colors: [{ red: 255, green: 0, blue: 0 }],
        phash: 'test-phash',
        accessibility: { colorblind_accessibility_score: 0.8 },
        quality_analysis: { quality_score: 0.9 },
      };

      mockCloudinary.v2.api.resource.mockResolvedValue(mockMetadata);

      const result = await upload.getFileMetadata(publicId);

      expect(result).toEqual({
        exif: mockMetadata.exif,
        imageMetadata: mockMetadata.image_metadata,
        faces: mockMetadata.faces,
        colors: mockMetadata.colors,
        perceptualHash: mockMetadata.phash,
        accessibility: mockMetadata.accessibility,
        qualityAnalysis: mockMetadata.quality_analysis,
      });
    });

    it('should return null when service not configured', async () => {
      delete process.env.CLOUDINARY_CLOUD_NAME;
      const newUpload = require('../src/upload').default;

      const result = await newUpload.getFileMetadata('test-file-id');
      expect(result).toBeNull();
    });

    it('should handle metadata retrieval errors gracefully', async () => {
      const publicId = 'test-file-id';
      mockCloudinary.v2.api.resource.mockRejectedValue(new Error('Metadata retrieval failed'));

      const result = await upload.getFileMetadata(publicId);
      expect(result).toBeNull();
    });
  });

  describe('File Management', () => {
    beforeEach(() => {
      process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
      process.env.CLOUDINARY_API_KEY = 'test-api-key';
      process.env.CLOUDINARY_API_SECRET = 'test-api-secret';
    });

    it('should delete file successfully', async () => {
      const publicId = 'test-file-id';
      mockCloudinary.v2.uploader.destroy.mockResolvedValue({ result: 'ok' });

      const result = await upload.deleteFile(publicId);

      expect(result).toBe(true);
      expect(mockCloudinary.v2.uploader.destroy).toHaveBeenCalledWith(publicId);
    });

    it('should delete multiple files successfully', async () => {
      const publicIds = ['file1', 'file2', 'file3'];
      mockCloudinary.v2.uploader.destroy.mockResolvedValue({ result: 'ok' });

      const results = await upload.deleteMultipleFiles(publicIds);

      expect(results).toHaveLength(3);
      results.forEach(result => expect(result).toBe(true));
    });

    it('should update file successfully', async () => {
      const publicId = 'test-file-id';
      const transformation = { width: 800, height: 600 };
      mockCloudinary.v2.uploader.explicit.mockResolvedValue(mockCloudinaryResponse);

      const result = await upload.updateFile(publicId, transformation);

      expect(result.success).toBe(true);
      expect(mockCloudinary.v2.uploader.explicit).toHaveBeenCalledWith(publicId, {
        type: 'upload',
        transformation,
      });
    });
  });

  describe('Upload Widget Configuration', () => {
    beforeEach(() => {
      process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
      process.env.CLOUDINARY_API_KEY = 'test-api-key';
      process.env.CLOUDINARY_API_SECRET = 'test-api-secret';
    });

    it('should generate upload widget config with metadata stripping', () => {
      const config = upload.getUploadWidgetConfig('test-folder');

      expect(config.cloudName).toBe('test-cloud');
      expect(config.folder).toBe('test-folder');
      expect(config.transformation).toEqual({ strip: 'all' });
      expect(config.maxFileSize).toBe(10 * 1024 * 1024);
      expect(config.allowedFormats).toEqual(['jpg', 'jpeg', 'png', 'gif', 'webp']);
    });

    it('should throw error when service not configured', () => {
      delete process.env.CLOUDINARY_CLOUD_NAME;
      const newUpload = require('../src/upload').default;

      expect(() => newUpload.getUploadWidgetConfig()).toThrow('Upload service not configured');
    });
  });

  describe('Service Status', () => {
    it('should return correct status when configured', () => {
      process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
      const newUpload = require('../src/upload').default;
      
      const status = newUpload.getStatus();
      expect(status.configured).toBe(true);
      expect(status.cloudName).toBe('test-cloud');
    });

    it('should return unconfigured status when not configured', () => {
      const newUpload = require('../src/upload').default;
      
      const status = newUpload.getStatus();
      expect(status.configured).toBe(false);
    });
  });
});
