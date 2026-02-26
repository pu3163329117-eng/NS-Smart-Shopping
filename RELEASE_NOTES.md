# v1.0.0: NS-AI 智能购物生态系统正式上线 (Official Launch)

我们很高兴地宣布 **NS-AI Smart Shopping v1.0.0** 正式发布！这是一个融合了前沿 AI 技术与沉浸式交互体验的下一代电商平台。

## 🌟 核心亮点 (Key Highlights)

### 🤖 深度 AI 集成 (Deep AI Integration)
- **Deepseek 模型驱动**: 全站接入 Deepseek 大语言模型 API，为商品和众筹项目提供实时、深度的智能分析。
- **AI 商品全维测评**: 商品详情页新增 "AI 深度分析" 面板，自动生成雷达图（创新性、实用性、性价比）及详细的购买建议。
- **AI 众筹智囊**: 众筹项目配备 AI 评估报告，从 "创新指数"、"社会价值"、"可行性" 三个维度进行评分和点评。
- **智能推荐引擎**: 首页及侧边栏购物车集成 AI 每日精选与个性化推荐算法。
- **AI 实验室**: 独立的 AI 交互实验空间，探索更多智能购物可能性。

### 🎨 赛博朋克与玻璃拟态 UI (Cyberpunk & Glassmorphism UI)
- **沉浸式视觉**: 采用深色模式基调，结合霓虹渐变与玻璃拟态（Glassmorphism）设计，打造未来感十足的购物环境。
- **流畅动效**: 全站应用 GSAP 动画引擎，实现丝滑的滚动体验、打字机特效、呼吸灯指示器及卡片 3D 倾斜交互。
- **细节打磨**: 自定义滚动条、动态背景 Blob 动画、交互式 Hover 效果。

## 🛍️ 功能模块 (Features)

### 1. 多元市场 (NS Market)
- 支持多维度商品筛选与排序。
- 响应式商品卡片，支持快速预览与加入购物车。
- 无缝集成的商品详情弹窗。

### 2. 创意众筹 (Crowdfunding)
- 展示具有创新潜力的科技项目。
- 实时进度条与资金追踪。
- 集成 AI 投资价值分析卡片。

### 3. 用户中心 (User Center)
- 全功能个人资料管理（头像、昵称、收货地址）。
- 订单管理、钱包资产、收藏夹功能。
- 数据可视化仪表盘。

### 4. 智能购物车 (Smart Cart)
- 侧边栏抽屉式设计，支持随时呼出。
- 实时价格计算与数量管理。
- 购物车专属的 AI 凑单推荐。

## 💻 技术栈 (Tech Stack)

- **Frontend**: Vue 3 (Composition API), Vite, Tailwind CSS
- **State Management**: Pinia (Cart, User, Products, Favorites)
- **Router**: Vue Router 4
- **Animation**: GSAP (GreenSock Animation Platform)
- **Visualization**: Apache ECharts
- **AI Integration**: Deepseek API (via custom aiService)
- **Backend**: Node.js (Foundation)

## 🚀 快速开始 (Quick Start)

```bash
# 克隆仓库
git clone https://github.com/pu3163329117-eng/NS-Smart-Shopping.git

# 进入目录
cd NS-Smart-Shopping/smart-ja-web

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

---
*NS-AI Team - Redefining Shopping with Intelligence.*
