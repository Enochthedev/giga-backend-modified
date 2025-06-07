import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync';
import userService from '../services/user.service';
import emailService from "../services/email.service"

class UserController {
  createUser = catchAsync(async (req: Request, res: Response) => {
    const user = await userService.createUser(req.body);
    await emailService.sendVerifyAccountEmail(user.email, user.emailVerificationToken);
    res.status(httpStatus.CREATED).send({ message: 'User Created', data: user, status: true });
  });

  loginUser = catchAsync(async (req: Request, res: Response) => {
    const data = await userService.loginUser(req.body);
    res.status(httpStatus.CREATED).send({ message: data.message, data: data.data, status: true });
  });

  verifyEmail = catchAsync(async (req: Request, res: Response) => {
    const resp = await userService.verifyEmail(req.body);
    res.status(httpStatus.CREATED).send({ ...resp, status: true });
  });

  // updatePassword = catchAsync(async (req: Request, res: Response) => {
  //   const resp = await userService.updatePassword(req.body);
  //   res.status(httpStatus.CREATED).send({ ...resp, status: true });
  // });

  // forgotPassword = catchAsync(async (req: Request, res: Response) => {
  //   const resp = await userService.forgotPassword(req.body);
  //   res.status(httpStatus.CREATED).send({ ...resp, status: true });
  // });

  // updateProfile = catchAsync(async (req: Request, res: Response) => {
  //   const resp = await userService.updateProfile(req.body);
  //   res.status(httpStatus.CREATED).send({ ...resp, status: true });
  // });

  getUser = catchAsync(async (req: Request, res: Response) => {
    const resp = await userService.getUser(req.params.id);
    res.status(httpStatus.OK).send({ ...resp, status: true });
  });

  addCard = catchAsync(async (req: Request, res: Response) => {
    const resp = await userService.addCard({ userId: req.params.id, card: req.body });
    res.status(httpStatus.CREATED).send({ ...resp, status: true });
  });

  rateUser = catchAsync(async (req: Request, res: Response) => {
    const resp = await userService.rateUser({ userId: req.params.id, rating: req.body.rating });
    res.status(httpStatus.CREATED).send({ ...resp, status: true });
  });

  createTaxiAccount = catchAsync(async (req: Request, res: Response) => {
    const resp = await userService.createTaxiAccount({ accountInfo: { ...req.body, user: req.params.id }, type: req.body.type });
    res.status(httpStatus.CREATED).send({ ...resp, status: true });
  });
}

export default new UserController();