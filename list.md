# 签到提醒系统 - v2 改进计划

## 已完成

| # | 功能 | 说明 | 状态 |
|---|------|------|:--:|
| D1 | TG 提醒随机延迟 | 批量发送时随机延迟 0-30s 启动 + 每条消息间 2-6s 间隔，防止容器平台判定批量外呼/滥用封号 | ✅ |

## 一、功能清单

### F1. 中英文切换

| \# | 任务 | 说明 | 优先级 | 状态 |
| --- | --- | --- | --- | --- |
| F1-1 | 建立 i18n 翻译文件 | `file web/src/i18n/zh.ts` + `file en.ts`，覆盖所有 UI 文案（按钮、提示、状态、弹窗） | 高 | ⬜ |
| F1-2 | 创建 LanguageContext | React Context + `localStorage` 持久化，默认中文，切换即时生效 | 高 | ⬜ |
| F1-3 | Header 加语言切换按钮 | 🌐 图标按钮，点击中/EN 切换，放在管理员登录按钮左侧 | 高 | ⬜ |
| F1-4 | 替换所有硬编码文案 | `LandingPage`、`App`、`TaskCard`、`AddTaskModal`、`EditTaskModal`、`StatusBadge`、`PublicTaskCard` 全部走 `t.xxx` | 高 | ⬜ |
| F1-5 | 签到历史弹窗 + 签到来源文案国际化 | source 显示：手动/Manual、TG Bot、分享链接/Share Link | 中 | ⬜ |

**技术方案：**

- 不引入 `react-i18next` 等重依赖，手写轻量 Context + 翻译对象
- 翻译 key 按模块分组：`common.*`、`landing.*`、`task.*`、`modal.*`、`status.*`、`disclaimer.*`
- 支持插值：`t('还剩{days}天', { days: 5 })` 用简单 replace 实现
- `localStorage` key: `checkin_lang`，值 `zh` / `en`

---

### F2. 底部合规声明

| \# | 任务 | 说明 | 优先级 | 状态 |
| --- | --- | --- | --- | --- |
| F2-1 | 声明文案（中英文各一份） | 中文完整版 + English Full Version，适配签到提醒场景 | 高 | ⬜ |
| F2-2 | LandingPage 底部 Footer 改造 | 替换现有简单提示，加入简短免责声明 + 「查看详情」链接 | 高 | ⬜ |
| F2-3 | 免责声明弹窗 | 点击「查看详情」弹出完整声明，带滚动区域，中英文随语言切换 | 高 | ⬜ |
| F2-4 | 管理页面底部也加一行简短声明 | 与 LandingPage 保持一致 | 中 | ⬜ |

**声明文案（签到提醒适配版）：**

中文简短版：

> ⚠ 本工具为个人非营利性签到提醒项目，仅供合法用途。使用即视为同意免责条款。

English short:

> ⚠ Personal non-commercial check-in reminder tool for lawful use only. By using this service you agree to our disclaimer.

中文完整版：

> 本工具为个人非营利性技术实验项目，仅提供签到任务管理和到期提醒服务。
>
> 1. 用户应确保所管理的签到任务内容合法合规，严禁用于违法违规用途。
> 2. 本工具不对数据的永久性、安全性、完整性作任何承诺，请自行备份重要数据。
> 3. 提醒通知的及时性受网络、服务商等不可控因素影响，不保证 100% 送达。
> 4. 本工具可根据服务器状态随时暂停或终止服务，恕不另行通知。
>    使用本工具即表示您已阅读并同意以上条款。

English full:

> This tool is a personal, non-commercial technical experiment providing check-in task management and reminder services.
>
> 1. Users must ensure all managed tasks are lawful. Illegal use is strictly prohibited.
> 2. No guarantees are made regarding data permanence, security, or integrity. Please back up important data.
> 3. Notification delivery is subject to factors beyond our control (network, service providers) and is not 100% guaranteed.
> 4. The tool may suspend or terminate service at any time without prior notice.
>    By using this tool, you acknowledge and agree to these terms.

---

### F3. 管理员一键导出/导入

| \# | 任务 | 说明 | 优先级 | 状态 |
| --- | --- | --- | --- | --- |
| F3-1 | 后端导出接口 `GET /api/export` | 导出全部 tasks + checkin_logs 为 JSON，带时间戳文件名 | 高 | ⬜ |
| F3-2 | 后端导入接口 `POST /api/import` | 接收 JSON，支持两种模式：`overwrite`（清空后导入）/ `merge`（按 id 合并，跳过已存在） | 高 | ⬜ |
| F3-3 | 前端导出按钮 | Header 工具栏加「📥 导出」按钮，点击自动下载 JSON 文件 | 高 | ⬜ |
| F3-4 | 前端导入按钮 + 弹窗 | Header 工具栏加「📤 导入」按钮，弹窗支持选择文件 + 选择合并模式 + 预览任务数量 | 高 | ⬜ |
| F3-5 | 导入确认二次弹窗 | 显示「将导入 X 个任务，Y 条签到记录，模式：覆盖/合并」，确认后执行 | 中 | ⬜ |
| F3-6 | 导入结果反馈 | 显示成功/失败数量，失败原因（格式错误、缺少字段等） | 中 | ⬜ |

**导出 JSON 结构：**

```json
{
  "version": 1,
  "exported_at": "2026-06-29T10:00:00.000Z",
  "tasks": [...],
  "checkin_logs": [...]
}
```

**导入逻辑：**

- `overwrite`：先 `DELETE FROM checkin_logs` + `DELETE FROM tasks`，再逐条 INSERT
- `merge`：按 task id 判重，已存在跳过，新任务插入；签到记录按 task_id 关联插入
- 返回 `{ imported: { tasks: N, logs: M }, skipped: K, errors: [...] }`

---

## 二、执行顺序

1. ⬜ 备份项目 (`file scripts/backup.sh`)
2. ⬜ F1-1 \~ F1-2：i18n 基础设施（翻译文件 + Context）
3. ⬜ F1-3：Header 语言切换按钮
4. ⬜ F1-4 \~ F1-5：逐步替换各组件硬编码文案
5. ⬜ F2-1 \~ F2-4：合规声明（文案 + Footer + 弹窗）
6. ⬜ F3-1 \~ F3-2：后端导出/导入接口
7. ⬜ F3-3 \~ F3-6：前端导出/导入 UI
8. ⬜ 全量自测（中英文切换、声明显示、导出导入流程）
9. ⬜ 更新 README.md + 打包备份

## 三、测试方案

### T1. 中英文切换

| 测试项 | 操作 | 预期结果 |
| --- | --- | --- |
| T1-1 | 首次访问（无 localStorage） | 默认显示中文 |
| T1-2 | 点击 🌐 按钮切换到英文 | 所有文案即时切换为英文，无需刷新 |
| T1-3 | 刷新页面 | 保持英文（localStorage 记住选择） |
| T1-4 | 切换语言后打开各弹窗 | 弹窗内容跟随当前语言 |
| T1-5 | 签到历史弹窗 | 来源显示对应语言（Manual/TG Bot/Share Link） |

### T2. 合规声明

| 测试项 | 操作 | 预期结果 |
| --- | --- | --- |
| T2-1 | LandingPage 底部 | 显示简短免责声明 + 「查看详情」链接 |
| T2-2 | 点击「查看详情」 | 弹出完整声明弹窗，可滚动 |
| T2-3 | 切换语言后查看声明 | 中英文自动切换 |
| T2-4 | 管理页面底部 | 同样显示简短声明 |

### T3. 导出/导入

| 测试项 | 操作 | 预期结果 |
| --- | --- | --- |
| T3-1 | 点击「📥 导出」 | 下载 JSON 文件，包含 tasks + checkin_logs |
| T3-2 | 导出的 JSON 内容 | version=1，有 exported_at，tasks 和 logs 数组完整 |
| T3-3 | 点击「📤 导入」→ 选择文件 → 合并模式 | 弹窗显示任务预览，确认后导入 |
| T3-4 | 合并模式导入已存在的任务 | 跳过重复，只导入新任务 |
| T3-5 | 覆盖模式导入 | 清空现有数据，全部导入 |
| T3-6 | 导入格式错误的文件 | 提示「文件格式错误」，不修改现有数据 |
| T3-7 | 导入后页面刷新 | 任务列表更新正确 |

## 四、技术约束

- **增量开发**：不改已有组件结构，新功能加新模块
- **零新依赖**：i18n 手写 Context，不引入 i18n 库
- **UI 一致性**：沿用现有暗色主题 + CSS 变量体系，按钮风格与现有保持一致
- **导出/导入**：纯 JSON，不引入 CSV/Excel 依赖
- **安全**：导出/导入接口都需要 JWT 认证