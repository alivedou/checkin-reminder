import { Router, Request, Response } from 'express';
import db from '../db/connection.js';

const router = Router();

router.post('/:id', (req: Request, res: Response) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id) as any;
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const now = new Date().toISOString();
  const next = new Date(Date.now() + task.interval_days * 86400000).toISOString();
  db.prepare('UPDATE tasks SET last_checkin = ?, next_checkin = ?, updated_at = ? WHERE id = ?').run(now, next, now, req.params.id);
  db.prepare('INSERT INTO checkin_logs (task_id, checked_at, source) VALUES (?, ?, ?)').run(req.params.id, now, req.body.source || 'manual');
  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json({ ok: true, task: updated, message: `✅ ${task.name} 已签到，下次：${new Date(next).toLocaleDateString('zh-CN')}` });
});

router.get('/:id/logs', (req: Request, res: Response) => {
  const logs = db.prepare('SELECT * FROM checkin_logs WHERE task_id = ? ORDER BY checked_at DESC LIMIT 50').all(req.params.id);
  res.json(logs);
});

export default router;
