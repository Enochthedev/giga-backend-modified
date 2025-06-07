import { Request, Response, NextFunction } from 'express';
import { verifyToken } from './auth';

export interface AuthedRequest extends Request {
  userData?: any;
}

export function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Missing token' });
    req.userData = verifyToken(token);
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Auth Failed' });
  }
}
