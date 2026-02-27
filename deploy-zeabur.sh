#!/bin/bash

# Zeabur 全栈部署脚本
# 使用方法: ./deploy-zeabur.sh [action]

set -e

ACTION=${1:-"deploy"}

echo "🚀 Zeabur 全栈部署脚本"
echo "========================"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查环境
check_environment() {
    info "检查部署环境..."
    
    # 检查Docker
    if ! command -v docker &> /dev/null; then
        error "Docker未安装"
        exit 1
    fi
    success "Docker已安装: $(docker --version)"
    
    # 检查Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose未安装"
        exit 1
    fi
    success "Docker Compose已安装: $(docker-compose --version)"
    
    # 检查Zeabur配置文件
    if [ ! -f "zeabur.yaml" ]; then
        error "未找到zeabur.yaml配置文件"
        exit 1
    fi
    success "Zeabur配置文件就绪"
    
    # 检查环境变量
    if [ ! -f ".env" ]; then
        info "未找到.env文件，从模板创建..."
        cp .env.example .env
        error "已创建.env文件，请编辑配置后再运行"
        exit 1
    fi
    success "环境变量文件就绪"
    
    # 检查必需的环境变量
    required_vars=("DB_PASSWORD" "GEMINI_API_KEY" "JWT_SECRET")
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" .env; then
            error "必需环境变量 ${var} 未设置"
            exit 1
        fi
    done
    success "所有必需环境变量已设置"
}

# 本地测试
test_local() {
    info "本地测试部署..."
    
    # 停止现有服务
    docker-compose -f zeabur.yaml down 2>/dev/null || true
    
    # 加载环境变量
    export $(grep -v '^#' .env | xargs)
    
    # 构建并启动
    docker-compose -f zeabur.yaml up --build -d
    
    # 等待服务启动
    info "等待服务启动..."
    sleep 10
    
    # 检查服务状态
    check_services
    
    success "本地测试部署完成"
    echo ""
    echo "🌐 访问地址: http://localhost"
    echo "🔧 后端API: http://localhost:3000"
    echo "🗄️  数据库: localhost:5432"
    echo "📊 健康检查: http://localhost/health"
    echo ""
    echo "查看日志: docker-compose -f zeabur.yaml logs -f"
    echo "停止服务: docker-compose -f zeabur.yaml down"
}

# 检查服务状态
check_services() {
    info "检查服务状态..."
    
    # 检查前端
    if curl -s http://localhost/health > /dev/null; then
        success "前端服务正常"
    else
        error "前端服务异常"
    fi
    
    # 检查后端
    if curl -s http://localhost:3000/health > /dev/null; then
        success "后端服务正常"
    else
        error "后端服务异常"
    fi
    
    # 检查数据库
    if docker-compose -f zeabur.yaml exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        success "数据库服务正常"
    else
        error "数据库服务异常"
    fi
}

# 构建Docker镜像
build_images() {
    info "构建Docker镜像..."
    
    # 加载环境变量
    export $(grep -v '^#' .env | xargs)
    
    # 构建前端
    info "构建前端镜像..."
    docker build -f smart-ja-web/Dockerfile.zeabur -t ns-smart-frontend:zeabur ./smart-ja-web
    
    # 构建后端
    info "构建后端镜像..."
    docker build -f smart-ja-backend/Dockerfile -t ns-smart-backend:zeabur ./smart-ja-backend
    
    success "Docker镜像构建完成"
    echo ""
    echo "📦 前端镜像: ns-smart-frontend:zeabur"
    echo "📦 后端镜像: ns-smart-backend:zeabur"
}

# 生成部署指南
generate_guide() {
    info "生成Zeabur部署指南..."
    
    cat > ZEABUR_DEPLOY_GUIDE.md << 'EOF'
# Zeabur 部署指南

## 部署步骤

### 1. 准备项目
```bash
# 克隆项目
git clone https://github.com/pu3163329117-eng/NS-Smart-Shopping.git
cd NS-Smart-Shopping

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置以下变量：
# DB_PASSWORD=你的数据库密码
# GEMINI_API_KEY=你的Gemini API密钥
# JWT_SECRET=你的JWT密钥（使用 openssl rand -base64 32 生成）
```

### 2. 本地测试
```bash
# 运行本地测试
./deploy-zeabur.sh test

# 访问 http://localhost 测试功能
```

### 3. 部署到Zeabur

#### 方法A: GitHub自动部署（推荐）
1. 登录 Zeabur 控制台 (https://zeabur.com)
2. 点击 "New Project" → "Import from GitHub"
3. 选择你的仓库: `pu3163329117-eng/NS-Smart-Shopping`
4. 选择 "Docker Compose" 部署方式
5. 上传 `zeabur.yaml` 配置文件
6. 配置环境变量（从 .env 文件复制）
7. 点击 "Deploy"

#### 方法B: Docker镜像部署
1. 构建并推送镜像到Docker Hub
2. 在Zeabur创建三个服务：
   - 前端: 使用 `ns-smart-frontend:zeabur`
   - 后端: 使用 `ns-smart-backend:zeabur`
   - 数据库: 使用 `postgres:15-alpine`
3. 配置环境变量和网络

### 4. 配置自定义域名
1. 在Zeabur项目设置中添加自定义域名
2. 在域名DNS中添加CNAME记录指向Zeabur提供的地址
3. Zeabur会自动配置SSL证书

## 环境变量说明

### 必需变量
```env
# 数据库
DB_PASSWORD=你的安全密码

# AI服务
GEMINI_API_KEY=你的Gemini API密钥

# 安全
JWT_SECRET=你的JWT密钥
```

### 可选变量
```env
# 数据库
DB_USER=postgres
DB_NAME=smartja

# 后端
PORT=3000
NODE_ENV=production

# 前端
VITE_API_URL=/api
VITE_APP_NAME="NS Smart Shopping"
```

## 监控和维护

### 查看日志
1. 登录 Zeabur 控制台
2. 选择你的项目
3. 点击服务名称
4. 查看 "Logs" 标签页

### 健康检查
- 前端: `https://你的域名/health`
- 后端: `https://你的域名/api/health`

### 资源监控
1. 在Zeabur控制台查看资源使用情况
2. 设置告警规则
3. 监控错误率

## 故障排除

### 常见问题

#### 1. 部署失败
- 检查环境变量是否正确
- 查看构建日志
- 确保Docker镜像可以正常构建

#### 2. 数据库连接失败
- 检查数据库密码
- 确保网络配置正确
- 查看数据库日志

#### 3. 前端无法访问
- 检查Nginx配置
- 查看前端构建日志
- 确保静态文件正确部署

#### 4. API调用失败
- 检查后端服务状态
- 查看API日志
- 确保环境变量正确

### 联系支持
- Zeabur官方文档: https://zeabur.com/docs
- GitHub Issues: https://github.com/pu3163329117-eng/NS-Smart-Shopping/issues

## 更新部署

### 代码更新
```bash
# 拉取最新代码
git pull origin main

# 重新构建镜像
./deploy-zeabur.sh build

# Zeabur会自动检测GitHub更新并重新部署
```

### 环境变量更新
1. 在Zeabur控制台更新环境变量
2. 重启受影响的服务

### 数据库迁移
```bash
# 如果需要数据库迁移
docker-compose -f zeabur.yaml exec backend npm run migrate
```

## 成本估算

### 免费额度
- Zeabur提供一定的免费额度
- 足够小型项目使用

### 付费方案
- 根据实际资源使用计费
- 可以设置预算限制

---

**部署完成！** 🎉

如果遇到问题，请参考故障排除部分或联系支持。
EOF
    
    success "部署指南已生成: ZEABUR_DEPLOY_GUIDE.md"
}

# 显示帮助
show_help() {
    echo "Zeabur 部署脚本"
    echo ""
    echo "使用方法: $0 [action]"
    echo ""
    echo "可选操作:"
    echo "  test     - 本地测试部署"
    echo "  build    - 构建Docker镜像"
    echo "  check    - 检查环境和服务"
    echo "  guide    - 生成部署指南"
    echo "  help     - 显示此帮助"
    echo ""
    echo "示例:"
    echo "  $0 test      # 本地测试"
    echo "  $0 build     # 构建镜像"
    echo "  $0 check     # 检查服务"
    echo ""
    echo "Zeabur部署步骤:"
    echo "  1. 配置 .env 文件"
    echo "  2. 运行 $0 test 本地测试"
    echo "  3. 上传到Zeabur控制台"
    echo "  4. 配置环境变量和域名"
}

# 主函数
main() {
    case $ACTION in
        "test")
            check_environment
            test_local
            ;;
        "build")
            check_environment
            build_images
            ;;
        "check")
            check_environment
            check_services
            ;;
        "guide")
            generate_guide
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            error "未知操作: $ACTION"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main