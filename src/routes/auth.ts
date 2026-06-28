import { Router, Request, Response } from 'express';
import { verifyPassword, signToken } from '../utils/auth.js';
import { config } from '../config.js';
import rateLimit from 'express-rate-limit';

const router = Router();
const loginLimiter = rateLimit({ windowMs: 15*60*1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many login attempts' } });

router.post('/login', loginLimiter, (req: Request, res: Response) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });
  const valid = verifyPassword(password);
  if (!valid) return res.status(401).json({ error: 'Wrong password' });
  const token = signToken({ role: 'admin' });
  res.json({ token });
});

export default router;
