# AI Novel Assistant - 部署指南

本文档提供完整的 GitHub Actions 自动部署配置说明。

## 目录

- [部署方案概览](#部署方案概览)
- [Railway 部署](#railway-部署)
- [Render 部署](#render-部署)
- [Docker 镜像发布](#docker-镜像发布)
- [环境变量配置](#环境变量配置)
- [故障排查](#故障排查)

---

## 部署方案概览

本项目支持三种自动部署方式:

| 方案 | 适用场景 | 优势 | 成本 |
|------|---------|------|------|
| **Railway** | 需要持久化存储的生产环境 | 简单易用,支持持久化磁盘 | 免费额度:$5/月 |
| **Render** | 中小型项目,稳定运行 | 完全托管,免费计划包含数据库 | 免费计划可用 |
| **Docker** | 自托管或 VPS 部署 | 完全控制,可部署到任何支持 Docker 的环境 | 取决于服务器 |

---

## Railway 部署

### 1. Railway 项目设置

#### 1.1 创建 Railway 项目
```bash
# 安装 Railway CLI
npm install -g @railway/cli

# 登录 Railway
railway login

# 在项目根目录初始化
railway init

# 关联到现有项目 (如果已创建)
railway link
```

#### 1.2 配置环境变量

在 Railway 控制台或使用 CLI 设置以下环境变量:

```bash
# 必需的环境变量
railway variables set OPENAI_API_KEY=sk-your-openai-api-key
railway variables set JWT_SECRET=your-super-secret-jwt-key-change-in-production
railway variables set NODE_ENV=production
railway variables set PORT=3001

# 可选配置
railway variables set ALLOWED_ORIGINS=https://your-app.railway.app
```

### 2. GitHub Actions 配置

#### 2.1 获取 Railway Token

1. 访问 [Railway Dashboard](https://railway.app/account/tokens)
2. 创建新的 Project Token
3. 复制 token 值

#### 2.2 配置 GitHub Secrets

在 GitHub 仓库中设置 Secrets:

1. 进入仓库 Settings → Secrets and variables → Actions
2. 添加以下 secrets:

| Secret Name | 说明 | 必需 |
|------------|------|------|
| `RAILWAY_TOKEN` | Railway API Token | ✅ |
| `RAILWAY_SERVICE_NAME` | 服务名称 (默认: ai-novel-assistant) | ❌ |

#### 2.3 触发部署

部署会在以下情况自动触发:
- 推送到 `master` 或 `main` 分支
- 手动触发 (Actions → Deploy to Railway → Run workflow)

```bash
# 推送代码触发部署
git add .
git commit -m "Deploy to Railway"
git push origin main
```

### 3. 验证部署

```bash
# 查看部署状态
railway status

# 查看日志
railway logs

# 获取部署 URL
railway domain
```

---

## Render 部署

### 1. Render 项目设置

#### 1.1 连接 GitHub 仓库

1. 访问 [Render Dashboard](https://dashboard.render.com/)
2. 点击 "New +" → "Web Service"
3. 连接你的 GitHub 仓库
4. 选择 `ai-novel-assistant` 项目

#### 1.2 配置服务

Render 会自动读取项目根目录的 `render.yaml` 配置文件。

手动配置选项:
- **Name**: ai-novel-assistant
- **Region**: Singapore (距离中国较近)
- **Branch**: main
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Plan**: Free

#### 1.3 配置环境变量

在 Render 控制台设置环境变量:

| 变量名 | 值 | 说明 |
|--------|---|------|
| `NODE_ENV` | production | 生产环境 |
| `PORT` | 3001 | 服务端口 |
| `OPENAI_API_KEY` | sk-xxx | OpenAI API 密钥 |
| `JWT_SECRET` | (自动生成) | JWT 签名密钥 |
| `ALLOWED_ORIGINS` | https://your-app.onrender.com | CORS 允许的源 |

#### 1.4 配置持久化存储

1. 在服务设置中添加 Disk:
   - **Name**: novel-data
   - **Mount Path**: /app/server/prisma/data
   - **Size**: 1 GB (免费)

### 2. GitHub Actions 配置 (可选)

#### 2.1 获取 Deploy Hook

1. 进入 Render 服务设置
2. 找到 "Deploy Hooks" 部分
3. 创建新的 Deploy Hook
4. 复制 Hook URL

#### 2.2 配置 GitHub Secrets

| Secret Name | 说明 | 必需 |
|------------|------|------|
| `RENDER_DEPLOY_HOOK_URL` | Render Deploy Hook URL | ❌ |

> 注意: Render 默认会在 git push 时自动部署,Deploy Hook 是可选的。

#### 2.3 触发部署

```bash
# 推送代码自动触发部署
git push origin main

# 或手动触发 GitHub Action
# Actions → Deploy to Render → Run workflow
```

### 3. 验证部署

- 访问 Render Dashboard 查看部署日志
- 部署完成后访问分配的 URL (https://your-app.onrender.com)
- 检查 `/api/health` 端点确认服务运行正常

---

## Docker 镜像发布

### 1. GitHub Container Registry (推荐)

Docker 镜像会自动发布到 GitHub Container Registry (ghcr.io)。

#### 1.1 自动构建触发条件

- 推送到 `master` 或 `main` 分支
- 创建版本标签 (如 `v1.0.0`)
- Pull Request (仅构建,不推送)

#### 1.2 镜像标签规则

| 触发事件 | 生成的标签 |
|---------|-----------|
| 推送到 main | `ghcr.io/your-username/ai-novel-assistant:latest` |
| 推送到 main | `ghcr.io/your-username/ai-novel-assistant:main` |
| 创建标签 v1.2.3 | `ghcr.io/your-username/ai-novel-assistant:1.2.3` |
| | `ghcr.io/your-username/ai-novel-assistant:1.2` |
| | `ghcr.io/your-username/ai-novel-assistant:1` |
| 提交 sha123 | `ghcr.io/your-username/ai-novel-assistant:main-sha123` |

#### 1.3 拉取和使用镜像

```bash
# 拉取最新镜像
docker pull ghcr.io/YOUR_GITHUB_USERNAME/ai-novel-assistant:latest

# 运行容器
docker run -d \
  -p 3001:3001 \
  -e OPENAI_API_KEY=your_key \
  -e JWT_SECRET=your_secret \
  -v novel-data:/app/server/prisma/data \
  -v novel-uploads:/app/server/uploads \
  ghcr.io/YOUR_GITHUB_USERNAME/ai-novel-assistant:latest
```

### 2. Docker Hub (可选)

#### 2.1 配置 Docker Hub

在 GitHub Secrets 中添加:

| Secret Name | 说明 |
|------------|------|
| `DOCKERHUB_USERNAME` | Docker Hub 用户名 |
| `DOCKERHUB_TOKEN` | Docker Hub Access Token |

#### 2.2 拉取镜像

```bash
docker pull YOUR_DOCKERHUB_USERNAME/ai-novel-assistant:latest
```

### 3. 使用 Docker Compose 部署

创建 `.env` 文件:
```env
OPENAI_API_KEY=sk-your-key
JWT_SECRET=your-secret-key
```

运行服务:
```bash
# 使用本地构建
docker-compose up -d

# 使用发布的镜像
docker-compose -f docker-compose.prod.yml up -d
```

---

## 环境变量配置

### 必需的环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `NODE_ENV` | 运行环境 | production |
| `PORT` | 服务端口 | 3001 |
| `DATABASE_URL` | 数据库连接 | file:./prisma/data/novels.db |
| `OPENAI_API_KEY` | OpenAI API 密钥 | sk-proj-xxx |
| `JWT_SECRET` | JWT 签名密钥 | 至少 32 字符的随机字符串 |

### 可选的环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `ALLOWED_ORIGINS` | CORS 允许的源 | http://localhost:5173 |
| `VITE_API_BASE_URL` | 前端 API 地址 | http://localhost:3001 |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk 认证密钥 | - |
| `GEMINI_API_KEY` | Gemini API 密钥 | - |

### 安全最佳实践

1. **永远不要**将 API 密钥提交到代码仓库
2. 使用强随机字符串作为 JWT_SECRET
3. 在生产环境中使用环境变量或密钥管理服务
4. 定期轮换 API 密钥和密钥
5. 限制 CORS 允许的源为实际部署的域名

---

## 故障排查

### 常见问题

#### 1. Railway 部署失败

**错误**: `Railway token not found`

**解决**:
```bash
# 确认 RAILWAY_TOKEN 已设置
echo $RAILWAY_TOKEN

# 重新设置 GitHub Secret
# Settings → Secrets → RAILWAY_TOKEN
```

#### 2. Render 部署失败

**错误**: `Build failed: npm install`

**解决**:
1. 检查 `package.json` 中的依赖是否正确
2. 确认 Node.js 版本兼容 (需要 20.x)
3. 查看 Render 日志获取详细错误信息

#### 3. Docker 镜像构建失败

**错误**: `COPY failed: no such file or directory`

**解决**:
```bash
# 确保文件结构正确
ls -la client/ server/

# 检查 .dockerignore 是否排除了必需的文件
cat .dockerignore
```

#### 4. 数据库连接失败

**错误**: `Can't reach database server`

**解决**:
1. 确认 DATABASE_URL 配置正确
2. 对于 Railway/Render,确保持久化磁盘已挂载
3. 检查文件权限: `ls -la server/prisma/data/`

#### 5. API 密钥无效

**错误**: `Invalid API key`

**解决**:
```bash
# 验证环境变量
railway variables get OPENAI_API_KEY

# 重新设置正确的密钥
railway variables set OPENAI_API_KEY=sk-new-key
```

### 调试技巧

#### 查看部署日志

**Railway**:
```bash
railway logs --tail
```

**Render**:
- Dashboard → 选择服务 → Logs 标签

**Docker**:
```bash
docker logs -f container-name
```

#### 健康检查

```bash
# 检查服务状态
curl https://your-app.com/api/health

# 预期响应
{"status":"ok","timestamp":"2025-10-28T..."}
```

#### 数据库检查

```bash
# Railway
railway connect

# 进入容器检查数据库
docker exec -it container-name sh
cd /app/server/prisma/data
ls -la novels.db
```

### 性能优化

1. **启用 CDN**: 使用 Cloudflare 或其他 CDN 加速静态资源
2. **数据库优化**: 定期清理旧数据,添加适当索引
3. **缓存策略**: 启用 Redis 缓存频繁访问的数据
4. **日志级别**: 生产环境设置为 `error` 级别
5. **监控告警**: 配置 UptimeRobot 或 Sentry 监控服务状态

---

## 版本发布流程

### 创建新版本

```bash
# 1. 更新版本号
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.0 → 1.1.0
npm version major  # 1.0.0 → 2.0.0

# 2. 推送标签
git push origin main --tags

# 3. GitHub Actions 会自动:
#    - 构建 Docker 镜像
#    - 推送到 ghcr.io 和 Docker Hub
#    - 创建 GitHub Release (如果配置)
```

### 回滚版本

**Railway**:
```bash
# 查看部署历史
railway deployments

# 回滚到指定版本
railway rollback <deployment-id>
```

**Render**:
- Dashboard → 选择服务 → Deploys → 选择历史版本 → Redeploy

**Docker**:
```bash
# 拉取特定版本
docker pull ghcr.io/your-username/ai-novel-assistant:1.0.0

# 更新运行的容器
docker-compose down
docker-compose up -d
```

---

## 支持与反馈

- **文档**: [README.md](./README.md)
- **Issues**: [GitHub Issues](https://github.com/your-username/ai-novel-assistant/issues)
- **讨论**: [GitHub Discussions](https://github.com/your-username/ai-novel-assistant/discussions)

---

## 许可证

MIT License - 详见 [LICENSE](./LICENSE) 文件
