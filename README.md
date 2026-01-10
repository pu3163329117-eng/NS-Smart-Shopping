# Smart JA - AI Student Company Platform

## 项目简介
全球首个由 AI 深度托管的青少年创业生态平台。本项目为 2026/1/11 路演版本 MVP。

## 快速开始 (Quick Start)

### 方式一：Docker 一键部署 (推荐)
确保已安装 Docker Desktop，然后在根目录运行：
```bash
docker-compose up --build
```
- 前端访问: http://localhost
- 后端 API: http://localhost:3000
- 数据库: 端口 5432

### 方式二：手动运行

**1. 启动后端**
```bash
cd smart-ja-backend
npm install
# 创建 .env 文件并填入 GEMINI_API_KEY (可选)
npm run dev
```

**2. 启动前端**
```bash
cd smart-ja-web
npm install
npm run dev
```

## 目录结构
- `smart-ja-web/`: Vue 3 + Tailwind CSS 前端源码
- `smart-ja-backend/`: Node.js + Express 后端源码
- `init.sql`: 数据库初始化脚本
- `PRD.md`: 产品需求文档

## 演示账号
路演版本无需登录，直接访问首页即可体验 AI 导购与视差滚动效果。
