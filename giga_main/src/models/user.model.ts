import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import validator from 'validator';
import bcrypt from 'bcryptjs';

/* This is defining an interface for the User model in the Mongoose schema. It extends the Document
interface provided by Mongoose and adds additional properties and methods specific to the User
model. These properties include name, userName, email, password, createdAt, and updatedAt. The
methods include isPasswordMatch, isEmailTaken, and isUserNameTaken, which are used to check if a
given password, email, or username is already taken in the database. */
interface IUser extends Document {
  // Profile Information
  profilePicture: string; // Cloudinary URL
  firstName: string;
  lastName: string;
  otherNames: string;
  userName: string;
  email: string;
  
  // Address Information
  country: string;
  address: string;
  street: string;
  city: string;
  zipCode: string;
  
  // Personal Information
  gender: string;
  weight: number;
  maritalStatus: string;
  ageGroup: string;
  areaOfInterest: string;
  
  // Authentication fields
  password?: string; // Optional for OAuth users
  oauthProvider?: string; // 'google', 'apple', or undefined for email/password
  oauthId?: string; // OAuth provider's user ID
  oauthAccessToken?: string; // OAuth access token
  oauthRefreshToken?: string; // OAuth refresh token
  
  // OTP Verification
  otpCode?: string;
  otpExpires?: Date;
  isPhoneVerified: boolean;
  
  // Other fields
  creditCard?: mongoose.Types.ObjectId;
  phoneNumber: string;
  ratings: number[];
  averageRating: number;
  emailVerificationToken: String;
  emailVerificationExpires: Date;
  isEmailVerified: Boolean;
  taxiProfile?: mongoose.Types.ObjectId;
  taxiProfileType: String;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  isPasswordMatch(password: string): Promise<boolean>;
  isEmailTaken(email: string, excludeUserId?: string): Promise<boolean>;
  isUserNameTaken(userName: string, excludeUserId?: string): Promise<boolean>;
  isPhoneNumberTaken(phoneNumber: string, excludeUserId?: string): Promise<boolean>;
  updatePassword(password: string): Promise<void>;
  updateProfile(updateBody: any): Promise<IUser>;
  generateOTP(): Promise<string>;
  verifyOTP(otp: string): Promise<boolean>;
}

/* This interface is extending the Mongoose Model interface for the User model and adding static
methods: `isEmailTaken`, `isUserNameTaken`, and `isPhoneNumberTaken`. These methods are used to check if a
given email, username, or phone number is already taken in the database, and they take an optional
`excludeUserId` parameter to exclude a specific user from the search. The methods return a Promise
that resolves to a boolean value indicating whether the email, username, or phone number is taken or not. */
interface IUserModel extends Model<IUser> {
  isEmailTaken(email: string, excludeUserId?: string): Promise<boolean>;
  isUserNameTaken(userName: string, excludeUserId?: string): Promise<boolean>;
  isPhoneNumberTaken(phoneNumber: string, excludeUserId?: string): Promise<boolean>;
  findByOAuthId(provider: string, oauthId: string): Promise<IUser | null>;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    // Profile Information
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    otherNames: {
      type: String,
      trim: true,
    },
    userName: {
      type: String, 
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: (value: string) => validator.isEmail(value),
        message: 'Invalid email',
      },
    },
    
    // Address Information
    country: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    street: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    zipCode: {
      type: String,
      required: true,
      trim: true,
    },
    
    // Personal Information
    gender: {
      type: String,
      required: true,
      enum: ['male', 'female', 'other', 'prefer-not-to-say'],
    },
    weight: {
      type: Number,
      required: true,
      min: 20,
      max: 500,
    },
    maritalStatus: {
      type: String,
      required: true,
      enum: ['single', 'married', 'divorced', 'widowed', 'prefer-not-to-say'],
    },
    ageGroup: {
      type: String,
      required: true,
      enum: ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'],
    },
    areaOfInterest: {
      type: String,
      required: true,
      trim: true,
    },
    
    // Profile Picture
    profilePicture: {
      type: String,
      default: '',
    },
    
    // Authentication
    password: {
      type: String,
      trim: true,
      minlength: 8,
      // Password is required only for email/password users, not for OAuth users
      required: function() {
        return !this.oauthProvider;
      }
    },
    oauthProvider: {
      type: String,
      enum: ['google', 'apple'],
      required: false,
    },
    oauthId: {
      type: String,
      required: false,
      sparse: true, // Allows multiple null values
    },
    oauthAccessToken: {
      type: String,
      required: false,
    },
    oauthRefreshToken: {
      type: String,
      required: false,
    },
    
    // OTP Verification
    otpCode: {
      type: String,
      required: false,
    },
    otpExpires: {
      type: Date,
      required: false,
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    
    // Email Verification
    emailVerificationToken: {
      type: String,
    },
    emailVerificationExpires: {
      type: Date,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    
    // Phone Number
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      validate: {
        validator: (value: string) => /^\+?[\d\s\-\(\)]+$/.test(value),
        message: 'Invalid phone number format',
      },
    },
    
    // Ratings & Reviews
    ratings: [{ type: Number, default: [] }],
    averageRating: { type: Number, default: 0 },
    
    // Payment Integration
    creditCard: {
      type: String,
      ref: 'CreditCard',
    },
    
    // Taxi Service Integration
    taxiProfile: {
      type: Schema.Types.ObjectId,
      ref: 'taxiProfileType',
      default: null // This will determine the model to reference dynamically
    },
    taxiProfileType: {
      type: String,
      required: true,
      enum: ['TaxiDriver', 'TaxiCustomer'],
      default: 'TaxiCustomer'
    }
  },
  
  {
    timestamps: true,
  }
);

// Compound index for OAuth lookups
userSchema.index({ oauthProvider: 1, oauthId: 1 }, { sparse: true });

// Index for phone number lookups
userSchema.index({ phoneNumber: 1 }, { unique: true });

userSchema.statics.isEmailTaken = async function (email: string, excludeUserId: string): Promise<boolean> {
  email = email.toLowerCase();
  const user = await this.findOne({ email, _id: { $ne: excludeUserId } });
  return !!user;
};

userSchema.statics.isUserNameTaken = async function (userName: string, excludeUserId): Promise<boolean> {
  userName = userName.toLowerCase();
  const user = await this.findOne({ userName, _id: { $ne: excludeUserId } });
  return !!user;
};

userSchema.statics.isPhoneNumberTaken = async function (phoneNumber: string, excludeUserId): Promise<boolean> {
  const user = await this.findOne({ phoneNumber, _id: { $ne: excludeUserId } });
  return !!user;
};

userSchema.statics.findByOAuthId = async function (provider: string, oauthId: string): Promise<IUser | null> {
  return this.findOne({ oauthProvider: provider, oauthId: oauthId });
};

userSchema.methods.isPasswordMatch = async function (password: string): Promise<boolean> {
  const user = this as IUser;
  if (!user.password) return false; // OAuth users don't have passwords
  return bcrypt.compare(password, user.password);
}; 

userSchema.methods.updatePassword = async function (password: string): Promise<void> {
  const user = this as IUser;
  user.password = password;
  await user.save();
};

userSchema.methods.generateOTP = async function (): Promise<string> {
  const user = this as IUser;
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  user.otpCode = otp;
  user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiration
  await user.save();
  return otp;
};

userSchema.methods.verifyOTP = async function (otp: string): Promise<boolean> {
  const user = this as IUser;
  if (!user.otpCode || !user.otpExpires) return false;
  
  if (new Date() > user.otpExpires) {
    // OTP expired
    user.otpCode = undefined;
    user.otpExpires = undefined;
    await user.save();
    return false;
  }
  
  if (user.otpCode === otp) {
    // OTP verified
    user.isPhoneVerified = true;
    user.otpCode = undefined;
    user.otpExpires = undefined;
    await user.save();
    return true;
  }
  
  return false;
};

//still needs to be tested
userSchema.methods.updateProfile = async function (updateBody: any): Promise<IUser> {
  const user = this as IUser;

  // Check if the updateBody object contains any properties that are not allowed to be updated.
  const disallowedProperties = ['_id', 'createdAt', 'updatedAt'];
  for (const property of disallowedProperties) {
    if (property in updateBody) {
      throw new Error(`The property ${property} cannot be updated.`);
    }
  }

  // Update the user object with the properties from the updateBody object.
  Object.keys(updateBody).forEach((key) => {
    user[key] = updateBody[key];
  });

  // Save the user object.
  await user.save();

  // Return the updated user object.
  return user;
};

userSchema.pre('save', async function (next) {
  const user = this as IUser;
  
  // Only hash password if it's modified and exists (for email/password users)
  if (user.isModified('password') && user.password) {
    user.password = await bcrypt.hash(user.password, 8);
  }
  
  // For OAuth users, mark email as verified
  if (user.oauthProvider && !user.isEmailVerified) {
    user.isEmailVerified = true;
  }
  
  if (user.isModified('ratings')) {
    // Calculate the average rating based on the list of ratings
    const totalRatings = user.ratings.length;
    if (totalRatings > 0) {
      const sumOfRatings = user.ratings.reduce((acc, rating) => acc + rating, 0);
      user.averageRating = sumOfRatings / totalRatings;
    } else {
      user.averageRating = 0;
    }
  }
  next();
});

const User: IUserModel = mongoose.model<IUser, IUserModel>('User', userSchema);
export default User;