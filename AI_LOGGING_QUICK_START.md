# AI调用日志功能 - 快速开始

## 🚀 功能已启用

AI调用日志功能已经集成到系统中，无需额外配置即可使用。

## 📡 API端点列表

### 基础查询

```bash
# 1. 获取日志列表（分页）
GET /api/ai-logs?page=1&limit=20

# 2. 按提供商过滤
GET /api/ai-logs?provider=openai

# 3. 按时间范围查询
GET /api/ai-logs?startDate=2025-11-01&endDate=2025-11-08

# 4. 按接口路径过滤
GET /api/ai-logs?apiUrl=/api/ai/chat

# 5. 获取单条日志详情
GET /api/ai-logs/{logId}
```

### 统计分析

```bash
# 6. 总体统计摘要
GET /api/ai-logs/stats/summary?period=month

# 7. 按提供商统计
GET /api/ai-logs/stats/by-provider

# 8. 按任务类型统计
GET /api/ai-logs/stats/by-task

# 9. 按接口路径统计（重点功能）⭐
GET /api/ai-logs/stats/by-endpoint

# 10. 成本趋势分析
GET /api/ai-logs/stats/costs?period=month

# 11. 性能指标
GET /api/ai-logs/stats/performance?provider=openai
```

### 管理功能

```bash
# 12. 清理旧日志（管理员）
DELETE /api/ai-logs/cleanup
Content-Type: application/json

{
  "retentionDays": 90
}
```

## 🧪 测试示例

### 1. 发起AI请求并检查日志

```bash
# 步骤1：发起AI对话
curl -X POST http://localhost:3001/api/ai/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "帮我写一段对话",
    "type": "creative",
    "novelId": "novel123"
  }'

# 步骤2：查看最新日志
curl http://localhost:3001/api/ai-logs?limit=1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. 查看本月统计

```bash
curl http://localhost:3001/api/ai-logs/stats/summary?period=month \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. 按接口路径统计

```bash
curl http://localhost:3001/api/ai-logs/stats/by-endpoint \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📊 响应示例

### 日志列表响应

```json
{
  "data": [
    {
      "id": "clxxx123",
      "provider": "openai",
      "model": "gpt-4",
      "endpoint": "chat",
      "apiUrl": "/api/ai/chat",
      "taskType": "creative",
      "promptTokens": 500,
      "completionTokens": 1000,
      "totalTokens": 1500,
      "latencyMs": 1200,
      "estimatedCost": 0.045,
      "status": "success",
      "createdAt": "2025-11-08T05:30:00Z",
      "novel": {
        "title": "我的小说"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

### 统计摘要响应

```json
{
  "totalCalls": 1500,
  "successfulCalls": 1480,
  "failedCalls": 20,
  "successRate": 98.67,
  "totalTokens": 450000,
  "promptTokens": 150000,
  "completionTokens": 300000,
  "totalCost": 15.50,
  "avgLatency": 1250,
  "costPerCall": 0.0103,
  "costPer1kTokens": 0.0344,
  "mostUsedModel": {
    "provider": "openai",
    "model": "gpt-4",
    "_count": { "id": 800 }
  }
}
```

### 按接口统计响应

```json
[
  {
    "apiUrl": "/api/ai/chat",
    "calls": 800,
    "totalTokens": 320000,
    "totalCost": 11.20,
    "avgLatency": 1100
  },
  {
    "apiUrl": "/api/ai/chat/stream",
    "calls": 500,
    "totalTokens": 200000,
    "totalCost": 7.50,
    "avgLatency": 1350
  },
  {
    "apiUrl": "/api/consistency/check",
    "calls": 200,
    "totalTokens": 50000,
    "totalCost": 1.75,
    "avgLatency": 900
  }
]
```

## ⚙️ 配置选项

在 `.env` 文件中添加以下配置（可选）：

```bash
# 启用/禁用日志功能
AI_LOGGING_ENABLED=true

# 日志保留天数
AI_LOGGING_RETENTION_DAYS=90

# 批量插入大小
AI_LOGGING_BATCH_SIZE=100

# 最大内容长度
AI_LOGGING_MAX_CONTENT_LENGTH=10000

# 是否清理API密钥等敏感信息
AI_LOGGING_SANITIZE_PROMPTS=false
```

## 🔍 使用场景

### 场景1：查看今天的AI使用情况

```bash
# 获取今日统计
curl http://localhost:3001/api/ai-logs/stats/summary?period=day \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 场景2：查找成本最高的功能模块

```bash
# 按接口路径统计，自动按成本降序排列
curl http://localhost:3001/api/ai-logs/stats/by-endpoint \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 场景3：分析某个小说的AI使用

```bash
# 查询特定小说的日志
curl http://localhost:3001/api/ai-logs?novelId=novel123&limit=50 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 场景4：性能调优

```bash
# 查看各提供商的性能对比
curl http://localhost:3001/api/ai-logs/stats/performance \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📈 数据洞察

通过日志数据，您可以：

1. **成本控制**
   - 查看每日/每月AI成本
   - 识别成本最高的功能
   - 优化高成本调用

2. **性能优化**
   - 对比不同提供商的响应速度
   - 识别慢接口
   - 优化Token使用

3. **用户行为分析**
   - 了解最常用的AI功能
   - 分析功能使用趋势
   - 指导产品优化方向

4. **问题排查**
   - 快速定位失败的调用
   - 查看错误详情
   - 分析错误率趋势

## 🎯 重点功能：接口路径统计

`/api/ai-logs/stats/by-endpoint` 端点专门用于分析不同API接口的AI使用情况。

**返回数据包括**：
- `apiUrl`: 接口路径（如 `/api/ai/chat`）
- `calls`: 调用次数
- `totalTokens`: 总Token使用量
- `totalCost`: 总成本
- `avgLatency`: 平均延迟

**使用建议**：
- 定期查看，识别高频调用的接口
- 对比不同接口的成本效率
- 优化成本最高的功能模块

## 🛠️ 管理建议

### 定期清理旧日志

```bash
# 每月清理90天以前的日志（管理员）
curl -X DELETE http://localhost:3001/api/ai-logs/cleanup \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"retentionDays": 90}'
```

### 监控数据库大小

```sql
-- 查看日志表大小
SELECT
  pg_size_pretty(pg_total_relation_size('public."AICallLog"')) as size,
  COUNT(*) as count
FROM "AICallLog";
```

## ❓ 常见问题

**Q: 日志会影响AI响应速度吗？**
A: 不会。日志记录是异步的，不会阻塞AI响应。

**Q: 日志数据会占用多少存储空间？**
A: 平均每条日志约2-5KB，1000条日志约2-5MB。建议定期清理旧日志。

**Q: 如何禁用日志功能？**
A: 在 `.env` 中设置 `AI_LOGGING_ENABLED=false`

**Q: 成本计算准确吗？**
A: 成本基于官方定价表估算，实际成本请以提供商账单为准。

**Q: 可以查看其他用户的日志吗？**
A: 不可以。普通用户只能查看自己的日志，管理员可以查看所有日志。

## 📚 相关文档

- 完整实施计划：[IMPLEMENTATION_PLAN_CN.md](IMPLEMENTATION_PLAN_CN.md)
- API URL字段规格：[AI_LOGGING_URL_SPEC.md](AI_LOGGING_URL_SPEC.md)
- 实施总结：[AI_LOGGING_IMPLEMENTATION_SUMMARY.md](AI_LOGGING_IMPLEMENTATION_SUMMARY.md)

---

**提示**：前端UI界面正在开发中，敬请期待！🎨
