# 快速部署 - writer.myaichatbox.com

5 步完成部署,预计耗时 15-20 分钟

---

## 准备工作 (5 分钟)

确保你有:
- [x] GitHub 账号
- [x] Vercel 账号 (https://vercel.com)
- [x] Railway 账号 (https://railway.app)
- [x] 域名管理权限 (myaichatbox.com)
- [x] OpenAI API Key 或兼容的 API

---

## 第 1 步: DNS 配置 (3 分钟)

登录你的 DNS 提供商,添加两条 CNAME 记录:

```
记录类型: CNAME
名称: writer
目标: cname.vercel-dns.com
TTL: Auto

记录类型: CNAME
名称: api.writer
目标: (等 Railway 配置完成后填写)
TTL: Auto
```

保存后等待 DNS 生效(1-5 分钟)。

---

## 第 2 步: Vercel 前端部署 (5 分钟)

### 2.1 导入项目

1. 访问 https://vercel.com/new
2. 选择 **Import Git Repository**
3. 选择你的 GitHub 仓库
4. 点击 **Import**

### 2.2 配置构建设置

```
Framework Preset: Vite
Root Directory: client
Build Command: npm run build-only
Output Directory: dist
Install Command: npm install
```

### 2.3 添加环境变量

点击 **Environment Variables**,添加:

```
Name: VITE_API_BASE_URL
Value: https://api.writer.myaichatbox.com
Environment: Production
```

### 2.4 添加自定义域名

1. 点击 **Deploy** 先完成首次部署
2. 进入项目 **Settings** → **Domains**
3. 添加域名: `writer.myaichatbox.com`
4. Vercel 会自动验证并配置 SSL

---

## 第 3 步: Railway 后端部署 (7 分钟)

### 3.1 创建项目

1. 访问 https://railway.app/new
2. 点击 **Deploy from GitHub repo**
3. 选择你的 GitHub 仓库
4. 等待自动部署完成

### 3.2 配置环境变量

点击项目 → **Variables** → **RAW Editor**,粘贴以下内容:

```bash
NODE_ENV=production
PORT=3001
ALLOWED_ORIGINS=https://writer.myaichatbox.com

# 数据库 (Supabase)
DATABASE_URL=postgresql://postgres.vclogfjvrngecsctzpoz:wwxCjN57Ipgc6G1L@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# OpenAI API
OPENAI_API_KEY=sk-Ntc0s8r1E7RcwTS7686b41Ef9b0e47B6A1Bd9eC0C91b0711
OPENAI_BASE_URL=https://aihubmix.com/v1
OPENAI_MODEL=DeepSeek-V3.1-Terminus
OPENAI_EMBEDDING_MODEL=qwen3-embedding-8b

# Custom Provider
CUSTOM_PROVIDER_NAME=aihunmix
CUSTOM_API_KEY=sk-Ntc0s8r1E7RcwTS7686b41Ef9b0e47B6A1Bd9eC0C91b0711
CUSTOM_BASE_URL=https://aihubmix.com/v1
CUSTOM_MODEL=DeepSeek-V3.1-Terminus
CUSTOM_TEMPERATURE=1
CUSTOM_MAX_TOKENS=200000

# Cloudflare R2
CLOUDFLARE_R2_ACCOUNT_ID=bd174503cffcff8dd5e17feedb1a872c
CLOUDFLARE_R2_ACCESS_KEY_ID=3c23f957a2946bc8a3f29e4c1355436f
CLOUDFLARE_R2_SECRET_ACCESS_KEY=387a17c47d1646d0a95810df8a50074a56c35c5411809c5b3461d846e069c3bb
CLOUDFLARE_R2_BUCKET_NAME=jeteokar
CLOUDFLARE_R2_ENDPOINT=https://bd174503cffcff8dd5e17feedb1a872c.r2.cloudflarestorage.com
CLOUDFLARE_R2_PUBLIC_DOMAIN=https://bd174503cffcff8dd5e17feedb1a872c.r2.cloudflarestorage.com
CLOUDFLARE_R2_CDN_DOMAIN=s3-for-jeteokar.myaichatbox.com

# Mem0
MEM0_ENABLED=true
MEM0_API_KEY=m0-Mgu8F2creRXInwie1FrdW5JMZ7HUFhY0VxxO9l1l
MEM0_BASE_URL=https://api.mem0.ai
MEM0_TIMEOUT=5000
MEM0_RETRIES=3
MEM0_FALLBACK_ENABLED=true
MEM0_LOG_LEVEL=info

LOG_LEVEL=info
```

点击 **Save** 保存。

### 3.3 添加自定义域名

1. 进入 **Settings** → **Domains**
2. 点击 **Custom Domain**
3. 输入: `api.writer.myaichatbox.com`
4. Railway 会显示一个 CNAME 目标值,类似: `your-project-abc123.up.railway.app`
5. 复制这个值

### 3.4 更新 DNS 记录

回到你的 DNS 提供商,编辑 `api.writer` 记录:

```
记录类型: CNAME
名称: api.writer
目标: [刚才复制的 Railway CNAME 值]
TTL: Auto
```

保存后等待验证。

---

## 第 4 步: 验证部署 (2 分钟)

### 4.1 测试前端

浏览器访问: https://writer.myaichatbox.com

应该能看到应用加载成功。

### 4.2 测试后端

打开终端运行:

```bash
curl https://api.writer.myaichatbox.com/health
```

应该返回: `{"status":"ok"}`

### 4.3 测试完整功能

1. 在前端注册/登录账号
2. 创建一个新项目
3. 添加角色或章节
4. 检查浏览器开发者工具,确认没有 CORS 错误

---

## 第 5 步: 完成 (1 分钟)

部署完成! 🎉

### 后续操作

✅ 保存以下信息:
- 前端 URL: https://writer.myaichatbox.com
- 后端 URL: https://api.writer.myaichatbox.com
- Vercel 项目: https://vercel.com/dashboard
- Railway 项目: https://railway.app/dashboard

✅ 设置监控:
- 配置 Vercel 部署通知
- 配置 Railway 崩溃告警

✅ 备份:
- 数据库已在 Supabase 自动备份
- 代码已在 GitHub 备份

---

## 常见问题

### Q: 前端无法访问?

**A:** 等待 DNS 传播(5-60 分钟)。检查:
```bash
nslookup writer.myaichatbox.com
```

### Q: API 请求 CORS 错误?

**A:** 检查 Railway 环境变量 `ALLOWED_ORIGINS`:
- 确保值为 `https://writer.myaichatbox.com`
- 没有尾部斜杠
- 没有多余空格

### Q: 后端无法连接?

**A:** 检查 Railway 部署状态:
1. 进入 Railway Dashboard
2. 查看 Logs 标签
3. 确认服务正在运行

### Q: SSL 证书错误?

**A:** Vercel 和 Railway 会自动配置 SSL,通常需要 5-15 分钟。

---

## 更新部署

当你修改代码后:

```bash
# 提交代码
git add .
git commit -m "feat: add new feature"
git push origin main
```

Vercel 和 Railway 会自动检测并重新部署。

---

## 回滚部署

### Vercel 回滚

1. 进入 Vercel Dashboard → Deployments
2. 找到之前的稳定版本
3. 点击 **Promote to Production**

### Railway 回滚

1. 进入 Railway Dashboard → Deployments
2. 找到之前的版本
3. 点击 **Rollback**

---

## 成本

- **Vercel**: 免费 (Hobby 计划)
- **Railway**: ~$5/月 (Starter 计划)
- **Supabase**: 免费 (Free 计划)
- **总计**: ~$5/月

---

## 获取帮助

遇到问题?

1. 查看详细文档: `DEPLOYMENT_GUIDE.md`
2. 检查 Vercel 日志: https://vercel.com/[project]/logs
3. 检查 Railway 日志: https://railway.app/[project]/logs
4. 提交 Issue: GitHub Issues

---

## 架构总览

```
[用户浏览器]
     ↓
[writer.myaichatbox.com]  ← Vercel (Vue 3 前端)
     ↓ API 请求
[api.writer.myaichatbox.com]  ← Railway (Node.js 后端)
     ↓
[Supabase]  ← PostgreSQL 数据库
[Cloudflare R2]  ← 文件存储
[OpenAI API]  ← AI 服务
[Mem0]  ← 记忆服务
```

---

## 下一步优化

- [ ] 配置 CDN 加速 (Cloudflare)
- [ ] 添加监控告警 (UptimeRobot)
- [ ] 启用分析统计 (Google Analytics)
- [ ] 配置自动备份
- [ ] 添加 CI/CD 测试

恭喜,你的 AI 小说助手已经成功部署! 🚀
