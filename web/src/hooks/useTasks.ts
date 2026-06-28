import { useState, useEffect, useCallback } from 'react';
import { Task, fetchTasks } from '../api/client';
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => { setLoading(true); try { setTasks(await fetchTasks()); } catch { /* ignore */ } finally { setLoading(false); } }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return { tasks, loading, refresh };
}
