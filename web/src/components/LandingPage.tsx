import { useState, useEffect } from 'react';
import { LogIn, Shield, Clock, AlertTriangle, CheckCircle2, Loader2, Eye, EyeOff } from 'lucide-react';
import { PublicTaskCard } from './PublicTaskCard';
import { fetchPublicTasks, PublicTask, login } from '../api/client';

interface LandingPageProps {
  onLoginSuccess: () => void;
}

export function LandingPage({ onLoginSuccess }: LandingPageProps) {
  const [tasks, setTasks] = useState<PublicTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    fetchPublicTasks()
      .then(setTasks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const ok = await login(password);
      if (ok) {
        onLoginSuccess();
      } else {
        setLoginError('密码错误，请重试');
      }
    } catch {
      setLoginError('登录失败，请检查网络');
    } finally {
      setLoginLoading(false);
    }
  };

  const overdue = tasks.filter(t => t.days_until !== null && t.days_until < 0);
  const warning = tasks.filter(t => t.days_until !== null && t.days_until >= 0 && t.days_until <= t.remind_days_before);
  const normal = tasks.filter(t => t.days_until !== null && t.days_until > t.remind_days_before);
  const pending = tasks.filter(t => t.days_until === null);

  const sections = [
    { title: '🔴 已过期', color: 'var(--accent-red)', items: overdue },
    { title: '🟡 即将到期', color: 'var(--accent-yellow)', items: warning },
    { title: '🟢 状态正常', color: 'var(--accent-green)', items: normal },
    { title: '⚪ 待设置', color: 'var(--text-muted)', items: pending },
  ].filter(s => s.items.length > 0);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b backdrop-blur-md" 
        style={{ background: 'rgba(15,17,23,0.9)', borderColor: 'var(--border)' }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">✅</span>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>签到提醒</h1>
            <span className="text-xs px-2 py-0.5 rounded-full" 
              style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>
              {tasks.length} 个任务
            </span>
          </div>
          <button 
            onClick={() => setShowLogin(true)}
            className="landing-login-btn">
            <LogIn className="w-4 h-4" />
            管理员登录
          </button>
        </div>
      </header>

      {/* Hero section */}
      <section className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            任务签到状态看板
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            实时监控各项签到任务的到期时间，确保不遗漏任何重要签到
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="landing-stat-card">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4" style={{ color: 'var(--accent-blue)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>总任务</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{tasks.length}</div>
          </div>
          <div className="landing-stat-card">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4" style={{ color: 'var(--accent-red)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>已过期</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: overdue.length > 0 ? 'var(--accent-red)' : 'var(--text-primary)' }}>
              {overdue.length}
            </div>
          </div>
          <div className="landing-stat-card">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4" style={{ color: 'var(--accent-yellow)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>即将到期</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: warning.length > 0 ? 'var(--accent-yellow)' : 'var(--text-primary)' }}>
              {warning.length}
            </div>
          </div>
          <div className="landing-stat-card">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--accent-green)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>状态正常</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{normal.length + pending.length}</div>
          </div>
        </div>
      </section>

      {/* Task list */}
      <main className="max-w-5xl mx-auto px-4 pb-12">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--text-muted)' }} />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>
            <div className="text-4xl mb-3">📭</div>
            <p className="text-sm">暂无签到任务</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sections.map(section => (
              <section key={section.title}>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: section.color }}>
                  {section.title} ({section.items.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {section.items.map(task => (
                    <PublicTaskCard key={task.id} task={task} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-xs" 
        style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
        <div className="flex items-center justify-center gap-2">
          <Shield className="w-3.5 h-3.5" />
          <span>签到链接和备注信息已隐藏 · 仅管理员可查看完整内容</span>
        </div>
      </footer>

      {/* Login modal */}
      {showLogin && (
        <div className="login-modal-overlay" onClick={() => { setShowLogin(false); setLoginError(''); }}>
          <div className="login-modal" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>管理员登录</h3>
              <button 
                onClick={() => { setShowLogin(false); setLoginError(''); }}
                className="p-1 rounded hover:bg-white/10"
                style={{ color: 'var(--text-muted)' }}>
                ✕
              </button>
            </div>
            
            <form onSubmit={handleLogin}>
              <div className="relative mb-4">
                <input 
                  type={showPassword ? 'text' : 'password'}
                  value={password} 
                  onChange={e => { setPassword(e.target.value); setLoginError(''); }}
                  placeholder="输入管理密码"
                  autoFocus 
                  className="login-input"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              {loginError && (
                <div className="mb-4 text-sm px-3 py-2 rounded-lg" 
                  style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--accent-red)' }}>
                  {loginError}
                </div>
              )}
              
              <button 
                type="submit" 
                disabled={loginLoading || !password}
                className="login-submit-btn">
                {loginLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> 登录中...</>
                ) : (
                  <><LogIn className="w-4 h-4" /> 登录</>
                )}
              </button>
            </form>
            
            <p className="mt-4 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              🔒 登录后可管理签到任务、查看详细信息
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
