# 项目交接说明文档 (Project Handover for Antigravity)

**日期**: 2026-02-25
**项目**: NS Smart Shopping (Smart JA Web)
**当前状态**: 开发中 (Development)

## 1. 项目概况
本项目是一个集成了AI实验室（DeepSeek）、创客中心（Maker）、电商市场（Market）的综合性Web应用。
- **前端**: Vue 3 + Vite + Tailwind CSS + Pinia
- **后端**: Node.js + Express
- **数据库**: 本地 JSON 文件存储 (位于 `server/db/`)
- **AI集成**: DeepSeek API (通过后端代理调用)

## 2. 关键配置与环境 (Configuration)

### 2.1 端口配置
为避免与系统常见服务冲突，项目使用了非标准端口：
- **后端 (Server)**: `3005` (原默认为3000，已修改)
- **前端 (Client)**: `5173` (Vite 默认)

**配置文件位置**:
- 后端端口: `server/.env` -> `PORT=3005`
- 前端代理: `vite.config.js` -> `proxy: { '/api': 'http://localhost:3005', ... }`

### 2.2 环境变量 (.env)
后端 `server/.env` 文件包含关键密钥：
```env
PORT=3005
JWT_SECRET=your_jwt_secret_key_here
DEEPSEEK_API_KEY=sk-xxxx (实际Key请查看文件)
DEEPSEEK_API_URL=https://api.deepseek.com/chat/completions
```

## 3. 启动说明 (How to Run)

### 步骤 1: 启动后端
```powershell
cd server
npm install  # 如果是首次运行
npm run dev
```
*成功标志*: 终端显示 `Server running on port 3005` 且数据库初始化成功。

### 步骤 2: 启动前端
```powershell
# 在项目根目录 (F:\JA\smart-ja-web)
npm install  # 如果是首次运行
npm run dev
```
*成功标志*: 终端显示 `Local: http://localhost:5173/`。

## 4. 核心模块说明

### 4.1 AI 实验室 (AI Lab)
- **入口**: `/ai-lab`
- **文件**: `src/views/AILab.vue`
- **逻辑**:
  - 用户选择 Agent（如 "供应链专家"）。
  - 前端发送请求到后端 `/api/ai/chat`。
  - 后端调用 DeepSeek API 并返回结果。
- **最近变更**:
  - 移除了所有固定回复格式（JSON/Markdown约束），允许 AI 自由回复。
  - 移除了前端/后端的 Mock 数据机制，确保直接调用真实 API。
  - 超时时间延长至 120秒，以适应 DeepSeek 的响应速度。

### 4.2 用户与认证 (Auth)
- **文件**: `server/controllers/authController.js`, `src/store/auth.js`
- **机制**: JWT 认证。支持 `Bearer Token`。
- **数据**: 用户数据存储在 `server/db/users.json`。密码在登录时自动从明文迁移到 Bcrypt 哈希。

### 4.3 创客中心 (Maker)
- **入口**: `/maker/dashboard`
- **功能**: 发布服务、管理订单、查看收益。

## 5. 已知问题与注意事项 (Known Issues)

1. **DeepSeek 响应时间**:
   - 由于 DeepSeek 模型推理可能较慢，前端已设置 2分钟超时。如果遇到 "网络连接失败"，通常是 API 响应超过了此限制或 API 服务本身不稳定。

2. **端口占用**:
   - 如果启动后端报错 `EADDRINUSE`，请检查 3005 端口是否被占用，或检查是否有残留的 node 进程。

3. **UserProfile 空白问题**:
   - `UserProfile.vue` 页面在某些情况下可能加载失败或显示空白，需进一步排查数据加载逻辑。

4. **文件上传**:
   - 图片上传至 `server/uploads/`。请确保该目录存在且有写入权限。

## 6. 维护建议
- **数据库备份**: 定期备份 `server/db/*.json` 文件。
- **API 扩展**: 如需添加新 AI 模型，请修改 `server/routes/ai.js` 中的 API 调用逻辑。

---
**致 Antigravity 团队**:
项目基础架构已搭建完毕，核心 AI 通路已打通且移除了限制性代码。请基于此版本继续迭代。
