# NS Smart Shopping 全栈部署指南

## 🚀 快速开始

### 一键部署脚本
```bash
# 1. 克隆项目
git clone https://github.com/pu3163329117-eng/NS-Smart-Shopping.git
cd NS-Smart-Shopping

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置必要的配置

# 3. 运行部署脚本
chmod +x deploy.sh
./deploy.sh local     # 本地测试
./deploy.sh railway   # 部署到Railway (推荐)
./deploy.sh render    # 部署到Render
```

## 📋 部署选项

### 1. Railway.app (推荐)
**优点**:
- 免费额度足够
- 一键部署Docker Compose
- 自动HTTPS和域名
- 内置数据库服务
- 监控和日志

**部署步骤**:
```bash
# 安装Railway CLI
curl -fsSL https://railway.app/install.sh | sh

# 登录
railway login

# 部署
railway up
```

**访问地址**: `https://your-project-name.railway.app`

### 2. Render.com
**优点**:
- 免费PostgreSQL数据库
- 自动部署GitHub仓库
- Web界面管理

**部署步骤**:
1. 注册Render.com账户
2. 连接GitHub仓库
3. 选择"Web Service"
4. 配置环境变量
5. 部署

### 3. 传统VPS/云服务器
**部署命令**:
```bash
# 安装Docker和Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 克隆项目
git clone https://github.com/pu3163329117-eng/NS-Smart-Shopping.git
cd NS-Smart-Shopping

# 启动服务
docker-compose -f docker-compose.prod.yml up -d
```

## 🏗️ 架构说明

### 服务架构
```
用户 → Nginx (80) → Vue前端
        ↓
   Express后端 (3000)
        ↓
 PostgreSQL数据库 (5432)
        ↓
   Gemini AI API
```

### 端口映射
- **80**: 前端Web界面
- **3000**: 后端API服务
- **5432**: PostgreSQL数据库

## 🔧 环境变量配置

### 必需配置
```env
# 数据库
DB_PASSWORD=your_secure_password

# AI服务
GEMINI_API_KEY=your_gemini_api_key

# 安全
JWT_SECRET=your_jwt_secret_key
```

### 生成安全密钥
```bash
# 生成JWT密钥
openssl rand -base64 32

# 生成数据库密码
openssl rand -base64 16
```

## 📊 资源需求

### 最小配置
- **内存**: 1GB RAM
- **存储**: 2GB 磁盘空间
- **CPU**: 1核

### 推荐配置
- **内存**: 2GB RAM
- **存储**: 5GB SSD
- **CPU**: 2核

## 🚨 故障排除

### 常见问题

#### 1. 数据库连接失败
```bash
# 检查数据库状态
docker-compose logs db

# 重启数据库
docker-compose restart db
```

#### 2. 前端无法访问
```bash
# 检查Nginx日志
docker-compose logs web

# 重启前端服务
docker-compose restart web
```

#### 3. 后端API错误
```bash
# 查看后端日志
docker-compose logs backend

# 检查环境变量
docker-compose exec backend env
```

#### 4. 内存不足
```yaml
# 在docker-compose.prod.yml中调整资源限制
deploy:
  resources:
    limits:
      memory: 1G
    reservations:
      memory: 512M
```

### 监控命令
```bash
# 查看所有服务状态
docker-compose ps

# 查看实时日志
docker-compose logs -f

# 查看资源使用
docker stats

# 进入容器调试
docker-compose exec backend sh
```

## 🔒 安全建议

### 生产环境安全
1. **修改所有默认密码**
2. **启用HTTPS**
3. **配置防火墙规则**
4. **定期备份数据库**
5. **监控日志和访问**

### 数据库备份
```bash
# 备份数据库
docker-compose exec db pg_dump -U postgres smartja > backup_$(date +%Y%m%d).sql

# 恢复数据库
docker-compose exec -T db psql -U postgres smartja < backup.sql
```

## 📈 性能优化

### 前端优化
- 启用Gzip压缩
- 配置浏览器缓存
- 使用CDN加速静态资源

### 后端优化
- 启用数据库连接池
- 实现API缓存
- 优化数据库查询

### 数据库优化
- 创建必要索引
- 定期清理旧数据
- 监控慢查询

## 🔄 更新部署

### 代码更新
```bash
# 拉取最新代码
git pull origin main

# 重新构建和部署
docker-compose -f docker-compose.prod.yml up --build -d

# 或使用部署脚本
./deploy.sh local
```

### 数据库迁移
```bash
# 运行数据库迁移
docker-compose exec backend npm run migrate

# 或手动执行SQL
docker-compose exec db psql -U postgres -d smartja -f migration.sql
```

## 📞 支持

### 问题反馈
1. 查看项目日志
2. 检查环境变量配置
3. 验证端口是否被占用
4. 检查网络连接

### 获取帮助
- GitHub Issues: https://github.com/pu3163329117-eng/NS-Smart-Shopping/issues
- 项目文档: 查看 `/docs` 目录

## 🎯 部署验证清单

### 部署前检查
- [ ] 环境变量配置完成
- [ ] 数据库密码已修改
- [ ] API密钥已设置
- [ ] 端口未被占用

### 部署后验证
- [ ] 前端可访问 (http://localhost:80)
- [ ] 后端API正常 (http://localhost:3000/health)
- [ ] 数据库连接正常
- [ ] AI服务可用

### 生产环境检查
- [ ] HTTPS已启用
- [ ] 防火墙配置正确
- [ ] 监控告警设置
- [ ] 备份策略就绪

---

**部署完成！** 🎉

如果遇到问题，请参考故障排除部分或提交GitHub Issue。