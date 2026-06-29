import { TaskCard } from './TaskCard';
import { Task } from '../api/client';
import { useLang } from '../i18n/LanguageContext';

interface TaskGridProps { tasks: Task[]; onRefresh: () => void; onEdit: (t: Task) => void; onHistory: (t: Task) => void; }

export function TaskGrid({ tasks, onRefresh, onEdit, onHistory }: TaskGridProps) {
  const { t } = useLang();
  if (tasks.length === 0) return (
    <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>
      <div className="text-4xl mb-3">📭</div>
      <p className="text-sm">{t('common.noTasks')}</p>
      <p className="text-xs mt-1">{t('common.noTasksHint')}</p>
    </div>
  );
  const overdue = tasks.filter(t => t.days_until !== null && t.days_until < 0);
  const upcoming = tasks.filter(t => t.days_until !== null && t.days_until >= 0);
  const normal = tasks.filter(t => t.days_until === null);
  const sections = [
    { title: t('section.overdueTitle'), color: 'var(--accent-red)', items: overdue },
    { title: t('section.dueSoonTitle'), color: 'var(--accent-yellow)', items: upcoming },
    { title: t('section.normalTitle'), color: 'var(--accent-green)', items: normal },
  ].filter(s => s.items.length > 0);
  return (
    <div className="space-y-6">
      {sections.map(s => (
        <section key={s.title}>
          <h2 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: s.color }}>
            {s.title} ({s.items.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {s.items.map(t => <TaskCard key={t.id} task={t} onRefresh={onRefresh} onEdit={onEdit} onHistory={onHistory} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
