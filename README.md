# AI Novel Assistant

AI驱动的小说创作协作工具，帮助作家在AI的辅助下高效创作长篇小说。

## ✨ 功能特性

### 核心功能

- 🤖 **AI智能协作**
  - 对话式AI助手：与AI讨论情节、角色发展
  - 内容增强模式：智能改写、扩写、润色文本
  - 一致性检查：自动检测角色、设定、情节的矛盾

- 📚 **项目管理**
  - 完整的小说项目组织和管理
  - 可视化写作进度追踪
  - 多项目并行管理

- 👥 **角色管理**
  - 详细的角色档案系统
  - 角色关系网络管理
  - 角色背景故事记录

- 🌍 **世界设定**
  - 分类管理世界观元素（地点、规则、文化等）
  - 设定引用和关联
  - 时间线和事件管理

- ✍️ **专业编辑器**
  - 基于 Monaco Editor 的代码级编辑体验
  - 多标签页同时编辑
  - 自动保存和版本控制
  - 字数统计和进度跟踪

- 📤 **多格式导出**
  - EPUB电子书格式
  - TXT文本格式
  - 包含元数据和章节结构

### 认证系统

支持两种认证模式，可动态切换：

- **Clerk认证（推荐）**：现代化认证服务，支持社交登录、自动邮箱验证
- **传统认证**：自定义JWT认证系统，完全可控的认证流程

开发模式下访问 `/dev/auth` 查看认证状态和调试工具。

## 🚀 快速开始

> **注意**: 本项目现在使用 **Monorepo 架构**，所有依赖都在根目录统一管理！

### 一键设置（推荐）
```bash
# 运行自动设置脚本
./scripts/setup.sh
```

### 手动设置
```bash
# 安装所有依赖（仅需在根目录运行）
npm install

# 设置数据库
npm run db:push
```

### 开发模式
```bash
# 启动完整开发环境（前端 + 后端）
npm run dev

# 或分别启动
npm run client:dev  # 仅前端
npm run server:dev  # 仅后端
```

### 开发数据库
- 默认情况下，后端在 `NODE_ENV=development` 时会使用本地 PostgreSQL 数据库连接串 `postgresql://noveluser:changeme@localhost:5432/novel_db?schema=public`
- 如果本地尚未启动数据库，可以使用项目内的 Docker 编排快速拉起：
  ```bash
  docker compose -f docker-compose.postgres.yml up -d postgres
  ```
- 需要自定义本地连接时，可设置 `LOCAL_DATABASE_URL`；若要直接链接远程数据库，则在环境变量中显式设置 `DATABASE_URL`
- 部署在反向代理后时，请通过 `TRUST_PROXY` 指定可信代理（默认只信任 loopback/linklocal/uniquelocal），避免使用不安全的 `true`

### 构建和部署
```bash
npm run build      # 构建前端
npm run start      # 启动生产服务器
```

## ⚙️ 环境配置

### 服务端环境变量 (server/.env)

```bash
# 数据库配置
DATABASE_URL="file:./prisma/novels.db"  # SQLite (开发)
# DATABASE_URL="postgresql://user:password@host:5432/dbname"  # PostgreSQL (生产)

# 服务器配置
PORT=3001
NODE_ENV=development

# OpenAI API 配置（必需）
OPENAI_API_KEY=your_openai_api_key_here

# CORS 配置
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# 反向代理配置（可选）
# TRUST_PROXY=loopback,linklocal,uniquelocal
```

### 客户端环境变量 (client/.env)

```bash
# API 配置
VITE_API_BASE_URL=http://localhost:3001

# Clerk 认证配置（可选 - 启用现代认证系统）
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here

# 认证功能开关（可选）
VITE_ALLOW_AUTH_MODE_SWITCH=true
VITE_ENABLE_SOCIAL_LOGIN=true
VITE_ENABLE_EMAIL_VERIFICATION=true
```

### 获取 API 密钥

1. **OpenAI API Key**: 访问 [platform.openai.com](https://platform.openai.com/api-keys) 创建
2. **Clerk Key**: 访问 [clerk.com](https://clerk.com) 创建项目并获取 Publishable Key

📖 **详细文档**: 查看 [MONOREPO.md](./MONOREPO.md) 了解完整的 Monorepo 架构说明

## 数据库迁移

项目支持从 SQLite 迁移到生产级数据库（PostgreSQL/MySQL）。

### 🎯 推荐方案：Supabase PostgreSQL

```bash
# 5分钟快速配置
# 1. 访问 https://supabase.com 创建项目
# 2. 复制连接字符串
# 3. 配置环境变量
cp .env.supabase.example server/.env
# 编辑 DATABASE_URL

# 4. 应用数据库结构
cd server
npx prisma generate
npx prisma db push

# 5. 测试连接
node test-db-connection.js
```

## 🛠️ 技术栈

### 前端
- **框架**: Vue 3 (Composition API) + TypeScript
- **UI组件**: Ant Design Vue
- **样式**: Tailwind CSS
- **编辑器**: Monaco Editor
- **状态管理**: Pinia
- **构建工具**: Vite
- **认证**: Clerk / 自定义JWT

### 后端
- **运行时**: Node.js + Express
- **ORM**: Prisma
- **数据库**: SQLite (开发) / PostgreSQL (生产推荐)
- **文件上传**: Multer
- **导出**: epub-gen

### AI & 服务
- **AI服务**: OpenAI API
- **存储**: Cloudflare R2 (可选)

## 📋 环境要求

- Node.js >= 16.x
- npm >= 8.x
- SQLite 3 (开发环境)
- PostgreSQL 14+ (生产环境推荐)

## 🏗️ 项目架构

### Monorepo 结构
```
ai-novel-assistant/
├── client/              # Vue 3 前端应用
│   ├── src/
│   │   ├── components/  # 可复用组件
│   │   ├── views/       # 页面视图
│   │   ├── stores/      # Pinia 状态管理
│   │   ├── services/    # API 服务层
│   │   └── assets/      # 静态资源
│   └── package.json
├── server/              # Node.js 后端应用
│   ├── routes/          # API 路由
│   ├── prisma/          # 数据库 schema 和迁移
│   ├── middleware/      # Express 中间件
│   └── package.json
├── scripts/             # 构建和部署脚本
└── package.json         # 根级依赖管理
```

### 核心数据模型

- **Novel**: 小说项目主体，包含元数据和状态
- **Character**: 角色定义，包含关系和背景
- **WorldSetting**: 世界观设定（地点、规则、文化）
- **Chapter**: 章节内容、大纲和情节点
- **AIConstraint**: 内容分级和AI行为规则
- **ConsistencyCheck**: AI生成的一致性问题追踪

### API 端点

- `/api/novels` - 项目管理
- `/api/characters` - 角色操作
- `/api/settings` - 世界设定操作
- `/api/chapters` - 章节内容操作
- `/api/ai` - AI 辅助功能
- `/api/export` - 导出功能（EPUB、TXT）
- `/api/auth` - 认证相关

## 📚 开发指南

### 常用命令

```bash
# 根目录命令
npm run dev           # 启动完整开发环境
npm run build         # 构建前端生产版本
npm run db:push       # 同步数据库 schema
npm run db:studio     # 打开 Prisma Studio GUI

# 客户端命令（在 client/ 目录下）
npm run dev           # 仅启动前端 (http://localhost:5173)
npm run build         # 构建前端
npm run type-check    # TypeScript 类型检查

# 服务端命令（在 server/ 目录下）
npm run dev           # 仅启动后端 (http://localhost:3001)
npm run db:migrate    # 创建和应用数据库迁移
```

### 开发注意事项

- 不要修改 Vite 开发服务器端口（5173）和后端端口（3001）
- 服务有自动重启机制，无需手动重启
- 使用 Composition API 风格编写 Vue 组件
- Tailwind CSS 必须使用 `@import` 语句，不是 `@tailwind` 指令

## 📈 开发进度

### 已完成
- [x] 项目初始化和架构搭建
- [x] 数据库设计和 Prisma ORM 集成
- [x] RESTful API 后端实现
- [x] Vue 3 + Ant Design Vue 前端界面
- [x] 统一认证系统（Clerk + 传统JWT）
- [x] 项目管理界面
- [x] 角色管理系统
- [x] 世界设定管理
- [x] 章节编辑器（Monaco Editor）
- [x] AI 助手集成（对话/增强/检查模式）
- [x] 多格式导出功能（EPUB、TXT）
- [x] 写作进度追踪和可视化

### 计划中
- [ ] 版本控制和历史记录
- [ ] 协作编辑功能
- [ ] 更多 AI 模型支持
- [ ] 移动端适配
- [ ] Electron 桌面应用
- [ ] 插件系统

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

在提交 PR 之前，请确保：
- 代码通过 ESLint 和 TypeScript 检查
- 遵循项目现有的代码风格
- 添加必要的测试用例
- 更新相关文档

详细开发指南请参考 [CLAUDE.md](./CLAUDE.md)

## 📄 许可证

MIT License

## 🔗 相关链接

- [开发指南](./CLAUDE.md)
- [Monorepo 架构说明](./MONOREPO.md)
- [数据库迁移指南](#数据库迁移)

---

如有问题或建议，欢迎提交 Issue 或联系维护者。
