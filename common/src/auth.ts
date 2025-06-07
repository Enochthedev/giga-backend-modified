import jwt from 'jsonwebtoken';

export interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

const secret = process.env.JWT_SECRET || 'secret';
const refreshSecret = process.env.REFRESH_SECRET || 'refreshSecret';

export function signAccessToken(payload: JwtPayload) {
  return jwt.sign(payload, secret, { expiresIn: '15m' });
}

export function signRefreshToken(payload: JwtPayload) {
  return jwt.sign(payload, refreshSecret, { expiresIn: '7d' });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, secret) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, refreshSecret) as JwtPayload;
}
