import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync';
import userService from '../services/user.service';
import { mailer } from 'common';

class UserController {
  createUser = catchAsync(async (req: Request, res: Response) => {
    const user = await userService.createUser(req.body);
    
    // Send welcome email
    try {
      await mailer.sendWelcomeEmail(user.email, user.userName);
    } catch (error) {
      // Don't fail user creation if email fails
      console.error('Failed to send welcome email:', error);
    }
    
    res.status(httpStatus.CREATED).send({ 
      message: 'User Created Successfully. Please check your email for OTP verification.', 
      data: { 
        id: user.id,
        email: user.email,
        userName: user.userName,
        requiresOTPVerification: true
      }, 
      status: true 
    });
  });

  loginUser = catchAsync(async (req: Request, res: Response) => {
    const data = await userService.loginUser(req.body);
    res.status(httpStatus.CREATED).send({ message: data.message, data: data.data, status: true });
  });

  logoutUser = catchAsync(async (req: Request, res: Response) => {
    const userId = (req as any).userData?.id;
    if (!userId) {
      return res.status(httpStatus.UNAUTHORIZED).send({ message: 'User not authenticated', status: false });
    }
    
    const data = await userService.logoutUser(userId);
    res.status(httpStatus.OK).send({ message: data.message, status: true });
  });

  verifyOTP = catchAsync(async (req: Request, res: Response) => {
    const resp = await userService.verifyOTP(req.body);
    res.status(httpStatus.OK).send({ message: resp.message, status: true });
  });

  resendOTP = catchAsync(async (req: Request, res: Response) => {
    const resp = await userService.resendOTP(req.body);
    res.status(httpStatus.OK).send({ message: resp.message, status: true });
  });

  verifyEmail = catchAsync(async (req: Request, res: Response) => {
    const resp = await userService.verifyEmail(req.body);
    res.status(httpStatus.OK).send({ message: resp.message, status: true });
  });

  updateProfile = catchAsync(async (req: Request, res: Response) => {
    const userId = (req as any).userData?.id;
    if (!userId) {
      return res.status(httpStatus.UNAUTHORIZED).send({ message: 'User not authenticated', status: false });
    }
    
    const resp = await userService.updateUser({ id: userId, ...req.body });
    res.status(httpStatus.OK).send({ message: resp.message, data: resp.data, status: true });
  });

  getUser = catchAsync(async (req: Request, res: Response) => {
    const resp = await userService.getUser(req.params.id);
    res.status(httpStatus.OK).send({ data: resp, status: true });
  });

  addCard = catchAsync(async (req: Request, res: Response) => {
    const resp = await userService.addCard({ userId: req.params.id, card: req.body });
    res.status(httpStatus.CREATED).send({ message: 'Card added successfully', data: resp, status: true });
  });

  rateUser = catchAsync(async (req: Request, res: Response) => {
    const resp = await userService.rateUser({ userId: req.params.id, rating: req.body.rating });
    res.status(httpStatus.CREATED).send({ message: resp.message, status: true });
  });

  createTaxiAccount = catchAsync(async (req: Request, res: Response) => {
    const resp = await userService.createTaxiAccount({ accountInfo: { ...req.body, user: req.params.id }, type: req.body.type });
    res.status(httpStatus.CREATED).send({ message: resp.message, status: true });
  });
}

export default new UserController();