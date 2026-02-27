# NS Smart Shopping 编码规范

> 遵循"反重力"的"No Shit Code"哲学和"漫威全栈"模型

## 1. 核心原则

### 1.1 No Shit Code (拒绝屎山代码)
- 单文件不超过300行
- 函数不超过50行
- 组件遵循原子化设计
- 注释率不低于20%

### 1.2 单源真理 (Single Source of Truth)
- API设计统一在`API_DESIGN.md`
- 数据库Schema统一管理
- 配置集中管理

### 1.3 技术债务零容忍
- 每周五进行代码审查
- 每月进行技术债务清理
- 发现重复代码立即重构

## 2. 前端规范 (Friday负责)

### 2.1 Vue 3 规范
```javascript
// ✅ 正确：使用Composition API + `<script setup>`
<script setup>
import { ref, computed } from 'vue'
import { useStore } from '../stores/counter'

const count = ref(0)
const doubleCount = computed(() => count.value * 2)
</script>

// ❌ 错误：避免Options API，除非必要
<script>
export default {
  data() {
    return {
      count: 0
    }
  }
}
</script>
```

### 2.2 组件命名
- 组件名：PascalCase，如`UserProfile.vue`
- 属性名：camelCase，如`userName`
- 事件名：kebab-case，如`@update-user`

### 2.3 文件结构
```
src/
├── components/           # 原子组件
│   ├── atoms/           # 基础原子组件
│   ├── molecules/       # 分子组件
│   └── organisms/       # 有机体组件
├── composables/         # 组合式函数
├── stores/              # Pinia状态管理
├── services/            # API服务层
├── utils/               # 工具函数
└── views/               # 页面组件
```

## 3. 后端规范 (Jarvis负责)

### 3.1 Node.js + Express 规范
```javascript
// ✅ 正确：清晰的模块划分
// routes/user.js
router.get('/:id', getUser);
router.post('/', createUser);
router.put('/:id', updateUser);

// services/userService.js
class UserService {
  async findById(id) {
    // 业务逻辑
  }
}

// ❌ 错误：避免在路由中写业务逻辑
router.get('/:id', async (req, res) => {
  // 不要在这里写复杂的业务逻辑
});
```

### 3.2 API设计
- RESTful风格
- 版本控制：`/api/v1/`
- 统一响应格式：
```json
{
  "success": true,
  "data": {},
  "message": "操作成功",
  "code": 200
}
```

### 3.3 错误处理
```javascript
// 使用统一的错误中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || '服务器内部错误',
    code: err.statusCode || 500
  });
});
```

## 4. 数据库规范

### 4.1 Prisma Schema
```prisma
// ✅ 正确：清晰的模型定义
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // 关系定义
  posts     Post[]
  
  // 索引
  @@index([email])
  @@map("users")
}
```

### 4.2 查询优化
- 避免N+1查询问题
- 使用分页查询
- 添加必要的索引

## 5. AI代理规范 (Tony协调)

### 5.1 代理配置
```yaml
# server/agents/xxx.yaml
name: ns-planner
model: deepseek-chat
description: "AI 商业规划师，负责市场分析和商业计划"

system_prompt: |
  你是 NS Smart Shopping 的 AI 商业规划师。
  你的职责是帮助用户分析市场机会和制定商业计划。

tools:
  - market_analysis
  - swot_analysis
```

### 5.2 工具集成
- 外部API调用需要错误处理
- 流式响应支持
- 记忆系统集成

## 6. 代码质量工具

### 6.1 ESLint配置
```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended'
  ],
  rules: {
    'max-lines': ['error', 300],
    'complexity': ['error', 10],
    'no-console': 'warn'
  }
};
```

### 6.2 Git提交规范
```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建过程或辅助工具
```

## 7. 部署规范

### 7.1 环境变量
```
# .env.example
NODE_ENV=development
PORT=3000
DATABASE_URL=file:./dev.db
DEEPSEEK_API_KEY=your_key_here
```

### 7.2 Docker配置
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 8. 文档规范

### 8.1 代码注释
```javascript
/**
 * 获取用户信息
 * @param {number} userId - 用户ID
 * @returns {Promise<User>} 用户对象
 * @throws {Error} 用户不存在时抛出错误
 */
async function getUser(userId) {
  // 实现逻辑
}
```

### 8.2 README结构
```
# 项目名称
## 简介
## 快速开始
## 开发指南
## API文档
## 部署指南
## 贡献指南
```

## 9. 团队协作

### 9.1 代码审查清单
- [ ] 代码是否符合规范？
- [ ] 是否有足够的测试？
- [ ] 文档是否更新？
- [ ] 性能是否考虑？
- [ ] 安全性是否检查？

### 9.2 每日工作流
1. 拉取最新代码
2. 运行测试
3. 开发新功能
4. 提交代码
5. 创建Pull Request
6. 代码审查
7. 合并代码

---

## 附录：反重力哲学

### A. 漫威全栈角色
- **Tony**: 架构决策，代码审查
- **Friday**: 前端开发，组件设计
- **Jarvis**: 后端开发，数据库设计
- **Ultron**: 代码重构，技术债务清理

### B. 龙虾运维
- 15分钟心跳监测
- 自动化部署
- 监控告警

### C. 成长小队
- Natasha: 产品分析
- Clint: 市场调研
- Thor: 社媒管理
- Wanda: UI设计
- Peter: 内容创作

---

*最后更新: 2026-02-27*
*维护者: OpenClaw (遵循反重力编码风格)*
