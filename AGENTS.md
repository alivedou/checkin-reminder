# Checkin Reminder - AGENTS.md

## 项目架构

- 根目录: Express.js + TypeScript 后端，入口 `src/index.ts`
- `web/`: React + Vite + TailwindCSS 前端，构建产物 `web/dist/` 由 Express 作为静态文件托管
- 数据库: SQLite (better-sqlite3)，首次启动自动创建于 `./data/tasks.db`
- Telegram Bot 可选，不配 `TG_BOT_TOKEN` 就跳过

## 本地运行

```
cp -n .env.example .env    # 首次
npm install
cd web && npm install && npm run build && cd ..
npm run dev                # tsx watch src/index.ts
```

## 关键命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 后端开发模式 (tsx watch, 热重载) |
| `npm run build` (root) | 编译 TS → `dist/` |
| `npm run start` | 运行编译后的生产版本 |
| `npm run migrate` | 单独运行数据库迁移 |
| `cd web && npm run dev` | 前端 Vite 开发服务器 |
| `cd web && npm run build` | 构建前端到 `web/dist/` |

## 注意事项

- `.env` 是 gitignored；`.env.example` 是模板
- `data/` 目录是 gitignored；代码启动时会自动创建
- 生产部署用 Docker: `docker compose up -d`
- `.github/workflows/docker-build.yml` 手动触发构建并推送多架构镜像到 ghcr.io
