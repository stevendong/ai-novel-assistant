# 头像上传功能配置指南

本指南介绍如何配置和使用AI小说助手的头像上传功能，该功能使用Cloudflare R2云存储服务。

## 功能特性

✅ **已完成的功能**：
- 支持JPEG、PNG、WebP格式图片上传
- 文件大小限制：2MB
- 自动生成唯一文件名，避免冲突
- 上传时自动删除旧头像文件
- 支持头像删除功能
- 实时更新用户界面

## 配置步骤

### 1. Cloudflare R2 设置

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 创建 R2 存储桶：
   - 桶名称：`ai-novel-assistant`（或自定义）
   - 地区：Auto
3. 获取 API 凭证：
   - 在 R2 → Manage R2 API tokens
   - 创建新的 API token
   - 权限：Object Read & Write

### 2. 环境变量配置

在 `server/.env` 文件中添加以下配置：

```bash
# Cloudflare R2 Storage Configuration
CLOUDFLARE_R2_ACCOUNT_ID=your_cloudflare_account_id
CLOUDFLARE_R2_ACCESS_KEY_ID=your_r2_access_key_id
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
CLOUDFLARE_R2_BUCKET_NAME=ai-novel-assistant
CLOUDFLARE_R2_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com

# 可选：公开域名（用于直接访问）
CLOUDFLARE_R2_PUBLIC_DOMAIN=your_bucket_public_domain.com

# 可选：CDN域名（用于更快访问）
CLOUDFLARE_R2_CDN_DOMAIN=your_cdn_domain.com
```

### 3. 数据库更新

运行以下命令更新数据库模式：

```bash
cd server
npm run db:push
```

这会为 User 表添加 `avatarKey` 字段用于存储文件删除密钥。

## 如何使用

### 用户端操作

1. 点击右上角用户头像
2. 选择"个人资料"
3. 在头像区域点击"更换头像"按钮
4. 选择图片文件（支持 JPEG、PNG、WebP）
5. 上传完成后头像会自动更新

### 删除头像

1. 在个人资料页面
2. 点击"删除头像"按钮
3. 确认删除操作

## API 接口

### 上传头像
```
POST /api/upload/avatar
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body:
- avatar: File (图片文件)
```

### 删除头像
```
DELETE /api/upload/avatar
Authorization: Bearer <token>
```

## 技术实现

### 后端架构
- **存储服务**: `server/services/uploadService.js`
- **路由处理**: `server/routes/upload.js`
- **配置文件**: `server/config/cloudflareR2.js`

### 前端实现
- **用户界面**: `client/src/components/user/UserMenu.vue`
- **状态管理**: `client/src/stores/auth.ts`

### 安全特性
- JWT Token 验证
- 文件类型和大小验证
- 唯一文件名生成
- 自动清理旧文件

## 故障排除

### 常见问题

1. **上传失败 "不支持的文件类型"**
   - 确保文件格式为 JPEG、PNG 或 WebP
   - 检查文件扩展名

2. **上传失败 "文件大小超过限制"**
   - 文件大小应小于 2MB
   - 考虑压缩图片

3. **服务器错误**
   - 检查 Cloudflare R2 配置是否正确
   - 验证 API 凭证和权限
   - 查看服务器日志

### 调试步骤

1. 检查环境变量配置
2. 验证 Cloudflare R2 连接
3. 查看浏览器网络请求
4. 检查服务器控制台日志

## 成本考虑

Cloudflare R2 的定价优势：
- 无出口流量费用
- 存储费用：$0.015/GB/月
- 请求费用：Class A（写入）$4.50/百万次
- 请求费用：Class B（读取）$0.36/百万次

## 安全建议

1. **访问控制**：仅允许认证用户上传
2. **文件验证**：严格检查文件类型和大小
3. **CDN配置**：使用 Cloudflare CDN 提高访问速度
4. **备份策略**：定期备份重要用户数据

---

✅ 头像上传功能已完全集成并可用于生产环境。