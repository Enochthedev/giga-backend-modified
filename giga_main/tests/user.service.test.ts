import userService from '../src/services/user.service';
import { createMockUser, createMockOAuthData } from '../../common/tests/utils/testHelpers';

// Mock the common package
jest.mock('common', () => ({
  signAccessToken: jest.fn(() => 'mock-access-token'),
  signRefreshToken: jest.fn(() => 'mock-refresh-token'),
  mailer: {
    sendOTPEmail: jest.fn().mockResolvedValue(true),
    sendWelcomeEmail: jest.fn().mockResolvedValue(true),
  },
  logger: {
    error: jest.fn(),
  },
}));

// Mock the User model
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
};

jest.mock('../src/models/user.model', () => mockUserModel);

// Mock bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

// Mock moment
jest.mock('moment', () => {
  const mockMoment = (date: any) => ({
    add: jest.fn(() => mockMoment(date)),
    toDate: jest.fn(() => new Date('2024-01-01')),
  });
  return mockMoment;
});

// Mock the randomString utility
jest.mock('../src/utils/util', () => ({
  randomString: jest.fn(() => 'mock-token'),
}));

describe('User Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User Creation', () => {
    const mockUserData = createMockUser();

    it('should create user successfully with OTP generation', async () => {
      // Mock model methods
      mockUserModel.isEmailTaken.mockResolvedValue(false);
      mockUserModel.isUserNameTaken.mockResolvedValue(false);
      mockUserModel.isPhoneNumberTaken.mockResolvedValue(false);
      mockUserModel.create.mockResolvedValue(mockUserData);

      const result = await userService.createUser(mockUserData);

      expect(result).toEqual(mockUserData);
      expect(mockUserModel.isEmailTaken).toHaveBeenCalledWith(mockUserData.email);
      expect(mockUserModel.isUserNameTaken).toHaveBeenCalledWith(mockUserData.userName);
      expect(mockUserModel.isPhoneNumberTaken).toHaveBeenCalledWith(mockUserData.phoneNumber);
      expect(mockUserModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          otpCode: expect.any(String),
          otpExpires: expect.any(Date),
          isPhoneVerified: false,
          emailVerificationToken: 'mock-token',
          emailVerificationExpires: expect.any(Date),
          isEmailVerified: false,
        })
      );
    });

    it('should fail when email is already taken', async () => {
      mockUserModel.isEmailTaken.mockResolvedValue(true);

      await expect(userService.createUser(mockUserData)).rejects.toThrow('Email already taken');
      expect(mockUserModel.isEmailTaken).toHaveBeenCalledWith(mockUserData.email);
    });

    it('should fail when username is already taken', async () => {
      mockUserModel.isEmailTaken.mockResolvedValue(false);
      mockUserModel.isUserNameTaken.mockResolvedValue(true);

      await expect(userService.createUser(mockUserData)).rejects.toThrow('Username already taken');
      expect(mockUserModel.isUserNameTaken).toHaveBeenCalledWith(mockUserData.userName);
    });

    it('should fail when phone number is already taken', async () => {
      mockUserModel.isEmailTaken.mockResolvedValue(false);
      mockUserModel.isUserNameTaken.mockResolvedValue(false);
      mockUserModel.isPhoneNumberTaken.mockResolvedValue(true);

      await expect(userService.createUser(mockUserData)).rejects.toThrow('Phone number already taken');
      expect(mockUserModel.isPhoneNumberTaken).toHaveBeenCalledWith(mockUserData.phoneNumber);
    });
  });

  describe('OAuth User Creation', () => {
    const mockOAuthData = createMockOAuthData('google');

    it('should create OAuth user successfully', async () => {
      mockUserModel.findByOAuthId.mockResolvedValue(null);
      mockUserModel.findOne.mockResolvedValue(null);
      mockUserModel.create.mockResolvedValue(mockOAuthData);

      const result = await userService.createOAuthUser(mockOAuthData);

      expect(result).toEqual(mockOAuthData);
      expect(mockUserModel.findByOAuthId).toHaveBeenCalledWith('google', mockOAuthData.oauthId);
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: mockOAuthData.email });
      expect(mockUserModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          oauthProvider: 'google',
          oauthId: mockOAuthData.oauthId,
          oauthAccessToken: mockOAuthData.accessToken,
          oauthRefreshToken: mockOAuthData.refreshToken,
          isEmailVerified: true,
          isPhoneVerified: false,
        })
      );
    });

    it('should link existing user to OAuth', async () => {
      const existingUser = createMockUser();
      mockUserModel.findByOAuthId.mockResolvedValue(null);
      mockUserModel.findOne.mockResolvedValue(existingUser);
      existingUser.save = jest.fn().mockResolvedValue(existingUser);

      const result = await userService.createOAuthUser(mockOAuthData);

      expect(result).toEqual(existingUser);
      expect(existingUser.oauthProvider).toBe('google');
      expect(existingUser.oauthId).toBe(mockOAuthData.oauthId);
      expect(existingUser.isEmailVerified).toBe(true);
      expect(existingUser.save).toHaveBeenCalled();
    });

    it('should update existing OAuth user tokens', async () => {
      const existingOAuthUser = createMockUser();
      existingOAuthUser.oauthProvider = 'google';
      existingOAuthUser.oauthId = mockOAuthData.oauthId;
      existingOAuthUser.save = jest.fn().mockResolvedValue(existingOAuthUser);

      mockUserModel.findByOAuthId.mockResolvedValue(existingOAuthUser);

      const result = await userService.createOAuthUser(mockOAuthData);

      expect(result).toEqual(existingOAuthUser);
      expect(existingOAuthUser.oauthAccessToken).toBe(mockOAuthData.accessToken);
      expect(existingOAuthUser.oauthRefreshToken).toBe(mockOAuthData.refreshToken);
      expect(existingOAuthUser.save).toHaveBeenCalled();
    });
  });

  describe('User Login', () => {
    const mockUser = createMockUser();
    mockUser.password = 'hashed-password';
    mockUser.taxiProfileType = 'customer';

    it('should login user successfully', async () => {
      mockUserModel.findOne.mockResolvedValue(mockUser);
      const bcrypt = require('bcrypt');
      bcrypt.compare.mockResolvedValue(true);

      const loginData = { email: 'test@example.com', password: 'password123' };
      const result = await userService.loginUser(loginData);

      expect(result.message).toBe('Login successful');
      expect(result.data.token).toBe('mock-access-token');
      expect(result.data.refreshToken).toBe('mock-refresh-token');
      expect(result.data.user.email).toBe(mockUser.email);
      expect(result.data.user.userName).toBe(mockUser.userName);
      expect(result.data.user.id).toBe(mockUser.id);
    });

    it('should fail when user not found', async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      const loginData = { email: 'nonexistent@example.com', password: 'password123' };
      await expect(userService.loginUser(loginData)).rejects.toThrow('Email or password Invalid');
    });

    it('should fail when password is incorrect', async () => {
      mockUserModel.findOne.mockResolvedValue(mockUser);
      const bcrypt = require('bcrypt');
      bcrypt.compare.mockResolvedValue(false);

      const loginData = { email: 'test@example.com', password: 'wrongpassword' };
      await expect(userService.loginUser(loginData)).rejects.toThrow('Email or password invalid');
    });
  });

  describe('User Logout', () => {
    it('should logout user successfully', async () => {
      const mockUser = createMockUser();
      mockUser.oauthProvider = 'google';
      mockUser.oauthAccessToken = 'old-token';
      mockUser.oauthRefreshToken = 'old-refresh-token';
      mockUser.save = jest.fn().mockResolvedValue(mockUser);

      mockUserModel.findById.mockResolvedValue(mockUser);

      const result = await userService.logoutUser('user-id');

      expect(result.message).toBe('Logout successful');
      expect(mockUser.oauthAccessToken).toBeUndefined();
      expect(mockUser.oauthRefreshToken).toBeUndefined();
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should logout user without OAuth tokens', async () => {
      const mockUser = createMockUser();
      mockUser.save = jest.fn().mockResolvedValue(mockUser);

      mockUserModel.findById.mockResolvedValue(mockUser);

      const result = await userService.logoutUser('user-id');

      expect(result.message).toBe('Logout successful');
      expect(mockUser.save).not.toHaveBeenCalled();
    });

    it('should fail when user not found', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      await expect(userService.logoutUser('nonexistent-id')).rejects.toThrow('User does not exist');
    });
  });

  describe('OTP Verification', () => {
    const mockUser = createMockUser();
    mockUser.isPhoneVerified = false;
    mockUser.verifyOTP = jest.fn();

    it('should verify OTP successfully', async () => {
      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockUser.verifyOTP.mockResolvedValue(true);

      const otpData = { email: 'test@example.com', otp: '123456' };
      const result = await userService.verifyOTP(otpData);

      expect(result.message).toBe('Phone number verified successfully');
      expect(mockUser.verifyOTP).toHaveBeenCalledWith('123456');
    });

    it('should fail when user not found', async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      const otpData = { email: 'nonexistent@example.com', otp: '123456' };
      await expect(userService.verifyOTP(otpData)).rejects.toThrow('User not found');
    });

    it('should fail when phone already verified', async () => {
      const verifiedUser = { ...mockUser, isPhoneVerified: true };
      mockUserModel.findOne.mockResolvedValue(verifiedUser);

      const otpData = { email: 'test@example.com', otp: '123456' };
      await expect(userService.verifyOTP(otpData)).rejects.toThrow('Phone number already verified');
    });

    it('should fail when OTP is invalid', async () => {
      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockUser.verifyOTP.mockResolvedValue(false);

      const otpData = { email: 'test@example.com', otp: '123456' };
      await expect(userService.verifyOTP(otpData)).rejects.toThrow('Invalid or expired OTP');
    });
  });

  describe('OTP Resend', () => {
    const mockUser = createMockUser();
    mockUser.isPhoneVerified = false;
    mockUser.generateOTP = jest.fn();

    it('should resend OTP successfully', async () => {
      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockUser.generateOTP.mockResolvedValue('new-otp');

      const otpData = { email: 'test@example.com' };
      const result = await userService.resendOTP(otpData);

      expect(result.message).toBe('OTP resent successfully');
      expect(mockUser.generateOTP).toHaveBeenCalled();
    });

    it('should fail when user not found', async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      const otpData = { email: 'nonexistent@example.com' };
      await expect(userService.resendOTP(otpData)).rejects.toThrow('User not found');
    });

    it('should fail when phone already verified', async () => {
      const verifiedUser = { ...mockUser, isPhoneVerified: true };
      mockUserModel.findOne.mockResolvedValue(verifiedUser);

      const otpData = { email: 'test@example.com' };
      await expect(userService.resendOTP(otpData)).rejects.toThrow('Phone number already verified');
    });
  });

  describe('Email Verification', () => {
    it('should verify email successfully', async () => {
      const mockUser = createMockUser();
      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockUserModel.findOneAndUpdate.mockResolvedValue(mockUser);

      const verificationData = { email: 'test@example.com', token: 'verification-token' };
      const result = await userService.verifyEmail(verificationData);

      expect(result.message).toBe('Email verified successfully');
      expect(mockUserModel.findOneAndUpdate).toHaveBeenCalledWith(
        { emailVerificationToken: 'verification-token', emailVerificationExpires: { $gt: expect.any(Date) } },
        { $set: { isEmailVerified: true } },
        { new: true }
      );
    });

    it('should fail when user not found', async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      const verificationData = { email: 'nonexistent@example.com', token: 'verification-token' };
      await expect(userService.verifyEmail(verificationData)).rejects.toThrow('User not found');
    });

    it('should fail when verification fails', async () => {
      mockUserModel.findOne.mockResolvedValue(createMockUser());
      mockUserModel.findOneAndUpdate.mockResolvedValue(null);

      const verificationData = { email: 'test@example.com', token: 'invalid-token' };
      await expect(userService.verifyEmail(verificationData)).rejects.toThrow('Email verification failed');
    });
  });

  describe('User Management', () => {
    it('should get user by ID successfully', async () => {
      const mockUser = createMockUser();
      mockUserModel.findById.mockResolvedValue(mockUser);

      const result = await userService.getUser('user-id');
      expect(result).toEqual(mockUser);
      expect(mockUserModel.findById).toHaveBeenCalledWith('user-id');
    });

    it('should fail to get non-existent user', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      await expect(userService.getUser('nonexistent-id')).rejects.toThrow('User does not exist');
    });

    it('should update user successfully', async () => {
      const mockUser = createMockUser();
      const updateData = { firstName: 'Updated', lastName: 'Name' };
      mockUserModel.findByIdAndUpdate.mockResolvedValue({ ...mockUser, ...updateData });

      const result = await userService.updateUser({ id: 'user-id', ...updateData });

      expect(result.message).toBe('Update successful');
      expect(result.data.firstName).toBe('Updated');
      expect(result.data.lastName).toBe('Name');
    });

    it('should delete user successfully', async () => {
      mockUserModel.findByIdAndDelete.mockResolvedValue({ deletedCount: 1 });

      const result = await userService.deleteUser({ id: 'user-id' });

      expect(result.message).toBe('Delete successful');
      expect(mockUserModel.findByIdAndDelete).toHaveBeenCalledWith('user-id');
    });

    it('should get all users successfully', async () => {
      const mockUsers = [createMockUser(), createMockUser()];
      mockUserModel.find.mockResolvedValue(mockUsers);

      const result = await userService.getAllUsers();
      expect(result).toEqual(mockUsers);
      expect(mockUserModel.find).toHaveBeenCalled();
    });
  });

  describe('Additional Features', () => {
    it('should add credit card successfully', async () => {
      const mockUser = createMockUser();
      mockUser.creditCard = undefined;
      mockUser.save = jest.fn().mockResolvedValue(mockUser);

      mockUserModel.findById.mockResolvedValue(mockUser);

      const cardData = { userId: 'user-id', card: { token: 'card-token' } };
      const result = await userService.addCard(cardData);

      expect(result).toEqual(mockUser);
      expect(mockUser.creditCard).toBe('card-token');
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should rate user successfully', async () => {
      const mockUser = createMockUser();
      mockUser.ratings = [];
      mockUser.save = jest.fn().mockResolvedValue(mockUser);

      mockUserModel.findById.mockResolvedValue(mockUser);

      const ratingData = { userId: 'user-id', rating: 5 };
      const result = await userService.rateUser(ratingData);

      expect(result.message).toBe('user rated');
      expect(mockUser.ratings).toContain(5);
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should create taxi account successfully', async () => {
      const mockUser = createMockUser();
      mockUser.taxiProfile = undefined;
      mockUser.taxiProfileType = 'TaxiCustomer';
      mockUser.save = jest.fn().mockResolvedValue(mockUser);

      mockUserModel.findById.mockResolvedValue(mockUser);

      const taxiData = { 
        accountInfo: { user: 'user-id', _id: 'taxi-profile-id' }, 
        type: 'TaxiDriver' 
      };
      const result = await userService.createTaxiAccount(taxiData);

      expect(result.message).toBe('taxi account created');
      expect(mockUser.taxiProfile).toBe('taxi-profile-id');
      expect(mockUser.taxiProfileType).toBe('TaxiDriver');
      expect(mockUser.save).toHaveBeenCalled();
    });
  });
});
