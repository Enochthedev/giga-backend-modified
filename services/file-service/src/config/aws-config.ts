import AWS from 'aws-sdk';

export class AWSConfig {
    private static s3Instance: AWS.S3;

    static getS3Instance(): AWS.S3 {
        if (!this.s3Instance) {
            const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
            const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

            if (!accessKeyId || !secretAccessKey) {
                throw new Error('AWS credentials are required');
            }

            AWS.config.update({
                accessKeyId,
                secretAccessKey,
                region: process.env.AWS_REGION || 'us-east-1'
            });

            this.s3Instance = new AWS.S3({
                apiVersion: '2006-03-01',
                signatureVersion: 'v4'
            });
        }

        return this.s3Instance;
    }

    static getBucketName(): string {
        const bucketName = process.env.S3_BUCKET_NAME;
        if (!bucketName) {
            throw new Error('S3_BUCKET_NAME environment variable is required');
        }
        return bucketName;
    }

    static getCloudFrontDomain(): string | null {
        return process.env.CLOUDFRONT_DOMAIN || null;
    }

    static getBucketRegion(): string {
        return process.env.S3_BUCKET_REGION || process.env.AWS_REGION || 'us-east-1';
    }
}