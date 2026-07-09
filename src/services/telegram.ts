import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config.js';
import { getAllTasks } from '../db/queries.js';
import { doCheckin } from '../routes/checkin.js';

let bot: TelegramBot | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempt = 0;

type InlineButton = { text: string; url?: string; callback_data?: string };

function getShareUrl(taskId: string, shareToken: string): string {
  const base = config.baseUrl || `http://localhost:${config.port}`;
  return `${base}/api/share/${taskId}/page?token=${shareToken}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '未知';
  return new Date(dateStr).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

function getStatusEmoji(task: any): string {
  if (task.days_until === null) return '⚪';
  if (task.days_until < 0) return '🔴';
  if (task.days_until <= task.remind_days_before) return '🟡';
  return '🟢';
}

function getDaysText(task: any): string {
  if (task.days_until === null) return '未签到';
  if (task.days_until < 0) return `过期${Math.abs(task.days_until)}天`;
  if (task.days_until === 0) return '今天到期';
  return `还剩${task.days_until}天`;
}

export function escapeMd(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

function scheduleReconnect(reason: string) {
  if (reconnectTimer) return;
  const isConflict = reason.includes('409') || reason.toLowerCase().includes('conflict');
  const delay = isConflict
    ? 15000
    : Math.min(60000, 5000 * Math.pow(2, Math.min(reconnectAttempt, 3)));
  console.error(`⚠️ TG polling 异常: ${reason}`);
  console.error(`🔄 ${delay / 1000}s 后自动重连 (attempt ${reconnectAttempt + 1})`);
  try { bot?.stopPolling(); } catch { /* ignore */ }
  bot = null;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    reconnectAttempt += 1;
    startBot();
  }, delay);
}

function startBot() {
  if (!config.tgBotToken) return;
  try {
    try { bot?.stopPolling(); } catch { /* ignore */ }
    bot = new TelegramBot(config.tgBotToken, { polling: true });
    wireHandlers(bot);
    reconnectAttempt = 0;
    console.log('✅ Telegram bot started');
  } catch (err: any) {
    console.error('❌ Telegram bot init failed:', err.message);
    scheduleReconnect(err.message || 'init failed');
  }
}

export function initBot() {
  if (!config.tgBotToken) { console.log('⚠️ TG_BOT_TOKEN not set, Telegram disabled'); return; }
  startBot();
}

function wireHandlers(b: TelegramBot) {
  b.on('polling_error', (err: any) => {
    scheduleReconnect(err?.message || String(err));
  });

  b.onText(/\/start/, (msg: TelegramBot.Message) => {
    b.sendMessage(msg.chat.id, '👋 **签到提醒 Bot**\n\n选择功能：', {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📋 任务列表', callback_data: 'menu:list' }, { text: '⏰ 即将到期', callback_data: 'menu:due' }] as InlineButton[],
          [{ text: '✅ 快速签到', callback_data: 'menu:check' }, { text: '📊 全部状态', callback_data: 'menu:status' }] as InlineButton[],
        ]
      }
    });
  });

  b.onText(/\/list/, (msg: TelegramBot.Message) => sendTaskList(msg.chat.id));
  b.onText(/\/status/, (msg: TelegramBot.Message) => sendStatus(msg.chat.id));
  b.onText(/\/check/, (msg: TelegramBot.Message) => sendCheckMenu(msg.chat.id));
  b.onText(/\/due/, (msg: TelegramBot.Message) => sendDueTasks(msg.chat.id));

  b.on('callback_query', (query: any) => {
    const data = query.data as string;
    const chatId = query.message?.chat.id;
    if (!data || !chatId) return;

    b.answerCallbackQuery(query.id);

    if (data === 'menu:list') return sendTaskList(chatId);
    if (data === 'menu:status') return sendStatus(chatId);
    if (data === 'menu:check') return sendCheckMenu(chatId);
    if (data === 'menu:due') return sendDueTasks(chatId);
    if (data === 'menu:home') return sendMainMenu(chatId);

    if (data.startsWith('check:')) {
      const taskId = data.slice(6);
      const result = doCheckin(taskId, 'telegram');
      if (result.ok) {
          b.editMessageText(`✅ **${escapeMd(result.taskName ?? '')}** 已签到\n下次到期：${formatDate(result.nextCheckin ?? null)}`, {
          chat_id: chatId,
          message_id: query.message!.message_id!,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[{ text: '🔙 返回', callback_data: 'menu:check' }] as InlineButton[]] }
        });
      } else {
        b.answerCallbackQuery(query.id, { text: '❌ 签到失败', show_alert: true });
      }
    }
  });
}

function sendMainMenu(chatId: number) {
  bot!.sendMessage(chatId, '👋 **签到提醒 Bot**\n\n选择功能：', {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '📋 任务列表', callback_data: 'menu:list' }, { text: '⏰ 即将到期', callback_data: 'menu:due' }] as InlineButton[],
        [{ text: '✅ 快速签到', callback_data: 'menu:check' }, { text: '📊 全部状态', callback_data: 'menu:status' }] as InlineButton[],
      ]
    }
  });
}

function sendTaskList(chatId: number) {
  const tasks = getAllTasks();
  if (!tasks.length) return bot!.sendMessage(chatId, '📭 暂无任务', {
    reply_markup: { inline_keyboard: [[{ text: '🏠 主菜单', callback_data: 'menu:home' } as InlineButton]] }
  });

  const lines = tasks.map((t: any) => {
    const emoji = getStatusEmoji(t);
    const days = getDaysText(t);
    return `${emoji} **${escapeMd(t.name)}** — ${days}`;
  });

  const buttons: InlineButton[][] = tasks.map((t: any) => {
    const emoji = getStatusEmoji(t);
    const days = getDaysText(t);
    if (t.share_token) {
      return [{ text: `${emoji} ${t.name} (${days})`, url: getShareUrl(t.id, t.share_token) }];
    }
    return [{ text: `${emoji} ${t.name} (${days}) — 无链接`, callback_data: 'menu:home' }];
  });

  buttons.push([{ text: '🏠 主菜单', callback_data: 'menu:home' }]);

  bot!.sendMessage(chatId, `📋 **任务列表** (${tasks.length}个)\n\n${lines.join('\n')}`, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: buttons }
  });
}

function sendStatus(chatId: number) {
  const tasks = getAllTasks();
  if (!tasks.length) return bot!.sendMessage(chatId, '📭 暂无任务', {
    reply_markup: { inline_keyboard: [[{ text: '🏠 主菜单', callback_data: 'menu:home' } as InlineButton]] }
  });

  const over = tasks.filter((t: any) => t.status === 'overdue');
  const warn = tasks.filter((t: any) => t.status === 'warning');
  const ok = tasks.filter((t: any) => t.status === 'normal' || t.status === 'pending');

  let text = '📊 **全部状态**\n\n';
  const buttons: InlineButton[][] = [];

  if (over.length) {
    text += '🔴 **已过期：**\n';
    over.forEach((t: any) => {
      const days = Math.abs(t.days_until);
      text += `• ${escapeMd(t.name)} — 过期${days}天 | 下次：${formatDate(t.next_checkin)}\n`;
      if (t.share_token) buttons.push([{ text: `🔴 签到 ${t.name}`, url: getShareUrl(t.id, t.share_token) }]);
    });
    text += '\n';
  }

  if (warn.length) {
    text += '🟡 **即将到期：**\n';
    warn.forEach((t: any) => {
      const days = t.days_until === 0 ? '今天' : `${t.days_until}天后`;
      text += `• ${escapeMd(t.name)} — ${days}到期 | 下次：${formatDate(t.next_checkin)}\n`;
      if (t.share_token) buttons.push([{ text: `🟡 签到 ${t.name}`, url: getShareUrl(t.id, t.share_token) }]);
    });
    text += '\n';
  }

  if (ok.length) {
    text += '🟢 **状态正常：**\n';
    ok.forEach((t: any) => {
      const days = t.days_until === null ? '未签到' : `${t.days_until}天后`;
      text += `• ${escapeMd(t.name)} — ${days}到期\n`;
    });
  }

  buttons.push([{ text: '🏠 主菜单', callback_data: 'menu:home' }]);

  bot!.sendMessage(chatId, text, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: buttons }
  });
}

function sendCheckMenu(chatId: number) {
  const tasks = getAllTasks();
  if (!tasks.length) return bot!.sendMessage(chatId, '📭 暂无任务', {
    reply_markup: { inline_keyboard: [[{ text: '🏠 主菜单', callback_data: 'menu:home' } as InlineButton]] }
  });

  const buttons: InlineButton[][] = tasks.map((t: any) => {
    const emoji = getStatusEmoji(t);
    return [{ text: `${emoji} 签到: ${t.name}`, callback_data: `check:${t.id}` }];
  });
  buttons.push([{ text: '🏠 主菜单', callback_data: 'menu:home' }]);

  bot!.sendMessage(chatId, '✅ **快速签到**\n\n点击下方按钮直接签到：', {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: buttons }
  });
}

function sendDueTasks(chatId: number) {
  const tasks = getAllTasks();
  const dueTasks = tasks.filter((t: any) => t.status === 'overdue' || t.status === 'warning');

  if (!dueTasks.length) return bot!.sendMessage(chatId, '✅ 全部正常，暂无到期任务', {
    reply_markup: { inline_keyboard: [[{ text: '🏠 主菜单', callback_data: 'menu:home' } as InlineButton]] }
  });

  let text = '⏰ **需要关注的任务：**\n\n';
  const buttons: InlineButton[][] = [];

  dueTasks.forEach((t: any) => {
    const emoji = getStatusEmoji(t);
    const days = getDaysText(t);
    text += `${emoji} **${escapeMd(t.name)}** — ${days}\n`;
    text += `   下次签到：${formatDate(t.next_checkin)}\n\n`;
    if (t.share_token) buttons.push([{ text: `${emoji} 签到 ${t.name}`, url: getShareUrl(t.id, t.share_token) }]);
  });

  buttons.push([{ text: '🏠 主菜单', callback_data: 'menu:home' }]);

  bot!.sendMessage(chatId, text, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: buttons }
  });
}

export async function sendTelegram(message: string): Promise<boolean> {
  if (!bot || !config.tgChatId) return false;
  try { await bot.sendMessage(config.tgChatId, message, { parse_mode: 'Markdown' }); return true; }
  catch (err: any) { console.error('❌ TG send failed:', err.message); return false; }
}

export async function sendTestMessage() { return sendTelegram('🔔 **签到提醒测试**\n连接正常 ✅'); }
