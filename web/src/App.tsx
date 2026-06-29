import { useState, useRef } from 'react';
import { Plus, RefreshCw, LogOut, Send, X, Globe, Download, Upload, Shield } from 'lucide-react';
import { useLang } from './i18n/LanguageContext';
import { useTasks } from './hooks/useTasks';
import { TaskGrid } from './components/TaskGrid';
import { AddTaskModal } from './components/AddTaskModal';
import { EditTaskModal } from './components/EditTaskModal';
import { LandingPage } from './components/LandingPage';
import { login, testTelegram, Task, getCheckinLogs, CheckinLog } from './api/client';

export default function App() {
  const { t, lang, setLang } = useLang();
  const [authenticated, setAuthenticated] = useState(() => !!localStorage.getItem('checkin_token'));
  const [showAdd, setShowAdd] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [password, setPassword] = useState('');
  const [tgResult, setTgResult] = useState<string | null>(null);
  const [historyTask, setHistoryTask] = useState<Task | null>(null);
  const [logs, setLogs] = useState<CheckinLog[]>([]);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importErr, setImportErr] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('merge');
  const fileRef = useRef<HTMLInputElement>(null);
  const { tasks, loading, refresh } = useTasks();

  const handleLogin = async (e: React.FormEvent) => { e.preventDefault(); const ok = await login(password); if (ok) setAuthenticated(true); else alert(t('common.wrongPassword')); };
  const handleTestTg = async () => { const res = await testTelegram(); setTgResult(res.message); setTimeout(() => setTgResult(null), 5000); };
  const handleHistory = async (task: Task) => { setHistoryTask(task); try { const data = await getCheckinLogs(task.id); setLogs(data); } catch { setLogs([]); } };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('checkin_token') || '';
      const res = await fetch('/api/admin/export', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `checkin-export-${new Date().toISOString().slice(0,10)}.json`;
      a.click(); URL.revokeObjectURL(url);
    } catch { alert(t('export.error')); }
  };

  const handleImport = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setImportMsg(t('import.importing'));
    setImportErr(null);
    try {
      const token = localStorage.getItem('checkin_token') || '';
      const json = await file.text();
      const res = await fetch(`/api/admin/import?mode=${importMode}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(JSON.parse(json)),
      });
      const data = await res.json();
      if (res.ok) {
        setImportMsg(t('import.success', { tasks: data.imported?.tasks ?? 0, logs: data.imported?.logs ?? 0 }));
        refresh();
      } else {
        setImportErr(data.error || t('import.error'));
        setImportMsg(null);
      }
    } catch {
      setImportErr(t('import.formatError'));
      setImportMsg(null);
    }
  };

  if (!authenticated) {
    return <LandingPage onLoginSuccess={() => setAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <header className="sticky top-0 z-40 border-b backdrop-blur-md" style={{ background: 'rgba(15,17,23,0.85)', borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold">✅ {t('common.appTitle')}</h1>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>{t('common.tasks', { n: tasks.length })}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium hover:bg-white/10" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
              <Globe className="w-3.5 h-3.5" /> {lang === 'zh' ? 'EN' : '中'}
            </button>
            <button onClick={handleTestTg} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/10" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}><Send className="w-3.5 h-3.5" /> {t('tg.test')}</button>
            <button onClick={handleExport} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/10" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
              <Download className="w-3.5 h-3.5" /> {t('common.export')}
            </button>
            <button onClick={() => { setImportMsg(null); setImportErr(null); fileRef.current?.click(); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/10" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
              <Upload className="w-3.5 h-3.5" /> {t('common.import')}
            </button>
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            <button onClick={refresh} className="p-2 rounded-lg hover:bg-white/10 transition-colors" style={{ color: 'var(--text-secondary)' }}><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => { localStorage.removeItem('checkin_token'); setAuthenticated(false); }} className="p-2 rounded-lg hover:bg-white/10 transition-colors" style={{ color: 'var(--text-muted)' }}><LogOut className="w-4 h-4" /></button>
            <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium" style={{ background: 'var(--accent-blue)', color: '#fff' }}><Plus className="w-4 h-4" /> {t('task.createSuccess')}</button>
          </div>
        </div>
        {tgResult && (<div className="max-w-7xl mx-auto px-4 pb-2"><div className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'var(--bg-input)', color: 'var(--accent-green)' }}>📱 {tgResult}</div></div>)}
        {importMsg && (<div className="max-w-7xl mx-auto px-4 pb-2"><div className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'var(--bg-input)', color: 'var(--accent-green)' }}>{importMsg}</div></div>)}
        {importErr && (<div className="max-w-7xl mx-auto px-4 pb-2"><div className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--accent-red)' }}>{importErr}</div></div>)}
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <TaskGrid tasks={tasks} onRefresh={refresh} onEdit={setEditTask} onHistory={handleHistory} />
      </main>

      {/* Disclaimer footer */}
      <footer className="border-t py-3 text-center text-xs" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-center gap-2" style={{ color: 'var(--text-muted)' }}>
          <Shield className="w-3 h-3" />
          <span>{t('disclaimer.short')}</span>
          <button onClick={() => setShowDisclaimer(true)} className="underline" style={{ color: 'var(--text-secondary)' }}>{t('disclaimer.viewDetail')}</button>
        </div>
      </footer>

      {showDisclaimer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setShowDisclaimer(false)}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: 'var(--bg-card)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>⚠ {t('disclaimer.title')}</h3>
              <button onClick={() => setShowDisclaimer(false)} className="p-1 rounded hover:bg-white/10" style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="max-h-96 overflow-y-auto text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>{t('disclaimer.full')}</div>
          </div>
        </div>
      )}

      {/* Checkin history modal */}
      {historyTask && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setHistoryTask(null)}>
          <div className="w-full max-w-lg rounded-2xl p-6" style={{ background: 'var(--bg-card)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>📋 {historyTask.name} {t('task.checkinHistory')}</h3>
              <button onClick={() => setHistoryTask(null)} className="p-1 rounded hover:bg-white/10" style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
            </div>
            {logs.length === 0 ? (
              <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>{t('task.noHistory')}</p>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-2">
                {logs.map(log => (
                  <div key={log.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'var(--bg-input)' }}>
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{new Date(log.checked_at).toLocaleString('zh-CN')}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: log.source === 'telegram' ? 'rgba(88,166,255,0.2)' : log.source === 'share_link' ? 'rgba(163,113,247,0.2)' : 'rgba(86,211,100,0.2)', color: log.source === 'telegram' ? 'var(--accent-blue)' : log.source === 'share_link' ? 'var(--accent-purple)' : 'var(--accent-green)' }}>
                      {log.source === 'telegram' ? t('task.sourceTelegram') : log.source === 'share_link' ? t('task.sourceShare') : t('task.sourceManual')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <AddTaskModal open={showAdd} onClose={() => setShowAdd(false)} onRefresh={refresh} />
      <EditTaskModal task={editTask} onClose={() => setEditTask(null)} onRefresh={refresh} />

      {/* Import mode selector modal */}
      {(importMsg || importErr) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => { setImportMsg(null); setImportErr(null); }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: 'var(--bg-card)' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{t('import.title')}</h3>
            {(importMsg || importErr) && (
              <p className="text-sm mb-4" style={{ color: importErr ? 'var(--accent-red)' : 'var(--accent-green)' }}>{importErr || importMsg}</p>
            )}
            <button onClick={() => { setImportMsg(null); setImportErr(null); }} className="w-full py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}>
              {t('common.close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
