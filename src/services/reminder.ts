import { getAllTasks } from '../db/queries.js';
import { sendTelegram } from './telegram.js';
import db from '../db/connection.js';

// Send limits
const BEFORE_DAILY_LIMIT = 3;  // 到期前：每天最多3次
const AFTER_DAILY_LIMIT = 1;   // 过期后：每天最多1次
const AFTER_MAX_DAYS = 3;      // 过期后：最多提醒3天

function getTodaySentCount(taskId: string, type: 'upcoming' | 'overdue'): number {
  const row = db.prepare(
    "SELECT COUNT(*) as cnt FROM notification_log WHERE task_id = ? AND type = ? AND date(sent_at) = date('now')"
  ).get(taskId, type) as any;
  return row?.cnt || 0;
}

function getOverdueDaysSent(taskId: string): number {
  const row = db.prepare(
    "SELECT COUNT(DISTINCT date(sent_at)) as days FROM notification_log WHERE task_id = ? AND type = 'overdue'"
  ).get(taskId) as any;
  return row?.days || 0;
}

function logNotification(taskId: string, type: 'upcoming' | 'overdue') {
  db.prepare("INSERT INTO notification_log (task_id, type) VALUES (?, ?)").run(taskId, type);
}

export async function processReminders() {
  const tasks = getAllTasks();
  const now = Date.now();
  let sent = 0;

  for (const task of tasks) {
    if (!task.remind_enabled || !task.next_checkin) continue;

    const diff = Math.ceil((new Date(task.next_checkin).getTime() - now) / 86400000);

    if (diff < 0) {
      // === 已过期：每天1次，最多3天 ===
      const daysOverdue = Math.abs(diff);
      const totalDaysSent = getOverdueDaysSent(task.id);

      if (totalDaysSent >= AFTER_MAX_DAYS) continue; // 已发满3天，不再提醒
      const todaySent = getTodaySentCount(task.id, 'overdue');
      if (todaySent >= AFTER_DAILY_LIMIT) continue; // 今天已发过

      await sendTelegram(
        `🔴 **${task.name}** 已过期 ${daysOverdue} 天！\n请立即签到。`
      );
      logNotification(task.id, 'overdue');
      sent++;

    } else if (diff <= task.remind_days_before) {
      // === 即将到期：每天3次 ===
      const todaySent = getTodaySentCount(task.id, 'upcoming');
      if (todaySent >= BEFORE_DAILY_LIMIT) continue; // 今天已发满3次

      const urgency = diff <= 1 ? '🟠' : '🟡';
      await sendTelegram(
        `${urgency} **${task.name}** 还剩 ${diff} 天到期\n下次签到：${new Date(task.next_checkin).toLocaleDateString('zh-CN')}`
      );
      logNotification(task.id, 'upcoming');
      sent++;
    }
  }

  if (sent > 0) console.log(`📬 Sent ${sent} reminder(s)`);
}
