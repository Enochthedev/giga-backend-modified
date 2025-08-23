import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env['NODE_ENV'] = 'test';
process.env['PORT'] = '0'; // Use random port for tests
process.env['LOG_LEVEL'] = 'error'; // Reduce log noise in tests

// Mock external services for testing
process.env['AUTH_SERVICE_URL'] = 'http://localhost:8001';
process.env['PAYMENT_SERVICE_URL'] = 'http://localhost:8002';
process.env['NOTIFICATION_SERVICE_URL'] = 'http://localhost:8003';
process.env['SEARCH_SERVICE_URL'] = 'http://localhost:8004';
process.env['FILE_SERVICE_URL'] = 'http://localhost:8005';
process.env['ANALYTICS_SERVICE_URL'] = 'http://localhost:8006';

// Rate limiting settings for tests
process.env['RATE_LIMIT_WINDOW_MS'] = '60000'; // 1 minute
process.env['RATE_LIMIT_MAX_REQUESTS'] = '1000'; // High limit for tests

// CORS settings
process.env['CORS_ORIGIN'] = 'http://localhost:3000';

// Health check settings
process.env['HEALTH_CHECK_TIMEOUT'] = '1000'; // 1 second for tests
process.env['HEALTH_CACHE_TIMEOUT'] = '5000'; // 5 seconds for tests