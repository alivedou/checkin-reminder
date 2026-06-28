import db from './connection.js';

export function getAllTasks() {
  const tasks = db.prepare('SELECT * FROM tasks ORDER BY next_checkin ASC').all() as any[];
  const now = Date.now();
  return tasks.map(t => {
    const days_until = t.next_checkin ? Math.ceil((new Date(t.next_checkin).getTime() - now) / 86400000) : null;
    const status = days_until === null ? 'pending' : days_until < 0 ? 'overdue' : days_until <= t.remind_days_before ? 'warning' : 'normal';
    return { ...t, days_until, status };
  });
}
