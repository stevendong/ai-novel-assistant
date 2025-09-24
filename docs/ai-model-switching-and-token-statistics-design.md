# AI模型切换及Token消耗统计系统设计方案

## 📋 项目概览和需求分析

### 当前项目架构
- **项目类型**: AI驱动的小说创作协作工具
- **技术栈**: Vue3 + Node.js + Express + Prisma + SQLite
- **AI集成**: 支持OpenAI、Claude、自定义提供商
- **核心功能**: 小说项目管理、角色设定、世界构建、章节编辑、AI助手对话

### 现有AI系统分析
#### 已实现的AI功能：
1. **多提供商支持**: OpenAI、Claude、自定义兼容提供商
2. **任务导向配置**: 创意、分析、一致性检查等不同温度参数
3. **记忆增强**: 集成Mem0长期记忆服务
4. **流式响应**: 实时AI对话体验
5. **智能重试**: 网络错误和限流自动重试
6. **上下文感知**: 基于小说项目的个性化提示词

#### 当前AI使用场景：
- **对话模式**: 自由AI助手对话 (`/api/ai/chat`, `/api/ai/chat/stream`)
- **内容增强**: 角色、设定、情节完善
- **一致性检查**: 自动检测逻辑矛盾
- **大纲生成**: 章节和整体大纲AI生成
- **内容创作**: AI辅助正文写作

### 核心需求
1. **灵活的模型切换**: 用户可以根据任务类型选择最适合的AI模型
2. **精确的用量统计**: 实时监控Token消耗，成本控制
3. **智能模型推荐**: 根据任务类型自动推荐最优模型
4. **用量分析报告**: 详细的使用分析和优化建议

---

## 🎯 解决方案设计

### 方案1: 渐进式增强方案 (推荐)

#### 阶段1: 基础模型切换 (2-3天)
- 在现有AI配置基础上增强
- 用户界面模型选择组件
- 基础token统计记录

#### 阶段2: 智能推荐系统 (3-4天)
- 任务类型智能模型匹配
- 用量分析仪表板
- 成本预警系统

#### 阶段3: 高级分析功能 (2-3天)
- 用量趋势分析
- 性能对比报告
- 预算管理工具

### 方案2: 一体化解决方案
- 一次性实现所有功能
- 开发周期较长 (10-12天)
- 系统复杂度较高

**推荐选择方案1，便于分阶段验证和优化**

---

## 🛠️ 技术架构设计

### 1. 数据库设计

#### 新增表结构

```sql
-- AI模型配置表
CREATE TABLE AIModelConfig (
  id TEXT PRIMARY KEY DEFAULT(cuid()),
  name TEXT NOT NULL UNIQUE,           -- 模型名称 (gpt-4, gpt-3.5-turbo, claude-3-sonnet等)
  provider TEXT NOT NULL,              -- 提供商 (openai, claude, custom)
  displayName TEXT NOT NULL,           -- 显示名称
  description TEXT,                    -- 模型描述
  maxTokens INTEGER DEFAULT 4096,      -- 最大token数
  costPer1kTokens REAL DEFAULT 0.002,  -- 每1k token成本(USD)
  recommendedFor TEXT,                 -- JSON: 推荐使用场景
  isActive BOOLEAN DEFAULT true,       -- 是否可用
  priority INTEGER DEFAULT 0,         -- 优先级排序
  metadata TEXT,                       -- JSON: 扩展配置
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AI使用记录表
CREATE TABLE AIUsageRecord (
  id TEXT PRIMARY KEY DEFAULT(cuid()),
  userId TEXT NOT NULL,
  novelId TEXT,                        -- 关联小说项目，可为空
  conversationId TEXT,                 -- 关联对话会话，可为空
  modelConfigId TEXT NOT NULL,         -- 关联模型配置
  taskType TEXT NOT NULL,              -- 任务类型 (chat, creative, analysis, consistency等)
  requestType TEXT NOT NULL,           -- 请求类型 (chat, stream)
  promptTokens INTEGER DEFAULT 0,      -- 输入token数
  completionTokens INTEGER DEFAULT 0,  -- 输出token数
  totalTokens INTEGER DEFAULT 0,       -- 总token数
  estimatedCost REAL DEFAULT 0,        -- 预估成本(USD)
  duration INTEGER DEFAULT 0,          -- 请求耗时(ms)
  success BOOLEAN DEFAULT true,        -- 是否成功
  errorType TEXT,                      -- 错误类型
  metadata TEXT,                       -- JSON: 请求详情
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
  FOREIGN KEY (novelId) REFERENCES Novel(id) ON DELETE SET NULL,
  FOREIGN KEY (conversationId) REFERENCES AIConversation(id) ON DELETE SET NULL,
  FOREIGN KEY (modelConfigId) REFERENCES AIModelConfig(id)
);

-- 用户AI偏好设置表
CREATE TABLE UserAIPreference (
  userId TEXT PRIMARY KEY,
  defaultModelId TEXT,                 -- 默认模型
  autoSelectModel BOOLEAN DEFAULT true, -- 是否自动选择模型
  budgetLimit REAL DEFAULT 10.0,      -- 月度预算限制(USD)
  warningThreshold REAL DEFAULT 0.8,  -- 预警阈值(80%)
  taskModelMapping TEXT,               -- JSON: 任务类型-模型映射
  preferences TEXT,                    -- JSON: 其他偏好设置
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
  FOREIGN KEY (defaultModelId) REFERENCES AIModelConfig(id)
);

-- AI使用统计汇总表 (用于快速查询)
CREATE TABLE AIUsageSummary (
  id TEXT PRIMARY KEY DEFAULT(cuid()),
  userId TEXT NOT NULL,
  novelId TEXT,
  date DATE NOT NULL,                  -- 统计日期
  modelConfigId TEXT NOT NULL,
  taskType TEXT NOT NULL,
  requestCount INTEGER DEFAULT 0,     -- 请求次数
  totalTokens INTEGER DEFAULT 0,      -- 总token数
  totalCost REAL DEFAULT 0,           -- 总成本
  avgDuration REAL DEFAULT 0,         -- 平均耗时
  successRate REAL DEFAULT 1.0,       -- 成功率
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
  FOREIGN KEY (novelId) REFERENCES Novel(id) ON DELETE CASCADE,
  FOREIGN KEY (modelConfigId) REFERENCES AIModelConfig(id),
  UNIQUE(userId, novelId, date, modelConfigId, taskType)
);
```

#### 添加索引优化

```sql
-- AIUsageRecord 索引
CREATE INDEX idx_ai_usage_user_date ON AIUsageRecord(userId, createdAt);
CREATE INDEX idx_ai_usage_novel ON AIUsageRecord(novelId, createdAt);
CREATE INDEX idx_ai_usage_model ON AIUsageRecord(modelConfigId, createdAt);
CREATE INDEX idx_ai_usage_task_type ON AIUsageRecord(taskType, createdAt);

-- AIUsageSummary 索引
CREATE INDEX idx_ai_summary_user_date ON AIUsageSummary(userId, date);
CREATE INDEX idx_ai_summary_novel_date ON AIUsageSummary(novelId, date);
```

### 2. 后端API设计

#### 模型管理API

```javascript
// routes/ai-models.js

// 获取可用模型列表 (增强版)
GET /api/ai/models
Response: {
  models: [
    {
      id: "model_001",
      name: "gpt-4",
      provider: "openai",
      displayName: "GPT-4",
      description: "最强大的通用AI模型",
      maxTokens: 8192,
      costPer1kTokens: 0.03,
      recommendedFor: ["creative", "analysis", "complex_tasks"],
      isActive: true,
      priority: 1
    }
  ],
  userPreference: {
    defaultModelId: "model_001",
    autoSelectModel: true,
    taskModelMapping: {
      "creative": "model_001",
      "analysis": "model_002",
      "chat": "model_003"
    }
  }
}

// 智能模型推荐
POST /api/ai/models/recommend
Request: {
  taskType: "creative",
  contextLength: 2048,
  budgetConstraint: 0.05
}
Response: {
  recommended: {
    modelId: "model_001",
    reason: "最适合创意任务",
    estimatedCost: 0.024
  },
  alternatives: [...]
}

// 更新用户AI偏好
PUT /api/ai/preferences
Request: {
  defaultModelId: "model_001",
  autoSelectModel: true,
  budgetLimit: 20.0,
  taskModelMapping: {...}
}
```

#### 使用统计API

```javascript
// routes/ai-statistics.js

// 获取用量统计概览
GET /api/ai/usage/overview?period=month&novelId=xxx
Response: {
  totalRequests: 1250,
  totalTokens: 125000,
  totalCost: 2.45,
  budgetUsed: 0.245,  // 24.5%
  topModels: [
    {
      modelName: "gpt-3.5-turbo",
      usage: 0.6,
      cost: 1.47
    }
  ],
  dailyUsage: [...],  // 按日统计
  taskTypeBreakdown: {...}
}

// 获取详细使用记录
GET /api/ai/usage/records?page=1&limit=50&modelId=xxx&taskType=creative
Response: {
  records: [...],
  pagination: {...},
  filters: {...}
}

// 获取成本分析报告
GET /api/ai/usage/cost-analysis?period=month
Response: {
  costTrend: [...],          // 成本趋势
  modelEfficiency: [...],    // 模型效率对比
  recommendations: [...],    // 优化建议
  projectedCost: 15.2       // 预测月度成本
}
```

#### 增强的AI对话API

```javascript
// 修改现有的 /api/ai/chat 和 /api/ai/chat/stream
POST /api/ai/chat
Request: {
  novelId: "novel_123",
  message: "帮我完善这个角色",
  type: "creative",
  modelId: "model_001",     // 新增: 指定模型
  autoSelectModel: false   // 新增: 是否自动选择
}
Response: {
  content: "...",
  usage: {
    promptTokens: 150,
    completionTokens: 200,
    totalTokens: 350,
    estimatedCost: 0.01
  },
  modelUsed: {
    id: "model_001",
    name: "gpt-4",
    selectionReason: "user_specified"
  }
}
```

### 3. 前端组件设计

#### 模型选择组件

```vue
<!-- components/ai/ModelSelector.vue -->
<template>
  <div class="model-selector">
    <a-select
      v-model:value="selectedModel"
      class="model-select"
      :placeholder="autoSelect ? '智能选择' : '选择模型'"
      :disabled="autoSelect"
      @change="onModelChange"
    >
      <template #suffixIcon>
        <RobotOutlined />
      </template>

      <a-option-group label="推荐模型">
        <a-option
          v-for="model in recommendedModels"
          :key="model.id"
          :value="model.id"
        >
          <div class="model-option">
            <span class="model-name">{{ model.displayName }}</span>
            <span class="model-cost">¥{{ model.estimatedCost }}</span>
            <a-tag v-if="model.isRecommended" color="green" size="small">推荐</a-tag>
          </div>
        </a-option>
      </a-option-group>

      <a-option-group label="其他模型">
        <a-option
          v-for="model in otherModels"
          :key="model.id"
          :value="model.id"
        >
          <div class="model-option">
            <span class="model-name">{{ model.displayName }}</span>
            <span class="model-cost">¥{{ model.estimatedCost }}</span>
          </div>
        </a-option>
      </a-option-group>
    </a-select>

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
  </div>
</template>
```

#### 用量统计仪表板

```vue
<!-- components/ai/UsageDashboard.vue -->
<template>
  <div class="usage-dashboard">
    <!-- 概览卡片 -->
    <a-row :gutter="16" class="overview-cards">
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="本月使用量"
            :value="overview.totalTokens"
            suffix="tokens"
          />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="本月费用"
            :value="overview.totalCost"
            :precision="2"
            prefix="¥"
          />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="预算使用率"
            :value="overview.budgetUsed * 100"
            suffix="%"
            :value-style="getBudgetStyle()"
          />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="调用次数"
            :value="overview.totalRequests"
            suffix="次"
          />
        </a-card>
      </a-col>
    </a-row>

    <!-- 图表区域 -->
    <a-row :gutter="16" class="charts-area">
      <a-col :span="12">
        <a-card title="使用量趋势">
          <LineChart :data="usageTrendData" />
        </a-card>
      </a-col>
      <a-col :span="12">
        <a-card title="模型使用分布">
          <PieChart :data="modelDistributionData" />
        </a-card>
      </a-col>
    </a-row>

    <!-- 详细记录 -->
    <a-card title="使用记录" class="usage-records">
      <template #extra>
        <a-space>
          <a-select v-model:value="filterModel" placeholder="筛选模型" allowClear>
            <a-option v-for="model in availableModels" :key="model.id" :value="model.id">
              {{ model.displayName }}
            </a-option>
          </a-select>
          <a-date-picker v-model:value="filterDate" />
        </a-space>
      </template>

      <a-table
        :columns="recordColumns"
        :data-source="filteredRecords"
        :pagination="pagination"
        @change="onTableChange"
      />
    </a-card>
  </div>
</template>
```

#### AI助手面板增强

```vue
<!-- 在现有的 AIAssistantPanel.vue 中添加模型选择 -->
<template>
  <div class="ai-assistant-panel">
    <!-- 现有的模式切换 -->
    <div class="panel-header">
      <!-- ... 现有代码 ... -->

      <!-- 新增: 模型设置区域 -->
      <div class="model-settings">
        <ModelSelector
          v-model:selectedModel="currentModel"
          v-model:autoSelect="autoSelectModel"
          :taskType="currentMode"
          @model-change="onModelChange"
        />

        <a-tooltip title="查看用量统计">
          <a-button
            type="text"
            size="small"
            @click="showUsageModal = true"
          >
            <BarChartOutlined />
          </a-button>
        </a-tooltip>
      </div>
    </div>

    <!-- 用量提醒 -->
    <a-alert
      v-if="showBudgetWarning"
      type="warning"
      :message="`本月已使用 ${budgetUsedPercentage}% 的AI预算`"
      show-icon
      closable
      class="budget-warning"
    />

    <!-- ... 现有的对话区域 ... -->

    <!-- 用量统计模态框 -->
    <a-modal
      v-model:open="showUsageModal"
      title="AI使用统计"
      width="1000px"
    >
      <UsageDashboard />
    </a-modal>
  </div>
</template>
```

### 4. 智能推荐算法

#### 模型推荐策略

```javascript
// services/modelRecommendationService.js

class ModelRecommendationService {
  // 根据任务类型推荐模型
  recommendByTaskType(taskType, context = {}) {
    const rules = {
      'creative': {
        priority: ['gpt-4', 'claude-3-opus', 'gpt-3.5-turbo'],
        factors: ['creativity', 'context_length', 'cost']
      },
      'analysis': {
        priority: ['gpt-4', 'claude-3-sonnet', 'gpt-3.5-turbo'],
        factors: ['accuracy', 'reasoning', 'cost']
      },
      'consistency': {
        priority: ['gpt-4', 'claude-3-haiku', 'gpt-3.5-turbo'],
        factors: ['accuracy', 'cost', 'speed']
      },
      'chat': {
        priority: ['gpt-3.5-turbo', 'claude-3-haiku'],
        factors: ['speed', 'cost']
      }
    };

    return this.calculateBestModel(rules[taskType], context);
  }

  // 根据用户历史使用模式推荐
  recommendByUserPattern(userId, taskType) {
    // 分析用户过去30天的使用数据
    // 考虑用户偏好、成本敏感度、效果满意度
  }

  // 根据预算约束推荐
  recommendByBudget(availableBudget, taskType, contextLength) {
    // 在预算范围内推荐性价比最高的模型
  }

  // 综合推荐算法
  async getSmartRecommendation(userId, taskType, context) {
    const factors = {
      taskType: await this.recommendByTaskType(taskType, context),
      userPattern: await this.recommendByUserPattern(userId, taskType),
      budget: await this.recommendByBudget(context.budget, taskType, context.length),
      performance: await this.getModelPerformanceData(taskType)
    };

    return this.weightedRecommendation(factors);
  }
}
```

### 5. 数据收集与分析

#### Token使用记录中间件

```javascript
// middleware/aiUsageLogger.js

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
      estimatedCost: this.calculateCost(usage.total_tokens, modelConfig.costPer1kTokens),
      duration,
      success,
      errorType: error?.type,
      metadata: JSON.stringify({
        model: modelConfig.name,
        provider: modelConfig.provider,
        requestDetails: this.sanitizeRequestDetails(req.body)
      })
    };

    await this.saveUsageRecord(record);
    await this.updateDailySummary(record);
  }

  calculateCost(totalTokens, costPer1kTokens) {
    return (totalTokens / 1000) * costPer1kTokens;
  }
}
```

#### 实时统计更新

```javascript
// services/usageStatisticsService.js

class UsageStatisticsService {
  // 更新每日汇总
  async updateDailySummary(record) {
    const today = new Date().toISOString().split('T')[0];

    await prisma.aIUsageSummary.upsert({
      where: {
        userId_novelId_date_modelConfigId_taskType: {
          userId: record.userId,
          novelId: record.novelId,
          date: today,
          modelConfigId: record.modelConfigId,
          taskType: record.taskType
        }
      },
      update: {
        requestCount: { increment: 1 },
        totalTokens: { increment: record.totalTokens },
        totalCost: { increment: record.estimatedCost },
        avgDuration: { /* 重新计算平均值 */ },
        successRate: { /* 重新计算成功率 */ }
      },
      create: {
        userId: record.userId,
        novelId: record.novelId,
        date: today,
        modelConfigId: record.modelConfigId,
        taskType: record.taskType,
        requestCount: 1,
        totalTokens: record.totalTokens,
        totalCost: record.estimatedCost,
        avgDuration: record.duration,
        successRate: record.success ? 1.0 : 0.0
      }
    });
  }

  // 检查预算警告
  async checkBudgetWarning(userId) {
    const user = await prisma.userAIPreference.findUnique({
      where: { userId }
    });

    if (!user?.budgetLimit) return null;

    const monthlyUsage = await this.getMonthlyUsage(userId);
    const usageRate = monthlyUsage.totalCost / user.budgetLimit;

    if (usageRate >= user.warningThreshold) {
      return {
        budgetLimit: user.budgetLimit,
        currentUsage: monthlyUsage.totalCost,
        usageRate,
        warning: usageRate >= 1.0 ? 'exceeded' : 'approaching'
      };
    }

    return null;
  }
}
```

---

## 📊 用户界面设计

### 1. 模型选择界面

**位置**: AI助手面板顶部
**功能**:
- 模型选择下拉框 (支持搜索)
- 智能推荐标识
- 预估成本显示
- 智能/手动切换开关

### 2. 用量统计面板

**位置**: 独立页面 + AI助手面板快捷入口
**内容**:
- 概览卡片 (本月用量、费用、预算使用率、调用次数)
- 趋势图表 (使用量趋势、成本趋势、模型分布)
- 详细记录表格 (支持筛选、排序、导出)

### 3. 设置页面增强

**位置**: 用户设置页面新增AI偏好设置
**内容**:
- 默认模型选择
- 任务类型-模型映射配置
- 预算限制设置
- 预警阈值配置
- 使用历史导出

### 4. 实时提醒

**位置**: 全局通知
**触发**:
- 预算接近限制时 (80%, 90%, 100%)
- 使用量异常增长时
- 模型服务异常时

---

## 🚀 实施计划

### 阶段1: 基础架构 (3天)

**Day 1: 数据库设计**
- 创建新的数据表结构
- 添加索引优化
- 数据库迁移脚本
- 预置模型配置数据

**Day 2: 后端API开发**
- 模型管理API (`/api/ai/models`)
- 使用记录API (`/api/ai/usage`)
- 增强现有AI对话API
- 使用量记录中间件

**Day 3: 基础前端组件**
- ModelSelector组件
- 集成到AIAssistantPanel
- 基础用量显示

### 阶段2: 智能推荐 (3天)

**Day 4: 推荐算法**
- 实现模型推荐服务
- 任务类型匹配逻辑
- 用户偏好学习

**Day 5: 用量统计服务**
- 实时统计更新
- 预算监控警告
- 性能分析工具

**Day 6: 前端统计界面**
- UsageDashboard组件
- 图表可视化
- 设置页面增强

### 阶段3: 高级功能 (2天)

**Day 7: 分析和优化**
- 成本优化建议
- 使用模式分析
- 预测性分析

**Day 8: 测试和优化**
- 单元测试
- 集成测试
- 性能优化
- 文档完善

---

## 📈 预期效果

### 用户体验提升
1. **智能化**: 自动推荐最适合的AI模型
2. **透明化**: 清晰的成本和用量显示
3. **可控化**: 灵活的预算和偏好设置

### 系统管理优化
1. **成本控制**: 精确的用量统计和预算管理
2. **性能监控**: 实时的AI服务性能数据
3. **用户洞察**: 深入的使用模式分析

### 业务价值
1. **用户留存**: 透明的成本控制增加用户信任
2. **收入优化**: 基于用量的计费模式
3. **产品差异化**: 智能AI模型推荐的竞争优势

---

## 🔧 技术考虑

### 性能优化
1. **数据库优化**: 合理的索引设计，定期数据归档
2. **缓存策略**: Redis缓存用户偏好和统计数据
3. **异步处理**: 用量记录异步更新，不影响AI响应速度

### 扩展性设计
1. **模块化架构**: 独立的推荐服务，便于算法迭代
2. **API设计**: RESTful接口，支持第三方集成
3. **配置驱动**: 模型配置和推荐规则可动态调整

### 安全性考虑
1. **数据脱敏**: 用量记录中的敏感信息脱敏处理
2. **权限控制**: 基于用户角色的功能访问控制
3. **审计日志**: 关键操作的审计跟踪

---

## 💡 创新特性

### 1. AI模型效果评估
- 基于用户反馈的模型效果评分
- 不同任务类型下的模型表现对比
- 智能推荐准确性的持续优化

### 2. 成本优化建议
- 基于用量模式的个性化优化建议
- 模型切换的成本影响预测
- 预算分配的智能化建议

### 3. 协作团队支持
- 团队成员的用量统计和预算分配
- 项目级别的AI使用分析
- 团队协作的模型偏好同步

### 4. 第三方集成预留
- 支持更多AI提供商的快速接入
- 自定义模型的性能评估框架
- 与企业计费系统的集成接口

---

这个设计方案提供了完整的AI模型切换和Token消耗统计系统，既满足当前需求，又具备良好的扩展性和创新性。通过分阶段实施，可以快速验证和优化功能，确保系统的稳定性和用户体验。