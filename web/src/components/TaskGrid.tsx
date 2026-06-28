import { TaskCard } from './TaskCard';
import { Task } from '../api/client';
interface TaskGridProps { tasks: Task[]; onRefresh: () => void; onEdit: (t: Task) => void; onHistory: (t: Task) => void; }
export function TaskGrid({ tasks, onRefresh, onEdit, onHistory }: TaskGridProps) {
  if (tasks.length === 0) return <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}><div className="text-4xl mb-3">📭</div><p className="text-sm">暂无签到任务</p><p className="text-xs mt-1">点击右上角「+ 添加任务」开始</p></div>;
  const overdue = tasks.filter(t => t.days_until !== null && t.days_until < 0);
  const upcoming = tasks.filter(t => t.days_until !== null && t.days_until >= 0);
  const normal = tasks.filter(t => t.days_until === null);
  const sections = [
    { title: '🔴 已过期', color: 'var(--accent-red)', items: overdue },
    { title: '🟡 即将到期', color: 'var(--accent-yellow)', items: upcoming },
    { title: '🟢 状态正常', color: 'var(--accent-green)', items: normal },
  ].filter(s => s.items.length > 0);
  return <div className="space-y-6">{sections.map(s => <section key={s.title}><h2 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: s.color }}>{s.title} ({s.items.length})</h2><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{s.items.map(t => <TaskCard key={t.id} task={t} onRefresh={onRefresh} onEdit={onEdit} onHistory={onHistory} />)}</div></section>)}</div>;
}
