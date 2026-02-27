#!/bin/bash

# NS Smart Shopping 全栈部署脚本
# 使用方法: ./deploy.sh [platform]

set -e

PLATFORM=${1:-"railway"}

echo "🚀 NS Smart Shopping 全栈部署脚本"
echo "=================================="

# 检查环境
check_environment() {
    echo "🔍 检查部署环境..."
    
    # 检查Docker
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker未安装"
        exit 1
    fi
    echo "✅ Docker已安装: $(docker --version)"
    
    # 检查Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        echo "❌ Docker Compose未安装"
        exit 1
    fi
    echo "✅ Docker Compose已安装: $(docker-compose --version)"
    
    # 检查环境变量文件
    if [ ! -f ".env" ]; then
        echo "⚠️  未找到.env文件，从模板创建..."
        cp .env.example .env
        echo "✅ 已创建.env文件，请编辑配置"
        exit 1
    fi
    echo "✅ 环境变量文件就绪"
}

# 本地测试部署
deploy_local() {
    echo "🏠 本地测试部署..."
    
    # 停止现有服务
    docker-compose down || true
    
    # 构建并启动
    docker-compose -f docker-compose.prod.yml up --build -d
    
    echo "✅ 本地部署完成"
    echo "🌐 访问地址: http://localhost:80"
    echo "🔧 后端API: http://localhost:3000"
    echo "🗄️  数据库: localhost:5432"
}

# Railway部署
deploy_railway() {
    echo "🚂 Railway.app 部署..."
    
    # 检查Railway CLI
    if ! command -v railway &> /dev/null; then
        echo "📦 安装Railway CLI..."
        curl -fsSL https://railway.app/install.sh | sh
    fi
    
    echo "🔑 登录Railway..."
    railway login
    
    echo "🚀 部署到Railway..."
    railway up
    
    echo "✅ Railway部署完成"
    echo "📊 访问Railway仪表板查看状态: https://railway.app"
}

# Render部署
deploy_render() {
    echo "🎨 Render.com 部署..."
    
    # 创建render.yaml
    cat > render.yaml << EOF
services:
  - type: web
    name: smart-ns-web
    runtime: docker
    dockerfilePath: ./Dockerfile.railway
    dockerContext: .
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: smartja-db
          property: connectionString
    healthCheckPath: /health
    autoDeploy: true

  - type: web
    name: smart-ns-api
    runtime: docker
    dockerfilePath: ./smart-ja-backend/Dockerfile
    dockerContext: ./smart-ja-backend
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: smartja-db
          property: connectionString
      - key: GEMINI_API_KEY
        sync: false
    healthCheckPath: /health
    autoDeploy: true

databases:
  - name: smartja-db
    databaseName: smartja
    user: smartja_user
    plan: free
EOF
    
    echo "✅ Render配置已创建"
    echo "📁 文件: render.yaml"
    echo "🚀 请上传到Render.com进行部署"
}

# 显示帮助
show_help() {
    echo "使用方法: $0 [platform]"
    echo ""
    echo "可选平台:"
    echo "  local     - 本地Docker测试"
    echo "  railway   - Railway.app部署 (推荐)"
    echo "  render    - Render.com部署"
    echo "  help      - 显示此帮助"
    echo ""
    echo "示例:"
    echo "  $0 local     # 本地测试"
    echo "  $0 railway   # 部署到Railway"
    echo ""
    echo "环境要求:"
    echo "  - Docker 和 Docker Compose"
    echo "  - 编辑.env文件配置环境变量"
}

# 主函数
main() {
    case $PLATFORM in
        "local")
            check_environment
            deploy_local
            ;;
        "railway")
            check_environment
            deploy_railway
            ;;
        "render")
            check_environment
            deploy_render
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            echo "❌ 未知平台: $PLATFORM"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main