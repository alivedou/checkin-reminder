import { Router } from 'express';
import db from '../db/connection.js';

const router = Router();

function getTaskStatus(task: any): string {
  if (!task.next_checkin) return 'pending';
  const diff = Math.ceil((new Date(task.next_checkin).getTime() - Date.now()) / 86400000);
  if (diff < 0) return 'overdue';
  if (diff <= task.remind_days_before) return 'warning';
  return 'normal';
}

// Public endpoint - returns sanitized task data (no URL, no notes, no share_token)
router.get('/', (_req, res) => {
  const tasks = db.prepare('SELECT id, name, interval_days, last_checkin, next_checkin, remind_days_before, remind_enabled, category, created_at FROM tasks ORDER BY next_checkin ASC').all();
  const now = Date.now();
  const enriched = tasks.map((task: any) => {
    const days_until = task.next_checkin ? Math.ceil((new Date(task.next_checkin).getTime() - now) / 86400000) : null;
    const days_since = task.last_checkin ? Math.floor((now - new Date(task.last_checkin).getTime()) / 86400000) : null;
    return {
      id: task.id,
      name: task.name,
      interval_days: task.interval_days,
      last_checkin: task.last_checkin,
      next_checkin: task.next_checkin,
      remind_days_before: task.remind_days_before,
      remind_enabled: task.remind_enabled,
      category: task.category,
      status: getTaskStatus(task),
      days_until,
      days_since,
    };
  });
  res.json(enriched);
});

export default router;
