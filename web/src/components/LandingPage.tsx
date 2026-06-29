import { useState, useEffect } from 'react';
import { LogIn, Shield, Clock, AlertTriangle, CheckCircle2, Loader2, Eye, EyeOff, Globe } from 'lucide-react';
import { PublicTaskCard } from './PublicTaskCard';
import { useLang } from '../i18n/LanguageContext';
import { fetchPublicTasks, PublicTask, login } from '../api/client';

interface LandingPageProps {
  onLoginSuccess: () => void;
}

export function LandingPage({ onLoginSuccess }: LandingPageProps) {
  const { t, lang, setLang } = useLang();
  const [tasks, setTasks] = useState<PublicTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

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
        setLoginError(t('common.wrongPassword'));
      }
    } catch {
      setLoginError(t('common.networkError'));
    } finally {
      setLoginLoading(false);
    }
  };

  const overdue = tasks.filter(t => t.days_until !== null && t.days_until < 0);
  const warning = tasks.filter(t => t.days_until !== null && t.days_until >= 0 && t.days_until <= t.remind_days_before);
  const normal = tasks.filter(t => t.days_until !== null && t.days_until > t.remind_days_before);
  const pending = tasks.filter(t => t.days_until === null);

  const sections = [
    { title: t('section.overdueTitle'), color: 'var(--accent-red)', items: overdue },
    { title: t('section.dueSoonTitle'), color: 'var(--accent-yellow)', items: warning },
    { title: t('section.normalTitle'), color: 'var(--accent-green)', items: normal },
    { title: t('section.pendingTitle'), color: 'var(--text-muted)', items: pending },
  ].filter(s => s.items.length > 0);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b backdrop-blur-md" 
        style={{ background: 'rgba(15,17,23,0.9)', borderColor: 'var(--border)' }}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">✅</span>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t('common.appTitle')}</h1>
            <span className="text-xs px-2 py-0.5 rounded-full" 
              style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>
              {t('common.tasks', { n: tasks.length })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/10"
              style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
              <Globe className="w-3.5 h-3.5" />
              {lang === 'zh' ? 'EN' : '中'}
            </button>
            <button 
              onClick={() => setShowLogin(true)}
              className="landing-login-btn">
              <LogIn className="w-4 h-4" />
              {t('landing.adminLogin')}
            </button>
          </div>
        </div>
      </header>

      {/* Hero section */}
      <section className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            {t('landing.dashboardTitle')}
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {t('landing.dashboardSub')}
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="landing-stat-card">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4" style={{ color: 'var(--accent-blue)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('landing.totalTasks')}</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{tasks.length}</div>
          </div>
          <div className="landing-stat-card">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4" style={{ color: 'var(--accent-red)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('landing.overdue')}</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: overdue.length > 0 ? 'var(--accent-red)' : 'var(--text-primary)' }}>{overdue.length}</div>
          </div>
          <div className="landing-stat-card">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4" style={{ color: 'var(--accent-yellow)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('landing.dueSoon')}</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: warning.length > 0 ? 'var(--accent-yellow)' : 'var(--text-primary)' }}>{warning.length}</div>
          </div>
          <div className="landing-stat-card">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--accent-green)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('landing.normal')}</span>
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
            <p className="text-sm">{t('common.noTasks')}</p>
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

      {/* Footer with disclaimer */}
      <footer className="border-t py-6 text-center text-xs" 
        style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
        <div className="max-w-5xl mx-auto px-4 space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Shield className="w-3.5 h-3.5" />
            <span>{t('landing.footerText')}</span>
          </div>
          <div>
            <span>{t('disclaimer.short')}</span>{' '}
            <button
              onClick={() => setShowDisclaimer(true)}
              className="underline hover:text-white transition-colors"
              style={{ color: 'var(--text-secondary)' }}>
              {t('disclaimer.viewDetail')}
            </button>
          </div>
        </div>
      </footer>

      {/* Login modal */}
      {showLogin && (
        <div className="login-modal-overlay" onClick={() => { setShowLogin(false); setLoginError(''); }}>
          <div className="login-modal" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t('landing.loginTitle')}</h3>
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
                  placeholder={t('common.enterPassword')}
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
                  <><Loader2 className="w-4 h-4 animate-spin" /> {t('common.loggingIn')}</>
                ) : (
                  <><LogIn className="w-4 h-4" /> {t('common.login')}</>
                )}
              </button>
            </form>
            
            <p className="mt-4 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              🔒 {t('landing.loginHint')}
            </p>
          </div>
        </div>
      )}

      {/* Disclaimer modal */}
      {showDisclaimer && (
        <div className="login-modal-overlay" onClick={() => setShowDisclaimer(false)}>
          <div className="login-modal" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>⚠ {t('disclaimer.title')}</h3>
              <button onClick={() => setShowDisclaimer(false)} className="p-1 rounded hover:bg-white/10" style={{ color: 'var(--text-muted)' }}>
                ✕
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>
              {t('disclaimer.full')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
