import db from './connection.js';
export function migrate() {
  db.exec(`CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, url TEXT DEFAULT '',
    interval_days INTEGER NOT NULL DEFAULT 14, last_checkin TEXT,
    next_checkin TEXT, remind_days_before INTEGER DEFAULT 3,
    remind_enabled INTEGER DEFAULT 1, status TEXT DEFAULT 'active',
    notes TEXT DEFAULT '', category TEXT DEFAULT '', share_token TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);
  const cols = db.prepare("PRAGMA table_info(tasks)").all() as any[];
  if (!cols.some(c => c.name === 'share_token')) db.exec("ALTER TABLE tasks ADD COLUMN share_token TEXT");
  if (!cols.some(c => c.name === 'category')) db.exec("ALTER TABLE tasks ADD COLUMN category TEXT DEFAULT ''");
  db.exec(`CREATE TABLE IF NOT EXISTS checkin_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, task_id TEXT NOT NULL,
    checked_at TEXT DEFAULT (datetime('now')), source TEXT DEFAULT 'manual',
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY, value TEXT NOT NULL
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS notification_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id TEXT NOT NULL,
    sent_at TEXT DEFAULT (datetime('now')),
    type TEXT DEFAULT 'reminder',
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
  )`);
  console.log('✅ Database migrated');
}