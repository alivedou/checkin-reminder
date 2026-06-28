import { getAllTasks } from '../db/queries.js';
import { sendTelegram } from './telegram.js';

export async function processReminders() {
  const tasks = getAllTasks();
  const now = Date.now();
  for (const task of tasks) {
    if (!task.remind_enabled || !task.next_checkin) continue;
    const diff = Math.ceil((new Date(task.next_checkin).getTime() - now) / 86400000);
    if (diff < 0) {
      const days = Math.abs(diff);
      await sendTelegram(`🔴 **${task.name}** 已过期 ${days} 天！\n请立即签到。`);
    } else if (diff <= task.remind_days_before) {
      const urgency = diff <= 1 ? '🟠' : '🟡';
      await sendTelegram(`${urgency} **${task.name}** 还剩 ${diff} 天到期\n下次签到：${new Date(task.next_checkin).toLocaleDateString('zh-CN')}`);
    }
  }
}
