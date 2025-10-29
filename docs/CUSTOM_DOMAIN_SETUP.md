# 自定义域名配置指南

域名: `writer.myaichatbox.com`

## 架构说明

- **前端**: Vercel 部署 (Vue 3 应用)
- **后端**: Railway 部署 (Node.js API)
- **域名**: writer.myaichatbox.com

## 第一步: DNS 配置

在你的域名提供商(如 Cloudflare、阿里云、腾讯云等)添加以下 DNS 记录:

### 方案 A: 使用子域名分离(推荐)

```
# 前端 - 指向 Vercel
writer.myaichatbox.com     CNAME    cname.vercel-dns.com

# 后端 API - 指向 Railway
api.writer.myaichatbox.com CNAME    [your-railway-project].up.railway.app
```

### 方案 B: 使用同一域名

```
# 前端 - 指向 Vercel
writer.myaichatbox.com     CNAME    cname.vercel-dns.com
```

注意: 如果使用方案 B,后端 API 将通过 Vercel 反向代理访问。

---

## 第二步: Vercel 前端配置

### 1. 在 Vercel Dashboard 添加自定义域名

1. 登录 [Vercel Dashboard](https://vercel.com)
2. 选择你的项目
3. 进入 **Settings** → **Domains**
4. 添加域名: `writer.myaichatbox.com`
5. 等待 DNS 验证通过(通常 1-5 分钟)

### 2. 配置环境变量

在 Vercel 项目设置中添加:

**方案 A (推荐 - 使用子域名):**
```bash
VITE_API_BASE_URL=https://api.writer.myaichatbox.com
```

**方案 B (使用同一域名 + Vercel 反向代理):**
```bash
VITE_API_BASE_URL=https://writer.myaichatbox.com/api
```

### 3. 部署前端

```bash
cd client
npm run build
# Vercel 会自动检测到更改并重新部署
```

或手动触发部署:
```bash
# 如果已安装 vercel CLI
vercel --prod
```

---

## 第三步: Railway 后端配置

### 1. 在 Railway Dashboard 添加自定义域名

**方案 A (推荐):**

1. 登录 [Railway Dashboard](https://railway.app)
2. 选择你的后端项目
3. 进入 **Settings** → **Domains**
4. 点击 **Add Custom Domain**
5. 输入: `api.writer.myaichatbox.com`
6. Railway 会提供一个 CNAME 记录值
7. 返回 DNS 提供商,添加该 CNAME 记录
8. 等待验证通过

**方案 B:**

如果使用 Vercel 反向代理,保持 Railway 默认域名即可。

### 2. 配置环境变量

在 Railway 项目设置中添加/更新:

**方案 A:**
```bash
# 数据库
DATABASE_URL=file:./prisma/novels.db
PORT=3001
NODE_ENV=production

# OpenAI
OPENAI_API_KEY=your_openai_api_key_here

# CORS - 允许你的前端域名
ALLOWED_ORIGINS=https://writer.myaichatbox.com

# 可选: Clerk 认证(如果使用)
CLERK_SECRET_KEY=your_clerk_secret_key_here
```

**方案 B (需要 Vercel 反向代理):**
```bash
ALLOWED_ORIGINS=https://writer.myaichatbox.com
```

### 3. 部署后端

Railway 会自动检测到环境变量更改并重新部署。

或手动触发:
```bash
# 如果使用 Railway CLI
railway up
```

---

## 第四步: 方案 B - Vercel 反向代理配置(可选)

如果选择方案 B,需要在前端项目添加反向代理配置。

创建 `client/vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://[your-railway-project].up.railway.app/:path*"
    }
  ],
  "headers": [
    {
      "source": "/api/:path*",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "https://writer.myaichatbox.com"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET,POST,PUT,DELETE,OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type,Authorization"
        }
      ]
    }
  ]
}
```

---

## 第五步: 验证部署

### 1. 测试前端

访问: `https://writer.myaichatbox.com`

应该能正常加载前端应用。

### 2. 测试后端 API

**方案 A:**
```bash
curl https://api.writer.myaichatbox.com/health
```

**方案 B:**
```bash
curl https://writer.myaichatbox.com/api/health
```

应该返回健康状态响应。

### 3. 测试完整流程

1. 在前端创建一个新项目
2. 检查浏览器开发者工具的网络请求
3. 确认 API 请求成功

---

## 常见问题

### 1. SSL 证书错误

Vercel 和 Railway 都会自动配置 SSL 证书,通常需要等待 5-15 分钟。

### 2. CORS 错误

确保后端的 `ALLOWED_ORIGINS` 包含你的前端域名:
```bash
ALLOWED_ORIGINS=https://writer.myaichatbox.com
```

### 3. DNS 未生效

DNS 传播需要时间,通常 5 分钟到 48 小时不等。使用以下命令检查:
```bash
nslookup writer.myaichatbox.com
dig writer.myaichatbox.com
```

### 4. API 请求 404

检查:
- 前端环境变量 `VITE_API_BASE_URL` 是否正确
- Railway 服务是否正常运行
- 如果使用方案 B,检查 `vercel.json` 配置

---

## 推荐配置: 方案 A

推荐使用**方案 A**(子域名分离),因为:

✅ 更清晰的架构分离
✅ 更好的缓存控制
✅ 更容易调试
✅ 更灵活的扩展性
✅ 避免 Vercel 代理限制

配置总览:
- 前端: `https://writer.myaichatbox.com` → Vercel
- 后端: `https://api.writer.myaichatbox.com` → Railway

---

## 安全建议

1. **环境变量**: 永远不要提交 `.env` 文件到 Git
2. **HTTPS**: 确保所有请求使用 HTTPS
3. **CORS**: 只允许你的域名访问 API
4. **API Keys**: 定期轮换 OpenAI API Key
5. **认证**: 考虑启用 Clerk 认证增强安全性

---

## 需要帮助?

如有问题,检查:
- Vercel 部署日志
- Railway 部署日志
- 浏览器开发者工具控制台
- DNS 配置是否正确
