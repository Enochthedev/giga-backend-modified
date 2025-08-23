import { Router } from 'express';
import { FileController } from '../controllers/file-controller';
import { authenticateToken, optionalAuth } from '../middleware/auth-middleware';
import { uploadSingle, uploadMultiple, handleUploadError } from '../middleware/upload-middleware';
import {
    validateRequest,
    validateQuery,
    uploadFileSchema,
    searchFilesSchema,
    processImageSchema,
    getSignedUrlSchema
} from '../validation/file-validation';

const router = Router();
const fileController = new FileController();

// Upload single file
router.post(
    '/upload',
    authenticateToken,
    uploadSingle,
    handleUploadError,
    validateRequest(uploadFileSchema),
    fileController.uploadFile
);

// Upload multiple files
router.post(
    '/upload/multiple',
    authenticateToken,
    uploadMultiple,
    handleUploadError,
    validateRequest(uploadFileSchema),
    fileController.uploadMultipleFiles
);

// Get file by ID (public files accessible without auth, private files require auth)
router.get(
    '/:fileId',
    optionalAuth,
    fileController.getFile
);

// Search files (public files accessible without auth, private files require auth)
router.get(
    '/',
    optionalAuth,
    validateQuery(searchFilesSchema),
    fileController.searchFiles
);

// Get user's files (requires authentication)
router.get(
    '/user/files',
    authenticateToken,
    validateQuery(searchFilesSchema),
    fileController.getUserFiles
);

// Delete file (requires authentication and ownership)
router.delete(
    '/:fileId',
    authenticateToken,
    fileController.deleteFile
);

// Process image (resize, optimize, etc.)
router.post(
    '/:fileId/process',
    authenticateToken,
    validateRequest(processImageSchema),
    fileController.processImage
);

// Get signed URL for direct access
router.post(
    '/:fileId/signed-url',
    optionalAuth,
    validateRequest(getSignedUrlSchema),
    fileController.getSignedUrl
);

export { router as fileRoutes };