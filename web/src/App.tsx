import { useState } from 'react';
import { Plus, RefreshCw, LogOut, Send } from 'lucide-react';
import { useTasks } from './hooks/useTasks';
import { TaskGrid } from './components/TaskGrid';
import { AddTaskModal } from './components/AddTaskModal';
import { EditTaskModal } from './components/EditTaskModal';
import { login, testTelegram, Task } from './api/client';
export default function App() {
  const [authenticated, setAuthenticated] = useState(() => !!localStorage.getItem('checkin_token'));
  const [showAdd, setShowAdd] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [password, setPassword] = useState('');
  const [tgResult, setTgResult] = useState<string | null>(null);
  const { tasks, loading, refresh } = useTasks();
  const handleLogin = async (e: React.FormEvent) => { e.preventDefault(); const ok = await login(password); if (ok) setAuthenticated(true); else alert('密码错误'); };
  const handleTestTg = async () => { const res = await testTelegram(); setTgResult(res.message); setTimeout(() => setTgResult(null), 5000); };
  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
        <form onSubmit={handleLogin} className="w-full max-w-sm rounded-2xl p-6 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <h1 className="text-xl font-bold text-center mb-4">🔐 签到提醒</h1>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="输入管理密码" autoFocus className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none mb-3" style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
          <button type="submit" className="w-full py-2.5 rounded-lg text-sm font-medium" style={{ background: 'var(--accent-blue)', color: '#fff' }}>进入面板</button>
        </form>
      </div>
    );
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
        <TaskGrid tasks={tasks} onRefresh={refresh} onEdit={setEditTask} />
      </main>
      <AddTaskModal open={showAdd} onClose={() => setShowAdd(false)} onRefresh={refresh} />
      <EditTaskModal task={editTask} onClose={() => setEditTask(null)} onRefresh={refresh} />
    </div>
  );
}
