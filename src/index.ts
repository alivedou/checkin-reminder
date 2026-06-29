import express from 'express';
import cors from 'cors';
import compression from 'compression';
import cron from 'node-cron';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { migrate } from './db/migrate.js';
import { ensureAdminHash } from './utils/auth.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/error.js';
import authRouter from './routes/auth.js';
import tasksRouter from './routes/tasks.js';
import checkinRouter from './routes/checkin.js';
import shareRouter from './routes/share.js';
import publicTasksRouter from './routes/publicTasks.js';
import { processReminders } from './services/reminder.js';
import { initBot } from './services/telegram.js';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(compression());
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

const apiLimiter = rateLimit({ windowMs: 5*60*1000, max: 100, standardHeaders: true, legacyHeaders: false });
app.use('/api', apiLimiter);

app.get('/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use('/api/auth', authRouter);
app.use('/api/share', shareRouter);
app.use('/api/public/tasks', publicTasksRouter);
app.use('/api/tasks', authMiddleware, tasksRouter);
app.use('/api/checkin', authMiddleware, checkinRouter);

app.post('/api/test-tg', authMiddleware, async (_req, res) => {
  const { sendTestMessage } = await import('./services/telegram.js');
  const ok = await sendTestMessage();
  res.json({ ok, message: ok ? '✅ 测试消息已发送' : '❌ 发送失败' });
});

const webDist = path.join(__dirname, '../web/dist');
app.use(express.static(webDist));
app.get('*', (req, res, next) => { if (req.path.startsWith('/api/')) return next(); res.sendFile(path.join(webDist, 'index.html')); });
app.use(errorHandler);

migrate();
ensureAdminHash();
initBot();

cron.schedule('0 9,14,20 * * *', () => processReminders().catch(console.error));

app.listen(config.port, () => {
  console.log(`\n🚀 签到提醒系统已启动\n📡 Port: ${config.port}\n📱 TG: ${config.tgBotToken ? '已配置' : '未配置'}\n`);
});

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
