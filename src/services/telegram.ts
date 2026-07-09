import TelegramBot from 'node-telegram-bot-api';
import { config } from '../config.js';
import { getAllTasks, getTasksDueWithin, getTaskById, createTask, updateTask, deleteTask, deleteAllTasks } from '../db/queries.js';
import { doCheckin } from '../routes/checkin.js';

let bot: TelegramBot | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempt = 0;

type InlineButton = { text: string; url?: string; callback_data?: string };

// 对话状态：用于 /add 交互式创建
const convState = new Map<number, { step: string; data: Record<string, any> }>();

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

  // ============= 命令 =============
  b.onText(/\/start/, (msg) => sendMainMenu(msg.chat.id));
  b.onText(/\/list/, (msg) => sendTaskList(msg.chat.id));
  b.onText(/\/status/, (msg) => sendStatus(msg.chat.id));
  b.onText(/\/check/, (msg) => sendCheckMenu(msg.chat.id));
  b.onText(/\/due/, (msg) => sendDueTasks(msg.chat.id, 30));
  b.onText(/\/due7/, (msg) => sendDueTasks(msg.chat.id, 7));
  b.onText(/\/add/, (msg) => startAddTask(msg.chat.id));
  b.onText(/\/del/, (msg) => sendDeleteMenu(msg.chat.id));
  b.onText(/\/delall/, (msg) => sendDeleteAllConfirm(msg.chat.id));
  b.onText(/\/edit/, (msg) => sendEditMenu(msg.chat.id));

  // /add 对话流程 - 接收文本输入
  b.on('message', (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;
    const state = convState.get(msg.chat.id);
    if (!state) return;
    handleAddStep(msg.chat.id, msg.text);
  });

  // ============= 回调 =============
  b.on('callback_query', (query: any) => {
    const data = query.data as string;
    const chatId = query.message?.chat.id;
    if (!data || !chatId) return;

    b.answerCallbackQuery(query.id);

    if (data === 'menu:list') return sendTaskList(chatId);
    if (data === 'menu:status') return sendStatus(chatId);
    if (data === 'menu:check') return sendCheckMenu(chatId);
    if (data === 'menu:due') return sendDueTasks(chatId, 30);
    if (data === 'menu:due7') return sendDueTasks(chatId, 7);
    if (data === 'menu:add') return startAddTask(chatId);
    if (data === 'menu:edit') return sendEditMenu(chatId);
    if (data === 'menu:del') return sendDeleteMenu(chatId);
    if (data === 'menu:home') return sendMainMenu(chatId);
    if (data === 'cancel:add') { convState.delete(chatId); return sendMainMenu(chatId); }

    if (data.startsWith('check:')) return handleCheckin(chatId, data.slice(6), query.message!.message_id!);
    if (data.startsWith('del:')) return handleDelete(chatId, data.slice(4), query.message!.message_id!);
    if (data.startsWith('del_confirm:')) return handleDeleteConfirm(chatId, data.slice(12), query.message!.message_id!);
    if (data === 'delall_confirm') return handleDeleteAll(chatId, query.message!.message_id!);
    if (data.startsWith('edit:')) return handleEditTask(chatId, data.slice(5), query.message!.message_id!);
    if (data.startsWith('edit_field:')) return handleEditField(chatId, data.slice(11), query.message!.message_id!);
  });
}

// ============= UI 函数 =============

function sendMainMenu(chatId: number) {
  bot!.sendMessage(chatId, '签到提醒 Bot\n\n📋 /list - 全部任务\n⏰ /due  - 即将到期\n⏰ /due7 - 7天内到期\n✅ /check - 快速签到\n📊 /status - 全部状态\n➕ /add  - 添加任务\n✏️ /edit - 编辑任务\n🗑️ /del  - 删除任务\n💥 /delall - 删除全部', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📋 任务列表', callback_data: 'menu:list' }, { text: '⏰ 即将到期', callback_data: 'menu:due' }] as InlineButton[],
        [{ text: '⏰ 7天内', callback_data: 'menu:due7' }, { text: '📊 全部状态', callback_data: 'menu:status' }] as InlineButton[],
        [{ text: '✅ 快速签到', callback_data: 'menu:check' }, { text: '➕ 添加任务', callback_data: 'menu:add' }] as InlineButton[],
        [{ text: '✏️ 编辑', callback_data: 'menu:edit' }, { text: '🗑️ 删除', callback_data: 'menu:del' }] as InlineButton[],
      ]
    }
  });
}

function sendTaskList(chatId: number) {
  const tasks = getAllTasks();
  if (!tasks.length) return bot!.sendMessage(chatId, '📭 暂无任务，/add 添加', { reply_markup: homeBtn() });

  const lines = tasks.map((t: any) => `${getStatusEmoji(t)} **${escapeMd(t.name)}** — ${getDaysText(t)}`);
  bot!.sendMessage(chatId, `📋 **任务列表** (${tasks.length}个)\n\n${lines.join('\n')}`, { parse_mode: 'Markdown', reply_markup: homeBtn() });
}

function sendStatus(chatId: number) {
  const tasks = getAllTasks();
  if (!tasks.length) return bot!.sendMessage(chatId, '📭 暂无任务', { reply_markup: homeBtn() });

  const over = tasks.filter((t: any) => t.status === 'overdue');
  const warn = tasks.filter((t: any) => t.status === 'warning');
  const ok = tasks.filter((t: any) => t.status === 'normal' || t.status === 'pending');

  let text = '📊 **全部状态**\n\n';
  if (over.length) { text += `🔴 已过期 ${over.length}个\n`; over.forEach((t: any) => text += `• ${escapeMd(t.name)} — 过期${Math.abs(t.days_until)}天\n`); text += '\n'; }
  if (warn.length) { text += `🟡 即将到期 ${warn.length}个\n`; warn.forEach((t: any) => text += `• ${escapeMd(t.name)} — ${t.days_until === 0 ? '今天' : t.days_until + '天后'}\n`); text += '\n'; }
  if (ok.length) { text += `🟢 正常 ${ok.length}个\n`; ok.forEach((t: any) => text += `• ${escapeMd(t.name)} — ${t.days_until === null ? '未签到' : t.days_until + '天后'}\n`); }

  bot!.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: homeBtn() });
}

function sendCheckMenu(chatId: number) {
  const tasks = getAllTasks();
  if (!tasks.length) return bot!.sendMessage(chatId, '📭 暂无任务', { reply_markup: homeBtn() });

  const buttons: InlineButton[][] = tasks.map((t: any) => [{ text: `${getStatusEmoji(t)} ${t.name}`, callback_data: `check:${t.id}` }]);
  buttons.push([{ text: '🏠 主菜单', callback_data: 'menu:home' }]);
  bot!.sendMessage(chatId, '✅ 点击签到：', { reply_markup: { inline_keyboard: buttons } });
}

function sendDueTasks(chatId: number, days: number = 30) {
  const tasks = getTasksDueWithin(days);
  if (!tasks.length) return bot!.sendMessage(chatId, `✅ ${days}天内无限期任务`, { reply_markup: homeBtn() });

  let text = `⏰ **${days}天内到期** (${tasks.length}个)\n\n`;
  tasks.forEach((t: any) => {
    text += `${getStatusEmoji(t)} **${escapeMd(t.name)}** — ${getDaysText(t)}\n   下次：${formatDate(t.next_checkin)}\n\n`;
  });
  bot!.sendMessage(chatId, text, { parse_mode: 'Markdown', reply_markup: homeBtn() });
}

function homeBtn() { return { inline_keyboard: [[{ text: '🏠 主菜单', callback_data: 'menu:home' } as InlineButton]] }; }

// ============= 回调处理器 =============

function handleCheckin(chatId: number, taskId: string, msgId: number) {
  const result = doCheckin(taskId, 'telegram');
  if (result.ok) {
    bot!.editMessageText(`✅ **${escapeMd(result.taskName ?? '')}** 已签到\n下次：${formatDate(result.nextCheckin ?? null)}`, { chat_id: chatId, message_id: msgId, parse_mode: 'Markdown', reply_markup: homeBtn() });
  } else {
    bot!.answerCallbackQuery(msgId.toString(), { text: '❌ 签到失败', show_alert: true } as any);
  }
}

// ---- 删除 ----

function sendDeleteMenu(chatId: number) {
  const tasks = getAllTasks();
  if (!tasks.length) return bot!.sendMessage(chatId, '📭 暂无任务', { reply_markup: homeBtn() });

  const buttons: InlineButton[][] = tasks.map((t: any) => [{ text: `🗑️ ${t.name}`, callback_data: `del:${t.id}` }]);
  buttons.push([{ text: '💥 删除全部', callback_data: 'delall_confirm' }]);
  buttons.push([{ text: '🏠 主菜单', callback_data: 'menu:home' }]);

  bot!.sendMessage(chatId, `🗑️ **删除任务**\n\n点击任务删除（含确认）：`, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
}

function handleDelete(chatId: number, taskId: string, msgId: number) {
  const task = getTaskById(taskId);
  if (!task) return bot!.answerCallbackQuery(msgId.toString(), { text: '任务不存在', show_alert: true } as any);

  bot!.editMessageText(`⚠️ 确认删除 **"${escapeMd(task.name)}"**？`, {
    chat_id: chatId, message_id: msgId, parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[
      { text: '✅ 确认删除', callback_data: `del_confirm:${taskId}` },
      { text: '❌ 取消', callback_data: 'menu:del' },
    ] as InlineButton[]] }
  });
}

function handleDeleteConfirm(chatId: number, taskId: string, msgId: number) {
  const task = getTaskById(taskId);
  const ok = deleteTask(taskId);
  bot!.editMessageText(ok ? `✅ 已删除"${escapeMd(task.name ?? '')}"` : '❌ 删除失败', { chat_id: chatId, message_id: msgId, reply_markup: homeBtn() });
}

function sendDeleteAllConfirm(chatId: number) {
  const tasks = getAllTasks();
  if (!tasks.length) return bot!.sendMessage(chatId, '📭 暂无任务');

  bot!.sendMessage(chatId, `⚠️ 确认删除**全部 ${tasks.length} 个任务**？此操作不可撤消。`, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [[
      { text: '💥 我确定全部删除', callback_data: 'delall_confirm' },
      { text: '❌ 取消', callback_data: 'menu:home' },
    ] as InlineButton[]] }
  });
}

function handleDeleteAll(chatId: number, msgId: number) {
  const n = deleteAllTasks();
  bot!.editMessageText(`✅ 已删除全部 ${n} 个任务`, { chat_id: chatId, message_id: msgId, reply_markup: homeBtn() });
}

// ---- 添加（对话式）----

function startAddTask(chatId: number) {
  convState.set(chatId, { step: 'name', data: {} });
  bot!.sendMessage(chatId, '➕ **添加任务**\n\n请输入任务名称（或发送 /cancel 取消）：', { parse_mode: 'Markdown' });
}

function handleAddStep(chatId: number, text: string) {
  const state = convState.get(chatId);
  if (!state) return;

  if (text.toLowerCase() === '/cancel') { convState.delete(chatId); return bot!.sendMessage(chatId, '❌ 已取消'); }

  switch (state.step) {
    case 'name':
      state.data.name = text;
      state.step = 'interval';
      bot!.sendMessage(chatId, `任务名：**${escapeMd(text)}**\n\n循环间隔天数？（默认14天）`, { parse_mode: 'Markdown' });
      break;
    case 'interval':
      const interval = parseInt(text) || 14;
      state.data.interval_days = interval;
      state.step = 'url';
      bot!.sendMessage(chatId, `间隔：${interval}天\n\n签到网址？（可选，直接回车跳过）`, { parse_mode: 'Markdown' });
      break;
    case 'url':
      state.data.url = text;
      state.step = 'remind';
      bot!.sendMessage(chatId, `提前几天提醒？（默认3天）`, { parse_mode: 'Markdown' });
      break;
    case 'remind':
      const remind = parseInt(text) || 3;
      state.data.remind_days_before = remind;
      state.step = 'next_checkin';
      bot!.sendMessage(chatId, `提前：${remind}天\n\n下次签到日期？（格式：月/日，如 7/15，留空自动算）`, { parse_mode: 'Markdown' });
      break;
    case 'next_checkin':
      if (text.trim()) {
        const parts = text.split(/[\/\-]/);
        const month = parseInt(parts[0]);
        const day = parseInt(parts[1]);
        if (month && day && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          const now = new Date();
          const target = new Date(now.getFullYear(), month - 1, day);
          if (target < now) target.setFullYear(target.getFullYear() + 1);
          state.data.next_checkin = target.toISOString();
        }
      }
      state.step = 'confirm';
      const urlInfo2 = state.data.url ? `\n网址：${state.data.url}` : '';
      const nextInfo = state.data.next_checkin ? `\n下次签到：${new Date(state.data.next_checkin).toLocaleDateString('zh-CN')}` : '';
      bot!.sendMessage(chatId, `📋 **确认创建**\n\n名称：${escapeMd(state.data.name)}\n间隔：${state.data.interval_days}天\n提前提醒：${state.data.remind_days_before}天${nextInfo}${urlInfo2}\n\n回复"确认"创建，其他取消`, { parse_mode: 'Markdown' });
      break;
    case 'confirm':
      if (text === '确认') {
        const task = createTask(state.data as { name: string; interval_days?: number; remind_days_before?: number; url?: string; next_checkin?: string });
        const urlInfo3 = task!.url ? `\n🔗 ${task!.url}` : '';
        bot!.sendMessage(chatId, `✅ 已创建"${escapeMd(task!.name)}"\n间隔${task!.interval_days}天 | 提前${task!.remind_days_before}天提醒\n下次：${formatDate(task!.next_checkin)}${urlInfo3}`, { reply_markup: homeBtn() });
      } else {
        bot!.sendMessage(chatId, '❌ 已取消');
      }
      convState.delete(chatId);
      break;
  }
}

// ---- 编辑 ----

function sendEditMenu(chatId: number) {
  const tasks = getAllTasks();
  if (!tasks.length) return bot!.sendMessage(chatId, '📭 暂无任务', { reply_markup: homeBtn() });

  const buttons: InlineButton[][] = tasks.map((t: any) => [{ text: `✏️ ${t.name}`, callback_data: `edit:${t.id}` }]);
  buttons.push([{ text: '🏠 主菜单', callback_data: 'menu:home' }]);

  bot!.sendMessage(chatId, `✏️ **编辑任务**\n\n暂仅支持改名称、间隔、提醒天数。选择任务：`, { parse_mode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
}

function handleEditTask(chatId: number, taskId: string, msgId: number) {
  const task = getTaskById(taskId);
  if (!task) return bot!.answerCallbackQuery(msgId.toString(), { text: '任务不存在', show_alert: true } as any);

  const next_interval = task.interval_days === 14 ? 7 : task.interval_days === 7 ? 30 : 14;
  const next_remind = task.remind_days_before === 3 ? 5 : task.remind_days_before === 5 ? 1 : 3;

  bot!.editMessageText(`✏️ **${escapeMd(task.name)}**\n\n当前：间隔${task.interval_days}天 | 提前${task.remind_days_before}天提醒`, {
    chat_id: chatId, message_id: msgId, parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: [
      [{ text: `间隔 → ${next_interval}天`, callback_data: `edit_field:${taskId}:interval:${next_interval}` }],
      [{ text: `提醒 → ${next_remind}天`, callback_data: `edit_field:${taskId}:remind:${next_remind}` }],
      [{ text: '🏠 主菜单', callback_data: 'menu:home' }],
    ] as InlineButton[][] }
  });
}

function handleEditField(chatId: number, rest: string, msgId: number) {
  const parts = rest.split(':');
  const taskId = parts[0];
  const field = parts[1];
  const value = parseInt(parts[2]);

  const updated = updateTask(taskId, field === 'interval' ? { interval_days: value } : { remind_days_before: value });
  if (!updated) return bot!.answerCallbackQuery(msgId.toString(), { text: '编辑失败', show_alert: true } as any);

  bot!.editMessageText(`✅ **${escapeMd(updated.name)}** 已更新\n间隔${updated.interval_days}天 | 提前${updated.remind_days_before}天提醒`, {
    chat_id: chatId, message_id: msgId, parse_mode: 'Markdown', reply_markup: homeBtn()
  });
}

// ============= 公共导出 =============

export async function sendTelegram(message: string): Promise<boolean> {
  if (!bot || !config.tgChatId) return false;
  try { await bot.sendMessage(config.tgChatId, message, { parse_mode: 'Markdown' }); return true; }
  catch (err: any) { console.error('❌ TG send failed:', err.message); return false; }
}

export async function sendTestMessage() { return sendTelegram('🔔 **签到提醒测试**\n连接正常 ✅'); }
