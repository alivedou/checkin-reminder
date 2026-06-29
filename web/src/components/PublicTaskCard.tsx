import { Clock, Bell, BellOff, CalendarClock, ShieldCheck } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { useLang } from '../i18n/LanguageContext';
import { PublicTask } from '../api/client';

interface PublicTaskCardProps {
  task: PublicTask;
}

export function PublicTaskCard({ task }: PublicTaskCardProps) {
  const { t } = useLang();

  const borderColor = task.days_until !== null && task.days_until < 0 
    ? 'rgba(239, 68, 68, 0.3)' 
    : task.days_until !== null && task.days_until <= task.remind_days_before 
      ? 'rgba(234, 179, 8, 0.3)' 
      : 'var(--border)';

  const nextDate = task.next_checkin 
    ? new Date(task.next_checkin).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }) 
    : t('task.unknown');

  const lastDateStr = task.last_checkin
    ? `${new Date(task.last_checkin).toLocaleDateString('zh-CN')} (${t('task.daysAgo', { n: task.days_since ?? '-' })})`
    : t('task.neverCheckin');

  return (
    <div className="public-card" style={{ borderColor }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
            {task.name}
          </h3>
          {task.category && (
            <span className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full" 
              style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>
              {task.category}
            </span>
          )}
        </div>
        <StatusBadge daysUntil={task.days_until} remindDaysBefore={task.remind_days_before} />
      </div>

      <div className="public-info-row">
        <div className="public-info-item">
          <CalendarClock className="w-4 h-4" />
          <div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('task.nextCheckin')}</div>
            <div className="font-medium" style={{ 
              color: task.days_until !== null && task.days_until <= task.remind_days_before 
                ? 'var(--accent-yellow)' 
                : 'var(--text-primary)' 
            }}>
              {nextDate}
            </div>
          </div>
        </div>
        <div className="public-info-item">
          <Clock className="w-4 h-4" />
          <div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('task.lastCheckin')}</div>
            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {lastDateStr}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span>{t('task.interval')}: {task.interval_days} {t('task.intervalUnit')}</span>
        {task.remind_enabled ? (
          <span className="inline-flex items-center gap-1" style={{ color: 'var(--accent-purple)' }}>
            <Bell className="w-3 h-3" /> {t('task.remindBefore')} {task.remind_days_before} {t('task.remindBeforeUnit')}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1">
            <BellOff className="w-3 h-3" /> {t('task.remindDisabled')}
          </span>
        )}
      </div>

      <div className="mt-3 pt-3 border-t flex items-center gap-2 text-xs" 
        style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
        <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
        <span>{t('privacy.hiddenNotice')}</span>
      </div>
    </div>
  );
}
