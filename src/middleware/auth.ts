import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth.js';
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '') || (req.query.token as string);
  if (token && verifyToken(token)) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}
