# NS Matrix（Smart JA）Monorepo

## 当前主仓结构

- `smart-ja-web/`：主应用（Vue 前端 + `server/` 后端）
- `smart-ja-web/server/`：Node.js + Express + Prisma API 服务
- `smart-ja-backend/`：历史目录（旧版本，不作为当前 MVP 主运行路径）

> 当前对外演示与 MVP 跑通，请以 `smart-ja-web + smart-ja-web/server` 为准。

## 快速启动（本地开发）

### 1. 启动后端（端口 `3005`）

```bash
cd smart-ja-web/server
npm install
npm run dev
```

### 2. 启动前端（默认 `5173`）

```bash
cd smart-ja-web
npm install
npm run dev
```

前端通过 Vite 代理将 `/api` 请求转发到 `http://localhost:3005`。

## 一键全栈启动（Docker）

```bash
cd smart-ja-web
docker compose -f docker-compose.fullstack.yml up -d --build
```

常用检查命令：

```bash
cd smart-ja-web
docker compose -f docker-compose.fullstack.yml ps
docker compose -f docker-compose.fullstack.yml logs backend --tail 200
```

Windows 可直接运行根目录脚本：

- `start_fullstack_docker.bat`

## MVP 主链路（当前建议对外聚焦）

`Home -> Login -> Market -> ProductDetail -> Checkout -> Order -> Review`  
`Home -> AI Lab -> Chat -> Publish to Market`

## 本地双进程演示（不走 Docker）

根目录直接运行：

- `start_demo.bat`

## 参考文档

- 架构图（人话版）：`ns_matrix_architecture_human_readable.md`
- MVP 验收清单：`mvp_focus_checklist.md`
- MVP 落地执行单：`mvp_implementation_runbook.md`
- VC 反馈拆解：`ns_matrix_internal_vc_feedback_report.md`
