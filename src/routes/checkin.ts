import { Router, Request, Response } from 'express';
import db from '../db/connection.js';

const router = Router();

export function doCheckin(taskId: string, source: string = 'manual'): { ok: boolean; taskName?: string; nextCheckin?: string; error?: string } {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as any;
  if (!task) return { ok: false, error: 'Task not found' };
  const now = new Date().toISOString();
  const baseTime = task.next_checkin ? new Date(task.next_checkin).getTime() : Date.now();
  const next = new Date(baseTime + task.interval_days * 86400000).toISOString();
  db.prepare('UPDATE tasks SET last_checkin = ?, next_checkin = ?, updated_at = ? WHERE id = ?').run(now, next, now, taskId);
  db.prepare('INSERT INTO checkin_logs (task_id, checked_at, source) VALUES (?, ?, ?)').run(taskId, now, source);
  return { ok: true, taskName: task.name, nextCheckin: next };
}

router.post('/:id', (req: Request, res: Response) => {
  const result = doCheckin(req.params.id, req.body.source || 'manual');
  if (!result.ok) return res.status(404).json({ error: result.error });
  res.json({ ok: true, message: `✅ ${result.taskName} 已签到，下次：${new Date(result.nextCheckin!).toLocaleDateString('zh-CN')}` });
});

router.get('/:id/logs', (req: Request, res: Response) => {
  const logs = db.prepare('SELECT * FROM checkin_logs WHERE task_id = ? ORDER BY checked_at DESC LIMIT 50').all(req.params.id);
  res.json(logs);
});

export default router;
