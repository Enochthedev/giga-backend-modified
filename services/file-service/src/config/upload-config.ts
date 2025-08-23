export interface UploadConfig {
    maxFileSize: number;
    allowedImageTypes: string[];
    allowedVideoTypes: string[];
    allowedDocumentTypes: string[];
    enableImageProcessing: boolean;
    defaultImageQuality: number;
    maxImageWidth: number;
    maxImageHeight: number;
}

export const uploadConfig: UploadConfig = {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
    allowedImageTypes: (process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/gif,image/webp').split(','),
    allowedVideoTypes: (process.env.ALLOWED_VIDEO_TYPES || 'video/mp4,video/mpeg,video/quicktime').split(','),
    allowedDocumentTypes: (process.env.ALLOWED_DOCUMENT_TYPES || 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document').split(','),
    enableImageProcessing: process.env.ENABLE_IMAGE_PROCESSING === 'true',
    defaultImageQuality: parseInt(process.env.DEFAULT_IMAGE_QUALITY || '80'),
    maxImageWidth: parseInt(process.env.MAX_IMAGE_WIDTH || '2048'),
    maxImageHeight: parseInt(process.env.MAX_IMAGE_HEIGHT || '2048')
};

export const getFileCategory = (mimeType: string): 'image' | 'video' | 'document' | 'other' => {
    if (uploadConfig.allowedImageTypes.includes(mimeType)) {
        return 'image';
    }
    if (uploadConfig.allowedVideoTypes.includes(mimeType)) {
        return 'video';
    }
    if (uploadConfig.allowedDocumentTypes.includes(mimeType)) {
        return 'document';
    }
    return 'other';
};

export const isAllowedFileType = (mimeType: string): boolean => {
    return [
        ...uploadConfig.allowedImageTypes,
        ...uploadConfig.allowedVideoTypes,
        ...uploadConfig.allowedDocumentTypes
    ].includes(mimeType);
};