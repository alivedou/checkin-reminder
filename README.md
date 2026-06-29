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

---

## 容器平台部署（Sealos / Railway / Zeabur / Fly.io 等）

### 前置条件

1. 在容器平台创建一个服务，使用公开镜像：
   ```
   ghcr.io/alivedou/checkin-reminder:latest
   ```
2. **配置持久化存储**——挂载一个 Volume 到 `/app/data`（这是唯一必需的非代码配置）

### 环境变量

部署时在平台的环境变量面板中至少设置以下两项：

| 变量 | 说明 | 示例 |
|------|------|------|
| `ADMIN_PASSWORD` | 你的管理密码 | `MyP@ssw0rd2024` |
| `JWT_SECRET` | 随机字符串（越长越好） | `openssl rand -hex 32` 的输出 |

以下为可选：

| 变量 | 说明 |
|------|------|
| `TG_BOT_TOKEN` | Telegram Bot Token（不填则关闭 TG 通知） |
| `TG_CHAT_ID` | Telegram Chat ID |
| `BASE_URL` | 服务公网地址（用于生成正确的分享链接） |

### 部署模板

**Sealos（Docker Compose 导入）：**
```yaml
services:
  checkin:
    image: ghcr.io/alivedou/checkin-reminder:latest
    ports:
      - "3000:3000"
    volumes:
      - data:/app/data
    environment:
      - ADMIN_PASSWORD=你的强密码
      - JWT_SECRET=你的随机密钥
      # Telegram 可选
      - TG_BOT_TOKEN=
      - TG_CHAT_ID=
volumes:
  data:
```

**Railway / Zeabur / Fly.io：**
- 镜像填 `ghcr.io/alivedou/checkin-reminder:latest`
- 添加 Environment Variables：`ADMIN_PASSWORD`、`JWT_SECRET`（及 TG 相关）
- 挂载 Volume 到 `/app/data`
- 暴露端口 `3000`

### 验证部署

部署后查看日志，确认以下三行：

```
✅ Admin password synced from env    ← 密码写入 DB 成功
📁 Storage:     外部挂载              ← 持久化已生效（非"容器内部"）
📱 TG:          已配置 / 未配置
```

如果看到 `📁 Storage: 容器内部（重启数据会丢失！）`，说明未正确挂载持久化存储，需要检查 Volume 配置。

---

## 自行部署（Fork 用户 / 本地 VPS）

### GitHub Actions 构建

1. Fork 本仓库到你自己的 GitHub 账号
2. **Actions → Docker Build → Run workflow** 手动触发
3. 镜像推送到 `ghcr.io/<你的用户名>/checkin-reminder:latest`
4. `ghcr.io` 镜像**默认为私有**，部署时需配置 PAT 认证拉取

### 本地 Docker 构建

```bash
git clone https://github.com/alivedou/checkin-reminder.git
cd checkin-reminder

# 方式一：docker compose（推荐）
# 编辑 .env 设置密码后直接启动
cp .env.example .env
vi .env
docker compose up -d

# 方式二：手动 docker build + run
docker build -t checkin-reminder .
docker run -d -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -e ADMIN_PASSWORD=你的密码 \
  -e JWT_SECRET=你的密钥 \
  checkin-reminder
```

### VPS 日常维护

```bash
docker compose logs -f          # 查看日志
docker compose restart          # 重启
docker compose down             # 停止
git pull && docker compose up -d --build  # 更新
```
