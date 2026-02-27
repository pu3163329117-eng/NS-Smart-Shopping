# Railway 部署指南

## 🚀 一键部署到Railway

### 最简单的方法
1. **访问**: https://railway.app/new
2. **选择**: "Deploy from GitHub repo"
3. **输入仓库URL**: `https://github.com/pu3163329117-eng/NS-Smart-Shopping`
4. **Railway会自动检测配置并部署**

### 手动配置步骤

#### 步骤1: 创建Railway项目
1. 登录 https://railway.app
2. 点击 "New Project"
3. 选择 "Deploy from GitHub repo"
4. 授权访问你的GitHub账户
5. 选择仓库: `pu3163329117-eng/NS-Smart-Shopping`

#### 步骤2: 配置服务
Railway会自动检测并创建三个服务：
1. **前端服务** (Web)
   - 端口: 3002
   - 根目录: `smart-ja-web`
   - 构建命令: `npm install && npm run build`
   - 启动命令: `npm run preview`

2. **后端服务** (API)
   - 端口: 3000  
   - 根目录: `smart-ja-backend`
   - 启动命令: `npm start`

3. **数据库服务** (PostgreSQL)
   - 版本: PostgreSQL 15
   - Railway会自动提供连接字符串

#### 步骤3: 配置环境变量
在Railway控制台设置以下环境变量：

**前端服务**:
```env
VITE_API_URL=https://your-api-service.railway.app
NODE_ENV=production
```

**后端服务**:
```env
DATABASE_URL=postgresql://username:password@railway-host:railway-port/railway-db
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_jwt_secret_key
NODE_ENV=production
PORT=3000
```

**注意**: Railway会自动为数据库服务注入 `DATABASE_URL` 环境变量。

#### 步骤4: 部署
1. Railway会自动开始部署
2. 查看构建日志
3. 等待所有服务变为绿色

#### 步骤5: 访问应用
部署完成后，Railway会提供：
- 前端URL: `https://your-web-service.railway.app`
- 后端URL: `https://your-api-service.railway.app`
- 健康检查: `https://your-web-service.railway.app/health`

## 🔧 项目结构

```
NS-Smart-Shopping/
├── smart-ja-web/          # 前端Vue应用
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── smart-ja-backend/      # 后端Node.js API
│   ├── index.js
│   └── package.json
├── railway.toml          # Railway配置文件
├── railway-simple.json   # 简化配置
├── Dockerfile.railway    # Railway专用Dockerfile
└── .env.example          # 环境变量模板
```

## 🚨 故障排除

### 常见问题

#### 1. 构建失败
```bash
# 查看构建日志
# 在Railway控制台 → 服务 → Deployments → 查看日志

# 常见原因:
# - 缺少依赖
# - 构建命令错误
# - 内存不足
```

#### 2. 服务无法启动
```bash
# 查看运行时日志
# 在Railway控制台 → 服务 → Logs

# 常见原因:
# - 端口配置错误
# - 环境变量缺失
# - 数据库连接失败
```

#### 3. 数据库连接问题
```bash
# 检查DATABASE_URL环境变量
# Railway会自动注入，确保后端服务能读取

# 在后端服务添加测试端点:
app.get('/test-db', async (req, res) => {
  try {
    const result = await db.query('SELECT 1');
    res.json({ success: true, result: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

#### 4. 前端无法访问后端API
```bash
# 检查VITE_API_URL环境变量
# 应该指向后端服务的Railway域名

# 在前端添加测试:
fetch(`${import.meta.env.VITE_API_URL}/health`)
  .then(response => response.json())
  .then(data => console.log('API连接:', data));
```

### 调试命令

#### 通过Railway CLI
```bash
# 安装CLI
npm i -g @railway/cli

# 登录
railway login

# 链接项目
railway link

# 查看日志
railway logs

# 查看环境变量
railway vars

# 部署
railway up
```

#### 直接访问服务
```bash
# 健康检查
curl https://your-service.railway.app/health

# API测试
curl https://your-api-service.railway.app/health

# 前端测试
curl https://your-web-service.railway.app
```

## 📈 监控和维护

### Railway内置功能
1. **自动HTTPS**: 免费SSL证书
2. **自动缩放**: 根据流量自动调整
3. **日志查看**: 实时查看应用日志
4. **指标监控**: CPU、内存、网络使用情况
5. **自动部署**: GitHub推送时自动重新部署

### 自定义域名
1. 在Railway项目设置中添加自定义域名
2. 在域名DNS添加CNAME记录指向Railway
3. Railway会自动配置SSL证书

### 备份和恢复
1. Railway自动备份数据库
2. 可以在控制台手动触发备份
3. 支持时间点恢复

## 🔄 更新部署

### 代码更新
```bash
# 1. 本地修改代码
git add .
git commit -m "更新说明"
git push origin main

# 2. Railway会自动检测并重新部署
```

### 环境变量更新
1. 在Railway控制台更新环境变量
2. 服务会自动重启应用新变量

### 数据库迁移
```bash
# 如果需要运行数据库迁移
# 可以在后端服务启动时自动运行
# 或通过Railway CLI手动运行

railway run -s api "npm run migrate"
```

## 💰 成本估算

### 免费额度
- Railway提供$5免费额度
- 足够小型项目使用
- 包含数据库服务

### 付费方案
- 按实际使用量计费
- 可以设置预算限制
- 支持团队协作

## 📞 支持

### Railway支持
- 官方文档: https://docs.railway.app
- Discord社区: https://discord.gg/railway
- 邮件支持: support@railway.app

### 项目支持
- GitHub Issues: https://github.com/pu3163329117-eng/NS-Smart-Shopping/issues
- 查看部署日志解决问题

---

## 🎯 部署验证清单

### 部署前
- [ ] GitHub仓库代码是最新的
- [ ] Railway账户已注册
- [ ] 环境变量值已准备好

### 部署中
- [ ] 所有服务构建成功
- [ ] 环境变量正确配置
- [ ] 服务状态显示为绿色

### 部署后
- [ ] 前端可以访问
- [ ] 后端API可以访问
- [ ] 数据库连接正常
- [ ] 核心功能测试通过

---

**现在就开始部署吧！** 🚀

Railway是最简单的全栈部署方案，一键即可完成所有配置。