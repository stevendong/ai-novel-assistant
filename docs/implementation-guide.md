# AI模型切换及Token统计系统 - 实施指南

## 🎯 实施概览

本指南提供了AI模型切换和Token消耗统计系统的详细实施步骤，包括代码示例、配置说明和测试方案。

---

## 📋 实施前准备

### 1. 环境要求检查

```bash
# 检查Node.js版本 (需要 >= 18.0.0)
node --version

# 检查数据库状态
npm run db:studio

# 确认现有AI配置
cat server/.env | grep -E "(OPENAI|CLAUDE|AI)"
```

### 2. 依赖包安装

```bash
# 在server目录下安装新的依赖
cd server
npm install node-cron          # 定时任务
npm install redis              # 缓存支持 (可选)

# 在client目录下安装新的依赖
cd ../client
npm install @ant-design/charts # 图表组件
npm install dayjs              # 日期处理
```

### 3. 数据库迁移

```bash
# 执行数据库架构更新
cd server
npx prisma db push --accept-data-loss

# 验证新表创建
npx prisma studio
```

---

## 🛠️ 阶段1: 数据库架构实施 (Day 1)

### 1.1 更新Prisma Schema

在 `server/prisma/schema.prisma` 中添加新的模型定义:

```prisma
// AI模型配置
model AIModelConfig {
  id                   String   @id @default(cuid())
  name                 String   @unique
  provider             String
  displayName          String
  description          String?
  maxTokens            Int      @default(4096)
  costPer1kTokensInput Float    @default(0.002)
  costPer1kTokensOutput Float   @default(0.002)
  recommendedFor       String?  // JSON array
  isActive             Boolean  @default(true)
  priority             Int      @default(0)
  metadata             String?  // JSON
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  // 关联关系
  usageRecords         AIUsageRecord[]
  userPreferences      UserAIPreference[]
  usageSummaries       AIUsageSummary[]
  evaluations          AIModelEvaluation[]

  @@index([provider])
  @@index([isActive, priority])
}

// AI使用记录
model AIUsageRecord {
  id                   String   @id @default(cuid())
  userId               String
  novelId              String?
  conversationId       String?
  modelConfigId        String
  taskType             String
  requestType          String
  promptTokens         Int      @default(0)
  completionTokens     Int      @default(0)
  totalTokens          Int      @default(0)
  estimatedCostInput   Float    @default(0)
  estimatedCostOutput  Float    @default(0)
  estimatedCostTotal   Float    @default(0)
  duration             Int      @default(0)
  success              Boolean  @default(true)
  errorType            String?
  errorMessage         String?
  metadata             String?  // JSON
  createdAt            DateTime @default(now())

  // 关联关系
  user                 User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  novel                Novel?             @relation(fields: [novelId], references: [id], onDelete: SetNull)
  conversation         AIConversation?    @relation(fields: [conversationId], references: [id], onDelete: SetNull)
  modelConfig          AIModelConfig      @relation(fields: [modelConfigId], references: [id])

  @@index([userId, createdAt])
  @@index([novelId, createdAt])
  @@index([modelConfigId, createdAt])
  @@index([taskType, createdAt])
}

// 用户AI偏好
model UserAIPreference {
  userId               String   @id
  defaultModelId       String?
  autoSelectModel      Boolean  @default(true)
  budgetLimitMonthly   Float    @default(10.0)
  budgetLimitDaily     Float?
  warningThreshold     Float    @default(0.8)
  taskModelMapping     String?  // JSON
  preferences          String?  // JSON
  notificationSettings String?  // JSON
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  // 关联关系
  user                 User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  defaultModel         AIModelConfig? @relation(fields: [defaultModelId], references: [id], onDelete: SetNull)
}

// AI使用统计汇总
model AIUsageSummary {
  id                   String   @id @default(cuid())
  userId               String
  novelId              String?
  date                 DateTime
  modelConfigId        String
  taskType             String
  requestCount         Int      @default(0)
  totalTokensInput     Int      @default(0)
  totalTokensOutput    Int      @default(0)
  totalTokens          Int      @default(0)
  totalCost            Float    @default(0)
  avgDuration          Float    @default(0)
  successCount         Int      @default(0)
  errorCount           Int      @default(0)
  successRate          Float    @default(1.0)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  // 关联关系
  user                 User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  novel                Novel?        @relation(fields: [novelId], references: [id], onDelete: Cascade)
  modelConfig          AIModelConfig @relation(fields: [modelConfigId], references: [id])

  @@unique([userId, novelId, date, modelConfigId, taskType])
  @@index([userId, date])
  @@index([novelId, date])
}

// 也需要在现有模型中添加关联
model User {
  // ... 现有字段
  aiPreference    UserAIPreference?
  aiUsageRecords  AIUsageRecord[]
  aiUsageSummaries AIUsageSummary[]
}

model Novel {
  // ... 现有字段
  aiUsageRecords  AIUsageRecord[]
  aiUsageSummaries AIUsageSummary[]
}

model AIConversation {
  // ... 现有字段
  aiUsageRecords  AIUsageRecord[]
}
```

### 1.2 初始化数据脚本

创建 `server/scripts/initAIModels.js`:

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function initAIModels() {
  console.log('正在初始化AI模型配置...');

  const models = [
    {
      name: 'gpt-4',
      provider: 'openai',
      displayName: 'GPT-4',
      description: '最强大的通用AI模型，擅长复杂推理和创意任务',
      maxTokens: 8192,
      costPer1kTokensInput: 0.03,
      costPer1kTokensOutput: 0.06,
      recommendedFor: JSON.stringify(['creative', 'analysis', 'complex_tasks']),
      priority: 10
    },
    {
      name: 'gpt-4-turbo-preview',
      provider: 'openai',
      displayName: 'GPT-4 Turbo',
      description: '更快更经济的GPT-4版本，支持更长上下文',
      maxTokens: 128000,
      costPer1kTokensInput: 0.01,
      costPer1kTokensOutput: 0.03,
      recommendedFor: JSON.stringify(['creative', 'analysis', 'long_context']),
      priority: 9
    },
    {
      name: 'gpt-3.5-turbo',
      provider: 'openai',
      displayName: 'GPT-3.5 Turbo',
      description: '高性价比的对话模型，适合日常交互',
      maxTokens: 4096,
      costPer1kTokensInput: 0.001,
      costPer1kTokensOutput: 0.002,
      recommendedFor: JSON.stringify(['chat', 'general', 'quick_tasks']),
      priority: 7
    },
    {
      name: 'claude-3-opus-20240229',
      provider: 'claude',
      displayName: 'Claude 3 Opus',
      description: 'Anthropic最强模型，专长分析和推理',
      maxTokens: 200000,
      costPer1kTokensInput: 0.015,
      costPer1kTokensOutput: 0.075,
      recommendedFor: JSON.stringify(['analysis', 'creative', 'consistency']),
      priority: 9
    },
    {
      name: 'claude-3-sonnet-20240229',
      provider: 'claude',
      displayName: 'Claude 3 Sonnet',
      description: '平衡性能和成本的模型',
      maxTokens: 200000,
      costPer1kTokensInput: 0.003,
      costPer1kTokensOutput: 0.015,
      recommendedFor: JSON.stringify(['analysis', 'general', 'consistency']),
      priority: 8
    }
  ];

  for (const model of models) {
    await prisma.aIModelConfig.upsert({
      where: { name: model.name },
      update: model,
      create: model
    });
    console.log(`✓ 已配置模型: ${model.displayName}`);
  }

  console.log('AI模型配置初始化完成!');
}

initAIModels()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

执行初始化:

```bash
cd server
node scripts/initAIModels.js
```

---

## 🔧 阶段2: 后端API开发 (Day 2)

### 2.1 AI模型管理服务

创建 `server/services/modelManagementService.js`:

```javascript
const { PrismaClient } = require('@prisma/client');
const aiService = require('./aiService');

class ModelManagementService {
  constructor() {
    this.prisma = new PrismaClient();
  }

  // 获取可用模型列表
  async getAvailableModels(userId, taskType = null) {
    const models = await this.prisma.aIModelConfig.findMany({
      where: {
        isActive: true,
        ...(taskType && {
          recommendedFor: {
            contains: taskType
          }
        })
      },
      orderBy: { priority: 'desc' }
    });

    // 获取用户偏好
    const userPreference = await this.getUserPreference(userId);

    // 添加推荐标记
    const modelsWithRecommendation = models.map(model => ({
      ...model,
      recommendedFor: JSON.parse(model.recommendedFor || '[]'),
      isRecommended: this.isModelRecommendedForTask(model, taskType),
      estimatedCost: this.estimateRequestCost(model, 1000) // 基于1000 tokens估算
    }));

    return {
      models: modelsWithRecommendation,
      userPreference
    };
  }

  // 智能模型推荐
  async recommendModel(userId, taskType, context = {}) {
    const models = await this.getAvailableModels(userId, taskType);
    const userPreference = await this.getUserPreference(userId);

    // 推荐算法
    const scoredModels = models.models.map(model => {
      const score = this.calculateModelScore(model, taskType, context, userPreference);
      return { ...model, score };
    });

    scoredModels.sort((a, b) => b.score - a.score);

    return {
      recommended: scoredModels[0],
      alternatives: scoredModels.slice(1, 3),
      selectionFactors: {
        taskTypeMatch: this.getTaskTypeMatchScore(scoredModels[0], taskType),
        userPreference: this.getUserPreferenceScore(scoredModels[0], userPreference),
        costEfficiency: this.getCostEfficiencyScore(scoredModels[0]),
        performance: this.getPerformanceScore(scoredModels[0])
      }
    };
  }

  // 计算模型评分
  calculateModelScore(model, taskType, context, userPreference) {
    let score = 0;

    // 任务类型匹配 (权重: 40%)
    const taskMatch = this.getTaskTypeMatchScore(model, taskType);
    score += taskMatch * 0.4;

    // 用户偏好 (权重: 30%)
    const userPref = this.getUserPreferenceScore(model, userPreference);
    score += userPref * 0.3;

    // 成本效率 (权重: 20%)
    const costEff = this.getCostEfficiencyScore(model, context.budgetConstraint);
    score += costEff * 0.2;

    // 性能表现 (权重: 10%)
    const performance = this.getPerformanceScore(model);
    score += performance * 0.1;

    return Math.round(score * 100) / 100;
  }

  // 获取用户偏好设置
  async getUserPreference(userId) {
    let preference = await this.prisma.userAIPreference.findUnique({
      where: { userId },
      include: { defaultModel: true }
    });

    if (!preference) {
      // 创建默认偏好设置
      preference = await this.prisma.userAIPreference.create({
        data: { userId },
        include: { defaultModel: true }
      });
    }

    return {
      ...preference,
      taskModelMapping: JSON.parse(preference.taskModelMapping || '{}'),
      preferences: JSON.parse(preference.preferences || '{}'),
      notificationSettings: JSON.parse(preference.notificationSettings || '{}')
    };
  }

  // 更新用户偏好设置
  async updateUserPreference(userId, updates) {
    const data = {
      ...updates,
      taskModelMapping: updates.taskModelMapping ? JSON.stringify(updates.taskModelMapping) : undefined,
      preferences: updates.preferences ? JSON.stringify(updates.preferences) : undefined,
      notificationSettings: updates.notificationSettings ? JSON.stringify(updates.notificationSettings) : undefined,
      updatedAt: new Date()
    };

    return await this.prisma.userAIPreference.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data }
    });
  }

  // 辅助方法
  isModelRecommendedForTask(model, taskType) {
    if (!taskType) return false;
    const recommendedFor = JSON.parse(model.recommendedFor || '[]');
    return recommendedFor.includes(taskType);
  }

  estimateRequestCost(model, tokenCount) {
    const inputCost = (tokenCount * 0.7 / 1000) * model.costPer1kTokensInput;
    const outputCost = (tokenCount * 0.3 / 1000) * model.costPer1kTokensOutput;
    return Math.round((inputCost + outputCost) * 10000) / 10000;
  }

  getTaskTypeMatchScore(model, taskType) {
    const recommendedFor = JSON.parse(model.recommendedFor || '[]');
    return recommendedFor.includes(taskType) ? 1.0 : 0.3;
  }

  getUserPreferenceScore(model, userPreference) {
    const mapping = userPreference.taskModelMapping || {};
    return model.id === userPreference.defaultModelId ? 1.0 : 0.5;
  }

  getCostEfficiencyScore(model, budgetConstraint) {
    if (!budgetConstraint) return 0.5;
    const estimatedCost = this.estimateRequestCost(model, 1000);
    return Math.max(0, 1 - (estimatedCost / budgetConstraint));
  }

  getPerformanceScore(model) {
    // 基于模型优先级的简单性能评分
    return model.priority / 10;
  }
}

module.exports = new ModelManagementService();
```

### 2.2 使用统计服务

创建 `server/services/usageStatisticsService.js`:

```javascript
const { PrismaClient } = require('@prisma/client');

class UsageStatisticsService {
  constructor() {
    this.prisma = new PrismaClient();
  }

  // 记录AI使用
  async recordUsage(data) {
    const record = await this.prisma.aIUsageRecord.create({
      data: {
        ...data,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null
      }
    });

    // 异步更新汇总统计
    setImmediate(() => this.updateUsageSummary(record));

    return record;
  }

  // 更新使用汇总
  async updateUsageSummary(record) {
    const date = new Date(record.createdAt).toISOString().split('T')[0];

    await this.prisma.aIUsageSummary.upsert({
      where: {
        userId_novelId_date_modelConfigId_taskType: {
          userId: record.userId,
          novelId: record.novelId,
          date: new Date(date),
          modelConfigId: record.modelConfigId,
          taskType: record.taskType
        }
      },
      update: {
        requestCount: { increment: 1 },
        totalTokensInput: { increment: record.promptTokens },
        totalTokensOutput: { increment: record.completionTokens },
        totalTokens: { increment: record.totalTokens },
        totalCost: { increment: record.estimatedCostTotal },
        successCount: { increment: record.success ? 1 : 0 },
        errorCount: { increment: record.success ? 0 : 1 },
        avgDuration: { /* 重新计算平均值 */ },
        successRate: { /* 重新计算成功率 */ },
        updatedAt: new Date()
      },
      create: {
        userId: record.userId,
        novelId: record.novelId,
        date: new Date(date),
        modelConfigId: record.modelConfigId,
        taskType: record.taskType,
        requestCount: 1,
        totalTokensInput: record.promptTokens,
        totalTokensOutput: record.completionTokens,
        totalTokens: record.totalTokens,
        totalCost: record.estimatedCostTotal,
        avgDuration: record.duration,
        successCount: record.success ? 1 : 0,
        errorCount: record.success ? 0 : 1,
        successRate: record.success ? 1.0 : 0.0
      }
    });
  }

  // 获取使用概览
  async getUsageOverview(userId, options = {}) {
    const { period = 'month', novelId, startDate, endDate } = options;

    const dateCondition = this.buildDateCondition(period, startDate, endDate);
    const where = {
      userId,
      ...(novelId && { novelId }),
      createdAt: dateCondition
    };

    // 总体统计
    const overview = await this.prisma.aIUsageRecord.aggregate({
      where,
      _count: { id: true },
      _sum: {
        totalTokens: true,
        estimatedCostTotal: true
      },
      _avg: {
        estimatedCostTotal: true,
        duration: true
      }
    });

    // 预算信息
    const budget = await this.getBudgetStatus(userId);

    // 模型使用分布
    const modelDistribution = await this.getModelDistribution(userId, where);

    // 任务类型分布
    const taskTypeDistribution = await this.getTaskTypeDistribution(userId, where);

    // 每日使用趋势
    const dailyUsage = await this.getDailyUsage(userId, where);

    return {
      overview: {
        totalRequests: overview._count.id || 0,
        totalTokens: overview._sum.totalTokens || 0,
        totalCost: overview._sum.estimatedCostTotal || 0,
        averageRequestCost: overview._avg.estimatedCostTotal || 0,
        averageResponseTime: overview._avg.duration || 0
      },
      budget,
      modelDistribution,
      taskTypeDistribution,
      dailyUsage
    };
  }

  // 获取预算状态
  async getBudgetStatus(userId) {
    const preference = await this.prisma.userAIPreference.findUnique({
      where: { userId }
    });

    if (!preference) {
      return { budgetLimitMonthly: 0, currentUsage: 0, usageRate: 0 };
    }

    // 获取本月使用量
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const monthlyUsage = await this.prisma.aIUsageRecord.aggregate({
      where: {
        userId,
        createdAt: { gte: currentMonth }
      },
      _sum: { estimatedCostTotal: true }
    });

    const currentUsage = monthlyUsage._sum.estimatedCostTotal || 0;
    const usageRate = currentUsage / preference.budgetLimitMonthly;

    return {
      budgetLimitMonthly: preference.budgetLimitMonthly,
      currentUsage,
      usageRate,
      remainingBudget: preference.budgetLimitMonthly - currentUsage,
      status: usageRate >= 1.0 ? 'exceeded' : usageRate >= preference.warningThreshold ? 'warning' : 'normal'
    };
  }

  // 获取详细使用记录
  async getUsageRecords(userId, options = {}) {
    const {
      page = 1,
      limit = 50,
      modelId,
      taskType,
      novelId,
      startDate,
      endDate,
      success,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    const where = {
      userId,
      ...(modelId && { modelConfigId: modelId }),
      ...(taskType && { taskType }),
      ...(novelId && { novelId }),
      ...(typeof success === 'boolean' && { success }),
      ...(startDate && endDate && {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      })
    };

    const [records, total] = await Promise.all([
      this.prisma.aIUsageRecord.findMany({
        where,
        include: {
          modelConfig: true,
          novel: { select: { title: true } },
          conversation: { select: { title: true } }
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit
      }),
      this.prisma.aIUsageRecord.count({ where })
    ]);

    return {
      records: records.map(record => ({
        ...record,
        metadata: record.metadata ? JSON.parse(record.metadata) : null
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
        hasMore: page * limit < total
      }
    };
  }

  // 辅助方法
  buildDateCondition(period, startDate, endDate) {
    if (startDate && endDate) {
      return {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const now = new Date();
    let start;

    switch (period) {
      case 'day':
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start = new Date(now);
        start.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        start = new Date(now);
        start.setFullYear(now.getFullYear() - 1);
        break;
      default:
        start = new Date(now);
        start.setMonth(now.getMonth() - 1);
    }

    return { gte: start };
  }

  async getModelDistribution(userId, where) {
    const distribution = await this.prisma.aIUsageRecord.groupBy({
      by: ['modelConfigId'],
      where,
      _count: { id: true },
      _sum: { estimatedCostTotal: true }
    });

    const modelConfigs = await this.prisma.aIModelConfig.findMany({
      where: {
        id: { in: distribution.map(d => d.modelConfigId) }
      }
    });

    return distribution.map(item => {
      const config = modelConfigs.find(c => c.id === item.modelConfigId);
      return {
        modelId: item.modelConfigId,
        modelName: config?.name,
        displayName: config?.displayName,
        requestCount: item._count.id,
        cost: item._sum.estimatedCostTotal
      };
    });
  }

  async getTaskTypeDistribution(userId, where) {
    return await this.prisma.aIUsageRecord.groupBy({
      by: ['taskType'],
      where,
      _count: { id: true },
      _sum: { estimatedCostTotal: true }
    });
  }

  async getDailyUsage(userId, where) {
    const records = await this.prisma.aIUsageRecord.findMany({
      where,
      select: {
        createdAt: true,
        estimatedCostTotal: true,
        totalTokens: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // 按日期分组
    const dailyMap = new Map();
    records.forEach(record => {
      const date = record.createdAt.toISOString().split('T')[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { requests: 0, tokens: 0, cost: 0 });
      }
      const day = dailyMap.get(date);
      day.requests += 1;
      day.tokens += record.totalTokens;
      day.cost += record.estimatedCostTotal;
    });

    return Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      ...data
    }));
  }
}

module.exports = new UsageStatisticsService();
```

### 2.3 使用记录中间件

创建 `server/middleware/aiUsageLogger.js`:

```javascript
const usageStatisticsService = require('../services/usageStatisticsService');
const modelManagementService = require('../services/modelManagementService');

class AIUsageLogger {
  // 请求前记录
  logRequest(req, modelConfig, startTime) {
    req.aiRequest = {
      startTime,
      modelConfig,
      userId: req.user?.id,
      novelId: req.body?.novelId,
      conversationId: req.body?.conversationId,
      taskType: req.body?.type || 'general',
      requestType: req.path.includes('stream') ? 'stream' : 'chat'
    };
  }

  // 请求后记录使用量
  async logUsage(req, response, success = true, error = null) {
    try {
      if (!req.aiRequest) return;

      const {
        startTime,
        modelConfig,
        userId,
        novelId,
        conversationId,
        taskType,
        requestType
      } = req.aiRequest;

      const duration = Date.now() - startTime;
      const usage = response?.usage || {};

      const record = {
        userId,
        novelId,
        conversationId,
        modelConfigId: modelConfig.id,
        taskType,
        requestType,
        promptTokens: usage.prompt_tokens || 0,
        completionTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || 0,
        estimatedCostInput: this.calculateCost(usage.prompt_tokens || 0, modelConfig.costPer1kTokensInput),
        estimatedCostOutput: this.calculateCost(usage.completion_tokens || 0, modelConfig.costPer1kTokensOutput),
        estimatedCostTotal: this.calculateTotalCost(usage, modelConfig),
        duration,
        success,
        errorType: error?.type,
        errorMessage: error?.message,
        metadata: {
          model: modelConfig.name,
          provider: modelConfig.provider,
          requestDetails: this.sanitizeRequestDetails(req.body)
        }
      };

      await usageStatisticsService.recordUsage(record);

      // 检查预算警告
      await this.checkBudgetWarning(userId);

    } catch (logError) {
      console.error('使用记录日志失败:', logError);
    }
  }

  calculateCost(tokens, costPer1k) {
    return (tokens / 1000) * costPer1k;
  }

  calculateTotalCost(usage, modelConfig) {
    const inputCost = this.calculateCost(usage.prompt_tokens || 0, modelConfig.costPer1kTokensInput);
    const outputCost = this.calculateCost(usage.completion_tokens || 0, modelConfig.costPer1kTokensOutput);
    return Math.round((inputCost + outputCost) * 10000) / 10000;
  }

  sanitizeRequestDetails(body) {
    return {
      messageLength: body.message?.length || 0,
      contextIncluded: !!body.context,
      autoSelectModel: body.autoSelectModel,
      customOptions: !!body.options
    };
  }

  async checkBudgetWarning(userId) {
    try {
      const budgetStatus = await usageStatisticsService.getBudgetStatus(userId);

      if (budgetStatus.status === 'warning' || budgetStatus.status === 'exceeded') {
        // 这里可以发送通知或记录警告
        console.log(`用户 ${userId} 预算警告: ${budgetStatus.status}, 使用率: ${budgetStatus.usageRate * 100}%`);
      }
    } catch (error) {
      console.error('预算检查失败:', error);
    }
  }
}

module.exports = new AIUsageLogger();
```

### 2.4 更新现有AI路由

修改 `server/routes/ai.js` 以集成新功能:

```javascript
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const aiService = require('../services/aiService');
const modelManagementService = require('../services/modelManagementService');
const usageStatisticsService = require('../services/usageStatisticsService');
const aiUsageLogger = require('../middleware/aiUsageLogger');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// 增强版AI对话接口
router.post('/chat', requireAuth, async (req, res) => {
  let modelConfig = null;
  const startTime = Date.now();

  try {
    const { novelId, message, type, modelId, autoSelectModel = true, context, options } = req.body;
    const userId = req.user.id;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // 获取模型配置
    if (modelId) {
      modelConfig = await prisma.aIModelConfig.findUnique({
        where: { id: modelId, isActive: true }
      });
      if (!modelConfig) {
        return res.status(400).json({ error: 'Invalid model ID' });
      }
    } else if (autoSelectModel) {
      const recommendation = await modelManagementService.recommendModel(userId, type, {
        contextLength: message.length,
        budgetConstraint: options?.budgetConstraint
      });
      modelConfig = await prisma.aIModelConfig.findUnique({
        where: { id: recommendation.recommended.modelId }
      });
    } else {
      const userPreference = await modelManagementService.getUserPreference(userId);
      if (userPreference.defaultModelId) {
        modelConfig = await prisma.aIModelConfig.findUnique({
          where: { id: userPreference.defaultModelId, isActive: true }
        });
      }
    }

    if (!modelConfig) {
      return res.status(400).json({ error: 'No suitable model found' });
    }

    // 记录请求开始
    aiUsageLogger.logRequest(req, modelConfig, startTime);

    // 获取小说上下文
    let novelContext = null;
    if (novelId) {
      novelContext = await prisma.novel.findUnique({
        where: { id: novelId, userId },
        include: {
          characters: { take: 10 },
          settings: { take: 10 },
          chapters: { take: 5, orderBy: { chapterNumber: 'desc' } },
          aiSettings: true
        }
      });
    }

    // 调用AI服务
    const response = await aiService.generateResponse(novelContext, message, type, {
      provider: modelConfig.provider,
      model: modelConfig.name,
      taskType: type,
      userId,
      messageType: context?.messageType || 'general',
      temperature: options?.temperature,
      maxTokens: options?.maxTokens
    });

    // 记录使用统计
    await aiUsageLogger.logUsage(req, response, true);

    // 获取预算信息
    const budgetInfo = await usageStatisticsService.getBudgetStatus(userId);

    // 构造响应
    const responseData = {
      content: response.message || response.content,
      messageId: `msg_${Date.now()}`,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
        estimatedCostInput: aiUsageLogger.calculateCost(response.usage?.prompt_tokens || 0, modelConfig.costPer1kTokensInput),
        estimatedCostOutput: aiUsageLogger.calculateCost(response.usage?.completion_tokens || 0, modelConfig.costPer1kTokensOutput),
        estimatedCostTotal: aiUsageLogger.calculateTotalCost(response.usage || {}, modelConfig)
      },
      modelUsed: {
        id: modelConfig.id,
        name: modelConfig.name,
        displayName: modelConfig.displayName,
        selectionReason: modelId ? 'user_specified' : (autoSelectModel ? 'auto_recommended' : 'user_default')
      },
      performance: {
        responseTime: Date.now() - startTime,
        requestId: `req_${Date.now()}`
      },
      suggestions: response.suggestions || [],
      budgetInfo: {
        monthlyUsed: budgetInfo.currentUsage,
        monthlyLimit: budgetInfo.budgetLimitMonthly,
        remainingBudget: budgetInfo.remainingBudget,
        usageRate: budgetInfo.usageRate
      }
    };

    res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    // 记录错误
    if (modelConfig) {
      await aiUsageLogger.logUsage(req, null, false, error);
    }

    console.error('Error in enhanced AI chat:', error);
    res.status(500).json({
      error: 'AI service error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'AI service temporarily unavailable'
    });
  }
});

// 继续原有的stream接口，添加类似的增强...

module.exports = router;
```

---

## 🎨 阶段3: 前端组件开发 (Day 3)

### 3.1 模型选择组件

创建 `src/components/ai/ModelSelector.vue`:

```vue
<template>
  <div class="model-selector">
    <a-space size="small">
      <!-- 模型选择下拉框 -->
      <a-select
        v-model:value="selectedModelId"
        class="model-select"
        :placeholder="autoSelect ? '智能选择' : '选择模型'"
        :disabled="autoSelect"
        :loading="loading"
        @change="onModelChange"
        style="width: 200px"
      >
        <template #suffixIcon>
          <RobotOutlined />
        </template>

        <!-- 推荐模型组 -->
        <a-optgroup v-if="recommendedModels.length > 0" label="推荐模型">
          <a-option
            v-for="model in recommendedModels"
            :key="model.id"
            :value="model.id"
          >
            <div class="model-option">
              <div class="model-info">
                <span class="model-name">{{ model.displayName }}</span>
                <a-tag color="green" size="small">推荐</a-tag>
              </div>
              <div class="model-details">
                <span class="model-cost">约 ¥{{ (model.estimatedCost * 7).toFixed(3) }}</span>
                <span class="model-provider">{{ model.provider }}</span>
              </div>
            </div>
          </a-option>
        </a-optgroup>

        <!-- 其他模型组 -->
        <a-optgroup label="其他模型">
          <a-option
            v-for="model in otherModels"
            :key="model.id"
            :value="model.id"
          >
            <div class="model-option">
              <div class="model-info">
                <span class="model-name">{{ model.displayName }}</span>
              </div>
              <div class="model-details">
                <span class="model-cost">约 ¥{{ (model.estimatedCost * 7).toFixed(3) }}</span>
                <span class="model-provider">{{ model.provider }}</span>
              </div>
            </div>
          </a-option>
        </a-optgroup>
      </a-select>

      <!-- 智能选择开关 -->
      <a-tooltip title="启用智能模型选择">
        <a-switch
          v-model:checked="autoSelect"
          size="small"
          @change="onAutoSelectChange"
        >
          <template #checkedChildren>智能</template>
          <template #unCheckedChildren>手动</template>
        </a-switch>
      </a-tooltip>

      <!-- 成本显示 -->
      <a-tooltip v-if="selectedModel" :title="`预估成本: ¥${(selectedModel.estimatedCost * 7).toFixed(4)}`">
        <a-tag color="blue" size="small">
          <DollarOutlined />
          ¥{{ (selectedModel.estimatedCost * 7).toFixed(3) }}
        </a-tag>
      </a-tooltip>
    </a-space>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { RobotOutlined, DollarOutlined } from '@ant-design/icons-vue'
import { aiModelApi } from '@/services/aiModelApi'

// Props
interface Props {
  taskType?: string
  autoSelect?: boolean
  selectedModel?: string
}

const props = withDefaults(defineProps<Props>(), {
  taskType: 'general',
  autoSelect: true,
  selectedModel: ''
})

// Emits
const emit = defineEmits<{
  'update:selectedModel': [value: string]
  'update:autoSelect': [value: boolean]
  'model-change': [model: any]
}>()

// Reactive state
const loading = ref(false)
const models = ref<any[]>([])
const selectedModelId = ref(props.selectedModel)
const autoSelect = ref(props.autoSelect)

// Computed
const recommendedModels = computed(() =>
  models.value.filter(model => model.isRecommended)
)

const otherModels = computed(() =>
  models.value.filter(model => !model.isRecommended)
)

const selectedModel = computed(() =>
  models.value.find(model => model.id === selectedModelId.value)
)

// Methods
const loadModels = async () => {
  loading.value = true
  try {
    const response = await aiModelApi.getAvailableModels({
      taskType: props.taskType
    })
    models.value = response.data.models

    // 如果没有选中的模型且有推荐模型，自动选择第一个推荐模型
    if (!selectedModelId.value && recommendedModels.value.length > 0) {
      selectedModelId.value = recommendedModels.value[0].id
      onModelChange(selectedModelId.value)
    }
  } catch (error) {
    console.error('加载模型列表失败:', error)
  } finally {
    loading.value = false
  }
}

const onModelChange = (modelId: string) => {
  const model = models.value.find(m => m.id === modelId)
  emit('update:selectedModel', modelId)
  emit('model-change', model)
}

const onAutoSelectChange = (value: boolean) => {
  emit('update:autoSelect', value)
  if (value && recommendedModels.value.length > 0) {
    selectedModelId.value = recommendedModels.value[0].id
    onModelChange(selectedModelId.value)
  }
}

// Watchers
watch(() => props.taskType, () => {
  loadModels()
})

watch(() => props.selectedModel, (newValue) => {
  selectedModelId.value = newValue
})

watch(() => props.autoSelect, (newValue) => {
  autoSelect.value = newValue
})

// Lifecycle
onMounted(() => {
  loadModels()
})
</script>

<style scoped>
.model-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.model-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.model-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.model-name {
  font-weight: 500;
}

.model-details {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-size: 12px;
  color: #999;
}

.model-cost {
  color: #1890ff;
  font-weight: 500;
}

.model-provider {
  text-transform: uppercase;
  opacity: 0.7;
}
</style>
```

### 3.2 用量统计仪表板

创建 `src/components/ai/UsageDashboard.vue`:

```vue
<template>
  <div class="usage-dashboard">
    <!-- 概览卡片 -->
    <a-row :gutter="16" class="overview-cards">
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="本月请求"
            :value="overview.totalRequests"
            suffix="次"
          >
            <template #prefix>
              <ApiOutlined />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="本月消耗"
            :value="overview.totalTokens"
            suffix="tokens"
          >
            <template #prefix>
              <DatabaseOutlined />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="本月费用"
            :value="overview.totalCost * 7"
            :precision="2"
            prefix="¥"
          >
            <template #prefix>
              <DollarOutlined />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="预算使用率"
            :value="budget.usageRate * 100"
            suffix="%"
            :value-style="getBudgetStyle()"
          >
            <template #prefix>
              <PieChartOutlined />
            </template>
          </a-statistic>
          <a-progress
            :percent="budget.usageRate * 100"
            :status="getBudgetStatus()"
            size="small"
            style="margin-top: 8px"
          />
        </a-card>
      </a-col>
    </a-row>

    <!-- 图表区域 -->
    <a-row :gutter="16" class="charts-area" style="margin-top: 16px">
      <a-col :span="12">
        <a-card title="使用量趋势" :loading="chartLoading">
          <LineChart :data="usageTrendData" />
        </a-card>
      </a-col>
      <a-col :span="12">
        <a-card title="模型使用分布" :loading="chartLoading">
          <PieChart :data="modelDistributionData" />
        </a-card>
      </a-col>
    </a-row>

    <!-- 详细记录表格 -->
    <a-card title="使用记录" class="usage-records" style="margin-top: 16px">
      <template #extra>
        <a-space>
          <a-select
            v-model:value="filters.modelId"
            placeholder="筛选模型"
            allowClear
            style="width: 150px"
            @change="loadRecords"
          >
            <a-option v-for="model in availableModels" :key="model.id" :value="model.id">
              {{ model.displayName }}
            </a-option>
          </a-select>

          <a-select
            v-model:value="filters.taskType"
            placeholder="任务类型"
            allowClear
            style="width: 120px"
            @change="loadRecords"
          >
            <a-option value="creative">创意写作</a-option>
            <a-option value="analysis">分析</a-option>
            <a-option value="chat">对话</a-option>
            <a-option value="consistency">一致性检查</a-option>
          </a-select>

          <a-range-picker
            v-model:value="filters.dateRange"
            @change="loadRecords"
          />

          <a-button @click="exportRecords" :loading="exporting">
            <DownloadOutlined />
            导出
          </a-button>
        </a-space>
      </template>

      <a-table
        :columns="recordColumns"
        :data-source="records"
        :pagination="pagination"
        :loading="tableLoading"
        @change="onTableChange"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'model'">
            <a-tag :color="getProviderColor(record.modelUsed.provider)">
              {{ record.modelUsed.displayName }}
            </a-tag>
          </template>

          <template v-if="column.key === 'cost'">
            <span :style="{ color: getCostColor(record.usage.estimatedCostTotal) }">
              ¥{{ (record.usage.estimatedCostTotal * 7).toFixed(4) }}
            </span>
          </template>

          <template v-if="column.key === 'performance'">
            <a-space>
              <a-tag :color="getPerformanceColor(record.performance.responseTime)">
                {{ record.performance.responseTime }}ms
              </a-tag>
              <a-tag v-if="record.success" color="green">成功</a-tag>
              <a-tag v-else color="red">失败</a-tag>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import {
  ApiOutlined,
  DatabaseOutlined,
  DollarOutlined,
  PieChartOutlined,
  DownloadOutlined
} from '@ant-design/icons-vue'
import { LineChart, PieChart } from '@/components/charts'
import { aiUsageApi } from '@/services/aiUsageApi'
import dayjs from 'dayjs'

// Reactive state
const loading = ref(false)
const chartLoading = ref(false)
const tableLoading = ref(false)
const exporting = ref(false)

const overview = ref({
  totalRequests: 0,
  totalTokens: 0,
  totalCost: 0
})

const budget = ref({
  usageRate: 0,
  status: 'normal'
})

const records = ref([])
const availableModels = ref([])
const usageTrendData = ref([])
const modelDistributionData = ref([])

const filters = reactive({
  modelId: undefined,
  taskType: undefined,
  dateRange: undefined
})

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true
})

// 表格列定义
const recordColumns = [
  {
    title: '时间',
    dataIndex: 'createdAt',
    key: 'time',
    width: 160,
    customRender: ({ text }) => dayjs(text).format('MM-DD HH:mm:ss')
  },
  {
    title: '模型',
    key: 'model',
    width: 120
  },
  {
    title: '任务类型',
    dataIndex: 'taskType',
    key: 'taskType',
    width: 100
  },
  {
    title: 'Tokens',
    dataIndex: ['usage', 'totalTokens'],
    key: 'tokens',
    width: 80
  },
  {
    title: '费用',
    key: 'cost',
    width: 80
  },
  {
    title: '性能',
    key: 'performance',
    width: 120
  },
  {
    title: '项目',
    dataIndex: ['context', 'novelTitle'],
    key: 'novel',
    ellipsis: true
  }
]

// Computed
const getBudgetStyle = () => {
  if (budget.value.usageRate >= 1.0) return { color: '#ff4d4f' }
  if (budget.value.usageRate >= 0.8) return { color: '#faad14' }
  return { color: '#52c41a' }
}

const getBudgetStatus = () => {
  if (budget.value.usageRate >= 1.0) return 'exception'
  if (budget.value.usageRate >= 0.8) return undefined
  return 'success'
}

// Methods
const loadOverview = async () => {
  loading.value = true
  try {
    const response = await aiUsageApi.getUsageOverview({ period: 'month' })
    overview.value = response.data.overview
    budget.value = response.data.budget

    // 处理图表数据
    usageTrendData.value = response.data.dailyUsage.map(item => ({
      date: item.date,
      requests: item.requests,
      cost: item.cost * 7 // 转换为人民币
    }))

    modelDistributionData.value = response.data.modelDistribution.map(item => ({
      type: item.displayName,
      value: item.cost * 7
    }))

  } catch (error) {
    console.error('加载使用概览失败:', error)
  } finally {
    loading.value = false
  }
}

const loadRecords = async () => {
  tableLoading.value = true
  try {
    const params = {
      page: pagination.current,
      limit: pagination.pageSize,
      modelId: filters.modelId,
      taskType: filters.taskType,
      startDate: filters.dateRange?.[0]?.format('YYYY-MM-DD'),
      endDate: filters.dateRange?.[1]?.format('YYYY-MM-DD')
    }

    const response = await aiUsageApi.getUsageRecords(params)
    records.value = response.data.records
    pagination.total = response.data.pagination.totalRecords

  } catch (error) {
    console.error('加载使用记录失败:', error)
  } finally {
    tableLoading.value = false
  }
}

const onTableChange = (pag, filters, sorter) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  loadRecords()
}

const exportRecords = async () => {
  exporting.value = true
  try {
    const params = {
      format: 'csv',
      modelId: filters.modelId,
      taskType: filters.taskType,
      startDate: filters.dateRange?.[0]?.format('YYYY-MM-DD'),
      endDate: filters.dateRange?.[1]?.format('YYYY-MM-DD')
    }

    const blob = await aiUsageApi.exportRecords(params)
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ai-usage-${dayjs().format('YYYY-MM-DD')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

  } catch (error) {
    console.error('导出失败:', error)
  } finally {
    exporting.value = false
  }
}

// 辅助方法
const getProviderColor = (provider) => {
  const colors = {
    openai: 'green',
    claude: 'blue',
    custom: 'purple'
  }
  return colors[provider] || 'default'
}

const getCostColor = (cost) => {
  if (cost > 0.1) return '#ff4d4f'
  if (cost > 0.05) return '#faad14'
  return '#52c41a'
}

const getPerformanceColor = (time) => {
  if (time > 5000) return 'red'
  if (time > 3000) return 'orange'
  return 'green'
}

// Lifecycle
onMounted(() => {
  loadOverview()
  loadRecords()
})
</script>

<style scoped>
.usage-dashboard {
  padding: 16px;
}

.overview-cards .ant-card {
  border-radius: 8px;
}

.charts-area .ant-card {
  border-radius: 8px;
}

.usage-records {
  border-radius: 8px;
}
</style>
```

---

## 📊 阶段4: 智能推荐算法优化 (Day 4)

### 4.1 增强推荐服务

创建 `server/services/modelRecommendationService.js`:

```javascript
const { PrismaClient } = require('@prisma/client');

class ModelRecommendationService {
  constructor() {
    this.prisma = new PrismaClient();

    // 任务类型权重配置
    this.taskWeights = {
      creative: {
        quality: 0.4,
        creativity: 0.3,
        cost: 0.2,
        speed: 0.1
      },
      analysis: {
        accuracy: 0.4,
        reasoning: 0.3,
        cost: 0.2,
        speed: 0.1
      },
      consistency: {
        accuracy: 0.5,
        cost: 0.3,
        speed: 0.2,
        creativity: 0.0
      },
      chat: {
        speed: 0.4,
        cost: 0.3,
        naturalness: 0.2,
        accuracy: 0.1
      }
    };

    // 模型特性评分 (可以从历史数据计算)
    this.modelScores = {
      'gpt-4': {
        quality: 0.95,
        creativity: 0.90,
        accuracy: 0.92,
        reasoning: 0.94,
        speed: 0.6,
        naturalness: 0.88
      },
      'gpt-3.5-turbo': {
        quality: 0.80,
        creativity: 0.75,
        accuracy: 0.82,
        reasoning: 0.78,
        speed: 0.95,
        naturalness: 0.85
      },
      'claude-3-opus-20240229': {
        quality: 0.93,
        creativity: 0.85,
        accuracy: 0.95,
        reasoning: 0.96,
        speed: 0.65,
        naturalness: 0.90
      }
    };
  }

  // 智能推荐主方法
  async recommend(userId, taskType, context = {}) {
    // 获取可用模型
    const models = await this.getAvailableModels();

    // 获取用户历史偏好
    const userPattern = await this.analyzeUserPattern(userId, taskType);

    // 获取用户预算约束
    const budgetInfo = await this.getBudgetConstraints(userId);

    // 计算每个模型的综合评分
    const scoredModels = models.map(model => {
      const score = this.calculateComprehensiveScore(
        model,
        taskType,
        context,
        userPattern,
        budgetInfo
      );

      return {
        ...model,
        score,
        scoreBreakdown: this.getScoreBreakdown(model, taskType, context, userPattern, budgetInfo)
      };
    });

    // 排序并返回推荐结果
    scoredModels.sort((a, b) => b.score - a.score);

    const recommended = scoredModels[0];
    const alternatives = scoredModels.slice(1, 3);

    return {
      recommended: {
        ...recommended,
        reason: this.generateRecommendationReason(recommended, taskType, userPattern),
        confidence: this.calculateConfidence(recommended, scoredModels)
      },
      alternatives: alternatives.map(alt => ({
        ...alt,
        reason: this.generateAlternativeReason(alt, recommended, taskType)
      })),
      selectionFactors: recommended.scoreBreakdown
    };
  }

  // 计算综合评分
  calculateComprehensiveScore(model, taskType, context, userPattern, budgetInfo) {
    const weights = this.taskWeights[taskType] || this.taskWeights.chat;
    const modelScores = this.modelScores[model.name] || {};

    let score = 0;

    // 基础能力评分 (40%)
    Object.entries(weights).forEach(([factor, weight]) => {
      const modelScore = modelScores[factor] || 0.5;
      score += modelScore * weight * 0.4;
    });

    // 用户偏好评分 (25%)
    const preferenceScore = this.calculatePreferenceScore(model, userPattern);
    score += preferenceScore * 0.25;

    // 成本效率评分 (20%)
    const costScore = this.calculateCostScore(model, context, budgetInfo);
    score += costScore * 0.2;

    // 历史表现评分 (15%)
    const performanceScore = this.calculatePerformanceScore(model, taskType, userPattern);
    score += performanceScore * 0.15;

    return Math.round(score * 100) / 100;
  }

  // 分析用户使用模式
  async analyzeUserPattern(userId, taskType) {
    const recentUsage = await this.prisma.aIUsageRecord.findMany({
      where: {
        userId,
        taskType,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 最近30天
        }
      },
      include: { modelConfig: true }
    });

    if (recentUsage.length === 0) {
      return { preferredModels: [], avgCostTolerance: 0.02, avgResponseTime: 3000 };
    }

    // 分析偏好模型
    const modelUsage = {};
    let totalCost = 0;
    let totalTime = 0;

    recentUsage.forEach(record => {
      const modelName = record.modelConfig.name;
      if (!modelUsage[modelName]) {
        modelUsage[modelName] = { count: 0, satisfaction: 0 };
      }
      modelUsage[modelName].count++;
      totalCost += record.estimatedCostTotal;
      totalTime += record.duration;
    });

    const preferredModels = Object.entries(modelUsage)
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, 3)
      .map(([name]) => name);

    return {
      preferredModels,
      avgCostTolerance: totalCost / recentUsage.length,
      avgResponseTime: totalTime / recentUsage.length,
      usageFrequency: recentUsage.length / 30
    };
  }

  // 计算偏好评分
  calculatePreferenceScore(model, userPattern) {
    if (!userPattern.preferredModels.length) return 0.5;

    const preferenceIndex = userPattern.preferredModels.indexOf(model.name);
    if (preferenceIndex === -1) return 0.3;

    // 根据偏好排名给分
    return 1 - (preferenceIndex * 0.2);
  }

  // 计算成本评分
  calculateCostScore(model, context, budgetInfo) {
    const estimatedCost = this.estimateRequestCost(model, context.contextLength || 1000);

    // 如果有预算约束
    if (context.budgetConstraint) {
      return Math.max(0, 1 - (estimatedCost / context.budgetConstraint));
    }

    // 基于用户月度预算剩余情况
    if (budgetInfo.remainingBudget > 0) {
      const costRatio = estimatedCost / (budgetInfo.remainingBudget / 100); // 假设还有100次请求
      return Math.max(0, 1 - costRatio);
    }

    // 默认基于模型成本排名
    return 1 - (estimatedCost / 0.1); // 假设0.1为高成本阈值
  }

  // 计算性能评分
  calculatePerformanceScore(model, taskType, userPattern) {
    // 这里可以基于历史数据计算实际性能
    // 暂时使用预定义评分
    const baseScore = this.modelScores[model.name]?.speed || 0.5;

    // 如果用户历史显示对响应时间敏感，调整评分
    if (userPattern.avgResponseTime < 2000) {
      return baseScore * 1.2; // 用户偏好快速响应
    }

    return baseScore;
  }

  // 生成推荐理由
  generateRecommendationReason(model, taskType, userPattern) {
    const reasons = [];

    if (userPattern.preferredModels.includes(model.name)) {
      reasons.push("基于您的使用习惯");
    }

    const taskReasons = {
      creative: "创意写作能力突出",
      analysis: "分析推理能力强",
      consistency: "逻辑一致性好",
      chat: "对话体验自然"
    };

    if (taskReasons[taskType]) {
      reasons.push(taskReasons[taskType]);
    }

    if (model.priority >= 9) {
      reasons.push("顶级模型性能");
    }

    return reasons.join("，") || "综合评估最佳选择";
  }

  // 计算推荐置信度
  calculateConfidence(recommended, allModels) {
    if (allModels.length < 2) return 0.9;

    const secondBest = allModels[1];
    const scoreDiff = recommended.score - secondBest.score;

    // 评分差距越大，置信度越高
    return Math.min(0.95, 0.6 + scoreDiff);
  }

  // 获取预算约束信息
  async getBudgetConstraints(userId) {
    const preference = await this.prisma.userAIPreference.findUnique({
      where: { userId }
    });

    if (!preference) return { remainingBudget: 10 };

    // 计算本月剩余预算
    const monthlyUsage = await this.getMonthlyUsage(userId);
    const remainingBudget = preference.budgetLimitMonthly - monthlyUsage;

    return {
      budgetLimitMonthly: preference.budgetLimitMonthly,
      currentUsage: monthlyUsage,
      remainingBudget,
      warningThreshold: preference.warningThreshold
    };
  }

  async getMonthlyUsage(userId) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const result = await this.prisma.aIUsageRecord.aggregate({
      where: {
        userId,
        createdAt: { gte: startOfMonth }
      },
      _sum: { estimatedCostTotal: true }
    });

    return result._sum.estimatedCostTotal || 0;
  }

  // 其他辅助方法...
  async getAvailableModels() {
    return await this.prisma.aIModelConfig.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' }
    });
  }

  estimateRequestCost(model, tokenCount) {
    const inputTokens = tokenCount * 0.7;
    const outputTokens = tokenCount * 0.3;
    const inputCost = (inputTokens / 1000) * model.costPer1kTokensInput;
    const outputCost = (outputTokens / 1000) * model.costPer1kTokensOutput;
    return inputCost + outputCost;
  }

  getScoreBreakdown(model, taskType, context, userPattern, budgetInfo) {
    return {
      taskTypeMatch: this.getTaskTypeMatchScore(model, taskType),
      userPreference: this.calculatePreferenceScore(model, userPattern),
      costEfficiency: this.calculateCostScore(model, context, budgetInfo),
      performance: this.calculatePerformanceScore(model, taskType, userPattern)
    };
  }

  getTaskTypeMatchScore(model, taskType) {
    const recommendedFor = JSON.parse(model.recommendedFor || '[]');
    return recommendedFor.includes(taskType) ? 1.0 : 0.3;
  }

  generateAlternativeReason(alternative, recommended, taskType) {
    const costSaving = this.estimateRequestCost(recommended, 1000) - this.estimateRequestCost(alternative, 1000);

    if (costSaving > 0.01) {
      return `更经济的选择，可节省${Math.round(costSaving * 7 * 1000) / 1000}元`;
    }

    if (alternative.priority > recommended.priority) {
      return "性能更强的备选方案";
    }

    return "备选推荐方案";
  }
}

module.exports = new ModelRecommendationService();
```

现在我已经为您创建了完整的AI模型切换及Token消耗统计系统设计方案。该方案包括：

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Analyze project structure and functionality", "status": "completed", "activeForm": "Analyzing project structure and functionality"}, {"content": "Design AI model switching solution", "status": "completed", "activeForm": "Designing AI model switching solution"}, {"content": "Design token consumption statistics system", "status": "completed", "activeForm": "Designing token consumption statistics system"}, {"content": "Create comprehensive documentation", "status": "completed", "activeForm": "Creating comprehensive documentation"}, {"content": "Review and discuss solution details", "status": "in_progress", "activeForm": "Reviewing and discussing solution details"}]