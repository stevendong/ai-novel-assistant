# 部署指南 - writer.myaichatbox.com

完整的 Vercel + Railway 部署流程

## 部署架构

```
┌─────────────────────────────────────────┐
│  writer.myaichatbox.com (前端)          │
│  ↓ Vercel                               │
│  Vue 3 + Vite                          │
└─────────────────────────────────────────┘
                ↓ API 请求
┌─────────────────────────────────────────┐
│  api.writer.myaichatbox.com (后端)      │
│  ↓ Railway                              │
│  Node.js + Express                      │
└─────────────────────────────────────────┘
                ↓
┌─────────────────────────────────────────┐
│  Supabase (数据库)                       │
│  PostgreSQL                             │
└─────────────────────────────────────────┘
```

---

## 第一步: DNS 配置

在你的 DNS 提供商(如 Cloudflare)添加以下记录:

```
类型    名称                          值                              TTL
CNAME   writer                       cname.vercel-dns.com           Auto
CNAME   api.writer                   [待 Railway 提供]               Auto
```

注意: `api.writer` 的 CNAME 值将在 Railway 配置自定义域名后获得。

---

## 第二步: Vercel 前端部署

### 1. 连接 GitHub 仓库

1. 访问 [Vercel Dashboard](https://vercel.com/new)
2. 点击 **Import Project**
3. 选择你的 GitHub 仓库
4. 配置项目:
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `npm run build-only`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### 2. 配置环境变量

在 Vercel 项目设置 → Environment Variables 添加:

```bash
# Production Environment
VITE_API_BASE_URL=https://api.writer.myaichatbox.com
```

可选(如果使用 Clerk 认证):
```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_live_your_clerk_publishable_key_here
```

### 3. 添加自定义域名

1. 进入 **Settings** → **Domains**
2. 添加域名: `writer.myaichatbox.com`
3. Vercel 会自动验证 DNS 并配置 SSL
4. 等待 SSL 证书生成(通常 1-5 分钟)

### 4. 触发部署

点击 **Deploy** 或推送代码到 main 分支自动触发部署。

---

## 第三步: Railway 后端部署

### 1. 创建新项目

1. 访问 [Railway Dashboard](https://railway.app/new)
2. 点击 **New Project**
3. 选择 **Deploy from GitHub repo**
4. 选择你的 GitHub 仓库
5. 配置项目:
   - **Root Directory**: `server`
   - **Start Command**: `npm start`

### 2. 配置环境变量

在 Railway 项目 Variables 标签页添加:

```bash
# Server Configuration
NODE_ENV=production
PORT=3001

# CORS Configuration
ALLOWED_ORIGINS=https://writer.myaichatbox.com

# Database (Supabase Session Pooler)
DATABASE_URL=postgresql://postgres.vclogfjvrngecsctzpoz:wwxCjN57Ipgc6G1L@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# OpenAI API Configuration
OPENAI_API_KEY=sk-Ntc0s8r1E7RcwTS7686b41Ef9b0e47B6A1Bd9eC0C91b0711
OPENAI_BASE_URL=https://aihubmix.com/v1
OPENAI_MODEL=DeepSeek-V3.1-Terminus
OPENAI_EMBEDDING_MODEL=qwen3-embedding-8b

# Custom Provider Configuration
CUSTOM_PROVIDER_NAME=aihunmix
CUSTOM_API_KEY=sk-Ntc0s8r1E7RcwTS7686b41Ef9b0e47B6A1Bd9eC0C91b0711
CUSTOM_BASE_URL=https://aihubmix.com/v1
CUSTOM_MODEL=DeepSeek-V3.1-Terminus
CUSTOM_TEMPERATURE=1
CUSTOM_MAX_TOKENS=200000

# Cloudflare R2 Storage
CLOUDFLARE_R2_ACCOUNT_ID=bd174503cffcff8dd5e17feedb1a872c
CLOUDFLARE_R2_ACCESS_KEY_ID=3c23f957a2946bc8a3f29e4c1355436f
CLOUDFLARE_R2_SECRET_ACCESS_KEY=387a17c47d1646d0a95810df8a50074a56c35c5411809c5b3461d846e069c3bb
CLOUDFLARE_R2_BUCKET_NAME=jeteokar
CLOUDFLARE_R2_ENDPOINT=https://bd174503cffcff8dd5e17feedb1a872c.r2.cloudflarestorage.com
CLOUDFLARE_R2_PUBLIC_DOMAIN=https://bd174503cffcff8dd5e17feedb1a872c.r2.cloudflarestorage.com
CLOUDFLARE_R2_CDN_DOMAIN=s3-for-jeteokar.myaichatbox.com

# Mem0 Memory Service
MEM0_ENABLED=true
MEM0_API_KEY=m0-Mgu8F2creRXInwie1FrdW5JMZ7HUFhY0VxxO9l1l
MEM0_BASE_URL=https://api.mem0.ai
MEM0_TIMEOUT=5000
MEM0_RETRIES=3
MEM0_FALLBACK_ENABLED=true
MEM0_LOG_LEVEL=info

# Logging
LOG_LEVEL=info
```

可选(如果使用 Clerk):
```bash
CLERK_SECRET_KEY=sk_live_your_clerk_secret_key_here
```

### 3. 添加自定义域名

1. 进入 **Settings** → **Domains**
2. 点击 **Custom Domain**
3. 输入: `api.writer.myaichatbox.com`
4. Railway 会显示 CNAME 目标值(如: `your-project.up.railway.app`)
5. 复制该值并返回 DNS 提供商
6. 更新 DNS 记录:
   ```
   CNAME   api.writer   your-project.up.railway.app
   ```
7. 等待验证通过并自动配置 SSL

### 4. 配置健康检查(可选)

在 Railway Settings:
- **Health Check Path**: `/health`
- **Health Check Timeout**: 30 seconds

### 5. 部署

Railway 会自动检测更改并部署。

---

## 第四步: 验证部署

### 1. 检查前端

```bash
# 访问前端
curl -I https://writer.myaichatbox.com

# 预期: 200 OK
```

浏览器访问: `https://writer.myaichatbox.com`

### 2. 检查后端 API

```bash
# 测试健康检查端点
curl https://api.writer.myaichatbox.com/health

# 预期: {"status":"ok"}
```

### 3. 检查 CORS

在浏览器开发者工具中:
1. 访问前端
2. 尝试创建项目或执行 API 操作
3. 检查 Network 标签,确认:
   - API 请求成功 (200/201)
   - 没有 CORS 错误

### 4. 检查 SSL 证书

```bash
# 检查前端 SSL
openssl s_client -connect writer.myaichatbox.com:443 -servername writer.myaichatbox.com

# 检查后端 SSL
openssl s_client -connect api.writer.myaichatbox.com:443 -servername api.writer.myaichatbox.com
```

---

## 持续部署 (CI/CD)

### 自动部署触发条件

**Vercel 前端:**
- 推送到 `main` 分支
- 创建 Pull Request (预览部署)
- 手动触发

**Railway 后端:**
- 推送到 `main` 分支
- 手动触发

### 部署流程

```bash
# 开发流程
git checkout -b feature/new-feature
# ... 开发代码
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature

# 创建 PR 进行代码审查
# Vercel 会自动创建预览部署

# 合并到 main 后自动部署到生产环境
git checkout main
git merge feature/new-feature
git push origin main
```

---

## 环境管理

### 本地开发环境

```bash
# 前端
cd client
cp .env.example .env
# 编辑 .env 配置本地 API 地址

# 后端
cd server
cp .env.example .env
# 编辑 .env 配置本地数据库和 API keys
```

### 生产环境

生产环境变量通过 Vercel 和 Railway Dashboard 管理,不应提交到代码库。

---

## 故障排查

### 前端无法加载

1. 检查 Vercel 部署日志
2. 检查 DNS 配置是否正确
3. 检查 SSL 证书状态
4. 清除浏览器缓存

### API 请求失败

1. 检查 Railway 部署日志
2. 验证环境变量配置
3. 检查 CORS 配置
4. 测试 API 健康检查端点

### CORS 错误

```bash
# 检查 Railway 环境变量
ALLOWED_ORIGINS=https://writer.myaichatbox.com

# 确保没有尾部斜杠
```

### 数据库连接失败

1. 检查 DATABASE_URL 是否正确
2. 确认使用 Supabase Session Pooler URL
3. 检查网络连接和防火墙规则

### DNS 未生效

```bash
# 检查 DNS 传播
nslookup writer.myaichatbox.com
nslookg api.writer.myaichatbox.com

# 强制刷新 DNS
# macOS/Linux
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder

# Windows
ipconfig /flushdns
```

---

## 监控和日志

### Vercel 日志

访问: `https://vercel.com/[your-team]/[project]/deployments`

查看:
- 构建日志
- 运行时日志
- 分析数据

### Railway 日志

访问: Railway Dashboard → 你的项目 → Logs

查看:
- 应用日志
- 部署日志
- 错误追踪

### 设置告警(推荐)

1. **Vercel**: 配置部署失败通知
2. **Railway**: 配置应用崩溃告警
3. **Uptime Monitoring**: 使用第三方服务(如 UptimeRobot)

---

## 性能优化

### 前端优化

1. **启用 Gzip/Brotli 压缩** (Vercel 自动)
2. **配置缓存策略** (已在 vercel.json 配置)
3. **CDN 加速** (Vercel 自动)
4. **图片优化**: 使用 WebP 格式

### 后端优化

1. **数据库连接池**: 已使用 Supabase Session Pooler
2. **API 响应缓存**: 考虑添加 Redis
3. **资源优化**: Railway 根据负载自动扩展

---

## 安全建议

1. **环境变量**: 永远不要提交敏感信息到 Git
2. **HTTPS Only**: 所有请求强制使用 HTTPS
3. **CORS 配置**: 只允许特定域名
4. **API Key 轮换**: 定期更新 API keys
5. **依赖更新**: 定期更新依赖包
6. **安全头**: 配置 CSP、HSTS 等安全头

---

## 成本估算

### Vercel (前端)

- **Hobby Plan**: 免费
  - 100 GB 带宽/月
  - 无限部署
  - 自动 HTTPS
  - 全球 CDN

### Railway (后端)

- **Starter Plan**: $5/月
  - 500 小时计算时间
  - 100 GB 出站流量
  - 8 GB RAM
  - 8 vCPU

### Supabase (数据库)

- **Free Plan**: 免费
  - 500 MB 数据库存储
  - 1 GB 文件存储
  - 无限 API 请求

### 总计

预估月成本: **$5 - $10**

---

## 扩展计划

当流量增长时:

1. **数据库**: 升级 Supabase Pro ($25/月)
2. **后端**: Railway 自动扩展(按使用付费)
3. **前端**: Vercel Pro ($20/月)升级更多带宽
4. **CDN**: 考虑 Cloudflare 加速

---

## 备份策略

### 数据库备份

Supabase 自动每日备份(免费计划保留 7 天)

手动备份:
```bash
# 使用 pg_dump
pg_dump "postgresql://postgres:password@host:5432/postgres" > backup.sql
```

### 代码备份

代码已在 GitHub 管理,确保:
- 定期推送到远程仓库
- 使用分支保护规则
- 配置自动备份

---

## 支持和帮助

- **Vercel 文档**: https://vercel.com/docs
- **Railway 文档**: https://docs.railway.app
- **Supabase 文档**: https://supabase.com/docs
- **项目 Issues**: [GitHub Issues](https://github.com/your-repo/issues)

---

## 快速命令参考

```bash
# 本地开发
npm run dev                    # 启动全栈开发服务器

# 构建
npm run build                  # 构建前端生产版本

# 数据库
npm run db:push                # 同步数据库 schema
npm run db:studio              # 打开 Prisma Studio

# 部署
git push origin main           # 触发自动部署

# 查看日志
# Vercel: https://vercel.com/dashboard
# Railway: https://railway.app/dashboard
```

---

## 下一步

✅ 完成域名配置
✅ 部署前端到 Vercel
✅ 部署后端到 Railway
✅ 配置环境变量
✅ 验证部署成功

现在你可以:
- 邀请用户测试
- 配置自定义功能
- 添加监控和告警
- 优化性能
- 扩展功能

祝部署顺利! 🚀
