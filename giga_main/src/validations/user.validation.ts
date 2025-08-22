import Joi from 'joi';
import { password, objectId } from './custom.validation';

const createUser = {
  body: Joi.object().keys({
    // Core Information
    userName: Joi.string().required().min(3).max(30),
    email: Joi.string().required().email(),
    password: Joi.string().required().custom(password),
    phoneNumber: Joi.string().required().pattern(/^\+?[\d\s\-\(\)]+$/),
    
    // Personal Information
    firstName: Joi.string().required().min(2).max(50),
    lastName: Joi.string().optional().min(2).max(50),
    otherNames: Joi.string().optional().min(2).max(50),
    gender: Joi.string().required().valid('male', 'female', 'other', 'prefer-not-to-say'),
    weight: Joi.number().required().min(20).max(500),
    maritalStatus: Joi.string().required().valid('single', 'married', 'divorced', 'widowed', 'prefer-not-to-say'),
    ageGroup: Joi.string().required().valid('18-24', '25-34', '35-44', '45-54', '55-64', '65+'),
    areaOfInterest: Joi.string().required().min(3).max(100),
    
    // Address Information
    country: Joi.string().required().min(2).max(100),
    address: Joi.string().required().min(5).max(200),
    street: Joi.string().required().min(3).max(100),
    city: Joi.string().required().min(2).max(100),
    zipCode: Joi.string().required().min(3).max(20),
    
    // Optional Fields
    profilePicture: Joi.string().optional().uri(),
  }),
};

const loginUser = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    password: Joi.string().required(),
  }),
};

const verifyOTP = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    otp: Joi.string().required().length(6).pattern(/^\d{6}$/),
  }),
};

const resendOTP = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
  }),
};

const loginSubAdmin = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    password: Joi.string().required(),
    twoFactorCode: Joi.string().required(),
  }),
};

const forgotPassword = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
  }),
};

const resetPassword = {
  body: Joi.object().keys({
    password: Joi.string().required().custom(password),
    token: Joi.string().required(),
    email: Joi.string().email().required(),
  }),
};

const updatePassword = {
  body: Joi.object().keys({
    oldPassword: Joi.string().required(),
    newPassword: Joi.string().required(),
  }),
};

const createSubAdmin = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    password: Joi.string().required().custom(password),
    userName: Joi.string().required(),
    phoneNumber: Joi.string().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string(),
    otherNames: Joi.string(),
  }),
};

const updateProfile = {
  body: Joi.object().keys({
    firstName: Joi.string().optional().min(2).max(50),
    lastName: Joi.string().optional().min(2).max(50),
    otherNames: Joi.string().optional().min(2).max(50),
    gender: Joi.string().optional().valid('male', 'female', 'other', 'prefer-not-to-say'),
    weight: Joi.number().optional().min(20).max(500),
    maritalStatus: Joi.string().optional().valid('single', 'married', 'divorced', 'widowed', 'prefer-not-to-say'),
    ageGroup: Joi.string().optional().valid('18-24', '25-34', '35-44', '45-54', '55-64', '65+'),
    areaOfInterest: Joi.string().optional().min(3).max(100),
    country: Joi.string().optional().min(2).max(100),
    address: Joi.string().optional().min(5).max(200),
    street: Joi.string().optional().min(3).max(100),
    city: Joi.string().optional().min(2).max(100),
    zipCode: Joi.string().optional().min(3).max(20),
    profilePicture: Joi.string().optional().uri(),
  }),
};

export default {
  loginUser,
  createUser,
  verifyOTP,
  resendOTP,
  resetPassword,
  forgotPassword,
  updatePassword,
  createSubAdmin,
  loginSubAdmin,
  updateProfile,
};
