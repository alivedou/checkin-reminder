import { useState } from 'react';
import { Plus, RefreshCw, LogOut, Send, X } from 'lucide-react';
import { useTasks } from './hooks/useTasks';
import { TaskGrid } from './components/TaskGrid';
import { AddTaskModal } from './components/AddTaskModal';
import { EditTaskModal } from './components/EditTaskModal';
import { LandingPage } from './components/LandingPage';
import { login, testTelegram, Task, getCheckinLogs, CheckinLog } from './api/client';
export default function App() {
  const [authenticated, setAuthenticated] = useState(() => !!localStorage.getItem('checkin_token'));
  const [showAdd, setShowAdd] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [password, setPassword] = useState('');
  const [tgResult, setTgResult] = useState<string | null>(null);
  const [historyTask, setHistoryTask] = useState<Task | null>(null);
  const [logs, setLogs] = useState<CheckinLog[]>([]);
  const { tasks, loading, refresh } = useTasks();
  const handleLogin = async (e: React.FormEvent) => { e.preventDefault(); const ok = await login(password); if (ok) setAuthenticated(true); else alert('密码错误'); };
  const handleTestTg = async () => { const res = await testTelegram(); setTgResult(res.message); setTimeout(() => setTgResult(null), 5000); };
  const handleHistory = async (task: Task) => { setHistoryTask(task); try { const data = await getCheckinLogs(task.id); setLogs(data); } catch { setLogs([]); } };
  if (!authenticated) {
    return <LandingPage onLoginSuccess={() => setAuthenticated(true)} />;
  }
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <header className="sticky top-0 z-40 border-b backdrop-blur-md" style={{ background: 'rgba(15,17,23,0.85)', borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold">✅ 签到提醒</h1>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>{tasks.length} 个任务</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleTestTg} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/10" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}><Send className="w-3.5 h-3.5" /> 测试TG</button>
            <button onClick={refresh} className="p-2 rounded-lg hover:bg-white/10 transition-colors" style={{ color: 'var(--text-secondary)' }}><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => { localStorage.removeItem('checkin_token'); setAuthenticated(false); }} className="p-2 rounded-lg hover:bg-white/10 transition-colors" style={{ color: 'var(--text-muted)' }}><LogOut className="w-4 h-4" /></button>
            <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium" style={{ background: 'var(--accent-blue)', color: '#fff' }}><Plus className="w-4 h-4" /> 添加任务</button>
          </div>
        </div>
        {tgResult && (<div className="max-w-7xl mx-auto px-4 pb-2"><div className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'var(--bg-input)', color: 'var(--accent-green)' }}>📱 {tgResult}</div></div>)}
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <TaskGrid tasks={tasks} onRefresh={refresh} onEdit={setEditTask} onHistory={handleHistory} />
      </main>
      <AddTaskModal open={showAdd} onClose={() => setShowAdd(false)} onRefresh={refresh} />
      <EditTaskModal task={editTask} onClose={() => setEditTask(null)} onRefresh={refresh} />
      {historyTask && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setHistoryTask(null)}>
          <div className="w-full max-w-lg rounded-2xl p-6" style={{ background: 'var(--bg-card)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>📋 {historyTask.name} 签到历史</h3>
              <button onClick={() => setHistoryTask(null)} className="p-1 rounded hover:bg-white/10" style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
            </div>
            {logs.length === 0 ? (
              <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>暂无签到记录</p>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-2">
                {logs.map(log => (
                  <div key={log.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'var(--bg-input)' }}>
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{new Date(log.checked_at).toLocaleString('zh-CN')}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: log.source === 'telegram' ? 'rgba(88,166,255,0.2)' : log.source === 'share_link' ? 'rgba(163,113,247,0.2)' : 'rgba(86,211,100,0.2)', color: log.source === 'telegram' ? 'var(--accent-blue)' : log.source === 'share_link' ? 'var(--accent-purple)' : 'var(--accent-green)' }}>{log.source === 'telegram' ? 'TG Bot' : log.source === 'share_link' ? '分享链接' : '手动'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
