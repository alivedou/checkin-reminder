import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import db from '../db/connection.js';

export function ensureAdminHash(): void {
  const existing = db.prepare("SELECT value FROM settings WHERE key='admin_password_hash'").get() as any;
  if (!existing) {
    const hash = bcrypt.hashSync(config.adminPassword, 12);
    db.prepare("INSERT OR REPLACE INTO settings (key,value) VALUES ('admin_password_hash',?)").run(hash);
    console.log('✅ Admin password hashed');
  }
}
export function verifyPassword(pw: string): boolean {
  const row = db.prepare("SELECT value FROM settings WHERE key='admin_password_hash'").get() as any;
  if (!row) return false;
  return bcrypt.compareSync(pw, row.value);
}
export function signToken(payload: object): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });
}
export function verifyToken(token: string): boolean {
  try { jwt.verify(token, config.jwtSecret); return true; } catch { return false; }
}
