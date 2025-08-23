import { AdminDatabase } from '../database/connection';
import { logger } from '../utils/logger';

// Test database setup
beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/admin_service_test';

    try {
        await AdminDatabase.initialize();
        logger.info('Test database connection established');
    } catch (error) {
        logger.error('Failed to connect to test database:', error);
        throw error;
    }
});

// Clean up after all tests
afterAll(async () => {
    try {
        await AdminDatabase.close();
        logger.info('Test database connection closed');
    } catch (error) {
        logger.error('Error closing test database connection:', error);
    }
});

// Clean up after each test
afterEach(async () => {
    // Clean up test data if needed
    // This can be customized based on test requirements
});

// Suppress console logs during tests unless explicitly needed
if (process.env.VERBOSE_TESTS !== 'true') {
    console.log = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
}