const BASE = '/api';
function authHeaders(): Record<string, string> {
  const t = localStorage.getItem('checkin_token') || '';
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` };
}
export interface Task {
  id: string; name: string; url: string; interval_days: number;
  last_checkin: string | null; next_checkin: string | null;
  remind_days_before: number; remind_enabled: number; status: string;
  notes: string; category: string; days_until: number | null; days_since: number | null;
  created_at: string;
}
export interface CheckinLog { id: number; task_id: string; checked_at: string; source: string; }

export async function login(password: string): Promise<boolean> {
  const res = await fetch(`${BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
  if (res.ok) { const d = await res.json(); localStorage.setItem('checkin_token', d.token); return true; }
  return false;
}
export async function fetchTasks(): Promise<Task[]> { const r = await fetch(`${BASE}/tasks`, { headers: authHeaders() }); if (!r.ok) throw new Error('Failed'); return r.json(); }
export async function createTask(data: { name: string; url?: string; interval_days?: number; remind_days_before?: number; notes?: string; category?: string }): Promise<Task> {
  const r = await fetch(`${BASE}/tasks`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) }); if (!r.ok) throw new Error('Failed'); return r.json();
}
export async function updateTask(id: string, data: Partial<Task>): Promise<Task> {
  const r = await fetch(`${BASE}/tasks/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(data) }); if (!r.ok) throw new Error('Failed'); return r.json();
}
export async function deleteTask(id: string): Promise<void> { await fetch(`${BASE}/tasks/${id}`, { method: 'DELETE', headers: authHeaders() }); }
export async function checkinTask(id: string): Promise<{ ok: boolean; message: string }> {
  const r = await fetch(`${BASE}/checkin/${id}`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ source: 'manual' }) }); return r.json();
}
export async function testTelegram(): Promise<{ ok: boolean; message: string }> {
  const r = await fetch(`${BASE}/test-tg`, { method: 'POST', headers: authHeaders() }); return r.json();
}
export async function getShareUrl(taskId: string): Promise<{ shareUrl: string }> {
  const r = await fetch(`${BASE}/share/${taskId}`, { headers: authHeaders() }); return r.json();
}
export async function getCheckinLogs(taskId: string): Promise<CheckinLog[]> {
  const r = await fetch(`${BASE}/checkin/${taskId}/logs`, { headers: authHeaders() }); return r.json();
}
