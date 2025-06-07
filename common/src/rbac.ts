import { Request, Response, NextFunction } from 'express';

export type Role = 'admin' | 'driver' | 'vendor' | 'customer';

export function checkRole(roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).userData as { role?: Role };
    if (user && roles.includes(user.role as Role)) {
      return next();
    }
    return res.status(403).json({ message: 'Forbidden' });
  };
}
