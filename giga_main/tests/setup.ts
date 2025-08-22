// Test setup file for giga_main service
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/giga_test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.REFRESH_SECRET = 'test-refresh-secret';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
process.env.APPLE_CLIENT_ID = 'test-apple-client-id';
process.env.APPLE_TEAM_ID = 'test-apple-team-id';
process.env.APPLE_KEY_ID = 'test-apple-key-id';
process.env.APPLE_PRIVATE_KEY = 'test-apple-private-key';
process.env.FRONTEND_URL = 'http://localhost:3000';

// Global test timeout
jest.setTimeout(10000);

// Suppress console logs during tests (unless there's an error)
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: console.error, // Keep error logging
};

// Mock mongoose
jest.mock('mongoose', () => ({
  connect: jest.fn().mockResolvedValue({}),
  connection: {
    on: jest.fn(),
    once: jest.fn(),
  },
}));

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn(),
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mock-token'),
  verify: jest.fn(() => ({ userId: 'test-user-id' })),
}));

// Mock moment
jest.mock('moment', () => {
  const mockMoment = (date: any) => ({
    add: jest.fn(() => mockMoment(date)),
    toDate: jest.fn(() => new Date('2024-01-01')),
    format: jest.fn(() => '2024-01-01'),
  });
  return mockMoment;
});

// Mock passport
jest.mock('passport', () => ({
  authenticate: jest.fn(() => (req: any, res: any, next: any) => next()),
  initialize: jest.fn(),
  session: jest.fn(),
}));

// Mock the common package
jest.mock('common', () => ({
  signAccessToken: jest.fn(() => 'mock-access-token'),
  signRefreshToken: jest.fn(() => 'mock-refresh-token'),
  verifyToken: jest.fn(() => ({ userId: 'test-user-id' })),
  verifyRefreshToken: jest.fn(() => ({ userId: 'test-user-id' })),
  authMiddleware: jest.fn((req: any, res: any, next: any) => next()),
  checkRole: jest.fn((req: any, res: any, next: any) => next()),
  mailer: {
    sendOTPEmail: jest.fn().mockResolvedValue(true),
    sendWelcomeEmail: jest.fn().mockResolvedValue(true),
    sendVerificationEmail: jest.fn().mockResolvedValue(true),
  },
  upload: {
    uploadFile: jest.fn().mockResolvedValue({
      success: true,
      url: 'https://example.com/test.jpg',
      publicId: 'test-public-id',
    }),
  },
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  redisRateLimit: jest.fn(),
  setupSwagger: jest.fn(),
  initDb: jest.fn(),
}));

// Mock User model methods
const mockUserModel = {
  findOne: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  find: jest.fn(),
  isEmailTaken: jest.fn(),
  isUserNameTaken: jest.fn(),
  isPhoneNumberTaken: jest.fn(),
  findByOAuthId: jest.fn(),
  findOneAndUpdate: jest.fn(),
};

// Mock Admin model methods
const mockAdminModel = {
  findOne: jest.fn(),
  create: jest.fn(),
};

// Mock SubAdmin model methods
const mockSubAdminModel = {
  findOne: jest.fn(),
  create: jest.fn(),
};

// Mock Token model methods
const mockTokenModel = {
  findOne: jest.fn(),
  create: jest.fn(),
  deleteOne: jest.fn(),
};

// Mock models
jest.mock('../src/models/user.model', () => mockUserModel);
jest.mock('../src/models/admin.model', () => mockAdminModel);
jest.mock('../src/models/subAdmin.model', () => mockSubAdminModel);
jest.mock('../src/models/token.model', () => mockTokenModel);

// Mock utility functions
jest.mock('../src/utils/util', () => ({
  randomString: jest.fn(() => 'mock-token'),
  catchAsync: jest.fn((fn: any) => fn),
}));

// Mock OAuth service
jest.mock('../src/services/oauth.service', () => ({
  default: {
    authenticate: jest.fn(),
    initialize: jest.fn(),
  },
}));

// Mock email service
jest.mock('../src/services/email.service', () => ({
  default: {
    sendEmail: jest.fn().mockResolvedValue(true),
    sendOTPEmail: jest.fn().mockResolvedValue(true),
  },
}));

// Export mocks for use in tests
export {
  mockUserModel,
  mockAdminModel,
  mockSubAdminModel,
  mockTokenModel,
};
