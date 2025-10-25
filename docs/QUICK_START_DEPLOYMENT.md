# 快速部署指南

5 分钟内将 AI Novel Assistant 部署上线！

## 🎯 最推荐方案

### Railway.app (零成本开始)

**为什么选择 Railway?**
- ✅ 每月 $5 免费额度（足够轻度使用）
- ✅ 自动 HTTPS 和域名
- ✅ 持久化存储支持
- ✅ 一键部署
- ✅ 国内访问速度快

**部署步骤** (5 分钟)

1. **Fork 本仓库到你的 GitHub**

2. **访问 Railway.app 并登录**
   ```
   https://railway.app/
   ```
   使用 GitHub 账号登录

3. **创建新项目**
   - 点击 "New Project"
   - 选择 "Deploy from GitHub repo"
   - 选择你 fork 的仓库

4. **配置环境变量**

   在 Railway 项目设置中添加：

   ```bash
   OPENAI_API_KEY=sk-你的OpenAI密钥
   JWT_SECRET=随机生成32位以上的密钥
   ```

   生成 JWT_SECRET:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

5. **添加持久化存储**

   在项目设置 → Volumes → Add Volume:
   - 挂载路径: `/app/server/prisma/data`
   - 大小: 1GB

6. **部署！**

   Railway 会自动构建和部署，几分钟后你会得到一个可访问的 URL:
   ```
   https://你的应用.up.railway.app
   ```

7. **完成！** 🎉

访问你的 URL，开始使用！

---

## 🐳 备选方案：Docker (本地或 VPS)

如果你有自己的服务器或想在本地运行：

### 前提条件
- 已安装 Docker 和 Docker Compose
- 已安装 Git

### 部署步骤 (3 分钟)

1. **克隆项目**
   ```bash
   git clone https://github.com/yourusername/ai-novel-assistant.git
   cd ai-novel-assistant
   ```

2. **配置环境变量**
   ```bash
   cp .env.example .env
   nano .env  # 编辑并填入你的 OpenAI API Key
   ```

3. **启动服务**
   ```bash
   docker-compose up -d
   ```

4. **访问应用**
   ```
   http://localhost:3001
   ```

就这么简单！

### 管理命令

```bash
# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 备份数据
npm run backup
```

---

## 📱 其他平台快速部署

### Render.com (完全免费)

**一键部署**:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com)

1. 点击按钮
2. 连接 GitHub 仓库
3. 设置 `OPENAI_API_KEY` 环境变量
4. 点击 "Create Web Service"

**注意**: 免费版会在 15 分钟无活动后休眠，首次访问会有 30-60 秒延迟。

### Zeabur (国内用户推荐)

1. 访问 [zeabur.com](https://zeabur.com)
2. GitHub 登录
3. 创建项目 → 从 GitHub 导入
4. 配置环境变量
5. 部署

---

## 🔧 部署前检查

在部署前，运行检查脚本确保一切就绪：

```bash
npm run deploy:check
```

这会检查：
- ✓ Node.js 版本
- ✓ 依赖安装
- ✓ 环境变量配置
- ✓ 构建是否成功
- ✓ Git 状态

---

## 🔑 必需配置

所有部署方案都需要以下环境变量：

| 变量 | 说明 | 如何获取 |
|------|------|----------|
| `OPENAI_API_KEY` | OpenAI API 密钥 | [platform.openai.com](https://platform.openai.com/api-keys) |
| `JWT_SECRET` | JWT 加密密钥 | 使用上面的命令生成随机字符串 |

可选变量：
- `ALLOWED_ORIGINS`: CORS 允许的域名（自动配置）
- `PORT`: 端口（默认 3001）
- `NODE_ENV`: 环境（自动设为 production）

---

## 📊 成本对比

| 平台 | 月成本 | 适用场景 |
|------|--------|----------|
| Railway | $0-5 | 个人项目、小团队 |
| Render | $0 | 测试、演示 |
| Zeabur | $0-5 | 国内用户 |
| Docker (VPS) | $3-10 | 完全控制 |
| 腾讯云轻量 | ¥50+ | 生产环境 |

---

## 🆘 遇到问题？

### 常见问题

**Q: 部署后访问显示 "Application Error"**

A: 检查环境变量是否正确设置，特别是 `OPENAI_API_KEY`

**Q: 数据库找不到**

A: 确保添加了持久化存储卷（Railway/Render 的 Volume）

**Q: OpenAI API 调用失败**

A:
- 检查 API Key 是否有效
- 确认 OpenAI 账户有余额
- 如在国内服务器，可能需要配置代理

**Q: 构建失败**

A:
```bash
# 本地先测试构建
npm install
npm run build
npm run deploy:check
```

### 获取帮助

- 查看完整文档: [DEPLOYMENT.md](./DEPLOYMENT.md)
- 提交 Issue: [GitHub Issues](https://github.com/yourusername/ai-novel-assistant/issues)
- 查看日志排查问题

---

## 🚀 进阶配置

部署成功后，你可能还想：

### 绑定自定义域名

**Railway**:
1. 项目设置 → Domains
2. 添加自定义域名
3. 配置 DNS CNAME 记录

**Render**:
1. 项目设置 → Custom Domain
2. 添加域名
3. 配置 DNS

### 配置 S3 存储 (可选)

如果文件上传量大，可以使用 AWS S3 或兼容服务：

```bash
# 添加到环境变量
AWS_ACCESS_KEY_ID=你的AccessKey
AWS_SECRET_ACCESS_KEY=你的SecretKey
AWS_S3_BUCKET=你的bucket名称
AWS_REGION=ap-southeast-1
```

### 设置自动备份

在服务器上配置定时任务：

```bash
# 编辑 crontab
crontab -e

# 添加每天凌晨 2 点备份
0 2 * * * cd /path/to/ai-novel-assistant && npm run backup
```

### 监控和告警

推荐工具：
- [UptimeRobot](https://uptimerobot.com/) - 免费监控
- [BetterStack](https://betterstack.com/) - 日志和监控
- Railway/Render 内置监控

---

## ✅ 部署检查清单

部署完成后，测试以下功能：

- [ ] 应用可以访问
- [ ] 可以注册/登录
- [ ] 可以创建新小说项目
- [ ] AI 对话功能正常
- [ ] 可以创建和编辑章节
- [ ] 文件上传功能正常
- [ ] 导出 EPUB 功能正常

---

## 🎓 下一步

部署成功后：

1. 阅读 [用户手册](./docs/USER_GUIDE.md)（如果有）
2. 配置 AI 约束和内容分级
3. 导入现有小说数据
4. 邀请团队成员（如有协作功能）
5. 设置定期备份

---

**祝你写作愉快！** ✍️
