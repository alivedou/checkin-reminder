import db from './connection.js';
import { v4 as uuidv4 } from 'uuid';

export function getAllTasks() {
  const tasks = db.prepare('SELECT * FROM tasks ORDER BY next_checkin ASC').all() as any[];
  const now = Date.now();
  return tasks.map(t => {
    const days_until = t.next_checkin ? Math.ceil((new Date(t.next_checkin).getTime() - now) / 86400000) : null;
    const status = days_until === null ? 'pending' : days_until < 0 ? 'overdue' : days_until <= t.remind_days_before ? 'warning' : 'normal';
    return { ...t, days_until, status };
  });
}

export function getTasksDueWithin(days: number) {
  const tasks = getAllTasks();
  const now = Date.now();
  return tasks.filter((t: any) => {
    if (!t.next_checkin || t.days_until === null) return false;
    return t.days_until >= 0 && t.days_until <= days;
  });
}

export function getTaskById(id: string) {
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;
}

export function createTask(data: { name: string; interval_days?: number; remind_days_before?: number; url?: string; next_checkin?: string }) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const interval = data.interval_days || 14;
  const remind = data.remind_days_before || 3;
  const next = data.next_checkin
    ? new Date(data.next_checkin).toISOString()
    : new Date(Date.now() + interval * 86400000).toISOString();
  db.prepare('INSERT INTO tasks (id,name,url,interval_days,remind_days_before,next_checkin,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, data.name, data.url || '', interval, remind, next, now, now);
  return getTaskById(id);
}

export function updateTask(id: string, data: { interval_days?: number; remind_days_before?: number }): any {
  const task = getTaskById(id);
  if (!task) return null;
  const now = new Date().toISOString();
  db.prepare('UPDATE tasks SET interval_days=?, remind_days_before=?, updated_at=? WHERE id=?')
    .run(data.interval_days ?? task.interval_days, data.remind_days_before ?? task.remind_days_before, now, id);
  return getTaskById(id);
}

export function deleteTask(id: string): boolean {
  const r = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return (r as any).changes > 0;
}

export function deleteAllTasks(): number {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM tasks').get() as any;
  db.prepare('DELETE FROM tasks').run();
  db.prepare('DELETE FROM checkin_logs').run();
  return count?.cnt || 0;
}
