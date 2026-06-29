import { useState } from 'react';
import { ExternalLink, Clock, Bell, BellOff, Trash2, Check, Loader2, Copy, RotateCcw, Pencil, History, CalendarClock } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { useLang } from '../i18n/LanguageContext';
import { Task, checkinTask, deleteTask, getShareUrl } from '../api/client';

interface TaskCardProps { task: Task; onRefresh: () => void; onEdit: (t: Task) => void; onHistory: (t: Task) => void; }

export function TaskCard({ task, onRefresh, onEdit, onHistory }: TaskCardProps) {
  const { t } = useLang();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const handleCheckin = async () => { setLoading(true); try { await checkinTask(task.id); onRefresh(); } catch { alert(t('task.checkinFailed')); } finally { setLoading(false); } };
  const handleDelete = async () => { if (!confirm(t('task.deleteConfirm', { name: task.name }))) return; await deleteTask(task.id); onRefresh(); };
  const handleShare = async () => { try { const { shareUrl } = await getShareUrl(task.id); await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { alert(t('task.shareFailed')); } };
  const borderColor = task.days_until !== null && task.days_until < 0 ? 'var(--accent-red)' : task.days_until !== null && task.days_until <= task.remind_days_before ? 'var(--accent-yellow)' : 'var(--border)';
  const nextDate = task.next_checkin ? new Date(task.next_checkin).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }) : t('task.unknown');
  const lastDateStr = task.last_checkin
    ? `${new Date(task.last_checkin).toLocaleDateString('zh-CN')} (${t('task.daysAgo', { n: task.days_since ?? '-' })})`
    : t('task.neverCheckin');

  return (
    <div className="rounded-xl border p-5 transition-all hover:shadow-lg" style={{ background: 'var(--bg-card)', borderColor }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{task.name}</h3>
          {task.url && <a href={task.url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs mt-1 hover:underline" style={{ color: 'var(--accent-blue)' }}><ExternalLink className="w-3 h-3" /> {task.url}</a>}
          {task.category && <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>{task.category}</span>}
        </div>
        <StatusBadge daysUntil={task.days_until} remindDaysBefore={task.remind_days_before} />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
          <CalendarClock className="w-4 h-4" />
          <div><div className="text-xs">{t('task.nextCheckin')}</div><div className="font-medium" style={{ color: task.days_until !== null && task.days_until <= task.remind_days_before ? 'var(--accent-yellow)' : 'var(--text-primary)' }}>{nextDate}</div></div>
        </div>
        <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
          <Clock className="w-4 h-4" />
          <div><div className="text-xs">{t('task.lastCheckin')}</div><div className="font-medium" style={{ color: 'var(--text-primary)' }}>{lastDateStr}</div></div>
        </div>
      </div>
      <div className="flex items-center gap-3 mb-4 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span>{t('task.interval')}: {task.interval_days} {t('task.intervalUnit')}</span>
        {task.remind_enabled ? (
          <span className="inline-flex items-center gap-1" style={{ color: 'var(--accent-purple)' }}><Bell className="w-3 h-3" /> {t('task.remindBefore')} {task.remind_days_before} {t('task.remindBeforeUnit')}</span>
        ) : (
          <span className="inline-flex items-center gap-1"><BellOff className="w-3 h-3" /> {t('task.remindDisabled')}</span>
        )}
      </div>
      {task.notes && <div className="text-xs mb-4 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>📝 {task.notes}</div>}
      <div className="flex flex-wrap gap-2">
        <button onClick={handleCheckin} disabled={loading} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--accent-blue)', color: '#fff' }}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />} {t('task.checkin')}
        </button>
        <button onClick={() => onEdit(task)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
          <Pencil className="w-3.5 h-3.5" /> {t('common.edit')}
        </button>
        <button onClick={() => onHistory(task)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
          <History className="w-3.5 h-3.5" /> {t('task.history')}
        </button>
        <button onClick={handleShare} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? t('task.copied') : t('task.quickShare')}
        </button>
        <button onClick={handleDelete} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-500/20" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>
          <Trash2 className="w-3.5 h-3.5" /> {t('common.delete')}
        </button>
      </div>
    </div>
  );
}
