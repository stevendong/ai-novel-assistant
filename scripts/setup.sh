#!/bin/bash

# AI Novel Assistant - Monorepo Setup Script
# 这个脚本帮助你设置和管理多仓架构项目

set -e

echo "🚀 AI Novel Assistant - Monorepo Setup"
echo "======================================"

# 检查 Node.js 版本
echo "📋 检查 Node.js 版本..."
node_version=$(node -v | cut -d'v' -f2)
required_version="20.19.0"

if [ "$(printf '%s\n' "$required_version" "$node_version" | sort -V | head -n1)" != "$required_version" ]; then
    echo "❌ 需要 Node.js >= $required_version，当前版本: $node_version"
    exit 1
fi

echo "✅ Node.js 版本检查通过: $node_version"

# 检查 npm 版本
echo "📋 检查 npm 版本..."
npm_version=$(npm -v)
required_npm="9.0.0"

if [ "$(printf '%s\n' "$required_npm" "$npm_version" | sort -V | head -n1)" != "$required_npm" ]; then
    echo "❌ 需要 npm >= $required_npm，当前版本: $npm_version"
    exit 1
fi

echo "✅ npm 版本检查通过: $npm_version"

# 清理旧的 node_modules
echo "🧹 清理旧的依赖..."
rm -rf node_modules client/node_modules server/node_modules
rm -f package-lock.json client/package-lock.json server/package-lock.json

# 安装依赖
echo "📦 安装所有依赖..."
npm install

# 生成 Prisma 客户端
echo "🗄️  生成 Prisma 客户端..."
npm run db:push

echo "✅ 设置完成！"
echo ""
echo "🎯 可用的命令："
echo "  npm run dev          - 启动开发服务器（前端 + 后端）"
echo "  npm run client:dev   - 仅启动前端开发服务器"
echo "  npm run server:dev   - 仅启动后端开发服务器"
echo "  npm run build        - 构建前端"
echo "  npm run build:all    - 构建所有工作区"
echo "  npm run start        - 启动生产服务器"
echo "  npm run db:push      - 推送数据库模式"
echo "  npm run db:studio    - 打开 Prisma Studio"
echo "  npm run clean        - 清理所有构建产物和依赖"
echo ""
echo "🌟 现在你可以运行 'npm run dev' 来启动项目！"
