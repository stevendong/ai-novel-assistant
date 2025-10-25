# AI Novel Assistant 部署指南

本文档提供多种低成本部署方案，适合个人和小团队使用。

## 📋 目录

- [部署需求](#部署需求)
- [方案对比](#方案对比)
- [方案一：Railway（推荐）](#方案一railway推荐)
- [方案二：Render](#方案二render)
- [方案三：Zeabur](#方案三zeabur)
- [方案四：腾讯云/阿里云](#方案四腾讯云阿里云)
- [方案五：Docker自托管](#方案五docker自托管)
- [环境变量配置](#环境变量配置)
- [数据库迁移](#数据库迁移)
- [故障排查](#故障排查)

---

## 部署需求

### 最低硬件要求
- CPU: 1 核
- 内存: 512MB (推荐 1GB)
- 磁盘: 2GB (含数据库和上传文件)
- Node.js: 20.19.0+ 或 22.12.0+

### 必需服务
- SQLite 数据库（文件存储）
- 持久化存储（用于数据库和上传文件）
- OpenAI API 密钥

### 网络要求
- 支持 HTTPS（推荐）
- 能够访问 OpenAI API（需要海外网络或代理）

---

## 方案对比

| 方案 | 月成本 | 免费额度 | 部署难度 | 持久化存储 | 国内访问 | 推荐指数 |
|------|--------|----------|----------|------------|----------|----------|
| Railway | $0-5 | $5/月 | ⭐ | ✅ (1GB) | 较快 | ⭐⭐⭐⭐⭐ |
| Render | $0 | 免费层 | ⭐⭐ | ✅ (1GB) | 较慢 | ⭐⭐⭐⭐ |
| Zeabur | $0-5 | $5/月 | ⭐ | ✅ | 快 | ⭐⭐⭐⭐⭐ |
| 腾讯云轻量 | ¥50+ | - | ⭐⭐⭐ | ✅ | 很快 | ⭐⭐⭐ |
| Docker自托管 | 服务器成本 | - | ⭐⭐⭐⭐ | ✅ | 取决于服务器 | ⭐⭐⭐ |

---

## 方案一：Railway（推荐）

Railway 提供每月 $5 免费额度，支持持久化存储，部署简单，速度快。

### 成本估算
- **免费额度**: $5/月
- **预计使用**: $2-4/月（轻度使用）
- **超出后**: 按使用量计费

### 部署步骤

#### 1. 准备工作

```bash
# 确保代码已提交到 Git 仓库
git add .
git commit -m "Ready for deployment"
git push
```

#### 2. 创建 Railway 项目

1. 访问 [Railway.app](https://railway.app/)
2. 使用 GitHub 账号登录
3. 点击 "New Project" → "Deploy from GitHub repo"
4. 选择 `ai-novel-assistant` 仓库
5. Railway 会自动检测项目类型

#### 3. 配置环境变量

在 Railway 项目设置中添加以下环境变量：

```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=file:/app/server/prisma/data/novels.db
OPENAI_API_KEY=sk-your-openai-api-key
JWT_SECRET=your-random-secret-key-min-32-chars
ALLOWED_ORIGINS=https://your-app.up.railway.app
```

#### 4. 添加持久化卷

1. 进入项目设置 → "Volumes"
2. 点击 "Add Volume"
3. 挂载路径: `/app/server/prisma/data`
4. 大小: 1GB
5. 再添加一个卷用于上传文件:
   - 挂载路径: `/app/server/uploads`
   - 大小: 1GB

#### 5. 配置构建命令

Railway 会自动检测，但你可以手动配置：

```toml
# railway.toml (已创建)
[build]
builder = "nixpacks"
buildCommand = "npm run build"

[deploy]
startCommand = "npm start"
healthcheckPath = "/api/health"
```

#### 6. 部署

点击 "Deploy"，Railway 会自动：
1. 安装依赖
2. 构建前端
3. 生成 Prisma Client
4. 启动服务

#### 7. 获取域名

部署成功后，Railway 会提供一个域名，格式：
```
https://your-app.up.railway.app
```

你也可以绑定自定义域名。

#### 8. 初始化数据库

```bash
# 使用 Railway CLI
railway login
railway link
railway run npm run db:push
```

或者访问应用，首次访问会自动初始化数据库。

---

## 方案二：Render

Render 提供完全免费的托管服务，适合测试和小流量应用。

### 限制
- 免费实例在 15 分钟无活动后会休眠
- 冷启动时间 30-60 秒
- 每月 750 小时免费运行时间

### 部署步骤

#### 1. 准备代码

确保 `render.yaml` 已创建（已完成）。

#### 2. 创建 Render 服务

1. 访问 [Render.com](https://render.com/)
2. 使用 GitHub 登录
3. 点击 "New" → "Blueprint"
4. 连接 GitHub 仓库
5. Render 会自动读取 `render.yaml`

#### 3. 配置环境变量

在 Render 控制台设置：

```bash
OPENAI_API_KEY=sk-your-openai-api-key
```

其他变量已在 `render.yaml` 中配置。

#### 4. 部署

点击 "Apply"，Render 会自动部署。

#### 5. 获取域名

```
https://ai-novel-assistant.onrender.com
```

#### 6. 保持活跃（可选）

为避免休眠，可以使用 Cron 服务定期 ping：

```bash
# 使用 UptimeRobot 或类似服务
# 每 10 分钟访问一次
https://ai-novel-assistant.onrender.com/api/health
```

---

## 方案三：Zeabur

Zeabur 是国内团队开发的 PaaS 平台，对中文用户友好，访问速度快。

### 成本
- 免费额度: $5/月
- 中国香港节点，访问速度快

### 部署步骤

1. 访问 [Zeabur.com](https://zeabur.com/)
2. GitHub 登录
3. 创建新项目 → 从 GitHub 导入
4. 选择仓库和分支
5. Zeabur 自动检测并部署
6. 配置环境变量（同 Railway）
7. 添加持久化存储卷

### 优势
- 中文界面
- 国内访问快
- 支持多种数据库
- 免费 SSL 证书

---

## 方案四：腾讯云/阿里云

适合需要稳定性和国内访问速度的生产环境。

### 成本
- 轻量应用服务器: ¥50-100/月
- 对象存储 COS/OSS: ¥1-10/月

### 部署步骤

#### 1. 购买服务器

选择配置：
- CPU: 1核 或 2核
- 内存: 2GB
- 带宽: 3-5Mbps
- 系统: Ubuntu 22.04 LTS

#### 2. 安装环境

```bash
# SSH 连接服务器
ssh root@your-server-ip

# 更新系统
apt update && apt upgrade -y

# 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 安装 PM2（进程管理）
npm install -g pm2

# 安装 Nginx
apt install -y nginx

# 安装 Git
apt install -y git
```

#### 3. 部署应用

```bash
# 克隆代码
cd /var/www
git clone https://github.com/yourusername/ai-novel-assistant.git
cd ai-novel-assistant

# 安装依赖
npm install

# 配置环境变量
cp .env.example server/.env
nano server/.env  # 编辑环境变量

# 构建前端
npm run build

# 初始化数据库
cd server
npx prisma generate
npx prisma db push

# 使用 PM2 启动
pm2 start index.js --name ai-novel-assistant
pm2 save
pm2 startup
```

#### 4. 配置 Nginx

```bash
nano /etc/nginx/sites-available/ai-novel-assistant
```

添加以下配置：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /var/www/ai-novel-assistant/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用配置：

```bash
ln -s /etc/nginx/sites-available/ai-novel-assistant /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

#### 5. 配置 SSL（可选但推荐）

```bash
# 安装 Certbot
apt install -y certbot python3-certbot-nginx

# 获取证书
certbot --nginx -d your-domain.com

# 自动续期
certbot renew --dry-run
```

---

## 方案五：Docker 自托管

使用 Docker 容器化部署，适合有 VPS 或本地服务器的用户。

### 部署步骤

#### 1. 安装 Docker

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 安装 Docker Compose
apt install -y docker-compose
```

#### 2. 配置环境变量

```bash
# 创建 .env 文件
cp .env.example .env
nano .env
```

编辑 `.env` 文件，设置必要的环境变量。

#### 3. 构建和启动

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 初始化数据库
docker-compose exec app npx prisma db push
```

#### 4. 管理服务

```bash
# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看状态
docker-compose ps

# 进入容器
docker-compose exec app sh
```

#### 5. 数据备份

```bash
# 备份数据库
docker-compose exec app tar -czf /tmp/backup.tar.gz /app/server/prisma/data /app/server/uploads
docker cp ai-novel-assistant:/tmp/backup.tar.gz ./backup-$(date +%Y%m%d).tar.gz

# 恢复数据库
docker cp ./backup.tar.gz ai-novel-assistant:/tmp/
docker-compose exec app tar -xzf /tmp/backup.tar.gz -C /
```

---

## 环境变量配置

### 必需变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `NODE_ENV` | 环境 | `production` |
| `PORT` | 端口 | `3001` |
| `DATABASE_URL` | 数据库路径 | `file:./prisma/data/novels.db` |
| `OPENAI_API_KEY` | OpenAI API 密钥 | `sk-...` |
| `JWT_SECRET` | JWT 密钥（32字符以上） | 随机生成的字符串 |
| `ALLOWED_ORIGINS` | CORS 允许的域名 | `https://your-app.com` |

### 可选变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `AWS_ACCESS_KEY_ID` | AWS 访问密钥 | - |
| `AWS_SECRET_ACCESS_KEY` | AWS 密钥 | - |
| `AWS_S3_BUCKET` | S3 存储桶 | - |
| `MEM0_API_KEY` | Mem0 API 密钥 | - |

### 生成 JWT_SECRET

```bash
# 使用 Node.js 生成
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 或使用 OpenSSL
openssl rand -hex 32
```

---

## 数据库迁移

### 导出数据

```bash
# 从开发环境导出
cd server
npx prisma db push --force-reset  # 确保 schema 是最新的
cp prisma/novels.db /path/to/backup/

# 导出为 SQL
sqlite3 prisma/novels.db .dump > backup.sql
```

### 导入数据

```bash
# 方式1: 直接复制数据库文件
# 上传到服务器的 /app/server/prisma/data/novels.db

# 方式2: 使用 SQL 文件
sqlite3 /app/server/prisma/data/novels.db < backup.sql

# 方式3: 使用 Prisma
npx prisma db push  # 创建表结构
# 然后使用应用的导入功能导入数据
```

---

## 故障排查

### 常见问题

#### 1. 数据库连接失败

```bash
Error: ENOENT: no such file or directory
```

**解决方案**:
- 确保挂载了持久化卷
- 检查 `DATABASE_URL` 路径是否正确
- 运行 `npx prisma generate` 和 `npx prisma db push`

#### 2. OpenAI API 超时

```bash
Error: Request timeout
```

**解决方案**:
- 检查服务器是否能访问 OpenAI API
- 配置代理（如使用国内服务器）
- 使用 OpenAI 代理服务

#### 3. 内存不足

```bash
JavaScript heap out of memory
```

**解决方案**:
```bash
# 增加 Node.js 内存限制
NODE_OPTIONS="--max-old-space-size=1024" node index.js
```

#### 4. 文件上传失败

**解决方案**:
- 检查 `uploads` 目录权限
- 确保持久化卷已挂载
- 检查磁盘空间

### 查看日志

**Railway**:
```bash
railway logs
```

**Render**:
在 Render 控制台查看实时日志

**Docker**:
```bash
docker-compose logs -f app
```

**PM2**:
```bash
pm2 logs ai-novel-assistant
```

---

## 性能优化

### 1. 启用 Gzip 压缩

在 Nginx 配置中添加：

```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

### 2. 配置缓存

```nginx
location /assets {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 3. 使用 CDN

- 将前端静态资源上传到 CDN
- 配置 `VITE_CDN_URL` 环境变量

### 4. 数据库优化

```bash
# 定期清理和优化 SQLite
sqlite3 novels.db "VACUUM;"
sqlite3 novels.db "ANALYZE;"
```

---

## 监控和维护

### 设置健康检查

所有部署方案都支持健康检查端点：

```
GET /api/health
```

### 定期备份

建议每天自动备份数据库：

```bash
# 添加到 crontab
0 2 * * * /path/to/backup-script.sh
```

备份脚本示例：

```bash
#!/bin/bash
DATE=$(date +%Y%m%d)
BACKUP_DIR=/backups
DB_PATH=/app/server/prisma/data/novels.db

# 创建备份
cp $DB_PATH $BACKUP_DIR/novels-$DATE.db
gzip $BACKUP_DIR/novels-$DATE.db

# 删除 7 天前的备份
find $BACKUP_DIR -name "novels-*.db.gz" -mtime +7 -delete
```

---

## 总结

### 推荐方案

1. **个人项目/测试**: Railway 或 Zeabur（免费额度充足）
2. **小团队**: Railway 或 Render（成本可控）
3. **生产环境**: 腾讯云/阿里云（稳定可靠）
4. **技术团队**: Docker 自托管（完全控制）

### 下一步

- [ ] 选择部署方案
- [ ] 准备 OpenAI API 密钥
- [ ] 配置环境变量
- [ ] 执行部署
- [ ] 测试功能
- [ ] 设置备份策略

如有问题，请查看项目 [GitHub Issues](https://github.com/yourusername/ai-novel-assistant/issues)。
