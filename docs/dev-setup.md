# NS Smart Shopping 开发环境设置指南

> 遵循"反重力"开发规范

## 1. 环境要求

### 1.1 系统要求
- Node.js 18+ (推荐20+)
- npm 9+ 或 yarn 1.22+
- Git 2.30+
- 推荐使用 VS Code 作为编辑器

### 1.2 推荐 VS Code 扩展
```json
{
  "推荐扩展": [
    "Vue.volar",           // Vue 3 支持
    "dbaeumer.vscode-eslint", // ESLint
    "esbenp.prettier-vscode", // Prettier
    "bradlc.vscode-tailwindcss", // Tailwind CSS
    "prisma.prisma",       // Prisma ORM
    "GitHub.copilot"       // AI 辅助编程
  ]
}
```

## 2. 快速开始

### 2.1 克隆项目
```bash
git clone https://github.com/pu3163329117-eng/NS-Smart-Shopping.git
cd NS-Smart-Shopping
```

### 2.2 安装依赖
```bash
# 安装根目录依赖（开发工具）
npm install

# 安装子项目依赖（会自动执行）
# 或者手动安装：
cd smart-ja-web && npm install
cd smart-ja-backend && npm install
```

### 2.3 环境配置
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，配置必要的环境变量
# 需要配置：
# - DEEPSEEK_API_KEY (DeepSeek API密钥)
# - DATABASE_URL (数据库连接)
# - 其他必要的API密钥
```

## 3. 启动开发服务器

### 3.1 一键启动（推荐）
```bash
# 同时启动前端和后端
npm run dev
```

### 3.2 分别启动
```bash
# 启动前端 (Vue 3 + Vite)
cd smart-ja-web
npm run dev
# 访问: http://localhost:5173

# 启动后端 (Node.js + Express)
cd smart-ja-backend
npm run dev
# API地址: http://localhost:3000
```

### 3.3 数据库初始化
```bash
# 进入前端项目（包含数据库）
cd smart-ja-web

# 初始化数据库（如果使用Prisma）
npx prisma db push
# 或
npx prisma migrate dev
```

## 4. 开发工作流

### 4.1 Git 工作流
```bash
# 1. 拉取最新代码
git pull origin main

# 2. 创建功能分支
git checkout -b feat/your-feature-name

# 3. 开发并提交
git add .
git commit -m "feat: 描述你的功能"

# 4. 推送分支
git push origin feat/your-feature-name

# 5. 创建 Pull Request
```

### 4.2 代码规范检查
```bash
# 自动修复代码格式问题
npm run lint

# 格式化代码
npm run format

# 检查代码规范（不自动修复）
npx eslint . --ext .js,.vue
```

### 4.3 提交规范
```
feat:     新功能
fix:      修复bug
docs:     文档更新
style:    代码格式调整
refactor: 代码重构
test:     测试相关
chore:    构建过程或辅助工具
```

## 5. 项目结构说明

### 5.1 整体结构
```
NS-Smart-Shopping/
├── smart-ja-web/          # 主全栈应用
├── smart-ja-backend/      # 微服务后端
├── docs/                  # 项目文档
├── scripts/               # 工具脚本
├── .github/               # GitHub配置
└── 根配置文件
```

### 5.2 前端结构 (smart-ja-web)
```
smart-ja-web/
├── src/
│   ├── components/        # Vue组件
│   │   ├── atoms/         # 原子组件
│   │   ├── molecules/     # 分子组件
│   │   └── organisms/     # 有机体组件
│   ├── composables/       # 组合式函数
│   ├── stores/            # Pinia状态管理
│   ├── services/          # API服务
│   ├── utils/             # 工具函数
│   └── views/             # 页面组件
├── server/                # 后端API
│   ├── routes/            # 路由定义
│   ├── controllers/       # 控制器
│   ├── middleware/        # 中间件
│   ├── utils/             # 工具函数
│   └── agents/            # AI代理配置
└── public/                # 静态资源
```

### 5.3 后端结构 (smart-ja-backend)
```
smart-ja-backend/
├── src/
│   ├── routes/            # API路由
│   ├── controllers/       # 控制器
│   ├── services/          # 业务逻辑
│   ├── models/            # 数据模型
│   ├── middleware/        # 中间件
│   └── utils/             # 工具函数
└── config/                # 配置文件
```

## 6. 开发规范

### 6.1 组件开发
```vue
<!-- UserProfile.vue -->
<template>
  <div class="user-profile">
    <!-- 模板内容 -->
  </div>
</template>

<script setup>
// 使用 Composition API
import { ref, computed } from 'vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const userName = computed(() => userStore.name)
</script>

<style scoped>
.user-profile {
  /* 样式 */
}
</style>
```

### 6.2 API 开发
```javascript
// routes/user.js
const express = require('express')
const router = express.Router()
const userService = require('../services/userService')

/**
 * 获取用户信息
 * @route GET /api/v1/users/:id
 * @param {string} id.path.required - 用户ID
 * @returns {User} 200 - 用户信息
 */
router.get('/:id', async (req, res) => {
  try {
    const user = await userService.findById(req.params.id)
    res.json({ success: true, data: user })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

module.exports = router
```

## 7. 测试

### 7.1 运行测试
```bash
# 前端测试
cd smart-ja-web
npm test

# 后端测试
cd smart-ja-backend
npm test
```

### 7.2 测试规范
- 单元测试覆盖核心业务逻辑
- 集成测试覆盖API接口
- E2E测试覆盖关键用户流程

## 8. 部署

### 8.1 开发环境
```bash
# 使用 Docker Compose
docker-compose up --build

# 或直接运行
npm run build
npm start
```

### 8.2 生产环境
```bash
# 构建生产版本
npm run build

# 设置生产环境变量
export NODE_ENV=production

# 启动服务
npm start
```

## 9. 故障排除

### 9.1 常见问题
```bash
# 依赖安装失败
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# 端口被占用
# 修改 .env 中的端口配置
PORT=3001
VITE_PORT=5174
```

### 9.2 获取帮助
- 查看项目文档：`/docs/` 目录
- 检查 API 文档：访问 `/api-docs`
- 查看日志文件：`logs/` 目录

## 10. 贡献指南

### 10.1 开发流程
1. 阅读并理解项目架构
2. 遵循编码规范
3. 编写测试用例
4. 更新相关文档
5. 提交代码审查

### 10.2 代码审查标准
- [ ] 代码符合规范
- [ ] 功能测试通过
- [ ] 文档已更新
- [ ] 没有引入新的警告

---

## 附录：反重力开发哲学

### A. 角色分工
- **Tony**: 关注架构和代码质量
- **Friday**: 专注前端组件开发
- **Jarvis**: 负责后端API和数据库
- **Ultron**: 定期重构，清理技术债务

### B. 质量保证
- 每行代码都要有存在的理由
- 每个函数都要有清晰的职责
- 每个组件都要可测试、可维护

### C. 持续改进
- 每周代码审查
- 每月技术债务清理
- 每季度架构评审

---

*文档版本: 1.0.0*
*最后更新: 2026-02-27*
*维护者: OpenClaw (遵循反重力规范)*
