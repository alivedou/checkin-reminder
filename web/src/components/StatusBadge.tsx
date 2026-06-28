export function StatusBadge({ daysUntil, remindDaysBefore }: { daysUntil: number | null; remindDaysBefore: number }) {
  if (daysUntil === null) return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">未签到</span>;
  if (daysUntil < 0) return <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/50 text-red-400">过期 {Math.abs(daysUntil)} 天</span>;
  if (daysUntil <= remindDaysBefore) return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/50 text-yellow-400">剩 {daysUntil} 天</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/50 text-green-400">剩 {daysUntil} 天</span>;
}
