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

## 一键部署（推荐仓库拥有者使用）

通过 GitHub Actions 构建**自带密码**的 Docker 镜像，部署到容器平台后**无需设置任何环境变量**。

### 第 1 步：设置 GitHub Secrets

在仓库 **Settings → Secrets and variables → Actions** 中添加以下 Secrets：

| Secret 名称 | 内容 | 是否必填 |
|-------------|------|:--:|
| `ADMIN_PASSWORD` | 你的管理密码 | ✅ |
| `JWT_SECRET` | 随机字符串，越长越好（如 `openssl rand -hex 32`） | ✅ |
| `TG_BOT_TOKEN` | Telegram Bot Token | 否 |
| `TG_CHAT_ID` | Telegram Chat ID | 否 |

**注意**：`JWT_SECRET` 务必设置一个固定值，否则每次重启镜像会自动生成新密钥，导致所有设备需要重新登录。

### 第 2 步：触发 Docker 构建

1. 打开仓库 **Actions** → **Docker Build** → **Run workflow**
2. 标签保持默认 `latest` 或自定义
3. 点击 **Run workflow**，等待构建完成（约 8-12 分钟）

构建完成后镜像推送至 `ghcr.io/alivedou/checkin-reminder:latest`。

### 第 3 步：容器平台部署

镜像已内置密码和密钥，直接拉取即可，**不需要填任何环境变量**。

唯一需要配置的是**持久化存储**，否则重启后数据丢失：

**Sealos / Docker Compose 导入：**
```yaml
services:
  checkin:
    image: ghcr.io/alivedou/checkin-reminder:latest
    ports:
      - "3000:3000"
    volumes:
      - data:/app/data          # ← 必须挂载持久化卷
volumes:
  data:
```

**Railway / Zeabur / Fly.io 等：**
- 镜像地址填 `ghcr.io/alivedou/checkin-reminder:latest`
- 挂载一个 Volume 到 `/app/data` 路径
- 无需设置任何环境变量

### 第 4 步：验证

部署后查看日志，确认：

```
✅ Admin password synced from env    ← hash 写入成功
📁 Storage:     外部挂载              ← 持久化存储已挂载
📱 TG:          已配置 / 未配置
```

---

## 自行部署（Fork 用户指南）

如果你 fork 了此仓库，按以下步骤构建你自己的镜像。

### 1. Fork 并配置 Secrets

1. Fork 本仓库到你自己的 GitHub 账号
2. 在 fork 的仓库中进 **Settings → Secrets and variables → Actions**，添加 Secrets（同上表）
3. **Settings → Actions → General → Workflow permissions** 设为 **Read and write permissions**

### 2. 触发构建

**Actions → Docker Build → Run workflow**，等待构建完成。

镜像会推送到 `ghcr.io/<你的GitHub用户名>/checkin-reminder:latest`。

### 3. 本地手动构建（不用 GitHub Actions）

```bash
git clone https://github.com/<你的用户名>/checkin-reminder.git
cd checkin-reminder

docker build \
  --build-arg ADMIN_PASSWORD=你的密码 \
  --build-arg JWT_SECRET=你的密钥 \
  --build-arg TG_BOT_TOKEN=你的TG Token \
  --build-arg TG_CHAT_ID=你的TG Chat ID \
  -t checkin-reminder:latest .
```

### 4. 部署

用你自己的镜像地址替换文档中的 `alivedou/checkin-reminder`，其余步骤同上。

### 5. 关于镜像隐私

- `ghcr.io` 上的镜像**默认为私有**，仅仓库拥有者可以拉取
- 使用 `--build-arg` 传入的密码不会出现在镜像层历史中（`docker history` 不可见）
- 镜像已内含密码，**请勿将其公开**

---

## VPS 手动部署（Docker Compose）

适用于自己有一台 Linux VPS（腾讯云/阿里云/甲骨文等）。

```bash
# 1. 安装 Docker
curl -fsSL https://get.docker.com | sudo bash

# 2. 克隆项目
git clone https://github.com/alivedou/checkin-reminder.git
cd checkin-reminder

# 3. 本地构建（传入密码）
docker build \
  --build-arg ADMIN_PASSWORD=你的密码 \
  --build-arg JWT_SECRET=你的密钥 \
  -t checkin-reminder .

# 4. 启动
docker compose up -d
```

编辑 `docker-compose.yml` 中的环境变量后也可直接 `docker compose up -d --build`，无需手动传 `--build-arg`。

### 日常维护

```bash
docker compose logs -f          # 查看日志
docker compose restart          # 重启服务
docker compose down             # 停止服务
docker compose up -d --build    # 更新并重建
```
