import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Mock AWS SDK for tests
jest.mock('aws-sdk', () => ({
    S3: jest.fn(() => ({
        upload: jest.fn().mockReturnValue({
            promise: jest.fn().mockResolvedValue({
                Location: 'https://test-bucket.s3.amazonaws.com/test-file.jpg'
            })
        }),
        getObject: jest.fn().mockReturnValue({
            promise: jest.fn().mockResolvedValue({
                Body: Buffer.from('test file content')
            })
        }),
        deleteObject: jest.fn().mockReturnValue({
            promise: jest.fn().mockResolvedValue({})
        }),
        getSignedUrl: jest.fn().mockReturnValue('https://signed-url.com/test-file.jpg'),
        headObject: jest.fn().mockReturnValue({
            promise: jest.fn().mockResolvedValue({
                ContentLength: 1024,
                LastModified: new Date(),
                ContentType: 'image/jpeg'
            })
        }),
        listObjectsV2: jest.fn().mockReturnValue({
            promise: jest.fn().mockResolvedValue({
                Contents: []
            })
        }),
        copyObject: jest.fn().mockReturnValue({
            promise: jest.fn().mockResolvedValue({})
        }),
        listBuckets: jest.fn().mockReturnValue({
            promise: jest.fn().mockResolvedValue({
                Buckets: []
            })
        })
    })),
    config: {
        update: jest.fn()
    }
}));

// Global test timeout
jest.setTimeout(30000);