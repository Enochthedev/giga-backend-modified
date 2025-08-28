import dotenv from 'dotenv';
import { Pool } from 'pg';
import Redis from 'ioredis';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-comprehensive-testing';
process.env.JWT_EXPIRES_IN = '1h';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.BCRYPT_ROUNDS = '4';
process.env.DATABASE_URL = 'postgresql://test_user:test_password@localhost:5432/test_db';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.RABBITMQ_URL = 'amqp://localhost:5672';
process.env.ELASTICSEARCH_URL = 'http://localhost:9200';

// Test database connection pool
let testDbPool: Pool;
let testRedis: Redis;

// Global setup
beforeAll(async () => {
    // Initialize test database connection
    testDbPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    });

    // Initialize test Redis connection
    testRedis = new Redis(process.env.REDIS_URL!, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
    });

    // Wait for connections to be ready
    try {
        await testDbPool.query('SELECT 1');
        await testRedis.ping();
        console.log('Test infrastructure connections established');
    } catch (error) {
        console.warn('Test infrastructure not available:', error);
    }
});

// Global cleanup
afterAll(async () => {
    if (testDbPool) {
        await testDbPool.end();
    }
    if (testRedis) {
        await testRedis.quit();
    }
});

// Mock console methods to reduce noise in tests
const originalConsole = global.console;
global.console = {
    ...originalConsole,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: originalConsole.warn, // Keep warnings
    error: originalConsole.error, // Keep errors
};

// Global test timeout
jest.setTimeout(30000);

// Export test utilities
export { testDbPool, testRedis };