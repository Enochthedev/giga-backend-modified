import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as AppleStrategy } from 'passport-apple';
import UserModel from '../models/user.model';
import { signAccessToken, signRefreshToken } from 'common';
import { randomString } from '../utils/util';
import moment from 'moment';

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/api/v1/auth/google/callback",
  scope: ['profile', 'email']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists with this Google ID
    let user = await UserModel.findByOAuthId('google', profile.id);
    
    if (user) {
      // Update OAuth tokens
      user.oauthAccessToken = accessToken;
      user.oauthRefreshToken = refreshToken;
      await user.save();
      return done(null, user);
    }
    
    // Check if user exists with this email
    user = await UserModel.findOne({ email: profile.emails?.[0]?.value });
    
    if (user) {
      // Link existing user to Google OAuth
      user.oauthProvider = 'google';
      user.oauthId = profile.id;
      user.oauthAccessToken = accessToken;
      user.oauthRefreshToken = refreshToken;
      user.isEmailVerified = true;
      await user.save();
      return done(null, user);
    }
    
    // Create new user
    const emailToken = randomString(6);
    const expires = moment().add(7, 'days');
    
    const newUser = await UserModel.create({
      firstName: profile.name?.givenName || 'Google',
      lastName: profile.name?.familyName || 'User',
      userName: `google_${profile.id}`,
      email: profile.emails?.[0]?.value,
      address: 'Not provided',
      zipCode: '00000',
      phoneNumber: '0000000000',
      oauthProvider: 'google',
      oauthId: profile.id,
      oauthAccessToken: accessToken,
      oauthRefreshToken: refreshToken,
      isEmailVerified: true,
      emailVerificationToken: emailToken,
      emailVerificationExpires: expires,
    });
    
    return done(null, newUser);
  } catch (error) {
    return done(error as Error);
  }
}));

// Apple OAuth Strategy
passport.use(new AppleStrategy({
  clientID: process.env.APPLE_CLIENT_ID!,
  teamID: process.env.APPLE_TEAM_ID!,
  keyID: process.env.APPLE_KEY_ID!,
  privateKeyLocation: process.env.APPLE_PRIVATE_KEY_PATH!,
  callbackURL: process.env.APPLE_CALLBACK_URL || "http://localhost:3000/api/v1/auth/apple/callback",
  passReqToCallback: true
}, async (req, accessToken, refreshToken, idToken, profile, done) => {
  try {
    // Apple profile structure is different
    const appleId = profile.id;
    const email = profile.email;
    
    // Check if user already exists with this Apple ID
    let user = await UserModel.findByOAuthId('apple', appleId);
    
    if (user) {
      // Update OAuth tokens
      user.oauthAccessToken = accessToken;
      user.oauthRefreshToken = refreshToken;
      await user.save();
      return done(null, user);
    }
    
    // Check if user exists with this email
    if (email) {
      user = await UserModel.findOne({ email });
      
      if (user) {
        // Link existing user to Apple OAuth
        user.oauthProvider = 'apple';
        user.oauthId = appleId;
        user.oauthAccessToken = accessToken;
        user.oauthRefreshToken = refreshToken;
        user.isEmailVerified = true;
        await user.save();
        return done(null, user);
      }
    }
    
    // Create new user
    const emailToken = randomString(6);
    const expires = moment().add(7, 'days');
    
    const newUser = await UserModel.create({
      firstName: 'Apple',
      lastName: 'User',
      userName: `apple_${appleId}`,
      email: email || `apple_${appleId}@apple.com`,
      address: 'Not provided',
      zipCode: '00000',
      phoneNumber: '0000000000',
      oauthProvider: 'apple',
      oauthId: appleId,
      oauthAccessToken: accessToken,
      oauthRefreshToken: refreshToken,
      isEmailVerified: true,
      emailVerificationToken: emailToken,
      emailVerificationExpires: expires,
    });
    
    return done(null, newUser);
  } catch (error) {
    return done(error as Error);
  }
}));

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await UserModel.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export default passport;
