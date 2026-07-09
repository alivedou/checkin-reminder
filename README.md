# ✅ 签到提醒系统

> 🏠 专为共享主机（如 ct8 / serv00）优化 — 单进程运行、sql.js 零原生依赖、纯 Web + Telegram 双重管理。

一个自托管的循环任务签到提醒工具。

## ✨ 功能

- 📋 任务卡片管理（增删改查 + 分类）
- 🔐 JWT 认证 + bcrypt 密码加密
- 📱 Telegram Bot 全功能管理（增删改查、签到、状态查询）
- ⏰ 定时提醒（提前 N 天，每天 3 次；过期每天 1 次，3 天后停）
- 🌐 中英文双语切换
- 📊 一键导出 / 导入（JSON）
- 📝 自动数据备份
- 🗜️ Gzip 压缩
- 📜 中英双语免责声明（合规意识）

## 🛠️ 技术栈

- **后端**：Express + TypeScript + sql.js（WASM 版 SQLite，无需 C++ 编译）
- **前端**：React 19 + Vite 6 + Tailwind CSS
- **认证**：JWT + bcryptjs
- **通知**：node-telegram-bot-api

## 📋 提醒策略

| 状态 | 频率 | 限制 |
|---|---|---|
| 即将到期 | 每天 3 次（09:00 / 14:00 / 20:00） | `remind_days_before` 天数内 |
| 已过期 | 每天 1 次 | 最多 3 天后停止 |

## 📡 Telegram Bot 命令

| 命令 | 功能 |
|---|---|
| `/start` | 主菜单 |
| `/list` | 全部任务 |
| `/due` | 即将到期（默认 30 天内） |
| `/due7` | 7 天内到期 |
| `/status` | 全部状态详情 |
| `/check` | 快速签到（按钮） |
| `/add` | 添加任务（5 步对话：名称 → 间隔 → 网址 → 提醒天数 → 下次签到日期） |
| `/edit` | 编辑任务（间隔 / 提醒天数） |
| `/del` | 删除任务（含确认） |
| `/delall` | 删除全部任务（含确认） |

> Bot 仅响应 `TG_CHAT_ID` 配的私聊（owner only）。

## 🚀 首次部署（完整流程）

### 1. 本机准备

```bash
# 1.1 解压
unzip checkin-reminder-ct8.zip
cd checkin-reminder-ct8

# 1.2 装依赖 + 编译后端
npm install
npm run build                       # src/ → dist/

# 1.3 编译前端
cd web && npm install && npm run build && cd ..  # → web/dist/

# 1.4 打包（只带运行时需要的东西，不带 node_modules / 源码 / .env）
tar czf checkin.tar.gz dist web/dist package.json .env.example
```

### 2. 上传到共享主机

```bash
scp checkin.tar.gz 用户名@s编号.ct8.pl:~/checkin.tar.gz
# 例如：scp checkin.tar.gz username@example.ct8.pl:~/checkin.tar.gz
# 也可以选择用ssh软件的sftp功能，手动把checkin.tar.gz 复制到ct8服务器的家目录下
```

> ⚠️ 共享主机不能绑 80/443 端口，必须先申请一个高端口（见下一步）。

### 3. 申请端口（ct8 / serv00 专用）

SSH 登录后：

```bash
devil port add tcp random
# 输出示例：Added port 12345
```

记下端口号，下面要用。

### 4. 解压 + 装依赖

```bash
mkdir -p ~/checkin        #创建项目文件夹
cd ~/checkin
tar xzf ~/checkin.tar.gz
mv -n .env.example .env    # 第一次部署
npm install --production  # 共享主机不编译，sql.js 纯 JS 零依赖
```

### 5. 配 .env

```bash
nano .env
```

关键三行：

```env
PORT=12345                          # ← 改成步骤 3 拿到的端口
ADMIN_PASSWORD=你的密码
TG_BOT_TOKEN=bot_token              # 没有 TG bot 就留空
TG_CHAT_ID=你的_chat_id
```

> 引号别加。token 不要带 `'..'` 包裹，详见 .env.example。

### 6. 启动

```bash
nohup node dist/index.js > app.log 2>&1 &
cat app.log
```

看到 `🚀 签到提醒系统已启动` 就成了。

访问地址：

```
http://用户名.ct8.pl:12345
# 例：http://username.ct8.pl:12345
```

### 7. 保活（共享主机必加）

共享主机有两类挂法，要两层一起防：

| 层 | 作用 | 手段 |
|----|------|------|
| A. 进程死了 | ct8 杀 node | crontab 检测，没有就拉起 |
| B. 进程还在、TG 假死 | polling 409/断网后 Bot 不工作 | 代码自动重连 + 可选每天强制重启 |

#### A. 进程保活（必加）

```bash
crontab -e
```

加一行：

```
*/5 * * * * pgrep -f "node dist/index.js" || (cd ~/checkin && nohup node dist/index.js >> app.log 2>&1 &)
```

每 5 分钟检测，**进程没了**才拉起来。

#### B. TG 假死（推荐）

代码里 `telegram.ts` 已在 `polling_error` 后自动重连（不必改 cron 也能好很多）。

可选：每天强制整进程重启一次（双保险，和 A 不冲突）：

```
0 5 * * * pkill -f "node dist/index.js"; sleep 2; cd ~/checkin && nohup node dist/index.js >> app.log 2>&1 &
```

完整 `crontab -e` 示例（两行都加）：

```
*/5 * * * * pgrep -f "node dist/index.js" || (cd ~/checkin && nohup node dist/index.js >> app.log 2>&1 &)
0 5 * * * pkill -f "node dist/index.js"; sleep 2; cd ~/checkin && nohup node dist/index.js >> app.log 2>&1 &
```

## 🔄 升级（后续重新部署）

```bash
# 本机
npm run build
cd web && npm run build && cd ..
tar czf checkin.tar.gz dist web/dist package.json .env.example

# 上传
scp checkin.tar.gz 用户名@s编号.ct8.pl:~/checkin.tar.gz
# 也可以选择用ssh软件的sftp功能，手动把checkin.tar.gz 复制到ct8服务器的家目录下


# 服务器
ssh 用户名@s编号.ct8.pl
cd ~/checkin
pkill -f "node dist/index.js"
tar xzf ~/checkin.tar.gz
npm install --production
nohup node dist/index.js > app.log 2>&1 &
```

`.env` 不动，保留原密码和 token。

## 🤖 Telegram Bot 配置

1. Telegram 找 `@BotFather` → `/newbot` → 拿 Token
2. 给 Bot 发任意消息，浏览器访问 `https://api.telegram.org/bot<TOKEN>/getUpdates` 找 `chat.id`
3. 填进 `.env`
4. BotFather 里 `/setcommands` 把上文的命令列表贴进去
5. 重启服务

## 📊 API 接口

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| POST | `/api/auth/login` | 否 | 登录拿 JWT |
| GET | `/api/tasks` | JWT | 全部任务 |
| POST | `/api/tasks` | JWT | 新建任务 |
| PUT | `/api/tasks/:id` | JWT | 更新 |
| DELETE | `/api/tasks/:id` | JWT | 删除 |
| POST | `/api/checkin/:id` | JWT | 签到 |
| GET | `/api/checkin/:id/logs` | JWT | 签到历史 |
| GET | `/api/admin/export` | JWT | 导出 JSON |
| POST | `/api/admin/import` | JWT | 导入（?mode=merge/overwrite） |
| POST | `/api/test-tg` | JWT | 测试 TG 通知 |
| GET | `/health` | 否 | 健康检查 |

## 💾 备份与恢复

```bash
# 手动备份
./scripts/backup.sh
# 输出：./backups/tasks_20260101_120000.db（保留 7 天）

# 恢复（先停服）
pkill -f "node dist/index.js"
cp ./backups/tasks_XXX.db ./data/tasks.db
nohup node dist/index.js > app.log 2>&1 &
```

> sql.js 是文件型数据库，复制 `.db` 文件就是完整备份。

## ⚙️ 环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `PORT` | ✅ | 服务端口（共享主机必须用 devil 申请的端口） |
| `ADMIN_PASSWORD` | ✅ | 管理员密码（首次启动自动 bcrypt 加密） |
| `TG_BOT_TOKEN` | ❌ | 留空则 TG bot 不启动 |
| `TG_CHAT_ID` | ❌ | TG 接收通知的 chat id |
| `DB_PATH` | ❌ | 默认 `./data/tasks.db` |
| `TZ` | ❌ | 时区，默认 `Asia/Shanghai` |
| `CORS_ORIGIN` | ❌ | 默认 `*` |
| `JWT_SECRET` | ❌ | 留空自动生成随机 |

## 📂 目录结构

```
checkin-reminder-ct8/
├── dist/                  # 后端编译产物（上传）
├── web/dist/              # 前端编译产物（上传）
├── src/
│   ├── index.ts
│   ├── config.ts
│   ├── db/
│   │   ├── connection.ts  # sql.js 封装
│   │   ├── migrate.ts
│   │   └── queries.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── tasks.ts
│   │   ├── checkin.ts
│   │   └── admin.ts
│   ├── services/
│   │   ├── reminder.ts
│   │   └── telegram.ts    # TG bot 全功能
│   └── middleware/
├── web/                   # 前端源码
├── scripts/
│   ├── backup.sh
│   └── restore.sh
├── package.json
├── .env.example
└── README.md
```

## 🐛 常见问题

**Q: 启动报 `EPERM` 端口错误？**
A: 共享主机不能用 80/443 等特权端口。`devil port add tcp random` 拿端口号填进 `.env` 的 `PORT`。

**Q: 进程跑着跑着消失了？**
A: 共享主机会杀进程。`crontab -e` 加保活命令。

**Q: TG bot 启动失败 / 报 409 冲突？**
A: 同 token 在别处 polling 了。`pkill -f "node.*tg-relay"`，重启。

**Q: `npm install --production` 装不上？**
A: sql.js 是纯 JS，没有原生依赖，应该不会失败。如果失败看 `app.log` 报错。

**Q: 怎么从 Web 改完任务同步到 TG？**
A: Web 和 TG 共享同一个 SQLite 文件，改动实时同步。

## 📜 免责声明

本项目仅供个人学习与使用。提醒内容与签到记录属于个人事务，请勿用于商业用途或分享敏感信息。开发者不对因使用本项目造成的任何损失负责。

This project is for personal learning and self-hosting use only. The developer assumes no responsibility for any loss caused by using this project.
