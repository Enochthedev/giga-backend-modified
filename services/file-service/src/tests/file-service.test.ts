import { FileService } from '../services/file-service';
import { DatabaseConnection } from '../database/connection';
import { FileUploadRequest } from '../types/file-types';

// Mock the database connection
jest.mock('../database/connection');
const mockDatabaseConnection = DatabaseConnection as jest.Mocked<typeof DatabaseConnection>;

describe('FileService', () => {
    let fileService: FileService;

    beforeEach(() => {
        fileService = new FileService();
        jest.clearAllMocks();
    });

    describe('uploadFile', () => {
        it('should upload a file successfully', async () => {
            // Mock database query
            mockDatabaseConnection.query.mockResolvedValueOnce({
                rows: [{
                    id: 'test-file-id',
                    original_name: 'test.jpg',
                    file_name: 'uuid.jpg',
                    mime_type: 'image/jpeg',
                    size: 1024,
                    category: 'image',
                    s3_key: 'uploads/user-id/uuid.jpg',
                    s3_url: 'https://test-bucket.s3.amazonaws.com/test-file.jpg',
                    cdn_url: null,
                    uploaded_by: 'user-id',
                    uploaded_at: new Date(),
                    is_processed: false,
                    processing_status: 'pending',
                    processing_error: null,
                    metadata: null
                }]
            });

            const mockFile = {
                originalname: 'test.jpg',
                mimetype: 'image/jpeg',
                size: 1024,
                buffer: Buffer.from('test file content')
            } as Express.Multer.File;

            const uploadRequest: FileUploadRequest = {
                file: mockFile,
                userId: 'user-id',
                tags: ['test'],
                isPublic: false
            };

            const result = await fileService.uploadFile(uploadRequest);

            expect(result).toMatchObject({
                id: 'test-file-id',
                fileName: 'uuid.jpg',
                originalName: 'test.jpg',
                mimeType: 'image/jpeg',
                size: 1024,
                category: 'image',
                isProcessed: false
            });

            expect(mockDatabaseConnection.query).toHaveBeenCalled();
        });

        it('should handle upload errors', async () => {
            mockDatabaseConnection.query.mockRejectedValueOnce(new Error('Database error'));

            const mockFile = {
                originalname: 'test.jpg',
                mimetype: 'image/jpeg',
                size: 1024,
                buffer: Buffer.from('test file content')
            } as Express.Multer.File;

            const uploadRequest: FileUploadRequest = {
                file: mockFile,
                userId: 'user-id'
            };

            await expect(fileService.uploadFile(uploadRequest)).rejects.toThrow('Database error');
        });
    });

    describe('getFile', () => {
        it('should retrieve a file by ID', async () => {
            mockDatabaseConnection.query.mockResolvedValueOnce({
                rows: [{
                    id: 'test-file-id',
                    original_name: 'test.jpg',
                    file_name: 'uuid.jpg',
                    mime_type: 'image/jpeg',
                    size: 1024,
                    category: 'image',
                    s3_key: 'uploads/user-id/uuid.jpg',
                    s3_url: 'https://test-bucket.s3.amazonaws.com/test-file.jpg',
                    cdn_url: null,
                    uploaded_by: 'user-id',
                    uploaded_at: new Date(),
                    is_processed: true,
                    processing_status: 'completed',
                    processing_error: null,
                    metadata: { width: 800, height: 600 }
                }]
            });

            const result = await fileService.getFile('test-file-id', 'user-id');

            expect(result).toMatchObject({
                id: 'test-file-id',
                originalName: 'test.jpg',
                mimeType: 'image/jpeg',
                size: 1024,
                category: 'image'
            });
        });

        it('should return null for non-existent file', async () => {
            mockDatabaseConnection.query.mockResolvedValueOnce({ rows: [] });

            const result = await fileService.getFile('non-existent-id', 'user-id');

            expect(result).toBeNull();
        });
    });

    describe('searchFiles', () => {
        it('should search files with filters', async () => {
            // Mock count query
            mockDatabaseConnection.query.mockResolvedValueOnce({
                rows: [{ count: '1' }]
            });

            // Mock files query
            mockDatabaseConnection.query.mockResolvedValueOnce({
                rows: [{
                    id: 'test-file-id',
                    original_name: 'test.jpg',
                    file_name: 'uuid.jpg',
                    mime_type: 'image/jpeg',
                    size: 1024,
                    category: 'image',
                    s3_key: 'uploads/user-id/uuid.jpg',
                    s3_url: 'https://test-bucket.s3.amazonaws.com/test-file.jpg',
                    cdn_url: null,
                    uploaded_by: 'user-id',
                    uploaded_at: new Date(),
                    is_processed: true,
                    processing_status: 'completed',
                    processing_error: null,
                    metadata: null
                }]
            });

            const searchQuery = {
                category: 'image',
                limit: 10,
                offset: 0
            };

            const result = await fileService.searchFiles(searchQuery, 'user-id');

            expect(result).toMatchObject({
                total: 1,
                limit: 10,
                offset: 0,
                files: expect.arrayContaining([
                    expect.objectContaining({
                        id: 'test-file-id',
                        category: 'image'
                    })
                ])
            });
        });
    });

    describe('deleteFile', () => {
        it('should delete a file successfully', async () => {
            // Mock get file query
            mockDatabaseConnection.query.mockResolvedValueOnce({
                rows: [{
                    id: 'test-file-id',
                    original_name: 'test.jpg',
                    file_name: 'uuid.jpg',
                    mime_type: 'image/jpeg',
                    size: 1024,
                    category: 'image',
                    s3_key: 'uploads/user-id/uuid.jpg',
                    s3_url: 'https://test-bucket.s3.amazonaws.com/test-file.jpg',
                    cdn_url: null,
                    uploaded_by: 'user-id',
                    uploaded_at: new Date(),
                    is_processed: true,
                    processing_status: 'completed',
                    processing_error: null,
                    metadata: null
                }]
            });

            // Mock delete query
            mockDatabaseConnection.query.mockResolvedValueOnce({
                rowCount: 1
            });

            const result = await fileService.deleteFile('test-file-id', 'user-id');

            expect(result).toBe(true);
        });

        it('should return false for non-existent file', async () => {
            mockDatabaseConnection.query.mockResolvedValueOnce({ rows: [] });

            const result = await fileService.deleteFile('non-existent-id', 'user-id');

            expect(result).toBe(false);
        });
    });
});