# Docker 构建修复说明

## 问题描述

原 Dockerfile 中使用了 `npm ci --only=production`,这会导致两个问题:

1. **构建失败**: 前端构建需要 devDependencies (如 Vite, TypeScript 等),使用 `--only=production` 会导致构建工具缺失
2. **同步错误**: `npm ci` 需要 package-lock.json 与 package.json 完全同步,否则会报错

## 修复方案

### 修改内容

**前端构建阶段**:
```dockerfile
# 修改前
RUN npm ci --only=production

# 修改后
RUN npm ci  # 安装所有依赖(包括 devDependencies)
```

**后端构建阶段**:
```dockerfile
# 修改前
RUN npm ci --only=production

# 修改后
RUN npm install --legacy-peer-deps  # 安装所有依赖 (npm install 用于处理 mem0ai 的可选依赖)
RUN npx prisma generate              # 生成 Prisma Client
RUN npm prune --production           # 清理 devDependencies
```

### 优势

1. **正确构建**: 所有构建工具都可用
2. **优化镜像**: 最终镜像只包含生产依赖
3. **多阶段构建**: 利用 Docker 多阶段构建特性,构建依赖不会进入最终镜像

## 验证构建

### 本地测试

```bash
# 构建镜像
docker build -t ai-novel-assistant:test .

# 查看镜像大小
docker images ai-novel-assistant:test

# 运行测试
docker run -d -p 3001:3001 \
  -e OPENAI_API_KEY=sk-test \
  -e JWT_SECRET=test-secret-key-at-least-32-chars-long \
  ai-novel-assistant:test

# 测试健康检查
curl http://localhost:3001/api/health

# 查看日志
docker logs <container-id>

# 清理
docker stop <container-id>
docker rm <container-id>
```

### GitHub Actions 自动构建

推送代码后,工作流会自动构建并推送镜像:

```bash
git add Dockerfile
git commit -m "fix: update Dockerfile to properly install dependencies"
git push origin main
```

查看构建状态:
- GitHub → Actions → Build and Push Docker Image

## 镜像大小优化

当前 Dockerfile 已实现多层优化:

1. **多阶段构建**: 将构建过程分为三个阶段
   - frontend-builder: 构建前端
   - backend-builder: 准备后端
   - 最终镜像: 只包含必需文件

2. **Alpine Linux**: 使用 `node:20-alpine` 作为基础镜像(更小)

3. **依赖清理**: 使用 `npm prune --production` 删除开发依赖

4. **只复制需要的文件**: 通过 `.dockerignore` 排除不必要的文件

### 预期镜像大小

- **未优化**: ~1.5GB
- **优化后**: ~300-500MB

## 故障排查

### 问题 1: package-lock.json 不同步

**错误**:
```
npm ERR! `npm ci` can only install packages when your package.json
and package-lock.json are in sync.
```

**解决**:
```bash
# 在 client 和 server 目录分别运行
cd client
npm install
git add package-lock.json

cd ../server
npm install
git add package-lock.json

git commit -m "chore: sync package-lock.json"
git push
```

### 问题 2: Prisma 生成失败

**错误**:
```
Error: @prisma/client did not initialize yet
```

**解决**:
已在 Dockerfile 中添加 `npx prisma generate`,确保在复制文件后生成 Prisma Client

### 问题 3: 权限错误

**错误**:
```
EACCES: permission denied, mkdir '/app/server/prisma/data'
```

**解决**:
已在 Dockerfile 中创建必要目录并设置正确权限:
```dockerfile
RUN mkdir -p /app/server/prisma/data && \
    mkdir -p /app/server/uploads && \
    chown -R nodejs:nodejs /app
```

## 最佳实践

### 1. 使用多阶段构建

分离构建环境和运行环境,减小最终镜像体积。

### 2. 缓存 npm 依赖

先复制 package*.json,再运行 npm install,利用 Docker 层缓存:
```dockerfile
COPY package*.json ./
RUN npm ci
COPY . .
```

### 3. 非 root 用户运行

创建专用用户运行应用,提高安全性:
```dockerfile
USER nodejs
```

### 4. 健康检查

添加 HEALTHCHECK 指令,让容器编排工具监控应用状态。

### 5. 使用 dumb-init

正确处理信号和僵尸进程:
```dockerfile
ENTRYPOINT ["dumb-init", "--"]
```

## 性能优化建议

### 1. 使用 BuildKit

启用 Docker BuildKit 获得更好的构建性能:
```bash
DOCKER_BUILDKIT=1 docker build -t ai-novel-assistant .
```

### 2. 并行构建

如果有多个独立的构建阶段,BuildKit 会自动并行执行。

### 3. 缓存挂载

使用 BuildKit 缓存挂载加速 npm install:
```dockerfile
RUN --mount=type=cache,target=/root/.npm \
    npm ci
```

### 4. 多架构构建

GitHub Actions 工作流已配置支持多架构:
- linux/amd64 (x86_64)
- linux/arm64 (ARM, 如 Apple Silicon)

## 相关资源

- [Docker 最佳实践](https://docs.docker.com/develop/dev-best-practices/)
- [Node.js Docker 指南](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [多阶段构建文档](https://docs.docker.com/build/building/multi-stage/)

## 更新日志

- **2025-10-28**: 修复 npm ci 依赖安装问题
- **2025-10-28**: 添加 npm prune 优化镜像大小
- **2025-10-28**: 更新文档说明修复内容
