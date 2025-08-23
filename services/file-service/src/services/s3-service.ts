import { AWSConfig } from '../config/aws-config';

export class S3Service {
    private s3 = AWSConfig.getS3Instance();
    private bucketName = AWSConfig.getBucketName();
    private cloudFrontDomain = AWSConfig.getCloudFrontDomain();

    async uploadFile(fileBuffer: Buffer, key: string, contentType: string): Promise<string> {
        const params = {
            Bucket: this.bucketName,
            Key: key,
            Body: fileBuffer,
            ContentType: contentType,
            ServerSideEncryption: 'AES256'
        };

        try {
            const result = await this.s3.upload(params).promise();
            return result.Location;
        } catch (error) {
            console.error('S3 upload error:', error);
            throw new Error(`Failed to upload file to S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async downloadFile(key: string): Promise<Buffer> {
        const params = {
            Bucket: this.bucketName,
            Key: key
        };

        try {
            const result = await this.s3.getObject(params).promise();
            return result.Body as Buffer;
        } catch (error) {
            console.error('S3 download error:', error);
            throw new Error(`Failed to download file from S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async deleteFile(key: string): Promise<void> {
        const params = {
            Bucket: this.bucketName,
            Key: key
        };

        try {
            await this.s3.deleteObject(params).promise();
        } catch (error) {
            console.error('S3 delete error:', error);
            throw new Error(`Failed to delete file from S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
        const params = {
            Bucket: this.bucketName,
            Key: key,
            Expires: expiresIn
        };

        try {
            return this.s3.getSignedUrl('getObject', params);
        } catch (error) {
            console.error('S3 signed URL error:', error);
            throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async copyFile(sourceKey: string, destinationKey: string): Promise<string> {
        const params = {
            Bucket: this.bucketName,
            CopySource: `${this.bucketName}/${sourceKey}`,
            Key: destinationKey
        };

        try {
            await this.s3.copyObject(params).promise();
            return this.getFileUrl(destinationKey);
        } catch (error) {
            console.error('S3 copy error:', error);
            throw new Error(`Failed to copy file in S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async fileExists(key: string): Promise<boolean> {
        const params = {
            Bucket: this.bucketName,
            Key: key
        };

        try {
            await this.s3.headObject(params).promise();
            return true;
        } catch (error) {
            if ((error as any).code === 'NotFound') {
                return false;
            }
            throw error;
        }
    }

    getFileUrl(key: string): string {
        if (this.cloudFrontDomain) {
            return `https://${this.cloudFrontDomain}/${key}`;
        }
        return `https://${this.bucketName}.s3.${AWSConfig.getBucketRegion()}.amazonaws.com/${key}`;
    }

    async getFileMetadata(key: string): Promise<any> {
        const params = {
            Bucket: this.bucketName,
            Key: key
        };

        try {
            const result = await this.s3.headObject(params).promise();
            return {
                size: result.ContentLength,
                lastModified: result.LastModified,
                contentType: result.ContentType,
                etag: result.ETag,
                metadata: result.Metadata
            };
        } catch (error) {
            console.error('S3 metadata error:', error);
            throw new Error(`Failed to get file metadata from S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async listFiles(prefix: string, maxKeys: number = 1000): Promise<any[]> {
        const params = {
            Bucket: this.bucketName,
            Prefix: prefix,
            MaxKeys: maxKeys
        };

        try {
            const result = await this.s3.listObjectsV2(params).promise();
            return result.Contents || [];
        } catch (error) {
            console.error('S3 list error:', error);
            throw new Error(`Failed to list files from S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}