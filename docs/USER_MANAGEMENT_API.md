# 用户管理模块 API 文档

## 概述

本文档详细描述了AI小说助手项目中的用户管理模块API接口，包括认证、用户资料管理、会话管理等功能。

## 认证相关接口

### 用户注册
```
POST /api/auth/register
```

**请求体：**
```json
{
  "username": "string (3-20字符，字母数字下划线)",
  "email": "string (有效邮箱地址)",
  "password": "string (至少6字符)",
  "nickname": "string (可选，显示名称)"
}
```

**响应：**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "string",
    "username": "string",
    "email": "string",
    "nickname": "string",
    "avatar": "string",
    "role": "string",
    "createdAt": "string",
    "inviteVerified": "boolean"
  },
  "session": {
    "sessionToken": "string",
    "refreshToken": "string",
    "expiresAt": "string"
  }
}
```

### 用户登录
```
POST /api/auth/login
```

**请求体：**
```json
{
  "identifier": "string (用户名或邮箱)",
  "password": "string"
}
```

**响应：** 同注册接口

### 刷新令牌
```
POST /api/auth/refresh
```

**请求体：**
```json
{
  "refreshToken": "string"
}
```

### 用户登出
```
POST /api/auth/logout
```
**需要认证**

### 登出所有会话
```
POST /api/auth/logout-all
```
**需要认证**

## 用户资料管理

### 获取当前用户信息
```
GET /api/auth/me
```
**需要认证**

### 更新个人资料
```
PUT /api/auth/profile
```
**需要认证**

**请求体：**
```json
{
  "nickname": "string (可选，最大50字符)",
  "avatar": "string (可选，头像URL)"
}
```

### 修改密码
```
PUT /api/auth/password
```
**需要认证**

**请求体：**
```json
{
  "currentPassword": "string",
  "newPassword": "string (至少6字符)"
}
```

### 删除账户
```
DELETE /api/auth/account
```
**需要认证**

**请求体：**
```json
{
  "password": "string (确认密码)"
}
```

## 会话管理

### 获取用户会话列表
```
GET /api/auth/sessions
```
**需要认证**

**响应：**
```json
{
  "sessions": [
    {
      "id": "string",
      "sessionToken": "string (部分显示)",
      "createdAt": "string",
      "lastUsed": "string",
      "expiresAt": "string",
      "userAgent": "string",
      "ipAddress": "string",
      "isCurrent": "boolean"
    }
  ]
}
```

### 删除特定会话
```
DELETE /api/auth/sessions/:sessionId
```
**需要认证**

## 统计和活动

### 获取用户统计信息
```
GET /api/auth/stats
```
**需要认证**

**响应：**
```json
{
  "stats": {
    "novels": "number (小说数量)",
    "chapters": "number (章节数量)",
    "totalWords": "number (总字数)",
    "activeSessions": "number (活跃会话数)",
    "recentActivity": "number (最近活动项目数)"
  }
}
```

### 获取用户活动记录
```
GET /api/auth/activity
```
**需要认证**

**查询参数：**
- `page`: 页码 (默认: 1)
- `limit`: 每页数量 (默认: 20)

**响应：**
```json
{
  "activities": [
    {
      "type": "string (novel/chapter)",
      "id": "string",
      "title": "string",
      "updatedAt": "string",
      "status": "string"
    }
  ],
  "pagination": {
    "page": "number",
    "limit": "number",
    "total": "number"
  }
}
```

## 数据验证

### 检查用户名/邮箱可用性
```
POST /api/auth/check-availability
```

**请求体：**
```json
{
  "username": "string (可选)",
  "email": "string (可选)"
}
```

**响应：**
```json
{
  "available": "boolean",
  "conflicts": {
    "username": "string (如果冲突)",
    "email": "string (如果冲突)"
  }
}
```

## 邀请码功能

### 验证并应用邀请码
```
POST /api/auth/verify-invite
```
**需要认证**

**请求体：**
```json
{
  "inviteCode": "string"
}
```

## 管理员接口

### 获取用户列表
```
GET /api/admin/users
```
**需要管理员权限**

**查询参数：**
- `page`: 页码 (默认: 1)
- `limit`: 每页数量 (默认: 20)
- `search`: 搜索关键字
- `role`: 角色筛选 (admin/user)

### 创建用户
```
POST /api/admin/users
```
**需要管理员权限**

**请求体：**
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "nickname": "string (可选)",
  "role": "string (admin/user, 默认: user)"
}
```

### 获取用户详情
```
GET /api/admin/users/:id
```
**需要管理员权限**

### 更新用户信息
```
PUT /api/admin/users/:id
```
**需要管理员权限**

**请求体：**
```json
{
  "username": "string",
  "email": "string",
  "nickname": "string (可选)",
  "password": "string (可选，留空不修改)"
}
```

### 更新用户状态
```
PATCH /api/admin/users/:id/status
```
**需要管理员权限**

**请求体：**
```json
{
  "isActive": "boolean"
}
```

### 更新用户角色
```
PATCH /api/admin/users/:id/role
```
**需要管理员权限**

**请求体：**
```json
{
  "role": "string (admin/user)"
}
```

### 重置用户密码
```
PATCH /api/admin/users/:id/password
```
**需要管理员权限**

**请求体：**
```json
{
  "newPassword": "string"
}
```

### 删除用户（软删除）
```
DELETE /api/admin/users/:id
```
**需要管理员权限**

### 批量用户操作
```
PATCH /api/admin/users/batch
```
**需要管理员权限**

**请求体：**
```json
{
  "userIds": ["string"],
  "action": "string (activate/deactivate/delete/updateRole)",
  "data": {
    "role": "string (仅updateRole操作需要)"
  }
}
```

### 用户搜索建议
```
GET /api/admin/users/search/suggestions
```
**需要管理员权限**

**查询参数：**
- `q`: 搜索关键字 (至少2字符)

### 导出用户数据
```
GET /api/admin/users/export
```
**需要管理员权限**

**查询参数：**
- `format`: 导出格式 (json/csv, 默认: json)
- `includeInactive`: 是否包含禁用用户 (默认: false)

### 获取系统统计信息
```
GET /api/admin/stats
```
**需要管理员权限**

**响应：**
```json
{
  "users": {
    "total": "number",
    "active": "number",
    "admins": "number",
    "recent": "number"
  },
  "content": {
    "novels": "number",
    "chapters": "number"
  }
}
```

## 错误处理

所有API都遵循统一的错误响应格式：

```json
{
  "error": "Error Type",
  "message": "详细错误信息"
}
```

### 常见错误码：
- `400` Bad Request - 请求参数错误
- `401` Unauthorized - 未认证或认证失败
- `403` Forbidden - 权限不足
- `404` Not Found - 资源不存在
- `409` Conflict - 资源冲突（如用户名已存在）
- `500` Internal Server Error - 服务器内部错误

## 认证方式

API使用Bearer Token认证：

```
Authorization: Bearer <sessionToken>
```

## 数据验证规则

### 用户名验证：
- 长度：3-20字符
- 允许字符：字母、数字、下划线、短横线
- 不区分大小写，自动转为小写存储

### 邮箱验证：
- 标准邮箱格式验证
- 不区分大小写，自动转为小写存储

### 密码验证：
- 最少6字符
- 建议包含大小写字母、数字和特殊字符

### 昵称验证：
- 最大50字符
- 不允许HTML标签
- 不允许特殊字符：`<>'"&`

## 安全特性

1. **密码加密**：使用bcrypt进行密码哈希存储
2. **会话管理**：JWT token + refresh token机制
3. **权限控制**：基于角色的访问控制
4. **输入验证**：严格的输入数据验证和清理
5. **XSS防护**：昵称等用户输入字段过滤HTML标签
6. **操作日志**：记录重要操作的日志
7. **自我保护**：防止管理员误操作自己的账户

## 前端集成

项目提供了完整的前端Store和组件：

### Auth Store方法：
- `register()` - 用户注册
- `login()` - 用户登录
- `logout()` - 用户登出
- `updateProfile()` - 更新资料
- `changePassword()` - 修改密码
- `getUserStats()` - 获取统计
- `getUserSessions()` - 获取会话
- `deleteSession()` - 删除会话
- `checkAvailability()` - 检查可用性

### Vue组件：
- `UserProfile.vue` - 用户资料管理页面
- `UserManagement.vue` - 管理员用户管理页面
- `UserForm.vue` - 用户表单组件
- `UserDetail.vue` - 用户详情组件

## 开发和测试

项目包含了完整的测试脚本：

- `test-user-management.js` - 管理员接口测试
- `test-auth-apis.js` - 认证接口测试

运行测试：
```bash
node test-user-management.js
node test-auth-apis.js
```

## 注意事项

1. 所有时间字段都采用ISO 8601格式
2. 用户名和邮箱在数据库中都是小写存储
3. 软删除：用户删除实际上是设置`isActive: false`
4. 会话自动清理：过期会话会被定期清理
5. 批量操作有数量限制，避免性能问题
6. 导出功能支持大数据量，但建议分批导出