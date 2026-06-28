import { useState } from 'react';
import { Calendar, ExternalLink, Clock, Bell, BellOff, Trash2, Check, Loader2, Copy, RotateCcw, Pencil, History } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { Task, checkinTask, deleteTask, getShareUrl } from '../api/client';
interface TaskCardProps { task: Task; onRefresh: () => void; onEdit: (t: Task) => void; onHistory: (t: Task) => void; }
export function TaskCard({ task, onRefresh, onEdit, onHistory }: TaskCardProps) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const handleCheckin = async () => { setLoading(true); try { await checkinTask(task.id); onRefresh(); } catch { alert('签到失败'); } finally { setLoading(false); } };
  const handleDelete = async () => { if (!confirm(`确定删除「${task.name}」？`)) return; await deleteTask(task.id); onRefresh(); };
  const handleShare = async () => { try { const { shareUrl } = await getShareUrl(task.id); await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { alert('获取分享链接失败'); } };
  const borderColor = task.days_until !== null && task.days_until < 0 ? 'var(--accent-red)' : 'var(--border)';
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
          <Calendar className="w-4 h-4" />
          <div><div className="text-xs">签到间隔</div><div className="font-medium" style={{ color: 'var(--text-primary)' }}>{task.interval_days} 天</div></div>
        </div>
        <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
          <Clock className="w-4 h-4" />
          <div><div className="text-xs">上次签到</div><div className="font-medium" style={{ color: 'var(--text-primary)' }}>{task.last_checkin ? `${new Date(task.last_checkin).toLocaleDateString('zh-CN')} (${task.days_since ?? '-'}天前)` : '从未签到'}</div></div>
        </div>
      </div>
      {task.remind_enabled ? (
        <div className="flex items-center gap-1.5 text-xs mb-4" style={{ color: 'var(--accent-purple)' }}><Bell className="w-3 h-3" /> 提前 {task.remind_days_before} 天提醒</div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs mb-4" style={{ color: 'var(--text-muted)' }}><BellOff className="w-3 h-3" /> 未启用提醒</div>
      )}
      {task.notes && <div className="text-xs mb-4 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>📝 {task.notes}</div>}
      <div className="flex flex-wrap gap-2">
        <button onClick={handleCheckin} disabled={loading} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--accent-blue)', color: '#fff' }}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />} 立即签到
        </button>
        <button onClick={() => onEdit(task)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
          <Pencil className="w-3.5 h-3.5" /> 编辑
        </button>
        <button onClick={() => onHistory(task)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
          <History className="w-3.5 h-3.5" /> 历史
        </button>
        <button onClick={handleShare} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? '已复制' : '快速分享'}
        </button>
        <button onClick={handleDelete} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-500/20" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>
          <Trash2 className="w-3.5 h-3.5" /> 删除
        </button>
      </div>
    </div>
  );
}
