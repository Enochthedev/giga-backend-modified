/**
 * Test setup configuration
 */

import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Mock Redis and ClickHouse for tests
jest.mock('../database/redis-connection', () => ({
    redisConnection: {
        connect: jest.fn(),
        getClient: jest.fn(),
        isClientConnected: jest.fn(() => true),
        set: jest.fn(),
        get: jest.fn(),
        del: jest.fn(),
        setJSON: jest.fn(),
        getJSON: jest.fn(),
        exists: jest.fn(),
        expire: jest.fn(),
        keys: jest.fn(),
        incr: jest.fn(),
        sadd: jest.fn(),
        smembers: jest.fn(),
        close: jest.fn()
    }
}));

jest.mock('../database/clickhouse-connection', () => ({
    clickHouseConnection: {
        getClient: jest.fn(() => ({
            query: jest.fn(),
            insert: jest.fn(),
            exec: jest.fn()
        })),
        testConnection: jest.fn(() => Promise.resolve(true)),
        initializeSchema: jest.fn(),
        close: jest.fn()
    }
}));

// Global test timeout
jest.setTimeout(30000);

// Setup and teardown
beforeAll(async () => {
    // Global setup
});

afterAll(async () => {
    // Global cleanup
});

beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
});

afterEach(() => {
    // Cleanup after each test
});