import UserModel from '../models/user.model';
import httpStatus from 'http-status';
import bcrypt from 'bcrypt';
import { signAccessToken, signRefreshToken } from 'common';
import { mailer } from 'common';
import ApiError from '../utils/ApiError';
import moment from 'moment';
import { randomString } from '../utils/util';

const getUserByEmail = async (email: any) => {
    const user = await UserModel.findOne({ email });
    return user;
};

const getUser = async (id: any) => {
    const user = await UserModel.findById(id);

    if (!user) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'User does not exist');
    }

    return user;
};

const createUser = async (userBody: any) => {
    // Check if email is already taken
    if (await UserModel.isEmailTaken(userBody.email)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
    }

    // Check if username is already taken
    if (await UserModel.isUserNameTaken(userBody.userName)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Username already taken');
    }

    // Check if phone number is already taken
    if (await UserModel.isPhoneNumberTaken(userBody.phoneNumber)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Phone number already taken');
    }

    // Generate OTP for phone verification
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = moment().add(10, 'minutes');

    // Generate email verification token
    const emailToken = randomString(6);
    const emailExpires = moment().add(7, 'days');

    const data = {
      ...userBody,
      otpCode: otp,
      otpExpires: otpExpires.toDate(),
      isPhoneVerified: false,
      emailVerificationToken: emailToken,
      emailVerificationExpires: emailExpires.toDate(),
      isEmailVerified: false,
    };

    const response = await UserModel.create(data);
    
    // Send OTP email
    try {
        await mailer.sendOTPEmail({
            to: userBody.email,
            otp: otp,
            userName: userBody.userName,
            type: 'phone'
        });
    } catch (error) {
        logger.error('Failed to send OTP email:', error);
        // Don't fail user creation if email fails
    }
    
    return response;
};

const createOAuthUser = async (oauthData: any) => {
    const { provider, oauthId, email, firstName, lastName, accessToken, refreshToken } = oauthData;
    
    // Check if user already exists with this OAuth ID
    let user = await UserModel.findByOAuthId(provider, oauthId);
    
    if (user) {
        // Update OAuth tokens
        user.oauthAccessToken = accessToken;
        user.oauthRefreshToken = refreshToken;
        await user.save();
        return user;
    }
    
    // Check if user exists with this email
    if (email) {
        user = await UserModel.findOne({ email });
        
        if (user) {
            // Link existing user to OAuth
            user.oauthProvider = provider;
            user.oauthId = oauthId;
            user.oauthAccessToken = accessToken;
            user.oauthRefreshToken = refreshToken;
            user.isEmailVerified = true;
            await user.save();
            return user;
        }
    }
    
    // Create new OAuth user with default values
    const emailToken = randomString(6);
    const expires = moment().add(7, 'days');
    
    const newUser = await UserModel.create({
        firstName: firstName || `${provider}User`,
        lastName: lastName || 'User',
        userName: `${provider}_${oauthId}`,
        email: email || `${provider}_${oauthId}@${provider}.com`,
        country: 'Not specified',
        address: 'Not specified',
        street: 'Not specified',
        city: 'Not specified',
        zipCode: '00000',
        gender: 'prefer-not-to-say',
        weight: 70,
        maritalStatus: 'prefer-not-to-say',
        ageGroup: '25-34',
        areaOfInterest: 'General',
        phoneNumber: '0000000000',
        oauthProvider: provider,
        oauthId: oauthId,
        oauthAccessToken: accessToken,
        oauthRefreshToken: refreshToken,
        isEmailVerified: true,
        isPhoneVerified: false,
        emailVerificationToken: emailToken,
        emailVerificationExpires: expires.toDate(),
    });
    
    return newUser;
};

const loginUser = async (data: any) => {
    const { email } = data;
  
    const user = await getUserByEmail(email);
  
    if (!user) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Email or password Invalid');
    }
  
    const compare = await bcrypt.compare(data.password, user.password);
  
    if (compare === false) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Email or password invalid');
    }
  
    const payload = { id: user.id, email: user.email, role: user.taxiProfileType };
    const token = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
  
    return {
      message: 'Login successful',
      data: {
        token,
        refreshToken,
        user: {
          email: user.email,
          userName: user.userName,
          id: user.id,
        },
      },
    };
};

const logoutUser = async (userId: string) => {
    const user = await getUser(userId);
    
    if (!user) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'User does not exist');
    }
    
    // Clear OAuth tokens if they exist
    if (user.oauthProvider) {
        user.oauthAccessToken = undefined;
        user.oauthRefreshToken = undefined;
        await user.save();
    }
    
    return { message: 'Logout successful' };
};

const verifyOTP = async (data: any) => {
    const { email, otp } = data;
    const user = await getUserByEmail(email);

    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }

    if (user.isPhoneVerified) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Phone number already verified');
    }

    const isValidOTP = await user.verifyOTP(otp);
    
    if (!isValidOTP) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid or expired OTP');
    }

    return { message: 'Phone number verified successfully' };
};

const resendOTP = async (data: any) => {
    const { email } = data;
    const user = await getUserByEmail(email);

    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }

    if (user.isPhoneVerified) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Phone number already verified');
    }

    const otp = await user.generateOTP();
    
    // Send new OTP email
    try {
        await mailer.sendOTPEmail({
            to: user.email,
            otp: otp,
            userName: user.userName,
            type: 'phone'
        });
    } catch (error) {
        logger.error('Failed to send OTP email:', error);
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to send OTP');
    }

    return { message: 'OTP resent successfully' };
};

const verifyEmail = async (data: any) => {
  const { email, token } = data;
  const user = await getUserByEmail(email);

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const updateEmailStatus = await UserModel.findOneAndUpdate(
    { emailVerificationToken: token, emailVerificationExpires: { $gt: new Date() } },
    { $set: { isEmailVerified: true } },
    { new: true },
  );

  if (!updateEmailStatus) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email verification failed');
  }

  return { message: 'Email verified successfully' };
};

const updateUser = async (data: any) => {
  const { id, ...updateData } = data;

  const updatedUser = await UserModel.findByIdAndUpdate(
    id,
    updateData,
    { new: true }
  );

  if (!updatedUser) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Update failed');
  }

  return { message: 'Update successful', data: updatedUser };
};

const deleteUser = async (data: any) => {
  const { id } = data;

  const deleteStatus = await UserModel.findByIdAndDelete(id);

  if (!deleteStatus) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Delete failed');
  }

  return { message: 'Delete successful' };
};

const getAllUsers = async () => {
  const users = await UserModel.find();
  return users;
};

const addCard = async (data: any) => {
  const user = await UserModel.findById(data.userId);

  if (!user) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User does not exist');
  }
  
  // Associate the credit card with the user
  user.creditCard = data.card.token;

  // Save the changes to the user document
  await user.save();
  return user;
};

const rateUser = async (data: any) => {
  const user = await UserModel.findById(data.userId);

  if (!user) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User does not exist');
  }
  
  user.ratings.push(data.rating);
  await user.save();
  return { message: "user rated" };
};

const createTaxiAccount = async (data: any) => {
    const user = await UserModel.findById(data.accountInfo.user);

    if (!user) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'User does not exist');
    }
    
    user.taxiProfile = data.accountInfo._id;
    user.taxiProfileType = data.type;
    await user.save();
    return { message: "taxi account created" };
};

export default {
    createUser,
    createOAuthUser,
    getUser,
    loginUser,
    logoutUser,
    verifyOTP,
    resendOTP,
    verifyEmail,
    updateUser,
    deleteUser,
    getAllUsers,
    addCard,
    rateUser,
    createTaxiAccount,
  };

