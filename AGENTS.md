# Checkin Reminder - AGENTS.md

## 项目架构

- 根目录: Express.js + TypeScript 后端，入口 `src/index.ts`
- `web/`: React + Vite + TailwindCSS 前端，构建产物 `web/dist/` 由 Express 作为静态文件托管
- 数据库: SQLite (better-sqlite3)，首次启动自动创建于 `./data/tasks.db`，WAL 模式
- Telegram Bot 可选，不配 `TG_BOT_TOKEN` 就跳过；配了则支持内联键盘交互
- 公开首页（LandingPage）：无需登录即可查看任务状态看板
- 镜像公开推送至 `ghcr.io/alivedou/checkin-reminder:latest`，不含内置密码

## 关键文件路径

| 功能 | 路径 |
|------|------|
| 启动入口 + 路由注册 | `src/index.ts` |
| 环境变量 = 配置 | `src/config.ts` |
| 数据库连接 + 迁移 | `src/db/connection.ts`, `src/db/migrate.ts` |
| 密码/JWT | `src/utils/auth.ts` |
| 认证中间件 | `src/middleware/auth.ts` (JWT 支持 header + query param) |
| 提醒逻辑 | `src/services/reminder.ts` (限流: 到期前 3次/天，过期后 1次/天×3天) |
| TG Bot | `src/services/telegram.ts` (内联键盘: `/start /list /check /status /due`) |
| 路由: 公开任务 | `src/routes/publicTasks.ts` (无需认证，去敏) |
| 路由: 分享链接 | `src/routes/share.ts` |
| 路由: 签到 | `src/routes/checkin.ts` (导出 `doCheckin()` 供 TG Bot 复用) |
| 路由: 任务 CRUD | `src/routes/tasks.ts` |
| 前端入口 | `web/src/App.tsx` (未登录→LandingPage，已登录→管理后台) |
| 公开首页 | `web/src/components/LandingPage.tsx` |
| 公开任务卡片 | `web/src/components/PublicTaskCard.tsx` |
| API 客户端 | `web/src/api/client.ts` |

## 本地运行

```
cp -n .env.example .env    # 首次
npm install
cd web && npm install && npm run build && cd ..
npm run dev                # tsx watch src/index.ts (后端热重载)
cd web && npm run dev      # Vite 前端开发服务器 (只开发前端时)
```

## 验证命令（改完代码必跑）

```
npx tsc --outDir dist      # 1. TypeScript 编译检查（零错误才算通过）
cd web && npm run build    # 2. 前端构建
timeout 8 npm run dev      # 3. 快速启动测试（确认无运行时崩溃）
```

## 关键命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 后端开发模式 (tsx watch) |
| `npm run build` (root) | 编译 TS → `dist/` |
| `npm run start` | 运行编译后的生产版本 (`node dist/index.js`) |
| `npm run migrate` | 单独运行数据库迁移 |
| `cd web && npm run dev` | 前端 Vite 开发服务器 |
| `cd web && npm run build` | 构建前端到 `web/dist/` |

## 数据库

### 表结构

| 表 | 用途 |
|------|------|
| `tasks` | 签到任务 (id, name, url, interval_days, next_checkin, remind_enabled, category, share_token, …) |
| `checkin_logs` | 签到记录 (task_id → tasks.id, source: manual/telegram/share_link) |
| `settings` | 键值对存储（当前仅存 admin_password_hash） |
| `notification_log` | 提醒发送日志 (task_id, type: upcoming/overdue, sent_at)，用于限流判断 |

### 迁移规则

- `migrate()` 在 `src/index.ts` 启动时自动执行
- 新增表使用 `CREATE TABLE IF NOT EXISTS`（幂等，不影响已有数据）
- 新增列使用 `ALTER TABLE ADD COLUMN` + `PRAGMA table_info` 检查是否存在
- 数据库文件在 `data/` 目录（gitignored），启动时自动创建

## 必须遵守的规则

### TypeScript 配置

- `tsconfig.json` 必须保留 `esModuleInterop: true`，否则 `import express from 'express'` 编译失败
- `moduleResolution` 和 `module` 已设为 `node16`/`Node16`，**不要再改回 `node`**
- 本地 `.ts` 文件之间的 import 必须使用 `.js` 扩展名（如 `import { config } from './config.js'`）

### Dockerfile

- 层内命令链必须用 `&&`，**不要用 `\&\&`**（反斜杠转义会导致 shell 行为异常，构建失败）
- 生产阶段只有 `npm ci --omit=dev`，不含 `tsx` 或 `typescript`

### 环境变量

- `config.ts` 读取 `process.env.XXX`，`||` 后为默认值
- 部署时**必须设置 `ADMIN_PASSWORD` 和 `JWT_SECRET`**，否则用默认值 `admin123` 和随机密钥
- `JWT_SECRET` 如果是随机生成，每次重启都会变化，已登录用户全部掉线
- `.env` 文件 gitignored，仅本地开发使用；Docker 镜像不内置 `.env`

### 启动校验

- 启动后 `ensureAdminHash()` 将密码写入 DB，然后 `verifyPassword()` 回读验证
- 如果回读失败（DB 不可写），打印错误并继续运行（不会崩溃，但登录将 401）
- 日志输出 `📁 Storage: 外部挂载` 或 `容器内部`，用于判断持久化是否生效

## Docker 构建

### 本地构建

```bash
docker build -t checkin-reminder .
```

### GitHub Actions 构建

- `.github/workflows/docker-build.yml` — 手动触发
- 多架构: `linux/amd64, linux/arm64`
- 推送到 `ghcr.io/alivedou/checkin-reminder:latest` + `:sha`
- 镜像为公开，**不内置密码**（用户部署时设环境变量）

## 部署要点

### 最低要求

1. 挂载持久化卷到 `/app/data`（否则重启数据丢失 + 401）
2. 设置环境变量 `ADMIN_PASSWORD` 和 `JWT_SECRET`
3. 暴露端口 3000

### 启动后验证

日志应出现以下行：

```
✅ Database migrated
✅ Admin password synced from env
📁 Storage:     外部挂载          ← 非"容器内部"
📱 TG:          已配置 / 未配置
```

如果缺少 `Admin password synced` 或 `Storage: 容器内部` → 存储未正确挂载。

### 环境变量优先级

`运行时 env > config.ts 默认值 > 无`

容器平台设置的环境变量会覆盖 `config.ts` 的硬编码默认值。

## Telegram Bot 架构

- `initBot()` 在 `src/index.ts` 启动时调用
- 支持命令: `/start` (主菜单), `/list`, `/status`, `/check`, `/due`
- 内联键盘交互: callback_data 格式为 `menu:xxx` 或 `check:taskId`
- 签到复用 `doCheckin(taskId, 'telegram')`（定义在 `src/routes/checkin.ts`）
- 分享链接功能依赖 `BASE_URL` 和 `share_token`，TG 内生成 `url` 按钮

## 注意事项

- `.env` 是 gitignored；`.env.example` 是模板
- `data/` 目录是 gitignored；代码启动时会自动创建
- `list.md` 是功能规划文档，非项目运行必需
- `scripts/backup.sh` 和 `scripts/restore.sh` 用于 SQLite 数据备份恢复
