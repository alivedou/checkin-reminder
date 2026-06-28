import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { createTask } from '../api/client';
interface Props { open: boolean; onClose: () => void; onRefresh: () => void; }
export function AddTaskModal({ open, onClose, onRefresh }: Props) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [intervalDays, setIntervalDays] = useState(14);
  const [remindDays, setRemindDays] = useState(3);
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const inputStyle = { background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' };
  if (!open) return null;
  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (!name.trim()) return; setLoading(true); try { await createTask({ name: name.trim(), url: url.trim(), interval_days: intervalDays, remind_days_before: remindDays, category: category.trim(), notes: notes.trim() }); onRefresh(); onClose(); setName(''); setUrl(''); setCategory(''); setNotes(''); } catch { alert('创建失败'); } finally { setLoading(false); } };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose} style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>➕ 添加任务</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10" style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div><label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>任务名称 *</label><input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="如：CloudFlare VPS" className="w-full px-3 py-2 rounded-lg border text-sm outline-none" style={inputStyle} /></div>
          <div><label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>签到地址</label><input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 rounded-lg border text-sm outline-none" style={inputStyle} /></div>
          <div><label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>分类</label><input type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="如：VPS、邮箱、云盘..." className="w-full px-3 py-2 rounded-lg border text-sm outline-none" style={inputStyle} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>签到间隔（天）</label><input type="number" min={1} max={365} value={intervalDays} onChange={e => setIntervalDays(+e.target.value)} className="w-full px-3 py-2 rounded-lg border text-sm outline-none" style={inputStyle} /></div>
            <div><label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>提前提醒（天）</label><input type="number" min={0} max={365} value={remindDays} onChange={e => setRemindDays(+e.target.value)} className="w-full px-3 py-2 rounded-lg border text-sm outline-none" style={inputStyle} /></div>
          </div>
          <div><label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>备注</label><textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="可选备注..." rows={2} className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none" style={inputStyle} /></div>
          <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2" style={{ background: 'var(--accent-blue)', color: '#fff' }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} 添加任务
          </button>
        </form>
      </div>
    </div>
  );
}
