# Cloudflare 部署方案详细指南

## 项目概述

AI小说写作助手是一个基于Vue.js + Node.js + SQLite的全栈应用，提供AI驱动的小说创作、角色管理、世界设定等功能。本文档详细说明如何将项目部署到Cloudflare平台。

## 技术架构分析

### 当前技术栈
- **前端**: Vue 3 + TypeScript + Vite + Ant Design Vue
- **后端**: Node.js + Express + Prisma ORM
- **数据库**: SQLite (当前大小: 2.1MB)
- **依赖服务**: OpenAI API, WebSocket通信, 文件上传/导出
- **认证**: JWT + 刷新令牌机制

### 部署架构映射

| 当前组件 | Cloudflare服务 | 说明 |
|---------|---------------|------|
| Vue前端 | Cloudflare Pages | 静态站点托管，自动构建部署 |
| Express后端 | Workers for Platforms | 容器化Node.js应用托管 |
| SQLite数据库 | Cloudflare D1 | 云端SQLite，完全兼容现有schema |
| 文件存储 | Cloudflare R2 | 对象存储，处理用户头像和导出文件 |
| WebSocket | Durable Objects | 实时AI对话通信 |

## 部署方案

### 方案选择: 混合部署架构

基于项目复杂度和开发效率考虑，推荐采用**混合部署架构**:

1. **前端**: 完全迁移到Cloudflare Pages
2. **后端**: 保持Express架构，部署到Workers for Platforms
3. **数据库**: 迁移到Cloudflare D1
4. **存储**: 文件存储迁移到R2

### 优势分析
- ✅ 最小代码改动，快速部署
- ✅ 保持现有开发流程
- ✅ 利用Cloudflare全球CDN
- ✅ 成本效益高（大部分功能在免费额度内）
- ✅ 自动扩缩容，无需服务器管理

## 详细部署步骤

### 第一阶段: 前端部署 (1-2天)

#### 1.1 Cloudflare Pages配置

```bash
# 在Cloudflare Dashboard创建Pages项目
# 连接GitHub仓库: https://github.com/your-username/ai-novel-assistant

# 构建配置
Build command: npm run build --workspace=client
Build output directory: client/dist
Root directory: /
Node.js version: 20.x
```

#### 1.2 环境变量配置

在Pages设置中添加环境变量:
```bash
# 生产环境API地址
VITE_API_BASE_URL=https://your-api-worker.your-subdomain.workers.dev

# Clerk认证配置（如果使用）
VITE_CLERK_PUBLISHABLE_KEY=pk_live_your_production_key
```

#### 1.3 构建优化

更新 `client/vite.config.ts`:
```typescript
export default defineConfig({
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
          antd: ['ant-design-vue'],
          editor: ['monaco-editor', '@monaco-editor/loader']
        }
      }
    }
  }
})
```

### 第二阶段: 数据库迁移 (3-5天)

#### 2.1 创建D1数据库

```bash
# 安装Wrangler CLI
npm install -g wrangler

# 登录Cloudflare
wrangler login

# 创建D1数据库
wrangler d1 create ai-novel-assistant-db
```

#### 2.2 Prisma配置更新

更新 `server/prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "sqlite"
  url = env("DATABASE_URL")
}
```

#### 2.3 数据迁移脚本

创建 `server/scripts/migrate-to-d1.js`:
```javascript
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

async function exportData() {
  const prisma = new PrismaClient();

  // 导出所有表数据
  const users = await prisma.user.findMany();
  const novels = await prisma.novel.findMany();
  const characters = await prisma.character.findMany();
  // ... 其他表

  const exportData = {
    users, novels, characters,
    // ... 其他数据
  };

  fs.writeFileSync('data-export.json', JSON.stringify(exportData, null, 2));
  console.log('数据导出完成');
}

exportData();
```

#### 2.4 D1数据导入

```bash
# 应用schema到D1
wrangler d1 execute ai-novel-assistant-db --command="$(cat server/prisma/schema.sql)"

# 导入数据
node server/scripts/migrate-to-d1.js
wrangler d1 execute ai-novel-assistant-db --file=data-import.sql
```

### 第三阶段: 后端部署 (2-3天)

#### 3.1 Workers配置

创建 `wrangler.toml`:
```toml
name = "ai-novel-assistant-api"
main = "server/index.js"
compatibility_date = "2024-01-01"

[env.production]
name = "ai-novel-assistant-api"

[[env.production.d1_databases]]
binding = "DB"
database_name = "ai-novel-assistant-db"
database_id = "your-d1-database-id"

[[env.production.r2_buckets]]
binding = "R2"
bucket_name = "ai-novel-assistant-files"

[env.production.vars]
NODE_ENV = "production"
JWT_SECRET = "your-production-jwt-secret"
ALLOWED_ORIGINS = "https://your-pages-domain.pages.dev"
```

#### 3.2 Prisma适配器配置

更新 `server/config/database.js`:
```javascript
const { PrismaClient } = require('@prisma/client');
const { PrismaD1 } = require('@prisma/adapter-d1');

function createPrismaClient(env) {
  if (env.DB) {
    // D1环境
    const adapter = new PrismaD1(env.DB);
    return new PrismaClient({ adapter });
  } else {
    // 本地开发环境
    return new PrismaClient();
  }
}

module.exports = { createPrismaClient };
```

#### 3.3 Express应用适配

更新 `server/index.js`:
```javascript
const express = require('express');
const { createPrismaClient } = require('./config/database');

function createApp(env) {
  const app = express();
  const prisma = createPrismaClient(env);

  // 将prisma实例注入到req对象
  app.use((req, res, next) => {
    req.prisma = prisma;
    req.env = env;
    next();
  });

  // 其他中间件和路由配置...

  return app;
}

// Workers环境导出
export default {
  async fetch(request, env, ctx) {
    const app = createApp(env);
    // 处理请求...
  }
};

// 本地开发环境
if (require.main === module) {
  const app = createApp(process.env);
  app.listen(3001, () => {
    console.log('Server running on port 3001');
  });
}
```

### 第四阶段: 文件存储迁移 (1-2天)

#### 4.1 R2存储配置

创建 `server/services/r2Storage.js`:
```javascript
class R2StorageService {
  constructor(r2Bucket) {
    this.r2 = r2Bucket;
  }

  async uploadFile(key, file, metadata = {}) {
    await this.r2.put(key, file, {
      customMetadata: metadata
    });

    return {
      key,
      url: `https://your-r2-domain/${key}`,
      size: file.size
    };
  }

  async deleteFile(key) {
    await this.r2.delete(key);
  }

  async getFile(key) {
    return await this.r2.get(key);
  }
}

module.exports = R2StorageService;
```

#### 4.2 文件上传API适配

更新文件上传路由:
```javascript
const R2StorageService = require('../services/r2Storage');

router.post('/upload/avatar', requireAuth, async (req, res) => {
  const r2Storage = new R2StorageService(req.env.R2);

  // 处理文件上传到R2
  const result = await r2Storage.uploadFile(
    `avatars/${req.user.id}/${Date.now()}.jpg`,
    req.file.buffer,
    { userId: req.user.id }
  );

  res.json(result);
});
```

## 环境变量配置

### 生产环境变量

#### Cloudflare Workers Secrets
```bash
# 设置生产环境密钥
wrangler secret put JWT_SECRET --env production
wrangler secret put OPENAI_API_KEY --env production
wrangler secret put REFRESH_TOKEN_SECRET --env production

# 设置普通变量
wrangler secret put NODE_ENV --env production
wrangler secret put ALLOWED_ORIGINS --env production
```

#### Pages环境变量
```bash
# 在Cloudflare Dashboard的Pages设置中添加
VITE_API_BASE_URL=https://ai-novel-assistant-api.your-subdomain.workers.dev
VITE_CLERK_PUBLISHABLE_KEY=pk_live_your_production_key
VITE_ENABLE_WEBSOCKET=true
```

## 部署时间线

### 第1周: 基础设施搭建
- **Day 1-2**: 前端Pages部署，基础配置
- **Day 3-4**: D1数据库创建和schema迁移
- **Day 5-7**: 数据导出导入，测试数据完整性

### 第2周: 后端服务部署
- **Day 8-10**: Workers配置，Express应用适配
- **Day 11-12**: API端点测试，认证系统验证
- **Day 13-14**: 前后端集成测试

### 第3周: 存储和优化
- **Day 15-16**: R2文件存储迁移
- **Day 17-18**: WebSocket功能适配（如需要）
- **Day 19-21**: 性能优化，监控配置

## 成本分析

### Cloudflare服务免费额度

| 服务 | 免费额度 | 超额费用 |
|------|---------|---------|
| **Pages** | 500次构建/月, 无限带宽 | $0.10/1000请求 |
| **Workers** | 100,000请求/日 | $0.50/百万请求 |
| **D1** | 5GB存储, 25M行读取/月 | $0.001/1000行读取 |
| **R2** | 10GB存储, 1M Class A操作/月 | $0.015/GB/月 |

### 预估月成本
- **小型应用** (< 1000用户): $0-5
- **中型应用** (1000-10000用户): $5-25
- **大型应用** (> 10000用户): $25-100

## 监控和维护

### 1. 性能监控

使用Cloudflare Analytics:
```javascript
// 在Workers中添加自定义指标
export default {
  async fetch(request, env, ctx) {
    const start = Date.now();

    try {
      const response = await handleRequest(request, env);

      // 记录响应时间
      ctx.waitUntil(
        env.ANALYTICS.writeDataPoint({
          'response_time': Date.now() - start,
          'status': response.status,
          'endpoint': new URL(request.url).pathname
        })
      );

      return response;
    } catch (error) {
      // 记录错误
      ctx.waitUntil(
        env.ANALYTICS.writeDataPoint({
          'error': error.message,
          'endpoint': new URL(request.url).pathname
        })
      );
      throw error;
    }
  }
};
```

### 2. 日志管理

配置结构化日志:
```javascript
function log(level, message, data = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data
  }));
}

// 使用示例
log('info', 'User login', { userId: user.id, method: 'jwt' });
log('error', 'Database query failed', { query: 'getUserPreferences', error: error.message });
```

### 3. 备份策略

D1数据库备份:
```bash
# 定期导出数据备份
wrangler d1 backup create ai-novel-assistant-db --name="backup-$(date +%Y%m%d)"

# 下载备份
wrangler d1 backup download ai-novel-assistant-db backup-id
```

## 安全配置

### 1. CORS配置
```javascript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### 2. 安全头配置
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://api.openai.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://your-r2-domain"]
    }
  }
}));
```

### 3. 速率限制
```javascript
const rateLimiter = {
  async handle(request, env) {
    const key = `rate_limit:${request.headers.get('cf-connecting-ip')}`;
    const current = await env.KV.get(key);

    if (current && parseInt(current) > 100) {
      return new Response('Too Many Requests', { status: 429 });
    }

    await env.KV.put(key, (parseInt(current) || 0) + 1, { expirationTtl: 3600 });
    return null;
  }
};
```

## 故障排除

### 常见问题及解决方案

#### 1. D1连接问题
```bash
# 检查D1数据库状态
wrangler d1 info ai-novel-assistant-db

# 测试数据库连接
wrangler d1 execute ai-novel-assistant-db --command="SELECT 1"
```

#### 2. Workers部署失败
```bash
# 检查wrangler配置
wrangler whoami

# 验证配置文件
wrangler validate

# 查看部署日志
wrangler tail
```

#### 3. Pages构建失败
检查构建日志中的依赖问题，常见解决方案:
```bash
# 清理依赖缓存
rm -rf node_modules package-lock.json
npm install

# 更新构建命令
Build command: npm ci && npm run build --workspace=client
```

## 回滚策略

### 1. 代码回滚
```bash
# Pages自动保存每次部署的版本
# 在Dashboard中可以一键回滚到之前版本

# Workers回滚
wrangler deploy --env production --compatibility-date=2024-01-01
```

### 2. 数据库回滚
```bash
# 从备份恢复
wrangler d1 restore ai-novel-assistant-db backup-id
```

### 3. 渐进式部署
使用Cloudflare的流量分配功能进行金丝雀部署:
```toml
[env.staging]
name = "ai-novel-assistant-api-staging"
routes = [
  { pattern = "api.example.com/*", zone_name = "example.com" }
]
```

## 总结

本部署方案通过Cloudflare的完整技术栈，为AI小说写作助手提供了高性能、低成本、易维护的部署解决方案。关键优势包括:

1. **快速部署**: 最小化代码改动，3周内完成迁移
2. **成本效益**: 利用Cloudflare慷慨的免费额度
3. **全球性能**: CDN加速，边缘计算响应快速
4. **自动扩缩**: 无需手动运维，自动应对流量变化
5. **安全可靠**: 企业级安全防护，99.9%可用性保证

遵循本指南的步骤规划，可以确保平滑、成功的部署过程。