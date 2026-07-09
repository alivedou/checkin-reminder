# Checkin Reminder CT8 - AGENTS.md

## 项目定位

专为共享主机（ct8 / serv00）优化的签到提醒系统。与 Docker 版共享前端代码，但部署方式、数据库编译、TG Bot 功能有差异化。

## 与 Docker 版差异

| 方面 | Docker 版 | CT8 版 |
|------|-----------|--------|
| 部署方式 | Docker / ghcr.io 镜像 | tar + scp + nohup |
| 进程管理 | Docker restart | crontab 保活 |
| TG Bot 命令 | 4 按钮菜单 | **8 按钮菜单**（含 /add /del /edit /delall） |
| TG Bot 命令 | `/due` 全量过滤 | `/due` 30天 + `/due7` 7天 |
| queries.ts | `getAllTasks` 仅 | 额外 7 个函数：`getTasksDueWithin`、`getTaskById`、`createTask`、`updateTask`、`deleteTask`、`deleteAllTasks` |
| TG 分享链接 | 支持 getShareUrl | **不支持**（共享主机无公网域名） |
| 数据库 | better-sqlite3 | better-sqlite3（平台需支持 C++ 编译） |
| 构建 | `docker build` | 本机 `tsc` + `vite build` → tar → scp |

## 关键文件路径

| 功能 | 路径 |
|------|------|
| 启动入口 + 路由注册 | `src/index.ts` |
| 环境变量 | `src/config.ts` |
| 数据库连接 + 迁移 | `src/db/connection.ts`, `src/db/migrate.ts` |
| 数据库查询（含 TG Bot CRUD） | `src/db/queries.ts` |
| 密码/JWT | `src/utils/auth.ts` |
| 认证中间件 | `src/middleware/auth.ts` |
| 提醒逻辑 | `src/services/reminder.ts`（限流 + 随机延迟 + try-catch） |
| **TG Bot（核心）** | `src/services/telegram.ts`（8 按钮 + CRUD + 对话式 /add + 自动重连 + escapeMd） |
| 路由: 签到 | `src/routes/checkin.ts`（导出 `doCheckin()` 供 TG Bot 复用） |
| 路由: 任务 CRUD | `src/routes/tasks.ts` |
| 路由: 导入导出 | `src/routes/admin.ts` |
| 前端入口 | `web/src/App.tsx` |
| 多语言 | `web/src/i18n/zh.ts`, `web/src/i18n/en.ts`, `web/src/i18n/LanguageContext.tsx` |

## 本地开发

```
npm install
cd web && npm install && npm run build && cd ..
npm run dev                # tsx watch src/index.ts（热重载）
```

## 验证命令（改完代码必跑）

```
npx tsc --outDir dist      # 1. 编译检查（零错误才算通过）
cd web && npm run build    # 2. 前端构建
```

## 部署流程（首次）

```
# 1. 本机构建
npm run build                     # TS → dist/
cd web && npm run build && cd ..  # Vite → web/dist/

# 2. 打包（只上传运行时文件）
tar czf checkin.tar.gz dist web/dist package.json .env.example

# 3. 上传到服务器
scp checkin.tar.gz 用户名@s编号.ct8.pl:~/checkin.tar.gz

# 4. 服务器解压 + 安装
ssh 用户名@s编号.ct8.pl
mkdir -p ~/checkin && cd ~/checkin
tar xzf ~/checkin.tar.gz
cp -n .env.example .env && vi .env  # 改密码 + 端口
npm install --production

# 5. 启动
nohup node dist/index.js > app.log 2>&1 &
cat app.log  # 检查启动日志
```

## 升级流程（后续更新）

```
# 本机（改完代码后）
npm run build && cd web && npm run build && cd ..
tar czf checkin.tar.gz dist web/dist package.json .env.example

# 上传
scp checkin.tar.gz 用户名@s编号.ct8.pl:~/checkin.tar.gz

# 服务器
ssh 用户名@s编号.ct8.pl
cd ~/checkin
pkill -f "node dist/index.js"    # 停旧进程
tar xzf ~/checkin.tar.gz          # 覆盖 dist/ + web/dist/
npm install --production           # 更新依赖（如无变化可跳过）
nohup node dist/index.js > app.log 2>&1 &  # 启动
cat app.log                        # 验证
```

> `.env` 不动，保留原密码和 token。

## 保活（必配）

```bash
crontab -e
```

```cron
# 每 5 分钟检查进程保活
*/5 * * * * pgrep -f "node dist/index.js" || (cd ~/checkin && nohup node dist/index.js >> app.log 2>&1 &)

# 每天凌晨 5 点强制重启（双保险）
0 5 * * * pkill -f "node dist/index.js"; sleep 2; cd ~/checkin && nohup node dist/index.js >> app.log 2>&1 &
```

## Telegram Bot 架构

### 命令列表

| 命令 | 功能 | 实现函数 |
|------|------|----------|
| `/start` | 8 按钮主菜单 | `sendMainMenu` |
| `/list` | 全部任务列表 | `sendTaskList` |
| `/due` | 30 天内到期 | `sendDueTasks(chatId, 30)` |
| `/due7` | 7 天内到期 | `sendDueTasks(chatId, 7)` |
| `/status` | 全部状态详情 | `sendStatus` |
| `/check` | 快速签到按钮 | `sendCheckMenu` |
| `/add` | 对话式创建（5 步） | `startAddTask` + `handleAddStep` |
| `/edit` | 编辑间隔/提醒天数 | `sendEditMenu` + `handleEditTask` |
| `/del` | 删除（含确认） | `sendDeleteMenu` + `handleDelete` |
| `/delall` | 清空全部（二次确认） | `sendDeleteAllConfirm` + `handleDeleteAll` |

### 自动重连

- `polling_error` → `scheduleReconnect()` → 指数退避（5s→10s→20s→40s，上限 60s，409 等 15s）
- 重连成功后 `reconnectAttempt` 重置为 0
- 不会在主进程假死

### Markdown 转义

所有 TG 消息中含任务名的 Markdown 文本均经过 `escapeMd()` 转义，防止 `_` `*` `[` 等字符导致 `ETELEGRAM 400` 崩溃。定义在 `telegram.ts:37`，导出供 `reminder.ts` 使用。

## 提醒服务架构

- `src/services/reminder.ts`：cron 9/14/20 触发
- 批量启动前随机延迟 0-15min
- 每条消息间隔 0-30s
- 到期前每天 ≤3 次，过期后每天 ≤1 次×3 天
- 两个 `sendTelegram` 调用均包了 `try-catch`，不会 unhandled rejection 崩进程

## 数据库

### 表结构

| 表 | 用途 |
|------|------|
| `tasks` | 签到任务 |
| `checkin_logs` | 签到记录 |
| `settings` | `admin_password_hash` |
| `notification_log` | 提醒发送日志（限流判断） |

### queries.ts 函数清单

| 函数 | 调用方 |
|------|--------|
| `getAllTasks()` | 所有 UI + reminder |
| `getTasksDueWithin(days)` | `sendDueTasks` |
| `getTaskById(id)` | `/del` `/edit` 回调 |
| `createTask(data)` | `/add` 对话流程 |
| `updateTask(id, data)` | `/edit` 字段修改 |
| `deleteTask(id)` | `/del` 确认删除 |
| `deleteAllTasks()` | `/delall` 清空 |

## 必须遵守的规则

### TypeScript 配置

- `esModuleInterop: true` — 不写则 `import express from 'express'` 编译失败
- `moduleResolution: node16` + `module: Node16` — TS 7 兼容
- 本地 `.ts` 文件互引必须使用 `.js` 扩展名

### Telegram Bot

- 所有消息包含动态内容（任务名、用户名）必须 `escapeMd()` 转义
- `queries.ts` 的 7 个额外函数是 TG Bot CRUD 的依赖，**不能删**
- ct8 版不含 `getShareUrl`，不要给 `/list`/`/status` 加分享链接按钮

### 提醒服务

- `sendTelegram` 的每个调用点必须 try-catch，防止 unhandled rejection 崩进程
- 随机延迟参数不要调到 0（防外呼封号）

### 部署

- 服务器用 `nohup node dist/index.js &` 启动，**不是** Docker
- 升级时必须 `pkill` 再启动，否则端口冲突
- 部署文件只有 `dist/` `web/dist/` `package.json` `.env.example`

## 注意事项

- `.env` gitignored，服务器手动维护
- `data/` gitignored，`.db` 备份用 `scripts/backup.sh`
- `checkin.tar.gz` 是构建产物，不要提交到 git
- TG Bot 仅响应 `TG_CHAT_ID` 主人的 private chat（`sendTelegram` 限定）
