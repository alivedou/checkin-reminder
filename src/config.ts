import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config();
export const config = {
  port: parseInt(process.env.PORT || '3000'),
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
  jwtSecret: process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex'),
  tgBotToken: process.env.TG_BOT_TOKEN || '',
  tgChatId: process.env.TG_CHAT_ID || '',
  dbPath: process.env.DB_PATH || './data/tasks.db',
  tz: process.env.TZ || 'Asia/Shanghai',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  baseUrl: process.env.BASE_URL || '',
};
