# AI模型调用日志记录及查看模块 - 实现计划

## 更新说明

✅ **已添加API URL字段记录**：在 `AICallLog` 表中新增 `apiUrl` 字段，用于记录实际请求的完整API URL地址

## 阶段1：数据库架构设计

**目标**：为全面的AI调用日志设计和实现数据库架构
**成功标准**：
- 架构支持所有AI提供商（OpenAI、Claude、Gemini、自定义）
- 捕获请求/响应详情、成本、性能指标
- 支持高效查询和分析
**测试**：
- 迁移成功运行
- 能够插入和查询日志记录
- 索引提升查询性能
**状态**：进行中

### 架构设计

**关键字段说明**：
- `provider`: AI提供商名称 (openai/claude/gemini/custom)
- `model`: 使用的具体模型 (如 gpt-4, claude-3-sonnet等)
- `endpoint`: AI提供商的端点类型 (chat/embedding/completion等)
- **`apiUrl`: 客户端请求的服务器接口路径 (如 /api/ai/chat, /api/ai/chat/stream, /api/consistency/check等)** ⭐ 新增
- `taskType`: 任务类型 (creative/analytical/consistency等)

```prisma
model AICallLog {
  id               String   @id @default(cuid())
  userId           String
  novelId          String?

  // 请求详情
  provider         String        // AI提供商
  model            String        // 模型名称
  endpoint         String        // 端点类型
  apiUrl           String?       // 🆕 API URL地址
  taskType         String?       // 任务类型
  requestMessages  String   @db.Text  // 请求消息
  requestParams    String?       // 请求参数

  // 响应详情
  responseContent  String?  @db.Text  // 响应内容
  responseMetadata String?       // 响应元数据

  // 性能指标
  promptTokens     Int      @default(0)  // 提示词token数
  completionTokens Int      @default(0)  // 完成token数
  totalTokens      Int      @default(0)  // 总token数
  latencyMs        Int?                  // 响应延迟(毫秒)

  // 成本追踪
  estimatedCost    Float?   @default(0)  // 估算成本
  currency         String   @default("USD")  // 货币单位

  // 状态和错误处理
  status           String   @default("success")  // 状态
  errorMessage     String?       // 错误消息
  errorCode        String?       // 错误代码
  retryCount       Int      @default(0)  // 重试次数

  // 元数据
  userAgent        String?       // 用户代理
  ipAddress        String?       // IP地址
  sessionId        String?       // 会话ID
  conversationId   String?       // 对话ID

  createdAt        DateTime @default(now())
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  novel            Novel?   @relation(fields: [novelId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([novelId])
  @@index([provider])
  @@index([taskType])
  @@index([status])
  @@index([createdAt])
  @@index([userId, createdAt])
}

model AIUsageStats {
  id               String   @id @default(cuid())
  userId           String
  novelId          String?
  provider         String
  model            String
  date             DateTime

  // 聚合指标
  totalCalls       Int      @default(0)      // 总调用次数
  successfulCalls  Int      @default(0)      // 成功次数
  failedCalls      Int      @default(0)      // 失败次数
  totalTokens      Int      @default(0)      // 总token数
  promptTokens     Int      @default(0)      // 提示词token数
  completionTokens Int      @default(0)      // 完成token数
  totalCost        Float    @default(0)      // 总成本
  avgLatencyMs     Float?                    // 平均延迟

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  novel            Novel?   @relation(fields: [novelId], references: [id], onDelete: SetNull)

  @@unique([userId, provider, model, date, novelId])
  @@index([userId])
  @@index([novelId])
  @@index([date])
  @@index([provider])
}
```

### API URL字段的作用

记录客户端请求后端的接口路径，用于分析和追踪AI调用来源。

**记录内容示例**：
- `/api/ai/chat` - 普通AI对话
- `/api/ai/chat/stream` - 流式AI对话
- `/api/consistency/check` - 一致性检查
- `/api/ai/outline/apply` - 应用大纲
- `/api/characters` - 角色相关AI增强
- `/api/chapters/generate` - 章节生成

**主要作用**：

1. **功能使用追踪**：
   - 识别哪些API端点最常调用AI
   - 分析不同功能的AI使用频率
   - 发现高频AI调用的功能模块

2. **成本归因**：
   - 按功能模块统计AI成本
   - 识别成本最高的功能
   - 优化高成本功能的实现

3. **调试和故障排查**：
   - 快速定位问题来源的接口
   - 追踪特定功能的AI调用情况
   - 分析接口级别的性能问题

4. **用户行为分析**：
   - 了解用户最常用的AI功能
   - 识别功能使用模式
   - 指导产品优化方向

5. **性能优化**：
   - 对比不同接口的响应时间
   - 识别需要优化的慢接口
   - 分析接口调用链路

## 阶段2：后端API实现

**目标**：实现日志服务和REST API端点
**成功标准**：
- 自动日志拦截所有AI调用
- 查询端点支持过滤和分页
- 分析端点提供聚合统计
**测试**：
- 日志中间件捕获所有AI调用
- API端点返回正确的过滤数据
- 聚合计算准确
**状态**：未开始

### 2.1 日志服务 (`server/services/aiLoggingService.js`)

**核心功能**：
- 拦截所有AI提供商调用
- 计算token使用量和估算成本
- 异步日志处理以避免阻塞响应
- 批量插入以提升性能

**方法**：
```javascript
class AILoggingService {
  // 记录单次AI调用
  async logAICall(logData)

  // 批量记录（性能优化）
  async batchLogCalls(logDataArray)

  // 计算成本
  calculateCost(provider, model, tokens)

  // 数据清理（限制长度、脱敏）
  sanitizeData(data, maxLength)

  // 每日统计聚合
  async aggregateDailyStats(userId, date)
}
```

### 2.2 API路由 (`server/routes/ai-logs.js`)

**端点列表**：

#### 1. GET /api/ai-logs
查询日志列表

**查询参数**：
- `userId`: 用户ID（必填）
- `novelId`: 小说ID（可选）
- `provider`: 提供商筛选
- `model`: 模型筛选
- `taskType`: 任务类型筛选
- `status`: 状态筛选（success/error）
- `startDate`: 开始日期
- `endDate`: 结束日期
- `page`: 页码（默认1）
- `limit`: 每页数量（默认20）

**返回**：分页的日志列表

#### 2. GET /api/ai-logs/:id
获取单条日志详情（包含完整请求/响应）

#### 3. GET /api/ai-logs/stats/summary
总体统计摘要

**查询参数**：
- `userId`: 用户ID
- `novelId`: 小说ID（可选）
- `period`: 时间段（day/week/month/all）

**返回**：聚合统计数据

#### 4. GET /api/ai-logs/stats/by-provider
按提供商统计使用量

**返回**：各提供商的调用次数、token使用、成本对比

#### 5. GET /api/ai-logs/stats/by-task
按任务类型统计

**返回**：不同任务类型的使用分布

#### 6. GET /api/ai-logs/stats/costs
成本分析

**返回**：成本趋势、预测、预算对比

#### 7. GET /api/ai-logs/stats/performance
性能指标

**返回**：延迟分析、错误率统计

#### 8. DELETE /api/ai-logs/cleanup
清理旧日志（管理员）

**请求体**：
```json
{
  "retentionDays": 90
}
```

## 阶段3：中间件集成

**目标**：将日志记录集成到现有AI服务调用中
**成功标准**：
- 所有AI调用自动记录，无代码重复
- 性能影响最小（<10ms开销）
- 错误处理不影响现有流程
**测试**：
- 现有AI功能继续正常工作
- 所有AI调用类型都有日志
- 性能基准测试通过
**状态**：未开始

### 3.1 路由层传递接口URL

**修改所有调用AI服务的路由**，在调用时传递 `requestUrl`：

**示例**：`server/routes/ai.js`

```javascript
// 普通AI对话接口
router.post('/chat', requireAuth, async (req, res) => {
  try {
    const { novelId, message, context, type, provider, model, locale } = req.body;
    const userId = req.user.id;

    // ... 获取小说上下文 ...

    const response = await aiService.generateResponse(novelContext, message, type, {
      provider,
      model,
      taskType: type,
      userId: userId,
      messageType: context?.messageType || 'general',
      locale,
      requestUrl: req.originalUrl || req.url  // 🆕 传递客户端请求的URL
    });

    res.json(response);
  } catch (error) {
    // ...
  }
});

// 流式对话接口
router.post('/chat/stream', requireAuth, async (req, res) => {
  // ...
  const stream = await aiService.generateResponseStream(novelContext, message, type, {
    provider,
    model,
    taskType: type,
    userId: req.user?.id,
    messageType: context?.messageType || type,
    locale,
    requestUrl: req.originalUrl || req.url  // 🆕 传递URL
  });
  // ...
});
```

**其他需要修改的路由**：
- `server/routes/consistency.js` - 一致性检查
- `server/routes/characters.js` - 角色AI增强
- `server/routes/settings.js` - 设定AI增强
- `server/routes/batchChapters.js` - 批量章节生成

### 3.2 AI服务包装器

**修改**：`server/services/aiService.js`

**策略**：用日志装饰器包装现有方法

```javascript
class AIService {
  async chat(messages, options = {}) {
    const startTime = Date.now();
    const provider = this.providers.get(options.provider || aiConfig.global.defaultProvider);

    const logContext = {
      userId: options.userId,
      novelId: options.novelId,
      provider: options.provider || 'openai',
      model: options.model || provider?.models?.chat,
      taskType: options.taskType,
      endpoint: 'chat',
      apiUrl: options.requestUrl || options.apiUrl,  // 🆕 客户端请求的服务器接口路径
      sessionId: options.sessionId,
      conversationId: options.conversationId
    };

    try {
      const response = await this._chatInternal(messages, options);

      // 记录成功调用
      await aiLoggingService.logAICall({
        ...logContext,
        status: 'success',
        requestMessages: JSON.stringify(messages),
        requestParams: JSON.stringify(options),
        responseContent: response.content,
        responseMetadata: JSON.stringify(response.metadata),
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
        latencyMs: Date.now() - startTime
      });

      return response;
    } catch (error) {
      // 记录失败调用
      await aiLoggingService.logAICall({
        ...logContext,
        status: 'error',
        requestMessages: JSON.stringify(messages),
        requestParams: JSON.stringify(options),
        errorMessage: error.message,
        errorCode: error.code,
        latencyMs: Date.now() - startTime
      });

      throw error;
    }
  }
}
```

### 3.3 中间件方式（可选）

也可以创建Express中间件来自动捕获URL：

**创建**：`server/middleware/aiLogging.js`

```javascript
// 将请求URL附加到req对象，供后续使用
function attachRequestUrl(req, res, next) {
  req.aiRequestUrl = req.originalUrl || req.url;
  next();
}

module.exports = { attachRequestUrl };
```

**使用**：在 `server/index.js` 中全局应用

```javascript
const { attachRequestUrl } = require('./middleware/aiLogging');

// 在所有路由之前
app.use(attachRequestUrl);
```

然后在调用AI服务时：

```javascript
const response = await aiService.generateResponse(novelContext, message, type, {
  // ... 其他选项
  requestUrl: req.aiRequestUrl  // 从中间件获取
});
```

### 3.4 成本计算

**定价配置** (`server/config/aiPricing.js`)：

```javascript
// 单位：美元/1K tokens
const AI_PRICING = {
  openai: {
    'gpt-4': { prompt: 0.03, completion: 0.06 },
    'gpt-4-turbo': { prompt: 0.01, completion: 0.03 },
    'gpt-3.5-turbo': { prompt: 0.0005, completion: 0.0015 }
  },
  claude: {
    'claude-3-opus-20240229': { prompt: 0.015, completion: 0.075 },
    'claude-3-sonnet-20240229': { prompt: 0.003, completion: 0.015 },
    'claude-3-haiku-20240307': { prompt: 0.00025, completion: 0.00125 }
  },
  gemini: {
    'gemini-pro': { prompt: 0.00025, completion: 0.0005 },
    'gemini-1.5-pro': { prompt: 0.0035, completion: 0.0105 }
  }
};
```

## 阶段4：前端UI实现

**目标**：创建全面的日志查看和分析界面
**成功标准**：
- 用户可以查看、过滤和搜索AI调用日志
- 实时统计显示使用情况和成本
- 导出功能支持日志和报告
**测试**：
- UI正确渲染日志
- 过滤器按预期工作
- 图表显示准确数据
**状态**：未开始

### 4.1 主要组件

**组件结构**：
```
client/src/components/ai-logs/
├── AILogsViewer.vue          # 主容器组件
├── LogsTable.vue              # 数据表格（分页）
├── LogsFilter.vue             # 过滤器侧边栏
├── LogDetail.vue              # 详细日志查看模态框
├── StatsOverview.vue          # 统计概览仪表板
├── ProviderChart.vue          # 按提供商使用量图表
├── CostTrendChart.vue         # 成本趋势图表
├── PerformanceMetrics.vue     # 性能指标展示
└── LogExporter.vue            # 导出到CSV/JSON
```

**LogDetail.vue** 显示内容：
- 请求信息：提供商、模型、**API URL** 🆕、端点、任务类型
- 请求消息（格式化JSON）
- 请求参数（格式化JSON）
- 响应内容（格式化，过长则截断）
- 性能指标：Token数、延迟、成本
- 错误详情（如果失败）
- 元数据：会话ID、对话ID、用户代理、IP地址

### 4.2 AILogsViewer.vue（主组件）

**功能**：
- 标签页导航：日志、统计、分析
- 日期范围选择器
- 提供商/模型/任务过滤器
- 实时统计卡片
- 导出选项

**布局**：
```vue
<template>
  <div class="ai-logs-viewer">
    <div class="header">
      <h1>AI模型调用日志</h1>
      <a-button @click="exportLogs">导出</a-button>
    </div>

    <a-tabs v-model:activeKey="activeTab">
      <a-tab-pane key="logs" tab="调用日志">
        <div class="logs-section">
          <LogsFilter v-model="filters" />
          <LogsTable :data="logs" :loading="loading" />
        </div>
      </a-tab-pane>

      <a-tab-pane key="stats" tab="统计数据">
        <StatsOverview :stats="stats" />
        <a-row :gutter="16">
          <a-col :span="12">
            <ProviderChart :data="providerStats" />
          </a-col>
          <a-col :span="12">
            <CostTrendChart :data="costTrends" />
          </a-col>
        </a-row>
      </a-tab-pane>

      <a-tab-pane key="analytics" tab="分析">
        <PerformanceMetrics :data="performance" />
      </a-tab-pane>
    </a-tabs>
  </div>
</template>
```

### 4.3 LogsTable.vue

**功能**：
- 可排序列
- 状态指示器（成功/错误）
- 每次调用成本显示
- 点击查看详情
- 分页

**列定义**：
- 时间戳
- 提供商/模型
- **API URL** 🆕
- 任务类型
- Token（提示/完成/总计）
- 延迟
- 成本
- 状态
- 操作（查看详情）

### 4.4 StatsOverview.vue

**关键指标卡片**：
- 总调用次数（时间段）
- 总Token使用量
- 总成本
- 平均延迟
- 成功率
- 最常用模型
- 每1K tokens成本
- 每日调用次数

### 4.5 导航集成

**添加到**：`client/src/components/layout/MainLayout.vue`

```vue
{
  key: 'ai-logs',
  icon: h(BarChartOutlined),
  label: 'AI日志',
  path: '/ai-logs'
}
```

**添加路由**：`client/src/router/index.js`

```javascript
{
  path: '/ai-logs',
  name: 'AILogs',
  component: () => import('../components/ai-logs/AILogsViewer.vue'),
  meta: { requiresAuth: true }
}
```

## 阶段5：分析和报告

**目标**：提供高级分析和洞察
**成功标准**：
- 趋势分析显示使用模式
- 成本预测帮助预算规划
- 性能洞察识别瓶颈
**测试**：
- 图表正确渲染
- 计算与原始数据匹配
- 预测合理
**状态**：未开始

### 5.1 高级分析功能

**成本分析**：
- 按日/周/月成本分解
- 按小说/项目成本统计
- 提供商成本对比
- 预算警报和预测

**使用模式**：
- 使用高峰时段识别
- 任务类型分布
- Token使用趋势
- 模型受欢迎度

**性能分析**：
- 按提供商平均延迟
- 错误率趋势
- 重试统计
- 吞吐量指标

**优化建议**：
- 为简单任务推荐更便宜的模型
- 识别低效提示词（高token使用）
- 基于性能推荐切换提供商
- 成本优化机会

### 5.2 导出和报告

**导出格式**：
- CSV（日志和统计）
- JSON（完整数据导出）
- PDF报告（图表和摘要）
- Excel工作簿（多工作表分析）

**定期报告**：
- 每周使用摘要邮件
- 月度成本报告
- 预算警报通知
- 异常检测警报

## 实施顺序

1. **阶段1**：数据库架构（1-2小时）
   - 创建迁移
   - 更新Prisma架构
   - 测试迁移

2. **阶段2**：后端日志服务（3-4小时）
   - 实现aiLoggingService
   - 创建API路由
   - 添加成本计算

3. **阶段3**：中间件集成（2-3小时）
   - 包装aiService方法
   - 测试所有AI端点
   - 性能测试

4. **阶段4**：前端UI（6-8小时）
   - 创建组件
   - 实现过滤
   - 添加图表和可视化

5. **阶段5**：分析（4-6小时）
   - 高级分析
   - 导出功能
   - 报告和警报

**总估算时间**：16-23小时

## 技术考虑

**性能**：
- 使用异步日志避免阻塞
- 批量插入用于高容量场景
- 为常见查询添加数据库索引
- 为统计端点实现缓存

**隐私**：
- 每用户可选择禁用日志
- 可配置数据保留期
- 日志中清理敏感数据
- GDPR合规（删除权）

**可扩展性**：
- 将旧日志归档到单独的表
- 实现日志轮转
- 对历史数据使用聚合统计
- 考虑单独的分析数据库

**安全**：
- 限制日志访问为所有者或管理员
- 在请求参数中脱敏API密钥
- 日志查询端点限流
- 审计日志访问

## 配置

**环境变量**：
```bash
# 日志配置
AI_LOGGING_ENABLED=true                    # 启用日志
AI_LOGGING_RETENTION_DAYS=90               # 保留天数
AI_LOGGING_BATCH_SIZE=100                  # 批量大小
AI_LOGGING_ASYNC=true                      # 异步日志

# 统计配置
AI_STATS_AGGREGATION_ENABLED=true          # 启用每日聚合
AI_STATS_DAILY_AGGREGATION_TIME=02:00      # 聚合时间

# 隐私
AI_LOGGING_SANITIZE_PROMPTS=false          # 清理提示词
AI_LOGGING_MAX_CONTENT_LENGTH=10000        # 最大内容长度
```
