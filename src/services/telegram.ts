import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config.js';
import { getAllTasks } from '../db/queries.js';

let bot: TelegramBot | null = null;

export function initBot() {
  if (!config.tgBotToken) { console.log('⚠️ TG_BOT_TOKEN not set, Telegram disabled'); return; }
  try {
    bot = new TelegramBot(config.tgBotToken, { polling: true });
    bot.on('polling_error', (err: any) => {
      if (err.code === 'EFATALERROR' || err.message?.includes('409')) {
        console.error('❌ TG Bot token invalid or conflict, disabling polling');
        bot?.stopPolling();
        bot = null;
      }
    });
    bot.onText(/\/start/, (msg) => bot!.sendMessage(msg.chat.id, '👋 签到提醒 Bot\n/list - 任务列表\n/status - 过期任务'));
    bot.onText(/\/list/, (msg) => {
      const tasks = getAllTasks();
      if (!tasks.length) return bot!.sendMessage(msg.chat.id, '📭 暂无任务');
      bot!.sendMessage(msg.chat.id, tasks.map((t: any, i: number) => {
        const d = t.days_until === null ? '未签到' : t.days_until < 0 ? `过期${Math.abs(t.days_until)}天` : `还剩${t.days_until}天`;
        return `${i+1}. ${t.status==='overdue'?'🔴':t.status==='warning'?'🟡':'🟢'} ${t.name} — ${d}`;
      }).join('\n'));
    });
    bot.onText(/\/status/, (msg) => {
      const tasks = getAllTasks();
      const over = tasks.filter((t: any) => t.status === 'overdue');
      const warn = tasks.filter((t: any) => t.status === 'warning');
      if (!over.length && !warn.length) return bot!.sendMessage(msg.chat.id, '✅ 全部正常');
      let text = '';
      if (over.length) text += '🔴 过期:\n' + over.map((t: any) => `• ${t.name}`).join('\n') + '\n\n';
      if (warn.length) text += '🟡 即将到期:\n' + warn.map((t: any) => `• ${t.name}`).join('\n');
      bot!.sendMessage(msg.chat.id, text);
    });
    console.log('✅ Telegram bot started');
  } catch (err: any) {
    console.error('❌ Telegram bot init failed:', err.message);
  }
}

export async function sendTelegram(message: string): Promise<boolean> {
  if (!bot || !config.tgChatId) return false;
  try { await bot.sendMessage(config.tgChatId, message, { parse_mode: 'Markdown' }); return true; }
  catch (err: any) { console.error('❌ TG send failed:', err.message); return false; }
}

export async function sendTestMessage() { return sendTelegram('🔔 **签到提醒测试**\n连接正常 ✅'); }
