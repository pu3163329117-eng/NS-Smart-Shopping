# 🚀 NS Matrix 生产部署指南

## 前置条件

- VPS: Ubuntu 22.04+，建议 2 核 4GB 以上
- 域名已解析到 VPS IP
- 已安装: `docker`、`docker compose`、`git`

## 方案一：手动首次部署

### 1. 克隆代码到 VPS

```bash
ssh your-user@your-vps-ip
git clone https://github.com/YOUR_ORG/YOUR_REPO.git /opt/smart-ja
cd /opt/smart-ja
```

### 2. 配置生产环境变量

```bash
cp .env.production.example .env.production
nano .env.production   # 填入真实值！
```

**必须修改的关键项：**
| 变量 | 说明 |
|------|------|
| `JWT_SECRET` | `openssl rand -base64 48` 生成 |
| `POSTGRES_PASSWORD` | 强密码，至少 16 位 |
| `CORS_ALLOW_ORIGINS` | 你的域名，如 `https://ns-matrix.com` |
| `GUSHI_ADMIN_EMAILS` | 管理员邮箱 |
| `DEEPSEEK_API_KEY` | DeepSeek API Key |

### 3. 申请 SSL 证书（Let's Encrypt）

```bash
# 安装 certbot
apt install certbot -y

# 申请证书（先确保 80 端口未被占用）
certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# 证书默认路径：/etc/letsencrypt/live/your-domain.com/
# 在 .env.production 中设置：
# SSL_CERT_PATH=/etc/letsencrypt/live/your-domain.com
```

### 4. 修改 Nginx 配置

```bash
nano nginx/app.conf
# 将所有 YOUR_DOMAIN 替换为真实域名
sed -i 's/YOUR_DOMAIN/ns-matrix.com/g' nginx/app.conf
```

### 5. 启动全栈服务

```bash
docker compose --env-file .env.production -f docker-compose.fullstack.yml up -d --build
```

### 6. 初始化数据库（首次部署）

```bash
# Backend 容器启动时会自动执行 prisma db push
# 如需手动触发：
docker compose --env-file .env.production -f docker-compose.fullstack.yml exec backend npx prisma db push --skip-generate
```

### 7. 验证部署

```bash
# 检查所有容器状态
docker compose -f docker-compose.fullstack.yml ps

# 查看后端日志
docker compose -f docker-compose.fullstack.yml logs backend -f

# 健康检测
curl https://your-domain.com/health
# → {"status":"ok"}
```

---

## 方案二：GitHub Actions 自动部署 (CD)

### 配置 GitHub Secrets

在 GitHub 仓库 → **Settings → Secrets and variables → Actions** 中添加：

| Secret 名称 | 说明 |
|-------------|------|
| `VPS_HOST` | VPS 公网 IP 或域名 |
| `VPS_USER` | SSH 用户名（如 `ubuntu` / `root`） |
| `VPS_SSH_KEY` | VPS SSH 私钥内容（`cat ~/.ssh/id_rsa`） |
| `VPS_PORT` | SSH 端口（默认 22） |
| `VPS_PROJECT_PATH` | 项目路径（如 `/opt/smart-ja`） |
| `VPS_DOMAIN` | 域名（用于健康检测） |

### 设置 GitHub Environment（可选审批）

在 **Settings → Environments → production** 中：
- 开启 **Required reviewers**（推送前需人工审批）
- 添加部署通知邮箱

### 触发部署

```bash
# 方式 1：推送到 main 分支自动触发
git push origin main

# 方式 2：GitHub Actions 页面手动触发 "workflow_dispatch"
```

---

## 日常运维命令

```bash
# 查看服务状态
docker compose -f docker-compose.fullstack.yml ps

# 重启某个服务
docker compose -f docker-compose.fullstack.yml restart backend

# 查看实时日志
docker compose -f docker-compose.fullstack.yml logs -f backend

# 进入容器调试
docker compose -f docker-compose.fullstack.yml exec backend sh

# 更新部署（拉新镜像）
docker compose --env-file .env.production -f docker-compose.fullstack.yml pull
docker compose --env-file .env.production -f docker-compose.fullstack.yml up -d

# 数据库备份
docker compose -f docker-compose.fullstack.yml exec db \
  pg_dump -U postgres smart_ja_prod > backup_$(date +%Y%m%d).sql

# SSL 证书续签
certbot renew --quiet
docker compose -f docker-compose.fullstack.yml exec frontend nginx -s reload
```

---

## 故障排查

### 后端启动失败
```bash
docker compose logs backend | grep ERROR
# 常见原因：DATABASE_URL 错误、JWT_SECRET 未设置
```

### 前端 502 Bad Gateway
```bash
# 检查后端是否正常
curl http://localhost:3005/health
# 检查 Nginx 配置语法
docker compose exec frontend nginx -t
```

### 上传文件不显示
```bash
# 检查 CDN_DOMAIN 配置
# 检查 S3 连通性（如使用 MinIO）
docker compose exec backend curl http://minio:9000
```
