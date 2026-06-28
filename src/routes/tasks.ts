import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';

const router = Router();

function getTaskStatus(task: any): string {
  if (!task.next_checkin) return 'pending';
  const diff = Math.ceil((new Date(task.next_checkin).getTime() - Date.now()) / 86400000);
  if (diff < 0) return 'overdue';
  if (diff <= task.remind_days_before) return 'warning';
  return 'normal';
}

function enrich(task: any) {
  const now = Date.now();
  const days_until = task.next_checkin ? Math.ceil((new Date(task.next_checkin).getTime() - now) / 86400000) : null;
  const days_since = task.last_checkin ? Math.floor((now - new Date(task.last_checkin).getTime()) / 86400000) : null;
  return { ...task, status: getTaskStatus(task), days_until, days_since };
}

router.get('/', (_req, res) => {
  const tasks = db.prepare('SELECT * FROM tasks ORDER BY next_checkin ASC').all();
  res.json(tasks.map(enrich));
});

router.post('/', (req, res) => {
  const { name, url, interval_days, remind_days_before, notes, category } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  if (name.length > 100) return res.status(400).json({ error: 'Name too long' });
  const id = uuidv4();
  const now = new Date().toISOString();
  const next = new Date(Date.now() + (interval_days || 14) * 86400000).toISOString();
  db.prepare('INSERT INTO tasks (id,name,url,interval_days,remind_days_before,next_checkin,notes,category,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(id, name, url||'', interval_days||14, remind_days_before||3, next, notes||'', category||'', now, now);
  const task = db.prepare('SELECT * FROM tasks WHERE id=?').get(id);
  res.status(201).json(enrich(task));
});

router.put('/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Not found' });
  const { name, url, interval_days, remind_days_before, remind_enabled, status, notes, category } = req.body;
  const now = new Date().toISOString();
  db.prepare('UPDATE tasks SET name=?,url=?,interval_days=?,remind_days_before=?,remind_enabled=?,status=?,notes=?,category=?,updated_at=? WHERE id=?')
    .run(name??task.name, url??task.url, interval_days??task.interval_days, remind_days_before??task.remind_days_before, remind_enabled??task.remind_enabled, status??task.status, notes??task.notes, category??task.category, now, req.params.id);
  res.json(enrich(db.prepare('SELECT * FROM tasks WHERE id=?').get(req.params.id)));
});

router.delete('/:id', (req, res) => {
  const r = db.prepare('DELETE FROM tasks WHERE id=?').run(req.params.id);
  if (r.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

export default router;
