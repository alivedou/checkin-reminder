import { useLang } from '../i18n/LanguageContext';

export function StatusBadge({ daysUntil, remindDaysBefore }: { daysUntil: number | null; remindDaysBefore: number }) {
  const { t } = useLang();
  if (daysUntil === null) return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">{t('status.neverSigned')}</span>;
  if (daysUntil < 0) return <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/50 text-red-400">{t('status.overdue', { n: Math.abs(daysUntil) })}</span>;
  if (daysUntil === 0) return <span className="text-xs px-2 py-0.5 rounded-full bg-orange-900/50 text-orange-400">{t('status.todayDue')}</span>;
  if (daysUntil <= remindDaysBefore) return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/50 text-yellow-400">{t('status.daysLeft', { n: daysUntil })}</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/50 text-green-400">{t('status.daysLeft', { n: daysUntil })}</span>;
}
