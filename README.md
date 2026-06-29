# ✅ VPS 签到提醒系统

一个自托管的签到提醒 Web 面板，支持 Telegram 通知。

## 功能

- 📋 任务卡片管理（增删改查）
- 🔐 JWT 认证 + bcrypt 密码加密
- 🔗 签到分享链接（无需登录即可签到）
- 📱 Telegram Bot 提醒通知
- 📊 签到历史记录
- 📁 分类筛选
- 🗜️ Gzip 压缩

## 提醒策略

| 状态 | 频率 | 限制 |
|------|------|------|
| 即将到期 | 每天 3 次（09:00, 14:00, 20:00） | 在 `remind_days_before` 天数内 |
| 已过期 | 每天 1 次 | 最多 3 天后停止 |

## 快速开始

### Docker Compose（推荐）

```bash
# 1. 克隆项目
git clone <your-repo>
cd checkin-reminder

# 2. 创建 .env 文件
cp .env.example .env
# 编辑 .env，设置 ADMIN_PASSWORD 和 JWT_SECRET

# 3. 启动
docker compose up -d
```

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | `3000` |
| `ADMIN_PASSWORD` | 管理员密码 | `admin123` |
| `JWT_SECRET` | JWT 签名密钥 | 随机生成 |
| `TG_BOT_TOKEN` | Telegram Bot Token | 空 |
| `TG_CHAT_ID` | Telegram Chat ID | 空 |
| `DB_PATH` | SQLite 数据库路径 | `./data/tasks.db` |
| `CORS_ORIGIN` | CORS 允许的来源 | `*` |
| `BASE_URL` | 服务外部访问地址 | 空 |

### Telegram Bot 配置

1. 在 Telegram 搜索 `@BotFather`，创建 Bot，获取 Token
2. 给 Bot 发一条消息，然后访问 `https://api.telegram.org/bot<TOKEN>/getUpdates` 获取 Chat ID
3. 将 Token 和 Chat ID 填入 `.env`

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 登录获取 JWT |
| GET | `/api/tasks` | 获取所有任务 |
| POST | `/api/tasks` | 创建任务 |
| PUT | `/api/tasks/:id` | 更新任务 |
| DELETE | `/api/tasks/:id` | 删除任务 |
| POST | `/api/checkin/:id` | 手动签到 |
| GET | `/api/checkin/:id/logs` | 签到历史 |
| GET | `/api/share/:id` | 获取分享链接 |
| GET | `/api/share/:id/checkin` | 分享链接签到 |
| POST | `/api/test-tg` | 测试 TG 通知 |

## 技术栈

- **后端**: Express + TypeScript + better-sqlite3
- **前端**: React + Vite + Tailwind CSS
- **认证**: JWT + bcryptjs
- **通知**: node-telegram-bot-api
- **容器**: Docker + Alpine Linux
