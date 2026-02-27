# Vercel 前端部署指南

## 🚀 Vercel + Railway 全栈部署方案

### 架构说明
```
用户访问 → Vercel (前端) → Railway (后端API) → Railway (数据库)
```

### 部署步骤

#### 步骤1: 部署后端到Railway
1. 访问 https://railway.app/new
2. 导入GitHub仓库: `pu3163329117-eng/NS-Smart-Shopping`
3. Railway会自动创建两个服务:
   - **后端API服务** (端口3000)
   - **PostgreSQL数据库服务**

4. 配置后端环境变量:
```env
DATABASE_URL=postgresql://username:password@railway-host:railway-port/railway-db
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET=your_jwt_secret_key
NODE_ENV=production
PORT=3000
```

5. 获取后端服务URL:
   - 在Railway控制台找到后端服务
   - 复制提供的域名，如: `https://your-api-service.railway.app`

#### 步骤2: 部署前端到Vercel
1. 访问 https://vercel.com/new
2. 导入GitHub仓库: `pu3163329117-eng/NS-Smart-Shopping`
3. Vercel会自动检测Vue项目
4. 配置构建设置:
   - **Framework Preset**: Vite
   - **Build Command**: `cd smart-ja-web && npm run build`
   - **Output Directory**: `smart-ja-web/dist`
   - **Install Command**: `cd smart-ja-web && npm install`

5. 配置环境变量:
```env
VITE_API_URL=https://your-api-service.railway.app
```

6. 点击部署

#### 步骤3: 配置API代理
在Vercel项目的 `vercel.json` 中配置API代理:
```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://your-api-service.railway.app/api/$1"
    }
  ]
}
```

## 🔧 项目配置

### Vercel专用文件
- `vercel.json` - Vercel部署配置
- `smart-ja-web/vite.config.ts` - Vite构建配置

### 前端环境变量
创建 `.env.production` 文件:
```env
VITE_API_URL=https://your-api-service.railway.app
```

### 后端环境变量
在Railway控制台设置:
```env
# Railway自动注入
DATABASE_URL=postgresql://...

# 手动设置
GEMINI_API_KEY=your_key_here
JWT_SECRET=your_secret_here
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://your-vercel-domain.vercel.app
```

## 🚨 故障排除

### Vercel构建失败
```bash
# 常见错误:
# 1. 依赖安装失败
#    解决方案: 检查package.json依赖

# 2. 构建命令错误
#    解决方案: 确保构建命令正确

# 3. 内存不足
#    解决方案: 升级Vercel计划或优化构建
```

### API连接失败
```bash
# 检查步骤:
# 1. 验证后端服务是否运行
curl https://your-api-service.railway.app/health

# 2. 检查CORS配置
# 在后端添加:
app.use(cors({
  origin: 'https://your-vercel-domain.vercel.app'
}));

# 3. 检查环境变量
# 确保VITE_API_URL正确设置
```

### 数据库连接失败
```bash
# 在Railway后端服务添加测试端点:
app.get('/test-db', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT 1');
    client.release();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

## 📈 性能优化

### Vercel优化
1. **边缘网络**: Vercel的全球CDN
2. **自动HTTPS**: 免费SSL证书
3. **自动优化**: 图片优化、代码分割
4. **预览部署**: 每个PR都有预览环境

### Railway优化
1. **自动缩放**: 根据流量调整资源
2. **健康检查**: 自动监控服务状态
3. **日志监控**: 实时查看应用日志
4. **备份恢复**: 自动数据库备份

## 🔄 更新部署

### 前端更新
```bash
# 代码推送到GitHub后，Vercel会自动部署
git add .
git commit -m "更新前端"
git push origin main
```

### 后端更新
```bash
# Railway会自动检测GitHub更新并部署
# 或通过Railway CLI手动部署
railway up
```

### 环境变量更新
1. **Vercel**: 在项目设置 → Environment Variables
2. **Railway**: 在服务设置 → Variables

## 💰 成本估算

### Vercel (前端)
- **免费计划**: 足够个人项目使用
- 包含: 100GB带宽、无限部署、自动HTTPS

### Railway (后端+数据库)
- **免费额度**: $5/月
- 包含: 数据库服务、监控、自动部署

### 总计
- **月成本**: $0 (免费计划足够)
- **如需升级**: 根据实际使用量

## 📞 支持

### Vercel支持
- 文档: https://vercel.com/docs
- Discord: https://vercel.com/discord
- GitHub讨论: https://github.com/vercel/vercel/discussions

### Railway支持
- 文档: https://docs.railway.app
- Discord: https://discord.gg/railway
- 邮件: support@railway.app

### 项目支持
- GitHub Issues: https://github.com/pu3163329117-eng/NS-Smart-Shopping/issues

## 🎯 部署验证清单

### 后端部署 (Railway)
- [ ] 后端服务构建成功
- [ ] 数据库服务运行正常
- [ ] 环境变量正确配置
- [ ] 健康检查通过: `https://api-service.railway.app/health`
- [ ] 数据库连接测试通过

### 前端部署 (Vercel)
- [ ] 前端构建成功
- [ ] 环境变量正确设置
- [ ] 部署完成，获得Vercel域名
- [ ] 可以访问前端页面
- [ ] API调用正常

### 集成测试
- [ ] 前端可以调用后端API
- [ ] 用户认证功能正常
- [ ] 数据库操作正常
- [ ] AI聊天功能正常

---

## 🚀 开始部署

### 推荐顺序
1. **先部署后端到Railway**
2. **获取后端API URL**
3. **部署前端到Vercel**
4. **配置前端环境变量**
5. **测试完整功能**

### 一键部署链接
- **Railway**: https://railway.app/new
- **Vercel**: https://vercel.com/new

### 预计时间
- 后端部署: 5-10分钟
- 前端部署: 3-5分钟
- 测试验证: 5-10分钟
- **总计**: 15-25分钟

---

**现在就开始部署吧！** 🎉

Vercel + Railway 是最佳的全栈部署组合，兼顾性能和易用性。