# GitHub Actions 部署快速指南

本指南帮助你快速配置 GitHub Actions 自动部署。

## 前置准备

1. 确保代码已推送到 GitHub 仓库
2. 选择部署平台 (Railway/Render/Docker)
3. 准备好 OpenAI API Key

---

## 方案一: Railway 部署 (推荐)

### 步骤 1: 创建 Railway 项目

访问 [Railway.app](https://railway.app/) 并创建新项目

### 步骤 2: 获取 Railway Token

1. 访问 [Account Tokens](https://railway.app/account/tokens)
2. 点击 "Create Token"
3. 输入名称: `github-actions`
4. 复制生成的 token

### 步骤 3: 配置 GitHub Secrets

在你的 GitHub 仓库中:

```
Settings → Secrets and variables → Actions → New repository secret
```

添加以下 secrets:

| Secret Name | Value |
|------------|-------|
| `RAILWAY_TOKEN` | 从步骤 2 复制的 token |
| `RAILWAY_SERVICE_NAME` | ai-novel-assistant (可选) |

### 步骤 4: 配置 Railway 环境变量

在 Railway 项目中设置环境变量:

```bash
# 安装 Railway CLI (可选,也可在网页端设置)
npm install -g @railway/cli
railway login
railway link

# 设置环境变量
railway variables set OPENAI_API_KEY=sk-your-key
railway variables set JWT_SECRET=$(openssl rand -base64 32)
railway variables set NODE_ENV=production
railway variables set PORT=3001
```

或在 Railway Dashboard 中手动设置。

### 步骤 5: 触发部署

```bash
git add .
git commit -m "Setup Railway deployment"
git push origin main
```

查看部署状态: Actions → Deploy to Railway

---

## 方案二: Render 部署

### 步骤 1: 连接 GitHub 仓库

1. 访问 [Render Dashboard](https://dashboard.render.com/)
2. 点击 "New +" → "Web Service"
3. 连接你的 GitHub 账号
4. 选择 `ai-novel-assistant` 仓库

### 步骤 2: 配置服务

Render 会自动读取 `render.yaml` 配置文件。

手动配置:
- **Name**: ai-novel-assistant
- **Region**: Singapore
- **Branch**: main
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

### 步骤 3: 配置环境变量

在 Render Dashboard 中添加:

| Key | Value |
|-----|-------|
| `OPENAI_API_KEY` | sk-your-key |
| `JWT_SECRET` | (点击 Generate 自动生成) |
| `NODE_ENV` | production |

### 步骤 4: 添加持久化存储

在服务设置中:
- 点击 "Disks"
- 添加新磁盘:
  - Name: novel-data
  - Mount Path: /app/server/prisma/data
  - Size: 1 GB

### 步骤 5: 部署

点击 "Create Web Service",Render 会自动部署。

后续推送代码会自动触发部署:
```bash
git push origin main
```

### (可选) 配置 GitHub Actions

获取 Deploy Hook:
1. 服务设置 → Deploy Hooks
2. 创建 Hook,复制 URL
3. 添加到 GitHub Secrets: `RENDER_DEPLOY_HOOK_URL`

---

## 方案三: Docker 镜像发布

### 步骤 1: 启用 GitHub Container Registry

默认已启用,无需额外配置。

### 步骤 2: (可选) 配置 Docker Hub

如果要同时发布到 Docker Hub:

1. 创建 [Docker Hub Access Token](https://hub.docker.com/settings/security)
2. 添加到 GitHub Secrets:

| Secret Name | Value |
|------------|-------|
| `DOCKERHUB_USERNAME` | 你的 Docker Hub 用户名 |
| `DOCKERHUB_TOKEN` | Access Token |

### 步骤 3: 触发构建

推送代码或创建标签:

```bash
# 推送 main 分支,构建 latest 镜像
git push origin main

# 创建版本标签,构建版本化镜像
git tag v1.0.0
git push origin v1.0.0
```

### 步骤 4: 使用镜像

```bash
# 拉取镜像
docker pull ghcr.io/YOUR_USERNAME/ai-novel-assistant:latest

# 创建 .env 文件
cat > .env << EOF
OPENAI_API_KEY=sk-your-key
JWT_SECRET=$(openssl rand -base64 32)
EOF

# 使用 docker-compose 运行
docker-compose -f docker-compose.prod.yml up -d
```

---

## 验证部署

### 检查部署状态

**GitHub Actions**:
```
仓库 → Actions → 选择工作流 → 查看运行状态
```

**Railway**:
```bash
railway status
railway logs
```

**Render**:
```
Dashboard → 服务 → Logs
```

### 测试应用

```bash
# 替换为你的部署 URL
curl https://your-app.railway.app/api/health
curl https://your-app.onrender.com/api/health

# 预期响应
{"status":"ok","timestamp":"..."}
```

---

## 常见问题

### Q1: GitHub Actions 工作流没有运行?

**检查**:
1. 确认工作流文件在 `.github/workflows/` 目录
2. 检查分支名称 (main/master)
3. 确认 Actions 已启用: Settings → Actions → Allow all actions

### Q2: Railway 部署失败: Token 无效

**解决**:
1. 重新生成 Railway Token
2. 更新 GitHub Secret: `RAILWAY_TOKEN`
3. 确认 token 有足够的权限

### Q3: Docker 镜像拉取失败: Permission denied

**解决**:
```bash
# 登录 GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# 或使镜像公开
# GitHub → 仓库 → Packages → 镜像 → Package settings → Change visibility → Public
```

### Q4: 环境变量没有生效

**检查**:
1. 确认变量名拼写正确
2. Railway/Render: 检查服务是否重启
3. Docker: 确认 `.env` 文件存在且被正确加载

### Q5: 数据库文件丢失

**解决**:
- Railway/Render: 确认持久化卷已正确挂载
- Docker: 检查 volume 配置: `docker volume ls`

---

## 下一步

1. **配置自定义域名**:
   - Railway: Settings → Domains
   - Render: Settings → Custom Domains

2. **设置监控告警**:
   - [UptimeRobot](https://uptimerobot.com/) - 免费监控服务
   - [Sentry](https://sentry.io/) - 错误追踪

3. **启用 HTTPS**:
   - Railway/Render 自动提供
   - 自托管: 使用 Let's Encrypt + Nginx

4. **配置 CI/CD**:
   - 添加自动化测试工作流
   - 配置多环境部署 (staging/production)

5. **优化性能**:
   - 启用 CDN
   - 配置 Redis 缓存
   - 数据库索引优化

---

## 获取帮助

- **详细文档**: [DEPLOYMENT.md](../../DEPLOYMENT.md)
- **项目文档**: [README.md](../../README.md)
- **问题反馈**: [GitHub Issues](https://github.com/your-username/ai-novel-assistant/issues)

---

祝部署顺利!
