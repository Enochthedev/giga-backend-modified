import { v4 as uuidv4 } from 'uuid';
import { DatabaseConnection } from '../database/connection';
import { S3Service } from './s3-service';
import { ImageProcessingService } from './image-processing-service';
import {
    FileMetadata,
    FileUploadRequest,
    FileUploadResponse,
    FileSearchQuery,
    FileSearchResponse,
    FileProcessingOptions
} from '../types/file-types';
import { getFileCategory } from '../config/upload-config';

export class FileService {
    private s3Service: S3Service;
    private imageProcessingService: ImageProcessingService;

    constructor() {
        this.s3Service = new S3Service();
        this.imageProcessingService = new ImageProcessingService();
    }

    async uploadFile(request: FileUploadRequest): Promise<FileUploadResponse> {
        const { file, userId, tags = [], isPublic = false } = request;

        // Generate unique file name
        const fileExtension = file.originalname.split('.').pop();
        const fileName = `${uuidv4()}.${fileExtension}`;
        const s3Key = `uploads/${userId}/${fileName}`;

        // Upload to S3
        const s3Url = await this.s3Service.uploadFile(file.buffer, s3Key, file.mimetype);

        // Create file metadata
        const fileMetadata: Partial<FileMetadata> = {
            id: uuidv4(),
            originalName: file.originalname,
            fileName,
            mimeType: file.mimetype,
            size: file.size,
            category: getFileCategory(file.mimetype),
            s3Key,
            s3Url,
            uploadedBy: userId,
            uploadedAt: new Date(),
            isProcessed: false,
            processingStatus: 'pending'
        };

        // Save to database
        const savedFile = await this.saveFileMetadata(fileMetadata, tags, isPublic);

        // Process image if needed (async)
        if (fileMetadata.category === 'image') {
            this.processImageAsync(savedFile.id, file.buffer);
        }

        const response: FileUploadResponse = {
            id: savedFile.id,
            fileName: savedFile.fileName,
            originalName: savedFile.originalName,
            mimeType: savedFile.mimeType,
            size: savedFile.size,
            url: savedFile.s3Url,
            category: savedFile.category,
            uploadedAt: savedFile.uploadedAt,
            isProcessed: savedFile.isProcessed
        };

        if (savedFile.cdnUrl) {
            response.cdnUrl = savedFile.cdnUrl;
        }

        return response;
    }

    async getFile(fileId: string, userId?: string): Promise<FileMetadata | null> {
        const query = `
      SELECT * FROM files 
      WHERE id = $1 
      AND (is_public = true OR uploaded_by = $2)
    `;

        const result = await DatabaseConnection.query(query, [fileId, userId]);

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapRowToFileMetadata(result.rows[0]);
    }

    async searchFiles(searchQuery: FileSearchQuery, userId?: string): Promise<FileSearchResponse> {
        const {
            category,
            mimeType,
            uploadedBy,
            tags,
            dateFrom,
            dateTo,
            limit = 20,
            offset = 0
        } = searchQuery;

        let whereConditions = ['(is_public = true OR uploaded_by = $1)'];
        const params: any[] = [userId];
        let paramIndex = 2;

        if (category) {
            whereConditions.push(`category = $${paramIndex}`);
            params.push(category);
            paramIndex++;
        }

        if (mimeType) {
            whereConditions.push(`mime_type = $${paramIndex}`);
            params.push(mimeType);
            paramIndex++;
        }

        if (uploadedBy) {
            whereConditions.push(`uploaded_by = $${paramIndex}`);
            params.push(uploadedBy);
            paramIndex++;
        }

        if (tags && tags.length > 0) {
            whereConditions.push(`tags && $${paramIndex}`);
            params.push(tags);
            paramIndex++;
        }

        if (dateFrom) {
            whereConditions.push(`uploaded_at >= $${paramIndex}`);
            params.push(dateFrom);
            paramIndex++;
        }

        if (dateTo) {
            whereConditions.push(`uploaded_at <= $${paramIndex}`);
            params.push(dateTo);
            paramIndex++;
        }

        const whereClause = whereConditions.join(' AND ');

        // Get total count
        const countQuery = `SELECT COUNT(*) FROM files WHERE ${whereClause}`;
        const countResult = await DatabaseConnection.query(countQuery, params);
        const total = parseInt(countResult.rows[0].count);

        // Get files
        const filesQuery = `
      SELECT * FROM files 
      WHERE ${whereClause}
      ORDER BY uploaded_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
        params.push(limit, offset);

        const filesResult = await DatabaseConnection.query(filesQuery, params);
        const files = filesResult.rows.map((row: any) => this.mapRowToFileMetadata(row));

        return {
            files,
            total,
            limit,
            offset
        };
    }

    async deleteFile(fileId: string, userId: string): Promise<boolean> {
        // Get file metadata
        const file = await this.getFile(fileId, userId);
        if (!file || file.uploadedBy !== userId) {
            return false;
        }

        // Delete from S3
        await this.s3Service.deleteFile(file.s3Key);

        // Delete from database
        const query = 'DELETE FROM files WHERE id = $1 AND uploaded_by = $2';
        const result = await DatabaseConnection.query(query, [fileId, userId]);

        return result.rowCount > 0;
    }

    async processImage(fileId: string, options: FileProcessingOptions): Promise<FileMetadata | null> {
        const file = await this.getFileById(fileId);
        if (!file || file.category !== 'image') {
            return null;
        }

        try {
            // Download original file from S3
            const fileBuffer = await this.s3Service.downloadFile(file.s3Key);

            // Process image
            const processedBuffer = await this.imageProcessingService.processImage(fileBuffer, options);

            // Generate new S3 key for processed image
            const processedKey = `processed/${file.s3Key}`;

            // Upload processed image
            const processedUrl = await this.s3Service.uploadFile(processedBuffer, processedKey, file.mimeType);

            // Update file metadata
            const updateQuery = `
        UPDATE files 
        SET s3_url = $1, is_processed = true, processing_status = 'completed', updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;

            const result = await DatabaseConnection.query(updateQuery, [processedUrl, fileId]);
            return this.mapRowToFileMetadata(result.rows[0]);
        } catch (error) {
            // Update processing status to failed
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await DatabaseConnection.query(
                'UPDATE files SET processing_status = $1, processing_error = $2 WHERE id = $3',
                ['failed', errorMessage, fileId]
            );
            throw error;
        }
    }

    async getSignedUrl(fileId: string, userId?: string, expiresIn: number = 3600): Promise<string | null> {
        const file = await this.getFile(fileId, userId);
        if (!file) {
            return null;
        }

        return this.s3Service.getSignedUrl(file.s3Key, expiresIn);
    }

    private async saveFileMetadata(
        fileMetadata: Partial<FileMetadata>,
        tags: string[],
        isPublic: boolean
    ): Promise<FileMetadata> {
        const query = `
      INSERT INTO files (
        id, original_name, file_name, mime_type, size, category, 
        s3_key, s3_url, cdn_url, uploaded_by, uploaded_at, 
        is_processed, processing_status, tags, is_public
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

        const values = [
            fileMetadata.id,
            fileMetadata.originalName,
            fileMetadata.fileName,
            fileMetadata.mimeType,
            fileMetadata.size,
            fileMetadata.category,
            fileMetadata.s3Key,
            fileMetadata.s3Url,
            fileMetadata.cdnUrl,
            fileMetadata.uploadedBy,
            fileMetadata.uploadedAt,
            fileMetadata.isProcessed,
            fileMetadata.processingStatus,
            tags,
            isPublic
        ];

        const result = await DatabaseConnection.query(query, values);
        return this.mapRowToFileMetadata(result.rows[0]);
    }

    private async getFileById(fileId: string): Promise<FileMetadata | null> {
        const query = 'SELECT * FROM files WHERE id = $1';
        const result = await DatabaseConnection.query(query, [fileId]);

        if (result.rows.length === 0) {
            return null;
        }

        return this.mapRowToFileMetadata(result.rows[0]);
    }

    private mapRowToFileMetadata(row: any): FileMetadata {
        return {
            id: row.id,
            originalName: row.original_name,
            fileName: row.file_name,
            mimeType: row.mime_type,
            size: parseInt(row.size),
            category: row.category,
            s3Key: row.s3_key,
            s3Url: row.s3_url,
            cdnUrl: row.cdn_url,
            uploadedBy: row.uploaded_by,
            uploadedAt: row.uploaded_at,
            isProcessed: row.is_processed,
            processingStatus: row.processing_status,
            processingError: row.processing_error,
            metadata: row.metadata
        };
    }

    private async processImageAsync(fileId: string, fileBuffer: Buffer): Promise<void> {
        try {
            // Update status to processing
            await DatabaseConnection.query(
                'UPDATE files SET processing_status = $1 WHERE id = $2',
                ['processing', fileId]
            );

            // Extract image metadata
            const metadata = await this.imageProcessingService.getImageMetadata(fileBuffer);

            // Update file with metadata
            await DatabaseConnection.query(
                'UPDATE files SET metadata = $1, is_processed = true, processing_status = $2 WHERE id = $3',
                [JSON.stringify(metadata), 'completed', fileId]
            );
        } catch (error) {
            console.error('Image processing failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await DatabaseConnection.query(
                'UPDATE files SET processing_status = $1, processing_error = $2 WHERE id = $3',
                ['failed', errorMessage, fileId]
            );
        }
    }
}