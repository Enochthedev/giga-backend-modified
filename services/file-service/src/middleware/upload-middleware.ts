import multer from 'multer';
import { Request } from 'express';
import { uploadConfig, isAllowedFileType } from '../config/upload-config';

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Check file type
    if (!isAllowedFileType(file.mimetype)) {
        const error = new Error(`File type ${file.mimetype} is not allowed`);
        error.name = 'INVALID_FILE_TYPE';
        return cb(error);
    }

    // Check file size (multer will also check this, but we can provide a custom error)
    cb(null, true);
};

// Create multer instance
export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: uploadConfig.maxFileSize,
        files: 10 // Maximum 10 files per request
    }
});

// Middleware for single file upload
export const uploadSingle = upload.single('file');

// Middleware for multiple file upload
export const uploadMultiple = upload.array('files', 10);

// Error handling middleware for multer errors
export const handleUploadError = (error: any, _req: Request, res: any, next: any) => {
    if (error instanceof multer.MulterError) {
        switch (error.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(400).json({
                    error: 'File too large',
                    code: 'FILE_TOO_LARGE',
                    maxSize: uploadConfig.maxFileSize
                });
            case 'LIMIT_FILE_COUNT':
                return res.status(400).json({
                    error: 'Too many files',
                    code: 'TOO_MANY_FILES',
                    maxFiles: 10
                });
            case 'LIMIT_UNEXPECTED_FILE':
                return res.status(400).json({
                    error: 'Unexpected file field',
                    code: 'UNEXPECTED_FILE'
                });
            default:
                return res.status(400).json({
                    error: 'Upload error',
                    code: 'UPLOAD_ERROR',
                    details: error.message
                });
        }
    }

    if (error.name === 'INVALID_FILE_TYPE') {
        return res.status(400).json({
            error: error.message,
            code: 'INVALID_FILE_TYPE',
            allowedTypes: [
                ...uploadConfig.allowedImageTypes,
                ...uploadConfig.allowedVideoTypes,
                ...uploadConfig.allowedDocumentTypes
            ]
        });
    }

    next(error);
};