import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import { config } from '../config.js';

const router = Router();

router.get('/:taskId', (req: Request, res: Response) => {
  const task = db.prepare('SELECT id, name, interval_days, share_token FROM tasks WHERE id = ?').get(req.params.taskId) as any;
  if (!task) return res.status(404).json({ error: 'Task not found' });
  let token = task.share_token;
  if (!token) { token = uuidv4(); db.prepare('UPDATE tasks SET share_token = ? WHERE id = ?').run(token, task.id); }
  const base = config.baseUrl || `${req.protocol}://${req.get('host')}`;
  res.json({ shareUrl: `${base}/api/share/${task.id}/checkin?token=${token}`, pageUrl: `${base}/api/share/${task.id}/page?token=${token}`, task: { id: task.id, name: task.name } });
});

router.get('/:taskId/checkin', (req: Request, res: Response) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.taskId) as any;
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!task.share_token || req.query.token !== task.share_token) return res.status(403).json({ error: 'Invalid token' });
  const now = new Date().toISOString();
  const next = new Date(Date.now() + task.interval_days * 86400000).toISOString();
  db.prepare('UPDATE tasks SET last_checkin = ?, next_checkin = ?, updated_at = ? WHERE id = ?').run(now, next, now, task.id);
  db.prepare('INSERT INTO checkin_logs (task_id, checked_at, source) VALUES (?, ?, ?)').run(task.id, now, 'share_link');
  res.json({ ok: true, message: `✅ ${task.name} 已签到，下次：${new Date(next).toLocaleDateString('zh-CN')}` });
});

router.get('/:taskId/page', (req: Request, res: Response) => {
  const task = db.prepare('SELECT id, name, interval_days, share_token FROM tasks WHERE id = ?').get(req.params.taskId) as any;
  if (!task) return res.status(404).send('任务不存在');
  if (!task.share_token || req.query.token !== task.share_token) return res.status(403).send('无效链接');
  res.type('html').send(`<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${task.name} - 签到</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui;background:#0a0a0f;color:#e5e5e5;min-height:100vh;display:flex;align-items:center;justify-content:center}.card{background:#1a1a2e;border-radius:16px;padding:40px;max-width:400px;width:90%;text-align:center;border:1px solid #2a2a3e}h1{font-size:24px;margin-bottom:8px}.sub{color:#a0a0b0;margin-bottom:24px}button{background:#2563eb;color:#fff;border:none;padding:14px 32px;border-radius:10px;font-size:16px;font-weight:600;cursor:pointer}button:hover{background:#1d4ed8}.result{margin-top:20px;padding:12px;border-radius:8px;display:none}.ok{display:block;background:rgba(34,197,94,.15);color:#22c55e}.err{display:block;background:rgba(239,68,68,.15);color:#ef4444}</style></head><body><div class="card"><h1>✅ ${task.name}</h1><p class="sub">签到间隔：${task.interval_days} 天</p><button id="btn" onclick="go()">立即签到</button><div id="r" class="result"></div></div><script>async function go(){const b=document.getElementById("btn"),r=document.getElementById("r");b.disabled=true;b.textContent="签到中...";try{const res=await fetch("/api/share/${task.id}/checkin?token=${task.share_token}");const d=await res.json();r.className="result "+(res.ok?"ok":"err");r.textContent=d.message||d.error;if(res.ok)b.textContent="已签到 ✅";else b.disabled=false,b.textContent="立即签到"}catch(e){r.className="result err";r.textContent="网络错误";b.disabled=false;b.textContent="立即签到"}}</script></body></html>`);
});

export default router;
