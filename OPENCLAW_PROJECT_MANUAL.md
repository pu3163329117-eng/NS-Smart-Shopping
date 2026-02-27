# OpenClaw 交接说明书 (OpenClaw Assistant Handover Manual)

**生成日期**: 2026-02-27
**目标受众**: OpenClaw (ZeroClaw) Agent 助手
**项目代号**: NS Smart Shopping (Smart JA)

致 OpenClaw：这是一份由 Antigravity 整理的最新系统全景与部署架构说明书。请务必在执行新的全栈构建、云端调试、或是功能迭代前阅读本指南，遵循我们的基础架构逻辑，以避免代码重构导致的云端奔溃。

---

## 1. 核心仓库架构 (Monorepo)

当前代码库位于主目录 `f:\JA`，采用 **Monorepo (单体多包)** 架构，内部拆分为两个核心子项目：

### 📁 1.1 `smart-ja-web` (主全栈应用)
这是我们的主力客户端与业务网关层，也是 Zeabur 等云节点的主要挂载点。
- **前端架构**: Vue 3 + Vite + Tailwind CSS + Pinia
- **后端架构**: Node.js + Express (运行在 `server/server.js`)
- **数据层 (DB)**: `better-sqlite3` + Prisma 框架 (本地数据库文件放置于 `server/db/`)
- **AI 代理配置**: 含有多个专为了 ZeroClaw 准备的 Agent 配置文件 (`server/agents/*.yaml`)，以及相应的通信路由如 `server/routes/zeroclaw.js`。

### 📁 1.2 `smart-ja-backend` (微服务/数据库代理节点)
这是一个纯后台的微服务，未来负责与外部机构系统数据交互。
- **架构**: Node.js + Express
- **数据层 (DB)**: Sequelize ORM + PostgreSQL
- **状态**: 作为附加服务独立运行。

---

## 2. 部署与云引擎核心规则 (Zeabur CI/CD)

**!!! 高危警告 (CRITICAL RULES) !!!**
为了让平台能在 Vercel / Zeabur 上存活并成功部署，**绝对不能随意修改或删除以下环境文件**，这会直接导致云节点卡死或奔溃：

1. **`f:\JA\zbpack.json`**:
   - **作用**: 强制 Zeabur 引擎忽视后台微服务，并锁定发布主目录为 `"app_dir": "smart-ja-web"`。
2. **`f:\JA\smart-ja-web\nixpacks.toml`**:
   - **作用**: 强制排除了 `staticfile` 静态网页提供者 (`Caddy`)！
   - 我们的 web 目录由于是全栈服务，如果缺少此配置，Nixpacks 引擎会误将打包后的 dist 识别为纯静态包，从而导致 Express 后端 API 完全不启动并返回 `404`。
3. **`f:\JA\smart-ja-web\api\package.json`**:
   - **作用**: 包含 `{"type": "commonjs"}`。由于根目录配置了 `ES Module`，需要在此限制以防止 Serverless 函数解析报错。
4. **数据库优雅降级 (Graceful Degradation)**:
   - `smart-ja-web/server/utils/db.js`: 如果在 Serverless 容器检测到系统写保护 (`EROFS`)，会自动降级连接 `/tmp/db` 或 `:memory:`，防止持久化存储报错。
   - `smart-ja-backend/index.js`: 加入了 Sequelize 的 `.catch` 与 `.finally`，如果关联的 Postgres 无响应，依然可以保障 Express 节点运行（进入降级模式），防止 Docker 容器陷入无限 CrashLoopBackOff。

---

## 3. 入口与启动指令 (Execution)

### 3.1 启动 Web 核心应用
```bash
# 1. 预构建与依赖安装 (必须在 smart-ja-web 中执行)
cd smart-ja-web
npm install

# 2. 启动开发环境 (热更双启)
npm run dev      # 启动 Vite 前端 (默认 5173)
# 另开一个终端
cd server
npm run dev      # 启动 Nodemon Express (默认 3005)

# 3. 生产环境启动与测试 (模拟云端)
npm run build    # 将 Vue 编译至 dist 文件夹
npm start        # 默认会启动 Node.js 去代理 dist 静态文件与所有 /api 路由请求
```

### 3.2 启动 Backend 后端服务
```bash
cd smart-ja-backend
npm install
npm run dev      # 默认端口 3000
```

---

## 4. 给 OpenClaw 的协作守则 (Agent Protocol)

在接下来由你（OpenClaw）接手的自动化功能研发中，请坚守最初制定的 `NS_SMART_BLUEPRINT.md` (No Shit Code 蓝图)：
1. **组件原子化**: 为 Vue 增加新 Feature 时，切勿将组件写成 500 行的“怪兽”，随时将其拆分为 `components/` 内的模块单元。
2. **保持全栈融合启动**: 任何对后端 API `server/routes/` 的修改，请务必保证可以通过 `smart-ja-web/server/server.js` 提供的 `express.static` 在同一个端口代理转发前端，不要破坏现在的同源运行状态。
3. **Agent Yaml 配置集成**: 请在此基础之上继续完善 `server/agents/` 下各个助理如 (Sales, SupplyChain, Designer 等) 的 Workflow 注入。

## 5. 目前产品状态与核心功能矩阵 (Current Product Status)

基于现阶段交付的版本（MVP），Smart JA 已经打通了从视觉感到 AI 对接的基础闭环：

- **视觉与交互 (Apple/Huawei Style UI)**：
  - 构建了极简主义、毛玻璃风格、多巴胺配色的用户界面。
  - 完成了具备呼吸感动效的首屏英雄区 (Hero Page) 以及全屏视差滚动的商品卡片展示，给予 12-18 岁少年极强的高级科技感体验。
- **功能落地 (Features)**：
  - **AI 实验室与智能体 (AI Lab & Agents)**：通过后台的 YAML 配置文件体系，已经初步跑通了基于大语言模型（DeepSeek 接口代理）的多智能体框架。
  - **后端云端环境已破冰**：解决了前后端缝合在云节点上部署极易崩溃的历史遗留难题，现在的系统具备全栈（Vue 3 + Tailwind + Node.js Express）自适应托管及轻量级本地化持久降级体验。
  - **无缝用户体验闭环**：打通了用户注册、系统生成商品浏览（如 TechKid 智趣、绿意未来、艺创空间等占位级商模），以及调用后端代理服务的 AI 客服/智能导购对话基础线路。

---

## 6. 未来发展愿景与迭代方向 (Future Vision)

致 OpenClaw，后续从 MVP 迈向“全球首个由 AI 深度托管的青少年创业生态平台”的关键接力棒就在你手中。以下是我们绘制的远景路线图（Roadmap），请在未来的开发决策中以此为灯塔：

### 阶段一：激活核心 AI 矩阵 (The Agentic Ecosystem)
1. **完善“学生管家”**：目前在 `server/agents/` 下预留的四套智能体（市场调研、大数据趋势、商业分析规划、虚拟化产品政策）需全面实现。
2. **零阻力经营模拟**：让毫无底子的小学生在跟智能体“微信聊天”中，就能被 AI 引导出 SWOT 分析、一键生成“苹果风”详情页，并完成上架、智能推荐以及销售预警。

### 阶段二：打通众筹与真实交易闭环 (Crowdfunding & Real Economy)
1. **加入众筹机制板块**：从单纯买单变成展示项目的路演台。支持进度条实施更新以吸引真实的家长或外部机构资金。
2. **启用核心重负载后台**：启动现有的 `smart-ja-backend` 微服务（PostgreSQL 驱动模块），处理更庞大且高度复杂的金融流转表和外部开放 API 接口。

### 阶段三：扩展多级上帝视角 (Multi-View Dashboards)
1. 为 **投资机构/学校** 开通全局看板。
2. 为 **教育教练/老师** 提供实时的 AI AI 评估分数板。打通商业计划书机器预审流程，大幅降低人类导师的精力消耗。
3. 把前端打造得更加酷炫，强化消费者纯浏览器下的完美视觉购物体验。

**祝武运昌隆。** (Antigravity 留)
