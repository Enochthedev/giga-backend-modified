import jwt from 'jsonwebtoken';

export interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

const secretEnv = process.env.JWT_SECRET;
if (!secretEnv) {
  throw new Error('JWT_SECRET not set');
}
const secret: string = secretEnv;

const refreshSecretEnv = process.env.REFRESH_SECRET;
if (!refreshSecretEnv) {
  throw new Error('REFRESH_SECRET not set');
}
const refreshSecret: string = refreshSecretEnv;

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
