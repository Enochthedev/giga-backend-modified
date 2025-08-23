import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

// Mock Stripe for tests
jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => ({
        paymentIntents: {
            create: jest.fn(),
            confirm: jest.fn(),
            retrieve: jest.fn(),
            cancel: jest.fn(),
        },
        paymentMethods: {
            create: jest.fn(),
            retrieve: jest.fn(),
            attach: jest.fn(),
            detach: jest.fn(),
        },
        refunds: {
            create: jest.fn(),
        },
        webhooks: {
            constructEvent: jest.fn(),
        },
    }));
});

// Mock database connection for tests
jest.mock('../database/connection', () => ({
    db: {
        query: jest.fn(),
        close: jest.fn(),
    },
}));

// Global test setup
beforeAll(async () => {
    // Setup test database or mock connections
});

afterAll(async () => {
    // Cleanup test resources
});

beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
});

afterEach(() => {
    // Cleanup after each test
});