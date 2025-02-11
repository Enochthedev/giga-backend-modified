import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import httpStatus from 'http-status';
import ApiError from '../utils/ApiError';

interface CustomRequest extends Request {
  userData?: any;
}

const authMiddleware = (
  req: CustomRequest,
  _: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Missing token');
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "test") as { [key: string]: any };
    req.userData = decoded;
    next();
  } catch (error:any) {
    if (error.message === 'jwt expired') {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Jwt expired');
    }
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Auth Failed');
  }
};

export default authMiddleware;