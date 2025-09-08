#!/bin/bash

# AI Novel Assistant - Monorepo 验证脚本

echo "🔍 验证 Monorepo 配置"
echo "===================="

# 检查根目录配置
echo "📋 检查根目录 package.json..."
if grep -q '"workspaces"' package.json; then
    echo "✅ Workspaces 配置已存在"
else
    echo "❌ Workspaces 配置缺失"
    exit 1
fi

# 检查依赖安装
echo "📦 检查依赖安装..."
if [ -d "node_modules" ]; then
    echo "✅ 根目录依赖已安装"
else
    echo "❌ 根目录依赖未安装"
    exit 1
fi

# 检查子目录没有独立的 node_modules
echo "🧹 检查子目录..."
if [ ! -d "client/node_modules" ] && [ ! -d "server/node_modules" ]; then
    echo "✅ 子目录没有独立的 node_modules（正确）"
else
    echo "⚠️  发现子目录有独立的 node_modules，建议清理"
fi

# 检查 workspace 识别
echo "🔗 检查 workspace 识别..."
workspace_output=$(npm ls --depth=0 2>/dev/null | grep "npm:" | wc -l | tr -d ' ')
if [ "$workspace_output" -ge 2 ]; then
    echo "✅ Workspaces 正确识别（$workspace_output 个工作区）"
else
    echo "❌ Workspaces 识别失败，但配置可能仍然正确"
    echo "   尝试运行: npm ls --depth=0"
fi

# 检查 Prisma 客户端
echo "🗄️  检查 Prisma 客户端..."
if [ -d "node_modules/.prisma/client" ]; then
    echo "✅ Prisma 客户端已生成"
else
    echo "⚠️  Prisma 客户端未生成，运行: npm run db:push"
fi

# 列出可用的脚本
echo ""
echo "🎯 可用的脚本命令："
echo "  npm run dev          - 启动完整开发环境"
echo "  npm run client:dev   - 启动前端开发服务器"
echo "  npm run server:dev   - 启动后端开发服务器"
echo "  npm run build        - 构建前端"
echo "  npm run start        - 启动生产服务器"
echo "  npm run db:push      - 推送数据库模式"
echo "  npm run clean        - 清理所有构建产物"
echo ""
echo "✅ Monorepo 配置验证完成！"
