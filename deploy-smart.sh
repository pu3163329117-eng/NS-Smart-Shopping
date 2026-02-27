#!/bin/bash

# NS Smart Shopping 智能部署助手
# 自动检测、配置和指导全栈部署

set -e

# 颜色和样式
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'
BOLD='\033[1m'

log() {
    echo -e "$1"
}

success() { log "${GREEN}✅ $1${NC}"; }
error() { log "${RED}❌ $1${NC}"; }
warning() { log "${YELLOW}⚠️  $1${NC}"; }
info() { log "${BLUE}ℹ️  $1${NC}"; }
step() { log "${BOLD}▶️  $1${NC}"; }
header() { log "\n${BOLD}=== $1 ===${NC}\n"; }

# 主菜单
show_menu() {
    header "NS Smart Shopping 部署助手"
    
    echo "选择部署平台:"
    echo "1) Railway - 全栈一键部署 (推荐)"
    echo "2) Vercel + Railway - 最佳性能组合"
    echo "3) Zeabur - 中国网络优化"
    echo "4) 本地Docker测试"
    echo "5) 检查项目状态"
    echo "6) 生成部署配置"
    echo "7) 退出"
    
    read -p "请输入选择 (1-7): " choice
    
    case $choice in
        1) railway_deploy ;;
        2) vercel_railway_deploy ;;
        3) zeabur_deploy ;;
        4) local_docker_deploy ;;
        5) check_project ;;
        6) generate_configs ;;
        7) exit 0 ;;
        *) error "无效选择"; show_menu ;;
    esac
}

# 检查项目状态
check_project() {
    header "项目状态检查"
    
    # 检查目录结构
    if [ -d "smart-ja-web" ] && [ -f "smart-ja-web/package.json" ]; then
        success "前端项目: smart-ja-web/"
    else
        error "前端项目缺失或损坏"
    fi
    
    if [ -d "smart-ja-backend" ] && [ -f "smart-ja-backend/package.json" ]; then
        success "后端项目: smart-ja-backend/"
    else
        error "后端项目缺失或损坏"
    fi
    
    # 检查配置文件
    configs=("vercel.json" "railway.toml" "docker-compose.prod.yml" "zbpack.json")
    for config in "${configs[@]}"; do
        if [ -f "$config" ]; then
            success "配置文件: $config"
        else
            warning "配置文件缺失: $config"
        fi
    done
    
    # 检查环境变量
    if [ -f ".env" ]; then
        success "环境变量文件: .env"
        # 检查关键变量
        if grep -q "GEMINI_API_KEY" .env && grep -q "JWT_SECRET" .env; then
            success "关键环境变量已配置"
        else
            warning "缺少关键环境变量"
        fi
    elif [ -f ".env.example" ]; then
        warning "请复制 .env.example 为 .env 并配置变量"
    else
        error "缺少环境变量模板"
    fi
    
    # 检查Git状态
    if git status &> /dev/null; then
        success "Git仓库正常"
        local branch=$(git branch --show-current)
        info "当前分支: $branch"
    else
        warning "不在Git仓库中或Git异常"
    fi
    
    read -p "按回车返回菜单..." -n 1
    show_menu
}

# 生成部署配置
generate_configs() {
    header "生成部署配置"
    
    echo "选择要生成的配置:"
    echo "1) Railway配置 (railway.toml)"
    echo "2) Vercel配置 (vercel.json)"
    echo "3) Zeabur配置 (zbpack.json)"
    echo "4) Docker配置 (docker-compose.prod.yml)"
    echo "5) 全部生成"
    echo "6) 返回菜单"
    
    read -p "选择: " config_choice
    
    case $config_choice in
        1) create_railway_config ;;
        2) create_vercel_config ;;
        3) create_zeabur_config ;;
        4) create_docker_config ;;
        5)
            create_railway_config
            create_vercel_config
            create_zeabur_config
            create_docker_config
            ;;
        6) show_menu ;;
        *) error "无效选择"; generate_configs ;;
    esac
    
    success "配置生成完成!"
    show_menu
}

# Railway部署指导
railway_deploy() {
    header "Railway 全栈部署"
    
    step "1. 访问 https://railway.app/new"
    step "2. 点击 'Deploy from GitHub repo'"
    step "3. 输入仓库URL:"
    echo "   https://github.com/pu3163329117-eng/NS-Smart-Shopping"
    step "4. Railway会自动:"
    echo "   • 检测项目结构"
    echo "   • 创建前端、后端、数据库服务"
    echo "   • 开始部署"
    step "5. 在Railway控制台配置环境变量:"
    echo "   • GEMINI_API_KEY (必需)"
    echo "   • JWT_SECRET (必需，使用 openssl rand -base64 32 生成)"
    echo "   • DATABASE_URL (Railway自动注入)"
    
    echo -e "\n${BOLD}一键部署链接:${NC}"
    echo "https://railway.app/new?template=https://github.com/pu3163329117-eng/NS-Smart-Shopping"
    
    ask_to_continue
}

# Vercel + Railway部署指导
vercel_railway_deploy() {
    header "Vercel + Railway 部署"
    
    echo "${BOLD}部署顺序:${NC}"
    echo ""
    echo "📦 ${BOLD}第一步: 部署后端到Railway${NC}"
    step "1. 访问 https://railway.app/new"
    step "2. 导入GitHub仓库"
    step "3. Railway会创建后端和数据库"
    step "4. 获取后端URL: https://your-api.railway.app"
    
    echo ""
    echo "🌐 ${BOLD}第二步: 部署前端到Vercel${NC}"
    step "1. 访问 https://vercel.com/new"
    step "2. 导入GitHub仓库"
    step "3. 配置环境变量:"
    echo "   VITE_API_URL=https://your-api.railway.app"
    step "4. 点击部署"
    
    echo ""
    echo "${BOLD}环境变量配置:${NC}"
    echo "后端 (Railway):"
    echo "  • GEMINI_API_KEY"
    echo "  • JWT_SECRET"
    echo "  • DATABASE_URL (自动)"
    echo ""
    echo "前端 (Vercel):"
    echo "  • VITE_API_URL"
    
    ask_to_continue
}

# Zeabur部署指导
zeabur_deploy() {
    header "Zeabur 部署"
    
    # 检查是否有冲突配置
    if [ -f "railway.toml" ] || [ -f "vercel.json" ]; then
        warning "检测到其他平台配置，可能干扰Zeabur"
        read -p "是否移除冲突配置? (y/n): " remove_choice
        if [[ $remove_choice =~ ^[Yy]$ ]]; then
            rm -f railway.toml railway.json vercel.json 2>/dev/null || true
            success "已移除冲突配置"
        fi
    fi
    
    # 确保有zbpack.json
    if [ ! -f "zbpack.json" ]; then
        create_zeabur_config
    fi
    
    step "1. 访问 https://zeabur.com"
    step "2. 创建新项目"
    step "3. 导入GitHub仓库"
    step "4. Zeabur会自动检测配置"
    step "5. 配置环境变量:"
    echo "   • GEMINI_API_KEY"
    echo "   • JWT_SECRET"
    step "6. 点击部署"
    
    ask_to_continue
}

# 本地Docker部署
local_docker_deploy() {
    header "本地Docker测试"
    
    # 检查Docker
    if ! command -v docker &> /dev/null; then
        error "Docker未安装"
        echo "安装Docker: https://docs.docker.com/get-docker/"
        show_menu
        return
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose未安装"
        echo "安装Docker Compose: https://docs.docker.com/compose/install/"
        show_menu
        return
    fi
    
    # 检查配置文件
    if [ ! -f "docker-compose.prod.yml" ]; then
        warning "Docker配置不存在，正在创建..."
        create_docker_config
    fi
    
    # 检查环境变量
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            warning "已创建.env文件，请编辑配置后再运行"
            echo "编辑 .env 文件，然后重新运行本地部署"
            show_menu
            return
        else
            error "缺少.env.example模板"
            show_menu
            return
        fi
    fi
    
    step "将执行以下命令:"
    echo "1. 停止现有服务"
    echo "2. 构建并启动新服务"
    echo "3. 显示服务状态"
    
    read -p "是否继续? (y/n): " confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        show_menu
        return
    fi
    
    # 执行部署
    echo ""
    step "停止现有服务..."
    docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
    
    step "构建并启动服务..."
    docker-compose -f docker-compose.prod.yml up --build -d
    
    step "等待服务启动..."
    sleep 8
    
    step "服务状态:"
    docker-compose -f docker-compose.prod.yml ps
    
    success "本地部署完成!"
    echo ""
    echo "🌐 前端: http://localhost"
    echo "🔧 后端: http://localhost:3000"
    echo "📊 健康检查: http://localhost/health"
    echo ""
    echo "查看日志: docker-compose -f docker-compose.prod.yml logs -f"
    echo "停止服务: docker-compose -f docker-complace.prod.yml down"
    
    read -p "按回车返回菜单..." -n 1
    show_menu
}

# 创建配置文件函数
create_railway_config() {
    cat > railway.toml << 'EOF'
[build]
builder = "NIXPACKS"
buildCommand = "cd smart-ja-web && npm install && npm run build"

[deploy]
startCommand = "cd smart-ja-web && npm run preview"
healthcheckPath = "/health"

[[services]]
name = "web"
port = 3002
rootDirectory = "smart-ja-web"

[[services]]
name = "api"
port = 3000
rootDirectory = "smart-ja-backend"
startCommand = "npm start"

[[services]]
name = "database"
type = "postgresql"
version = "15"
EOF
    success "创建 railway.toml"
}

create_vercel_config() {
    cat > vercel.json << 'EOF'
{
  "buildCommand": "cd smart-ja-web && npm install && npm run build",
  "outputDirectory": "smart-ja-web/dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "https://your-api.railway.app/api/$1"
    }
  ]
}
EOF
    success "创建 vercel.json"
}

create_zeabur_config() {
    cat > zbpack.json << 'EOF'
{
    "app_dir": "smart-ja-web",
    "build_command": "npm install && npm run build",
    "start_command": "npm start",
    "port": 3002
}
EOF
    success "创建 zbpack.json"
}

create_docker_config() {
    if [ ! -f "docker-compose.prod.yml" ]; then
        cp docker-compose.yml docker-compose.prod.yml 2>/dev/null || true
        success "创建 docker-compose.prod.yml"
    fi
}

# 辅助函数
ask_to_continue() {
    echo ""
    read -p "按回车返回主菜单..." -n 1
    show_menu
}

# 启动脚本
clear
echo "${BOLD}NS Smart Shopping 部署助手${NC}"
echo "版本 1.0 | 支持多平台全栈部署"
echo ""

# 检查是否在项目目录
if [ ! -d "smart-ja-web" ] || [ ! -d "smart-ja-backend" ]; then
    error "请在项目根目录运行此脚本"
    echo "项目根目录应包含: smart-ja-web/ 和 smart-ja-backend/"
    exit 1
fi

show_menu