# Checkin Reminder

VPS 签到提醒系统 — 管理定期签到任务，到期前通过 Telegram 推送提醒。

## 环境变量说明

启动前需配置 `.env` 文件（参考 `.env.example`）。**Docker 部署通过 `docker-compose.yml` 的环境变量字段配置，无需手动 `.env`。**

| 变量 | 必填 | 默认值 | 说明 |
|------|:--:|--------|------|
| `PORT` | 否 | `3000` | 网页服务的端口号。就好比你家门牌号，浏览器通过这个数字找到你的服务 |
| `ADMIN_PASSWORD` | **建议修改** | `admin123` | 管理后台的登录密码。**务必改成自己的密码**，首次启动后系统会自动加密存储 |
| `JWT_SECRET` | **建议修改** | 随机生成 | 登录凭证的加密密钥，相当于"签名印章"。**建议设置一个固定的复杂字符串**，否则每次重启服务都会换新密钥，导致需要重新登录 |
| `TG_BOT_TOKEN` | 否 | 空 | Telegram 机器人的 Token。不填就不启用 Telegram 通知。获取方式：在 TG 搜 `@BotFather`，发 `/newbot` 创建机器人后拿到 |
| `TG_CHAT_ID` | 否 | 空 | Telegram 接收提醒的聊天 ID。获取方式：给 `@userinfobot` 发消息即可看到自己的 ID |
| `DB_PATH` | 否 | `./data/tasks.db` | 数据库文件的存放路径。Docker 部署时已映射到容器外，通常不用改 |
| `TZ` | 否 | `Asia/Shanghai` | 时区。填你所在地的标准时区名，例如 `Asia/Shanghai`（北京/上海时间） |
| `CORS_ORIGIN` | 否 | `*` | 允许哪些网站访问本服务接口。默认 `*` 表示允许所有，单机部署不用改 |
| `BASE_URL` | 否 | 空 | 你的服务在公网上的访问地址，例如 `https://checkin.example.com`。填了之后分享链接才正确 |

---

## VPS Docker 部署

> 适用场景：你有一台自己的 Linux VPS（如腾讯云/阿里云/甲骨文/搬瓦工等）。

### 第 1 步：安装 Docker 和 Docker Compose

```bash
# 安装 Docker（Ubuntu/Debian）
curl -fsSL https://get.docker.com | sudo bash

# 启动 Docker 并设置开机自启
sudo systemctl enable docker --now

# 验证安装
docker --version
docker compose version
```

### 第 2 步：克隆项目

```bash
git clone https://github.com/<你的用户名>/checkin-reminder.git
cd checkin-reminder
```

### 第 3 步：配置环境变量

编辑 `docker-compose.yml`，修改 `environment` 下面的关键变量：

```yaml
environment:
  - ADMIN_PASSWORD=你的强密码          # ← 必须修改
  - JWT_SECRET=你的随机字符串          # ← 必须修改（可以随便打一串英文数字）
  - TG_BOT_TOKEN=123456:xxxxx         # ← 可选，需要 Telegram 提醒才填
  - TG_CHAT_ID=987654321              # ← 可选，同上
```

其他变量保持默认即可。

### 第 4 步：启动服务

```bash
docker compose up -d
```

### 第 5 步：访问与验证

- 浏览器打开 `http://你的VPS的IP:3000`
- 用你设置的 `ADMIN_PASSWORD` 登录
- 数据库文件保存在 `./data/` 目录，重启不会丢失

### 日常维护

```bash
# 查看日志
docker compose logs -f

# 重启服务
docker compose restart

# 停止服务
docker compose down

# 更新服务（拉新代码后）
git pull
docker compose up -d --build
```

---

## 容器平台部署

> 适用场景：你用 Sealos / Railway / Zeabur / Fly.io 等容器平台，不需要自己管理服务器。

### 方式一：Sealos（推荐国内用户）

Sealos 支持直接导入 `docker-compose.yml`。

1. 打开 [Sealos Cloud](https://cloud.sealos.run)，注册登录
2. 点击**应用商店 → 自定义应用 → 从 Docker Compose 导入**
3. 粘贴以下内容，**记得修改密码和密钥**：

```yaml
services:
  checkin:
    image: ghcr.io/<你的用户名>/checkin-reminder:latest
    ports:
      - "3000:3000"
    volumes:
      - data:/app/data
    environment:
      - PORT=3000
      - ADMIN_PASSWORD=你的强密码
      - JWT_SECRET=你的随机密钥
      - TG_BOT_TOKEN=
      - TG_CHAT_ID=
      - DB_PATH=/app/data/tasks.db
      - TZ=Asia/Shanghai
volumes:
  data:
```

4. 点击部署，等待启动完成
5. Sealos 会自动分配一个公网域名，直接访问即可

### 方式二：Railway（推荐海外用户）

1. 打开 [Railway](https://railway.app)，用 GitHub 登录
2. 点击 **New Project → Deploy from GitHub repo**，选择你的项目仓库
3. Railway 会自动检测 Dockerfile 并构建
4. 在 **Variables** 页面添加以下环境变量：

```
ADMIN_PASSWORD=你的强密码
JWT_SECRET=你的随机密钥
TG_BOT_TOKEN=如果不需要可不填
TG_CHAT_ID=如果不需要可不填
```

5. 在 **Settings** 页面添加一个 Volume，挂载路径为 `/app/data`
6. 等待自动部署，Railway 也会分配一个公网域名

### 方式三：其他平台通用步骤

任何支持 Dockerfile 的容器平台，部署步骤都一样：

1. 将项目推送到 GitHub 仓库
2. 在平台关联该仓库
3. 设置环境变量（至少 `ADMIN_PASSWORD` 和 `JWT_SECRET`）
4. 配置持久化存储（将 `/app/data` 挂载到持久卷，否则数据会在重启时丢失）
5. 暴露 3000 端口
6. 部署

---

## 本地开发

```bash
cp -n .env.example .env    # 首次
npm install
cd web && npm install && npm run build && cd ..
npm run dev                # 开发模式（热重载）
```

详见 [AGENTS.md](./AGENTS.md)。
