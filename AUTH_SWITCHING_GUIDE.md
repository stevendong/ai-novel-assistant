# 认证系统切换功能指南

本指南详细介绍了如何在 Clerk 登录和项目自有登录功能之间进行切换。

## 🎯 功能概述

系统现在支持在两种认证方式之间无缝切换：

1. **Clerk 认证**：现代化的第三方认证服务，支持社交登录、邮箱验证等
2. **传统认证**：项目自有的 JWT 认证系统

## 📁 新增文件结构

```
client/src/
├── config/
│   └── authConfig.ts              # 认证配置管理器
├── stores/
│   └── unifiedAuth.ts             # 统一认证状态管理
├── components/
│   └── auth/
│       └── AuthModeSwitcher.vue   # 认证模式切换组件
├── views/
│   └── AuthDevTools.vue           # 开发工具页面
└── utils/
    └── authSwitch.ts              # 认证切换工具（已有）
```

## 🔧 使用方法

### 1. 基础配置

在 `client/.env` 文件中配置：

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:3001

# Clerk Configuration (设置此项启用 Clerk)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_key

# 可选配置
VITE_ENABLE_SOCIAL_LOGIN=true
VITE_ENABLE_EMAIL_VERIFICATION=true
VITE_ALLOW_AUTH_MODE_SWITCH=true
```

### 2. 自动模式选择

系统会根据环境配置自动选择认证模式：

- **有 Clerk 密钥**：自动使用 Clerk 认证
- **无 Clerk 密钥**：自动使用传统认证

### 3. 手动切换

#### 通过 UI 切换

1. 在应用右上角找到认证方式切换器
2. 点击下拉菜单选择目标认证方式
3. 确认切换（会自动登出并刷新页面）

#### 通过代码切换

```typescript
import { useUnifiedAuthStore } from '@/stores/unifiedAuth'

const authStore = useUnifiedAuthStore()

// 切换到 Clerk 模式
await authStore.switchAuthMode('clerk')

// 切换到传统模式
await authStore.switchAuthMode('legacy')
```

#### 通过开发工具切换

访问 `/dev/auth`（仅开发环境）使用图形化开发工具进行切换和调试。

## 🛠️ 开发工具

### 访问开发工具

在开发环境中访问：`http://localhost:5173/dev/auth`

### 功能特性

1. **实时状态监控**：查看当前认证状态和配置
2. **一键切换**：快速在不同认证模式间切换
3. **系统诊断**：自动检测配置问题
4. **日志导出**：导出调试信息
5. **数据清理**：快速清除认证数据

### 浏览器调试

在开发环境的浏览器控制台中使用：

```javascript
// 查看认证配置信息
__AUTH_CONFIG__.info()

// 切换到 Clerk 模式
__AUTH_CONFIG__.switchAuthMode('clerk')

// 切换到传统模式
__AUTH_CONFIG__.switchAuthMode('legacy')

// 重置所有配置
__AUTH_CONFIG__.reset()

// 获取可用模式
__AUTH_CONFIG__.getAvailableModes()
```

## 🔄 切换流程

### 切换过程

1. **用户触发切换**
2. **系统确认**：显示切换确认对话框
3. **登出当前会话**：清理当前认证状态
4. **清除数据**：清理相关认证数据
5. **更新配置**：保存新的认证模式偏好
6. **重新初始化**：加载新认证系统
7. **页面刷新**：确保组件完全重载

### 数据保留

- **用户偏好**：切换选择会保存到 localStorage
- **应用数据**：用户创建的小说、角色等数据不受影响
- **会话状态**：切换后需要重新登录

## 🎛️ 配置选项

### 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `VITE_CLERK_PUBLISHABLE_KEY` | - | Clerk 公钥，设置后启用 Clerk |
| `VITE_ENABLE_SOCIAL_LOGIN` | `true` | 是否启用社交登录 |
| `VITE_ENABLE_EMAIL_VERIFICATION` | `true` | 是否启用邮箱验证 |
| `VITE_ALLOW_AUTH_MODE_SWITCH` | `true` | 是否允许切换认证模式 |

### 动态配置

```typescript
import { authConfig } from '@/config/authConfig'

// 获取当前配置
const config = authConfig.getConfig()

// 检查功能支持
const supportsSocialLogin = authConfig.supportsSocialLogin()
const allowsModeSwitch = authConfig.allowsModeSwitch()

// 获取路由信息
const loginRoute = authConfig.getLoginRoute()
const signupRoute = authConfig.getSignupRoute()
```

## 🧩 组件集成

### 使用统一认证 Store

```vue
<template>
  <div>
    <div v-if="authStore.isAuthenticated">
      欢迎，{{ authStore.user?.displayName }}！
      <p>当前使用：{{ authStore.currentAuthMode }}</p>
    </div>
    <button v-else @click="authStore.signIn()">
      登录
    </button>
  </div>
</template>

<script setup>
import { useUnifiedAuthStore } from '@/stores/unifiedAuth'

const authStore = useUnifiedAuthStore()

// 确保初始化
await authStore.init()
</script>
```

### 添加模式切换器

```vue
<template>
  <div>
    <!-- 在需要的地方添加切换器 -->
    <AuthModeSwitcher size="small" />
  </div>
</template>

<script setup>
import AuthModeSwitcher from '@/components/auth/AuthModeSwitcher.vue'
</script>
```

## 🔍 故障排除

### 常见问题

#### Q: 切换后无法登录
A: 检查 Clerk 控制台中的域名配置，确保 `localhost:5173` 在允许列表中。

#### Q: 切换器不显示
A: 确保设置了 `VITE_ALLOW_AUTH_MODE_SWITCH=true` 且配置了有效的 Clerk 密钥。

#### Q: 切换后数据丢失
A: 认证系统切换不会影响应用数据，但会清除登录状态，需要重新登录。

#### Q: 开发工具页面 404
A: 开发工具仅在开发环境可用，确保使用 `npm run dev` 启动。

### 调试步骤

1. **检查环境配置**
   ```bash
   # 查看环境变量
   echo $VITE_CLERK_PUBLISHABLE_KEY
   ```

2. **使用开发工具**
   - 访问 `/dev/auth` 查看系统状态
   - 运行系统诊断
   - 导出调试日志

3. **浏览器控制台**
   ```javascript
   // 查看详细信息
   __AUTH_CONFIG__.info()

   // 查看当前状态
   console.log(window.__VUE_DEVTOOLS_GLOBAL_HOOK__)
   ```

## 🚀 最佳实践

### 开发环境

1. **使用开发工具**：利用 `/dev/auth` 页面进行测试
2. **频繁切换测试**：确保两种模式都能正常工作
3. **检查控制台**：关注认证相关的日志信息

### 生产环境

1. **固定认证模式**：避免在生产环境频繁切换
2. **监控日志**：关注认证失败和切换错误
3. **备份方案**：保留传统认证作为备用

### 用户体验

1. **清晰提示**：告知用户切换会登出当前会话
2. **保存偏好**：记住用户的认证方式选择
3. **快速恢复**：切换后引导用户重新登录

## 🔐 安全考虑

1. **敏感信息**：不在前端暴露 Clerk Secret Key
2. **权限验证**：后端需要验证两种认证系统的 token
3. **会话管理**：切换时正确清理所有认证状态
4. **日志记录**：记录认证模式切换事件

## 📈 性能优化

1. **懒加载**：认证组件按需加载
2. **缓存配置**：避免重复读取环境变量
3. **状态同步**：最小化状态更新频率
4. **内存管理**：及时清理无用的认证数据

---

通过这个系统，您可以灵活地在现代化的 Clerk 认证和传统认证系统之间切换，为不同的使用场景提供最适合的认证方案。