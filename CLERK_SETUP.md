# Clerk 集成设置指南

本项目已集成 Clerk 作为认证系统，提供现代化的用户认证和管理功能。

## 🔧 配置步骤

### 1. 获取 Clerk 账户和密钥

1. 访问 [Clerk 控制台](https://dashboard.clerk.com/)
2. 创建新应用或使用现有应用
3. 在应用设置中获取 **Publishable Key**

### 2. 配置环境变量

在 `client/.env` 文件中设置：

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:3001

# Clerk Configuration
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_clerk_publishable_key_here
```

### 3. 在 Clerk 控制台中配置

#### 应用 URL 设置：
- **应用 URL**: `http://localhost:5173` (开发环境)
- **允许的重定向 URL**:
  - `http://localhost:5173`
  - `http://localhost:5173/`

#### 社交登录提供商（可选）：
- Google
- GitHub
- Microsoft
- 等等...

## 🚀 功能特性

### ✅ 已实现的功能

1. **现代化登录界面**
   - 使用 Clerk 的 SignIn 组件
   - 支持邮箱/密码登录
   - 支持社交登录（如果配置）
   - 自动处理邮箱验证

2. **注册功能**
   - 使用 Clerk 的 SignUp 组件
   - 邮箱验证流程
   - 用户资料设置

3. **用户管理**
   - 内置用户资料管理
   - 头像上传
   - 密码修改
   - 账户设置

4. **API 集成**
   - 自动 token 管理
   - 请求拦截器自动添加认证头
   - 401 错误自动处理和重试
   - 与后端 API 无缝集成

5. **向后兼容**
   - 保留旧的认证系统作为备用
   - 路由守卫更新
   - 渐进式迁移支持

## 📁 新增文件

```
client/src/
├── stores/
│   └── clerkAuth.ts              # Clerk 认证状态管理
├── components/
│   └── auth/
│       ├── ClerkSignIn.vue       # Clerk 登录组件
│       ├── ClerkSignUp.vue       # Clerk 注册组件
│       └── UserButton.vue        # 用户按钮组件
└── utils/
    └── api.ts                    # 更新的 API 客户端（支持 Clerk tokens）
```

## 🔄 迁移说明

### 从旧系统迁移

1. **保持向后兼容**: 旧的登录系统仍可通过 `/legacy-login` 访问
2. **环境检测**: 系统会根据是否配置 `VITE_CLERK_PUBLISHABLE_KEY` 自动选择认证系统
3. **数据迁移**: 用户数据可以通过后端 API 进行迁移

### 启用 Clerk 认证

只需在 `.env` 文件中设置有效的 `VITE_CLERK_PUBLISHABLE_KEY`，系统就会自动使用 Clerk 认证。

## 🎨 界面自定义

### Clerk 组件样式

所有 Clerk 组件都可以通过 CSS 进行自定义，参见 `ClerkSignIn.vue` 和 `ClerkSignUp.vue` 中的样式示例。

### 主题适配

Clerk 组件会自动适应应用的主题色彩，保持界面一致性。

## 🛠️ 开发和测试

### 开发环境

```bash
# 启动开发服务器
npm run dev

# 类型检查
npm run type-check

# 构建生产版本
npm run build
```

### 测试认证流程

1. 访问 `http://localhost:5173`
2. 系统会自动重定向到登录页面
3. 使用邮箱注册新账户或登录现有账户
4. 登录成功后会重定向到应用主界面

## 🔒 安全注意事项

1. **仅使用 Publishable Key**: 前端只使用 Publishable Key，不要暴露 Secret Key
2. **HTTPS 生产环境**: 生产环境必须使用 HTTPS
3. **域名验证**: 在 Clerk 控制台中正确配置允许的域名
4. **Token 安全**: Clerk 自动处理 token 的安全存储和更新

## 📚 更多资源

- [Clerk Vue.js 文档](https://clerk.com/docs/quickstarts/vue)
- [Clerk 认证配置](https://clerk.com/docs/authentication/overview)
- [Clerk 社交登录设置](https://clerk.com/docs/authentication/social-connections/overview)

## 🐛 常见问题

### Q: 为什么登录后立即被登出？
A: 检查后端 API 是否正确验证 Clerk 的 JWT token。

### Q: 如何添加更多社交登录选项？
A: 在 Clerk 控制台的 "Social connections" 部分进行配置。

### Q: 如何自定义登录页面样式？
A: 修改 `ClerkSignIn.vue` 和 `ClerkSignUp.vue` 中的 CSS 样式。

### Q: 生产环境如何配置？
A: 更新 `.env` 中的 Clerk Publishable Key 为生产环境密钥，并在 Clerk 控制台中配置生产域名。