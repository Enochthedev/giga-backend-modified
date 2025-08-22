import { Readable } from 'stream';

export const createMockBuffer = (size: number = 1024): Buffer => {
  return Buffer.alloc(size, 'test-data');
};

export const createMockStream = (): Readable => {
  const stream = new Readable();
  stream.push('test-data');
  stream.push(null);
  return stream;
};

export const createMockFile = (name: string = 'test.jpg', size: number = 1024): File => {
  return {
    name,
    size,
    type: 'image/jpeg',
    lastModified: Date.now(),
  } as File;
};

export const mockCloudinaryResponse = {
  secure_url: 'https://res.cloudinary.com/test/image/upload/test.jpg',
  public_id: 'test-public-id',
  format: 'jpg',
  bytes: 1024,
  result: 'ok',
};

export const mockEmailResponse = {
  messageId: 'test-message-id',
  accepted: ['test@example.com'],
  rejected: [],
  response: '250 Message accepted',
};

export const createMockUser = (overrides: any = {}) => {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    userName: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    phoneNumber: '+1234567890',
    country: 'Test Country',
    address: 'Test Address',
    street: 'Test Street',
    city: 'Test City',
    zipCode: '12345',
    gender: 'prefer-not-to-say',
    weight: 70,
    maritalStatus: 'prefer-not-to-say',
    ageGroup: '25-34',
    areaOfInterest: 'Testing',
    isEmailVerified: false,
    isPhoneVerified: false,
    ...overrides,
  };
};

export const createMockOAuthData = (provider: 'google' | 'apple' = 'google') => {
  return {
    provider,
    oauthId: `test-${provider}-id`,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
  };
};

export const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

export const mockRequest = (overrides: any = {}) => {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    ...overrides,
  };
};

export const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.redirect = jest.fn().mockReturnValue(res);
  return res;
};

export const mockNext = jest.fn();
