import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { ElasticsearchClient } from '../config/elasticsearch-config';
import { RedisClient } from '../config/redis-config';
import { logger } from '../utils/logger';

// Test configuration
const testConfig = {
    elasticsearch: {
        url: process.env.TEST_ELASTICSEARCH_URL || 'http://localhost:9200',
        indexPrefix: 'test_search_'
    },
    redis: {
        url: process.env.TEST_REDIS_URL || 'redis://localhost:6379',
        db: 15 // Use a different database for tests
    }
};

// Global test clients
let esClient: ElasticsearchClient;
let redisClient: RedisClient;

/**
 * Setup test environment before all tests
 */
beforeAll(async () => {
    try {
        // Initialize test clients
        esClient = new ElasticsearchClient({
            url: testConfig.elasticsearch.url,
            indexPrefix: testConfig.elasticsearch.indexPrefix
        });

        redisClient = new RedisClient({
            url: testConfig.redis.url,
            db: testConfig.redis.db
        });

        // Connect to Redis
        await redisClient.connect();

        // Test Elasticsearch connection
        const esConnected = await esClient.testConnection();
        if (!esConnected) {
            throw new Error('Failed to connect to test Elasticsearch');
        }

        logger.info('Test environment setup complete');
    } catch (error) {
        logger.error('Test setup failed:', error);
        throw error;
    }
});

/**
 * Cleanup test environment after all tests
 */
afterAll(async () => {
    try {
        // Clean up test indices
        await cleanupTestIndices();

        // Close connections
        await esClient.close();
        await redisClient.disconnect();

        logger.info('Test environment cleanup complete');
    } catch (error) {
        logger.error('Test cleanup failed:', error);
    }
});

/**
 * Setup before each test
 */
beforeEach(async () => {
    // Clear Redis cache before each test
    try {
        const client = redisClient.getClient();
        await client.flushDb();
    } catch (error) {
        logger.warn('Failed to clear Redis cache:', error);
    }
});

/**
 * Cleanup after each test
 */
afterEach(async () => {
    // Additional cleanup if needed
});

/**
 * Clean up test indices
 */
async function cleanupTestIndices(): Promise<void> {
    try {
        const client = esClient.getClient();
        const indexPattern = `${testConfig.elasticsearch.indexPrefix}*`;

        const response = await client.indices.delete({
            index: indexPattern,
            ignore_unavailable: true
        });

        logger.info('Test indices cleaned up');
    } catch (error) {
        logger.warn('Failed to cleanup test indices:', error);
    }
}

/**
 * Get test Elasticsearch client
 */
export function getTestElasticsearchClient(): ElasticsearchClient {
    return esClient;
}

/**
 * Get test Redis client
 */
export function getTestRedisClient(): RedisClient {
    return redisClient;
}

/**
 * Create test documents for testing
 */
export function createTestDocuments() {
    return [
        {
            id: 'product-1',
            type: 'product' as const,
            title: 'MacBook Pro 16-inch',
            description: 'Powerful laptop for professionals with M2 chip',
            category: 'Electronics',
            tags: ['laptop', 'apple', 'professional'],
            price: 2499.99,
            currency: 'USD',
            rating: 4.8,
            reviewCount: 1250,
            availability: true,
            vendorId: 'vendor-1',
            vendorName: 'Apple Store',
            brand: 'Apple',
            sku: 'MBP16-M2-512',
            inStock: true,
            stockQuantity: 50,
            createdAt: new Date('2023-01-01'),
            updatedAt: new Date('2023-12-01')
        },
        {
            id: 'product-2',
            type: 'product' as const,
            title: 'Sony WH-1000XM5 Headphones',
            description: 'Premium noise-canceling wireless headphones',
            category: 'Electronics',
            tags: ['headphones', 'sony', 'wireless', 'noise-canceling'],
            price: 399.99,
            currency: 'USD',
            rating: 4.6,
            reviewCount: 890,
            availability: true,
            vendorId: 'vendor-2',
            vendorName: 'Sony Official',
            brand: 'Sony',
            sku: 'WH1000XM5-B',
            inStock: true,
            stockQuantity: 25,
            createdAt: new Date('2023-02-01'),
            updatedAt: new Date('2023-11-01')
        },
        {
            id: 'hotel-1',
            type: 'hotel' as const,
            title: 'Grand Plaza Hotel',
            description: 'Luxury hotel in the heart of downtown',
            category: 'Accommodation',
            tags: ['luxury', 'downtown', 'business'],
            price: 299.99,
            currency: 'USD',
            location: {
                lat: 40.7589,
                lon: -73.9851,
                city: 'New York',
                country: 'USA'
            },
            rating: 4.5,
            reviewCount: 2100,
            availability: true,
            propertyId: 'prop-1',
            propertyType: 'hotel' as const,
            amenities: ['wifi', 'pool', 'gym', 'spa', 'restaurant'],
            checkInTime: '15:00',
            checkOutTime: '11:00',
            maxGuests: 4,
            roomCount: 350,
            createdAt: new Date('2023-01-15'),
            updatedAt: new Date('2023-12-15')
        }
    ];
}

/**
 * Wait for Elasticsearch to refresh indices
 */
export async function waitForElasticsearchRefresh(): Promise<void> {
    try {
        const client = esClient.getClient();
        await client.indices.refresh({
            index: `${testConfig.elasticsearch.indexPrefix}*`
        });

        // Small delay to ensure data is available
        await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
        logger.warn('Failed to refresh Elasticsearch indices:', error);
    }
}