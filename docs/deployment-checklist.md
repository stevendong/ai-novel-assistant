# AI模型切换及Token统计系统 - 部署检查清单

## 🚀 部署前准备

### 1. 环境配置检查

#### 1.1 服务器环境变量
在 `server/.env` 中添加新的配置项：

```bash
# AI模型管理配置
DEFAULT_USER_BUDGET_MONTHLY=10.0      # 默认月度预算(USD)
BUDGET_WARNING_THRESHOLD=0.8          # 预算预警阈值
AUTO_MODEL_SELECTION=true             # 默认启用智能模型选择

# 统计和缓存配置
ENABLE_USAGE_STATISTICS=true          # 启用使用统计
USAGE_CACHE_TTL=3600                  # 统计缓存时间(秒)
DAILY_SUMMARY_CRON="0 1 * * *"        # 每日统计任务时间

# 性能优化配置
MAX_CONCURRENT_AI_REQUESTS=10         # 最大并发AI请求数
AI_REQUEST_TIMEOUT=60000              # AI请求超时时间(毫秒)
USAGE_BATCH_SIZE=100                  # 使用记录批量处理大小

# 通知配置
ENABLE_BUDGET_ALERTS=true             # 启用预算预警
ALERT_EMAIL_TEMPLATE_PATH="./templates/budget-alert.html"
```

#### 1.2 客户端环境变量
在 `client/.env` 中添加：

```bash
# AI功能配置
VITE_ENABLE_MODEL_SWITCHING=true      # 启用模型切换功能
VITE_ENABLE_USAGE_STATISTICS=true     # 启用用量统计
VITE_DEFAULT_CHART_THEME=light        # 图表主题

# 显示配置
VITE_CURRENCY_SYMBOL=¥                # 货币符号
VITE_CURRENCY_EXCHANGE_RATE=7.0       # USD到本地货币汇率
VITE_DECIMAL_PLACES=4                 # 成本显示小数位数
```

### 2. 数据库迁移

#### 2.1 执行数据库更新
```bash
cd server

# 1. 备份现有数据库
cp prisma/novels.db prisma/novels.db.backup.$(date +%Y%m%d_%H%M%S)

# 2. 执行Prisma迁移
npx prisma db push

# 3. 初始化AI模型配置
node scripts/initAIModels.js

# 4. 验证数据库结构
npx prisma studio
```

#### 2.2 数据完整性检查
```sql
-- 检查新表是否正确创建
SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'AI%';

-- 检查模型配置数据
SELECT id, name, displayName, provider, isActive FROM AIModelConfig;

-- 检查索引创建
SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_ai_%';
```

### 3. 依赖包安装

#### 3.1 服务端依赖
```bash
cd server
npm install --production

# 验证关键依赖
node -e "console.log(require('node-cron').version)"  # 定时任务
```

#### 3.2 客户端依赖
```bash
cd client
npm install --production

# 构建生产版本
npm run build

# 验证构建产物
ls -la dist/
```

---

## 🔧 功能验证测试

### 1. API接口测试

#### 1.1 模型管理API测试
```bash
# 获取可用模型列表
curl -X GET "http://localhost:3001/api/ai/models" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# 智能模型推荐
curl -X POST "http://localhost:3001/api/ai/models/recommend" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "taskType": "creative",
    "contextLength": 2000,
    "budgetConstraint": 0.05
  }'
```

#### 1.2 增强AI对话测试
```bash
# 带模型选择的AI对话
curl -X POST "http://localhost:3001/api/ai/chat" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "帮我创作一个角色",
    "type": "creative",
    "modelId": "YOUR_MODEL_ID",
    "autoSelectModel": false
  }'
```

#### 1.3 使用统计API测试
```bash
# 获取使用概览
curl -X GET "http://localhost:3001/api/ai/usage/overview?period=month" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 获取详细记录
curl -X GET "http://localhost:3001/api/ai/usage/records?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. 前端功能测试

#### 2.1 模型选择组件
- [ ] 模型下拉列表正确显示
- [ ] 推荐模型标识正确
- [ ] 成本估算准确显示
- [ ] 智能/手动切换功能正常

#### 2.2 使用统计仪表板
- [ ] 概览卡片数据正确
- [ ] 图表渲染正常
- [ ] 筛选功能有效
- [ ] 导出功能可用

#### 2.3 预算监控
- [ ] 预算使用率计算正确
- [ ] 预警提示及时显示
- [ ] 预算设置保存有效

### 3. 数据流验证

#### 3.1 使用记录生成
```javascript
// 测试脚本：验证使用记录是否正确生成
const testUsageRecording = async () => {
  // 1. 发送AI请求
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_TOKEN',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: '测试消息',
      type: 'chat'
    })
  });

  // 2. 检查使用记录
  await new Promise(resolve => setTimeout(resolve, 1000)); // 等待异步记录

  const usageResponse = await fetch('/api/ai/usage/records?limit=1', {
    headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
  });

  const usage = await usageResponse.json();
  console.log('最新使用记录:', usage.data.records[0]);
};
```

#### 3.2 统计汇总验证
```sql
-- 验证每日汇总数据
SELECT
  date,
  SUM(requestCount) as totalRequests,
  SUM(totalCost) as totalCost
FROM AIUsageSummary
WHERE userId = 'TEST_USER_ID'
  AND date >= date('now', '-7 days')
GROUP BY date
ORDER BY date DESC;
```

---

## 📊 性能优化配置

### 1. 数据库优化

#### 1.1 索引优化
```sql
-- 添加复合索引优化查询
CREATE INDEX IF NOT EXISTS idx_usage_user_date_model
ON AIUsageRecord(userId, date(createdAt), modelConfigId);

-- 添加统计查询优化索引
CREATE INDEX IF NOT EXISTS idx_summary_date_user
ON AIUsageSummary(date DESC, userId);
```

#### 1.2 定期清理策略
```javascript
// 创建定期清理脚本 server/scripts/cleanupUsageData.js
const cleanupOldUsageData = async () => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // 删除6个月前的详细使用记录
  await prisma.aIUsageRecord.deleteMany({
    where: {
      createdAt: { lt: sixMonthsAgo }
    }
  });

  console.log('清理完成：删除6个月前的使用记录');
};
```

### 2. 缓存策略

#### 2.1 Redis缓存配置（可选）
```javascript
// server/config/cacheConfig.js
const redis = require('redis');

const cacheConfig = {
  // 模型推荐缓存：1小时
  modelRecommendation: {
    ttl: 3600,
    keyPrefix: 'model_rec:'
  },

  // 用户偏好缓存：30分钟
  userPreference: {
    ttl: 1800,
    keyPrefix: 'user_pref:'
  },

  // 使用统计缓存：5分钟
  usageStats: {
    ttl: 300,
    keyPrefix: 'usage_stats:'
  }
};

module.exports = cacheConfig;
```

### 3. 并发控制

#### 3.1 AI请求限流
```javascript
// server/middleware/rateLimiting.js
const rateLimit = require('express-rate-limit');

const aiRequestLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 30, // 每分钟最多30个AI请求
  message: 'AI请求过于频繁，请稍后再试',
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { aiRequestLimiter };
```

---

## 🔒 安全性检查

### 1. 数据安全

#### 1.1 敏感信息保护
- [ ] API密钥加密存储
- [ ] 用户消息内容不完整记录
- [ ] 使用记录中的个人信息脱敏

#### 1.2 权限控制
- [ ] 用户只能访问自己的数据
- [ ] 管理员功能权限隔离
- [ ] API接口认证验证

### 2. 预算安全

#### 2.1 预算控制
```javascript
// 预算检查中间件
const budgetCheck = async (req, res, next) => {
  const userId = req.user.id;
  const budgetStatus = await usageStatisticsService.getBudgetStatus(userId);

  if (budgetStatus.status === 'exceeded') {
    return res.status(402).json({
      error: 'BUDGET_EXCEEDED',
      message: '本月预算已超出限制',
      details: budgetStatus
    });
  }

  if (budgetStatus.usageRate >= 0.95) {
    res.set('X-Budget-Warning', 'APPROACHING_LIMIT');
  }

  next();
};
```

#### 1.2 异常使用监控
```javascript
// 异常使用检测
const detectAbnormalUsage = async (userId) => {
  const last24h = await prisma.aIUsageRecord.count({
    where: {
      userId,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }
  });

  if (last24h > 100) { // 24小时超过100次请求
    console.warn(`用户 ${userId} 24小时内请求 ${last24h} 次，可能存在异常`);
    // 发送预警通知
  }
};
```

---

## 📈 监控和日志

### 1. 应用监控

#### 1.1 关键指标监控
```javascript
// server/monitoring/metricsCollector.js
class MetricsCollector {
  constructor() {
    this.metrics = {
      totalRequests: 0,
      totalCost: 0,
      averageResponseTime: 0,
      errorRate: 0,
      budgetExceededUsers: 0
    };
  }

  // 收集AI请求指标
  recordAIRequest(duration, cost, success) {
    this.metrics.totalRequests++;
    this.metrics.totalCost += cost;

    // 更新平均响应时间
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + duration)
      / this.metrics.totalRequests;

    if (!success) {
      this.metrics.errorRate =
        (this.metrics.errorRate * (this.metrics.totalRequests - 1) + 1)
        / this.metrics.totalRequests;
    }
  }

  // 获取实时指标
  getMetrics() {
    return { ...this.metrics, timestamp: new Date() };
  }
}
```

#### 1.2 健康检查端点
```javascript
// 添加到主应用路由
app.get('/health/ai-system', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date(),
    services: {}
  };

  try {
    // 检查数据库连接
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = 'healthy';
  } catch (error) {
    health.services.database = 'unhealthy';
    health.status = 'degraded';
  }

  // 检查AI服务连接
  try {
    const testModels = await prisma.aIModelConfig.findFirst();
    health.services.ai_models = testModels ? 'healthy' : 'no_models';
  } catch (error) {
    health.services.ai_models = 'unhealthy';
    health.status = 'degraded';
  }

  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});
```

### 2. 日志配置

#### 2.1 结构化日志
```javascript
// server/utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'ai-novel-assistant' },
  transports: [
    new winston.transports.File({
      filename: 'logs/ai-system-error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/ai-system-combined.log'
    })
  ]
});

// AI特定的日志方法
logger.logAIRequest = (userId, modelId, taskType, duration, cost, success) => {
  logger.info('AI_REQUEST', {
    userId,
    modelId,
    taskType,
    duration,
    cost,
    success,
    timestamp: new Date()
  });
};

logger.logBudgetAlert = (userId, alertType, currentUsage, limit) => {
  logger.warn('BUDGET_ALERT', {
    userId,
    alertType,
    currentUsage,
    limit,
    timestamp: new Date()
  });
};

module.exports = logger;
```

---

## 🚀 部署后验证

### 1. 功能完整性测试

#### 1.1 用户工作流测试
```bash
# 测试脚本：完整用户工作流
#!/bin/bash
echo "开始完整功能测试..."

# 1. 用户登录
TOKEN=$(curl -s -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}' | jq -r '.token')

# 2. 获取模型推荐
echo "测试模型推荐..."
curl -s -X POST "http://localhost:3001/api/ai/models/recommend" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"taskType":"creative"}' | jq '.data.recommended.modelId'

# 3. 发送AI请求
echo "测试AI对话..."
curl -s -X POST "http://localhost:3001/api/ai/chat" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"测试消息","type":"creative"}' | jq '.success'

# 4. 检查使用统计
echo "测试使用统计..."
curl -s -X GET "http://localhost:3001/api/ai/usage/overview" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.overview.totalRequests'

echo "功能测试完成!"
```

### 2. 性能基准测试

#### 2.1 负载测试
```javascript
// 使用Artillery或类似工具进行负载测试
// artillery.yml
config:
  target: 'http://localhost:3001'
  phases:
    - duration: 60
      arrivalRate: 10
  processor: "./test-functions.js"

scenarios:
  - name: "AI Chat Requests"
    weight: 100
    flow:
      - post:
          url: "/api/ai/chat"
          headers:
            Authorization: "Bearer {{ token }}"
            Content-Type: "application/json"
          json:
            message: "测试负载"
            type: "chat"
```

### 3. 数据一致性验证

#### 3.1 统计数据校验
```sql
-- 验证使用记录和汇总数据的一致性
WITH daily_records AS (
  SELECT
    userId,
    date(createdAt) as date,
    COUNT(*) as record_count,
    SUM(totalTokens) as total_tokens,
    SUM(estimatedCostTotal) as total_cost
  FROM AIUsageRecord
  WHERE createdAt >= date('now', '-7 days')
  GROUP BY userId, date(createdAt)
),
daily_summary AS (
  SELECT
    userId,
    date,
    SUM(requestCount) as summary_count,
    SUM(totalTokens) as summary_tokens,
    SUM(totalCost) as summary_cost
  FROM AIUsageSummary
  WHERE date >= date('now', '-7 days')
  GROUP BY userId, date
)
SELECT
  r.userId,
  r.date,
  r.record_count,
  s.summary_count,
  ABS(r.record_count - s.summary_count) as count_diff,
  ABS(r.total_cost - s.summary_cost) as cost_diff
FROM daily_records r
LEFT JOIN daily_summary s ON r.userId = s.userId AND r.date = s.date
WHERE ABS(r.record_count - s.summary_count) > 0
   OR ABS(r.total_cost - s.summary_cost) > 0.001;
```

---

## 📝 部署完成确认清单

- [ ] **数据库**
  - [ ] 所有新表正确创建
  - [ ] 索引建立完成
  - [ ] 初始模型数据导入成功
  - [ ] 数据备份策略就位

- [ ] **后端服务**
  - [ ] 所有新API端点可访问
  - [ ] 使用记录中间件正常工作
  - [ ] 智能推荐服务响应正确
  - [ ] 预算监控功能有效

- [ ] **前端应用**
  - [ ] 模型选择组件渲染正常
  - [ ] 使用统计仪表板可访问
  - [ ] 图表和数据显示正确
  - [ ] 响应式设计适配良好

- [ ] **集成测试**
  - [ ] 完整用户工作流测试通过
  - [ ] 数据一致性验证无误
  - [ ] 性能基准测试达标
  - [ ] 错误处理机制有效

- [ ] **监控和日志**
  - [ ] 应用指标收集正常
  - [ ] 日志输出格式正确
  - [ ] 健康检查端点可用
  - [ ] 异常报警机制工作

- [ ] **安全性**
  - [ ] 权限控制验证通过
  - [ ] 数据脱敏处理正确
  - [ ] 预算控制机制有效
  - [ ] API安全配置完成

## 🎉 部署成功后的下一步

1. **用户培训** - 准备用户使用指南和培训材料
2. **性能调优** - 基于实际使用数据优化推荐算法
3. **功能扩展** - 根据用户反馈添加新功能
4. **数据分析** - 建立长期的使用模式分析

这个全面的部署检查清单确保了AI模型切换及Token统计系统的稳定上线和可靠运行。