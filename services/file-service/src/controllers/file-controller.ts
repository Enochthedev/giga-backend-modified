import { Response, NextFunction } from 'express';
import { FileService } from '../services/file-service';
import { AuthenticatedRequest } from '../middleware/auth-middleware';
import { createError } from '../middleware/error-handler';
import { FileUploadRequest } from '../types/file-types';

export class FileController {
    private fileService: FileService;

    constructor() {
        this.fileService = new FileService();
    }

    uploadFile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.file) {
                throw createError('No file provided', 400, 'NO_FILE');
            }

            if (!req.user) {
                throw createError('Authentication required', 401, 'UNAUTHORIZED');
            }

            const { category, tags, isPublic } = req.validatedBody || {};

            const uploadRequest: FileUploadRequest = {
                file: req.file,
                userId: req.user.id,
                category,
                tags,
                isPublic
            };

            const result = await this.fileService.uploadFile(uploadRequest);

            res.status(201).json({
                success: true,
                data: result,
                message: 'File uploaded successfully'
            });
        } catch (error) {
            next(error);
        }
    };

    uploadMultipleFiles = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
                throw createError('No files provided', 400, 'NO_FILES');
            }

            if (!req.user) {
                throw createError('Authentication required', 401, 'UNAUTHORIZED');
            }

            const { category, tags, isPublic } = req.validatedBody || {};
            const results = [];

            for (const file of req.files) {
                const uploadRequest: FileUploadRequest = {
                    file,
                    userId: req.user.id,
                    category,
                    tags,
                    isPublic
                };

                const result = await this.fileService.uploadFile(uploadRequest);
                results.push(result);
            }

            res.status(201).json({
                success: true,
                data: results,
                message: `${results.length} files uploaded successfully`
            });
        } catch (error) {
            next(error);
        }
    };

    getFile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { fileId } = req.params;
            const userId = req.user?.id;

            const file = await this.fileService.getFile(fileId, userId);

            if (!file) {
                throw createError('File not found', 404, 'FILE_NOT_FOUND');
            }

            res.json({
                success: true,
                data: file
            });
        } catch (error) {
            next(error);
        }
    };

    searchFiles = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.id;
            const searchQuery = req.validatedQuery;

            const result = await this.fileService.searchFiles(searchQuery, userId);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    };

    deleteFile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { fileId } = req.params;

            if (!req.user) {
                throw createError('Authentication required', 401, 'UNAUTHORIZED');
            }

            const success = await this.fileService.deleteFile(fileId, req.user.id);

            if (!success) {
                throw createError('File not found or access denied', 404, 'FILE_NOT_FOUND');
            }

            res.json({
                success: true,
                message: 'File deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    };

    processImage = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { fileId } = req.params;
            const processingOptions = req.validatedBody;

            const result = await this.fileService.processImage(fileId, processingOptions);

            if (!result) {
                throw createError('File not found or not an image', 404, 'FILE_NOT_FOUND');
            }

            res.json({
                success: true,
                data: result,
                message: 'Image processed successfully'
            });
        } catch (error) {
            next(error);
        }
    };

    getSignedUrl = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const { fileId } = req.params;
            const { expiresIn } = req.validatedQuery;
            const userId = req.user?.id;

            const signedUrl = await this.fileService.getSignedUrl(fileId, userId, expiresIn);

            if (!signedUrl) {
                throw createError('File not found', 404, 'FILE_NOT_FOUND');
            }

            res.json({
                success: true,
                data: {
                    url: signedUrl,
                    expiresIn,
                    expiresAt: new Date(Date.now() + expiresIn * 1000)
                }
            });
        } catch (error) {
            next(error);
        }
    };

    getUserFiles = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.user) {
                throw createError('Authentication required', 401, 'UNAUTHORIZED');
            }

            const searchQuery = {
                ...req.validatedQuery,
                uploadedBy: req.user.id
            };

            const result = await this.fileService.searchFiles(searchQuery, req.user.id);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    };
}