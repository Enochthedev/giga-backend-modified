export interface FileMetadata {
    id: string;
    originalName: string;
    fileName: string;
    mimeType: string;
    size: number;
    category: 'image' | 'video' | 'document' | 'other';
    s3Key: string;
    s3Url: string;
    cdnUrl?: string;
    uploadedBy: string;
    uploadedAt: Date;
    isProcessed: boolean;
    processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
    processingError?: string;
    metadata?: {
        width?: number;
        height?: number;
        duration?: number;
        format?: string;
        [key: string]: any;
    };
}

export interface FileUploadRequest {
    file: Express.Multer.File;
    userId: string;
    category?: string;
    tags?: string[];
    isPublic?: boolean;
}

export interface FileUploadResponse {
    id: string;
    fileName: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
    cdnUrl?: string;
    category: string;
    uploadedAt: Date;
    isProcessed: boolean;
}

export interface FileProcessingOptions {
    resize?: {
        width?: number;
        height?: number;
        fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    };
    quality?: number;
    format?: 'jpeg' | 'png' | 'webp';
    watermark?: {
        text?: string;
        image?: string;
        position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    };
}

export interface FileSearchQuery {
    category?: string;
    mimeType?: string;
    uploadedBy?: string;
    tags?: string[];
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
}

export interface FileSearchResponse {
    files: FileMetadata[];
    total: number;
    limit: number;
    offset: number;
}