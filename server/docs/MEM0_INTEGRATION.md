# Mem0 记忆服务集成指南

## 概述

本项目已集成Mem0记忆服务，为AI助手提供长期记忆和上下文理解能力。采用混合增强方案，保留现有系统稳定性的同时增加记忆功能。

## 快速开始

### 1. 获取Mem0 API密钥

1. 访问 [Mem0官网](https://mem0.ai) 注册账号
2. 创建新项目并获取API密钥
3. 复制API密钥备用

### 2. 配置环境变量

在 `server/.env` 文件中添加：

```bash
# Mem0配置
MEM0_ENABLED=true
MEM0_API_KEY=your_mem0_api_key_here
MEM0_BASE_URL=https://api.mem0.ai
MEM0_TIMEOUT=5000
MEM0_RETRIES=3
MEM0_FALLBACK_ENABLED=true
MEM0_LOG_LEVEL=info
```

### 3. 安装依赖

```bash
cd server
npm install
```

### 4. 应用数据库变更

```bash
npm run db:push
```

### 5. 测试集成

```bash
# 运行集成测试
node scripts/test-memory-integration.js

# 运行单元测试
npm test -- tests/services/memoryService.test.js
```

## 功能特性

### 核心功能

1. **智能记忆检索**：基于用户查询自动检索相关历史记忆
2. **自动记忆提取**：从AI对话中自动提取重要信息进行记忆
3. **个性化响应**：基于用户偏好和历史记忆提供个性化AI响应
4. **一致性保障**：通过记忆确保角色设定和世界观一致性
5. **降级兼容**：Mem0不可用时自动降级到本地备份模式

### 记忆类型

- `user_preference`: 用户偏好
- `character_trait`: 角色特征
- `world_setting`: 世界设定
- `plot_point`: 情节要点
- `style_guide`: 写作风格
- `consistency_rule`: 一致性规则
- `creative_decision`: 创作决策
- `feedback`: 用户反馈

### 支持的对话模式

- `chat`: 通用对话模式
- `enhance`: 内容增强模式
- `check`: 质量检查模式

## API接口

### AI对话接口

```bash
POST /api/ai/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "novelId": "novel_id",
  "message": "用户消息",
  "type": "chat",
  "context": {
    "messageType": "character"
  }
}
```

响应包含记忆增强信息：

```json
{
  "message": "AI响应",
  "metadata": {
    "memoriesUsed": 3,
    "memoryEnhanced": true,
    "processingTime": 1200
  }
}
```

### 记忆管理接口

#### 健康检查
```bash
GET /api/ai/memory/health
```

#### 获取记忆统计
```bash
GET /api/ai/memory/stats?novelId=<novel_id>
```

#### 手动添加记忆
```bash
POST /api/ai/memory/add
{
  "content": "记忆内容",
  "novelId": "novel_id",
  "memoryType": "character_trait",
  "importance": 4
}
```

#### 搜索记忆
```bash
POST /api/ai/memory/search
{
  "query": "搜索查询",
  "novelId": "novel_id",
  "limit": 10
}
```

#### 清除记忆
```bash
DELETE /api/ai/memory/clear
{
  "confirmCode": "CLEAR_MY_MEMORIES",
  "novelId": "novel_id"
}
```

## 配置说明

### 主要配置项

```javascript
// config/memoryConfig.js
{
  enabled: true,                    // 是否启用记忆功能
  fallbackEnabled: true,            // 是否启用降级模式
  memory: {
    maxRetrievalCount: 8,          // 最大检索记忆数量
    importanceThreshold: 2,        // 记忆重要性阈值
    minContentLength: 10           // 最小内容长度
  },
  performance: {
    memoryTimeoutMs: 3000,         // 记忆操作超时时间
    batchUpdateSize: 5             // 批量更新大小
  }
}
```

### 性能调优

1. **检索数量控制**：`maxRetrievalCount` 控制每次检索的记忆数量
2. **重要性过滤**：`importanceThreshold` 过滤低重要性记忆
3. **批量处理**：使用批量更新减少API调用频率
4. **超时设置**：合理设置超时时间避免阻塞

## 监控指标

### 性能指标

- `retrievalCount`: 检索次数
- `avgRetrievalTime`: 平均检索时间
- `additionCount`: 添加次数
- `avgAdditionTime`: 平均添加时间
- `successRate`: 成功率
- `fallbackCount`: 降级次数
- `errorCount`: 错误次数

### 查看指标

```bash
# 通过API查看
GET /api/ai/memory/stats

# 通过测试脚本
node scripts/test-memory-integration.js
```

## 常见问题

### Q: Mem0服务不可用怎么办？

A: 系统会自动降级到本地备份模式，基本功能不受影响。记忆会存储在本地数据库中。

### Q: 如何提高记忆检索的准确性？

A:
1. 调整 `importanceThreshold` 提高记忆质量
2. 确保记忆内容描述准确清晰
3. 合理设置记忆类型和重要性等级

### Q: 记忆会占用多少存储空间？

A: Mem0云服务有存储配额，本地备份使用SQLite数据库。可以定期清理不重要的记忆。

### Q: 如何备份和恢复记忆？

A: 记忆自动备份到本地数据库，可以通过数据库备份来保存记忆数据。

## 开发指南

### 添加新的记忆类型

1. 在 `memoryConfig.js` 中添加新类型
2. 更新 `modeMemoryTypes` 映射
3. 在 `extractImportantInformation` 中添加提取逻辑

### 自定义重要性计算

修改 `memoryService.js` 中的 `calculateImportance` 方法：

```javascript
calculateImportance(content, context, metadata) {
  let importance = 1;

  // 添加自定义逻辑
  if (content.includes('自定义关键词')) {
    importance += 2;
  }

  return Math.min(importance, 5);
}
```

### 扩展记忆检索逻辑

修改 `getRelevantMemoryTypes` 方法来自定义不同模式下的记忆类型过滤。

## 故障排查

### 日志级别

设置 `MEM0_LOG_LEVEL=debug` 获取详细日志。

### 常见错误

1. **API密钥错误**：检查 `MEM0_API_KEY` 配置
2. **网络超时**：调整 `MEM0_TIMEOUT` 设置
3. **权限不足**：确认Mem0账号配额
4. **记忆检索为空**：检查记忆内容和重要性阈值

### 测试脚本

使用集成测试脚本诊断问题：

```bash
node scripts/test-memory-integration.js
```

## 最佳实践

1. **记忆质量**：确保添加的记忆内容准确、清晰、有意义
2. **类型分类**：正确设置记忆类型以便后续检索
3. **重要性评级**：合理评估记忆重要性，避免信息过载
4. **定期清理**：定期清理过期或不相关的记忆
5. **性能监控**：定期检查性能指标，及时调优参数

## 更新日志

- **v1.0.0** (2024-01): 初始集成Mem0云服务
  - 支持基础记忆增删改查
  - 实现AI对话记忆增强
  - 添加降级兼容机制
  - 完成性能监控和测试

- **v1.1.0** (2024-01): Settings路由记忆集成
  - 修复所有Settings路由AI调用中缺失的userId参数
  - 新增worldbuilding和consistency记忆类型
  - 支持世界观设定增强、扩展、建议、批量生成的记忆功能
  - 支持一致性检查的记忆功能
  - 添加Settings路由记忆集成测试

## 已集成记忆功能的API

### ✅ 完全集成
- `POST /api/ai/chat` - AI助手对话
- `POST /api/settings/:id/enhance` - 世界观设定增强
- `POST /api/settings/:id/expand` - 世界观设定扩展
- `POST /api/settings/:id/suggestions` - 世界观设定建议
- `POST /api/settings/batch-generate` - 批量生成世界观设定
- `POST /api/settings/:id/consistency-check` - 一致性检查

### ⚠️ 部分集成
- Characters路由：使用`aiService.chat`方法，暂未集成记忆功能
- 流式AI响应：暂未集成记忆功能

### 🔄 记忆类型扩展
- `worldbuilding`: 世界观构建相关记忆
- `consistency`: 一致性检查相关记忆