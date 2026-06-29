import { Router, Request, Response } from 'express';
import db from '../db/connection.js';

const router = Router();

router.get('/admin/export', (_req: Request, res: Response) => {
  const tasks = db.prepare('SELECT * FROM tasks').all();
  const checkin_logs = db.prepare('SELECT * FROM checkin_logs').all();
  const data = { version: 1, exported_at: new Date().toISOString(), tasks, checkin_logs };
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="checkin-export.json"');
  res.json(data);
});

router.post('/admin/import', (req: Request, res: Response) => {
  const { tasks, checkin_logs, version } = req.body;
  if (!Array.isArray(tasks)) {
    return res.status(400).json({ error: 'Invalid format: tasks array required' });
  }

  const mode = (req.query.mode as string) === 'overwrite' ? 'overwrite' : 'merge';

  if (mode === 'overwrite') {
    db.prepare('DELETE FROM checkin_logs').run();
    db.prepare('DELETE FROM tasks').run();
  }

  let importedTasks = 0;
  let importedLogs = 0;
  let skipped = 0;

  const insertTask = db.prepare(
    'INSERT OR IGNORE INTO tasks (id, name, url, interval_days, last_checkin, next_checkin, remind_days_before, remind_enabled, status, notes, category, share_token, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
  );

  for (const task of tasks) {
    if (!task.id || !task.name) continue;
    const result = insertTask.run(
      task.id, task.name, task.url || '', task.interval_days || 14,
      task.last_checkin || null, task.next_checkin || null,
      task.remind_days_before || 3, task.remind_enabled ?? 1,
      task.status || 'active', task.notes || '', task.category || '',
      task.share_token || null, task.created_at || new Date().toISOString(),
      task.updated_at || new Date().toISOString()
    );
    if (result.changes > 0) importedTasks++;
    else skipped++;
  }

  if (Array.isArray(checkin_logs)) {
    const insertLog = db.prepare(
      'INSERT OR IGNORE INTO checkin_logs (id, task_id, checked_at, source) VALUES (?,?,?,?)'
    );
    for (const log of checkin_logs) {
      if (!log.task_id) continue;
      const result = insertLog.run(log.id || null, log.task_id, log.checked_at || new Date().toISOString(), log.source || 'manual');
      if (result.changes > 0) importedLogs++;
    }
  }

  res.json({
    ok: true,
    mode,
    imported: { tasks: importedTasks, logs: importedLogs },
    skipped,
    total: { tasks: importedTasks + skipped, logs: importedLogs },
  });
});

export default router;
