# AI模型切换及Token统计系统 - API接口规范

## 概述

本文档定义了AI模型切换和Token消耗统计系统的完整API接口规范，包括请求格式、响应格式、错误处理和使用示例。

---

## 1. AI模型管理API

### 1.1 获取可用模型列表

**接口地址**: `GET /api/ai/models`

**功能**: 获取所有可用的AI模型配置信息和用户偏好设置

**请求参数**:
```json
{
  "taskType": "creative",  // 可选: 筛选特定任务类型的推荐模型
  "includeInactive": false // 可选: 是否包含非活跃模型
}
```

**响应格式**:
```json
{
  "success": true,
  "data": {
    "models": [
      {
        "id": "model_001",
        "name": "gpt-4",
        "provider": "openai",
        "displayName": "GPT-4",
        "description": "最强大的通用AI模型，擅长复杂推理和创意任务",
        "maxTokens": 8192,
        "costPer1kTokensInput": 0.03,
        "costPer1kTokensOutput": 0.06,
        "recommendedFor": ["creative", "analysis", "complex_tasks"],
        "isActive": true,
        "priority": 10,
        "averageRating": 4.7,
        "usageCount": 1250
      }
    ],
    "userPreference": {
      "defaultModelId": "model_001",
      "autoSelectModel": true,
      "budgetLimitMonthly": 50.0,
      "budgetUsed": 12.45,
      "budgetUsageRate": 0.249,
      "taskModelMapping": {
        "creative": "model_001",
        "analysis": "model_002",
        "chat": "model_003"
      }
    },
    "recommendations": [
      {
        "taskType": "creative",
        "modelId": "model_001",
        "reason": "最适合创意写作任务",
        "confidence": 0.95
      }
    ]
  }
}
```

### 1.2 智能模型推荐

**接口地址**: `POST /api/ai/models/recommend`

**功能**: 根据任务类型和上下文智能推荐最适合的AI模型

**请求格式**:
```json
{
  "taskType": "creative",        // 必填: 任务类型
  "contextLength": 2048,         // 可选: 预期上下文长度
  "budgetConstraint": 0.05,      // 可选: 预算约束(USD)
  "performancePriority": "cost", // 可选: 优先级 (cost|quality|speed)
  "novelId": "novel_123",        // 可选: 关联小说项目
  "userHistory": true            // 可选: 是否考虑用户历史偏好
}
```

**响应格式**:
```json
{
  "success": true,
  "data": {
    "recommended": {
      "modelId": "model_001",
      "modelName": "gpt-4",
      "displayName": "GPT-4",
      "reason": "基于您的创意写作偏好和预算考虑",
      "confidence": 0.92,
      "estimatedCost": 0.024,
      "estimatedResponseTime": 3500,
      "pros": ["质量最高", "创意能力强"],
      "cons": ["成本较高"]
    },
    "alternatives": [
      {
        "modelId": "model_002",
        "modelName": "gpt-3.5-turbo",
        "reason": "更经济的选择，质量仍然不错",
        "confidence": 0.75,
        "estimatedCost": 0.008
      }
    ],
    "selectionFactors": {
      "taskTypeMatch": 0.9,
      "userPreference": 0.8,
      "costEfficiency": 0.6,
      "performance": 0.95
    }
  }
}
```

### 1.3 更新用户AI偏好

**接口地址**: `PUT /api/ai/preferences`

**功能**: 更新用户的AI使用偏好设置

**请求格式**:
```json
{
  "defaultModelId": "model_001",
  "autoSelectModel": true,
  "budgetLimitMonthly": 50.0,
  "budgetLimitDaily": 2.0,
  "warningThreshold": 0.8,
  "taskModelMapping": {
    "creative": "model_001",
    "analysis": "model_002",
    "chat": "model_003",
    "consistency": "model_002"
  },
  "notificationSettings": {
    "budgetWarnings": true,
    "dailyUsageSummary": false,
    "modelRecommendations": true
  }
}
```

**响应格式**:
```json
{
  "success": true,
  "data": {
    "message": "偏好设置已更新",
    "updatedPreferences": {
      // 更新后的完整偏好设置
    }
  }
}
```

---

## 2. 增强的AI对话API

### 2.1 AI对话 (增强版)

**接口地址**: `POST /api/ai/chat`

**功能**: 增强版AI对话，支持模型选择和使用统计

**请求格式**:
```json
{
  "novelId": "novel_123",
  "conversationId": "conv_456",
  "message": "帮我完善这个角色的性格设定",
  "type": "creative",
  "modelId": "model_001",        // 可选: 指定模型ID
  "autoSelectModel": false,      // 可选: 是否自动选择模型
  "context": {
    "previousMessages": 5,       // 可选: 包含的历史消息数量
    "includeProjectContext": true // 可选: 是否包含项目上下文
  },
  "options": {
    "temperature": 0.8,          // 可选: 覆盖模型默认参数
    "maxTokens": 2000,          // 可选: 限制响应长度
    "estimateCostOnly": false   // 可选: 仅估算成本不实际调用
  }
}
```

**响应格式**:
```json
{
  "success": true,
  "data": {
    "content": "基于您提供的角色信息，我建议...",
    "messageId": "msg_789",
    "conversationId": "conv_456",
    "usage": {
      "promptTokens": 150,
      "completionTokens": 200,
      "totalTokens": 350,
      "estimatedCostInput": 0.0045,
      "estimatedCostOutput": 0.012,
      "estimatedCostTotal": 0.0165
    },
    "modelUsed": {
      "id": "model_001",
      "name": "gpt-4",
      "displayName": "GPT-4",
      "selectionReason": "user_specified", // user_specified | auto_recommended | fallback
      "actualCost": 0.0165
    },
    "performance": {
      "responseTime": 3240,
      "requestId": "req_abc123"
    },
    "suggestions": [
      "继续完善角色的背景故事",
      "设计角色的对话风格"
    ],
    "budgetInfo": {
      "monthlyUsed": 12.67,
      "monthlyLimit": 50.0,
      "remainingBudget": 37.33,
      "usageRate": 0.253
    }
  }
}
```

### 2.2 流式AI对话 (增强版)

**接口地址**: `POST /api/ai/chat/stream`

**功能**: 增强版流式AI对话，实时推送响应内容

**请求格式**: 与普通对话API相同

**响应格式**: Server-Sent Events (SSE)

```javascript
// 连接建立
data: {"type":"connected","requestId":"req_123"}

// 模型选择信息
data: {"type":"model_selected","model":{"id":"model_001","name":"gpt-4","reason":"auto_recommended"}}

// 内容流
data: {"type":"chunk","content":"基于您的"}
data: {"type":"chunk","content":"角色设定"}

// 使用统计
data: {"type":"usage","usage":{"promptTokens":150,"completionTokens":25,"estimatedCost":0.0052}}

// 完成
data: {"type":"finish","reason":"stop","finalUsage":{"totalTokens":350,"estimatedCostTotal":0.0165}}

// 结束
data: {"type":"done"}
```

---

## 3. 使用统计API

### 3.1 使用统计概览

**接口地址**: `GET /api/ai/usage/overview`

**功能**: 获取用户AI使用统计概览

**请求参数**:
```
?period=month          // 时间周期: day|week|month|year
&novelId=novel_123     // 可选: 特定小说项目
&startDate=2024-01-01  // 可选: 开始日期
&endDate=2024-01-31    // 可选: 结束日期
```

**响应格式**:
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalRequests": 1250,
      "totalTokens": 125000,
      "totalCost": 24.50,
      "averageRequestCost": 0.0196,
      "averageResponseTime": 2800
    },
    "budget": {
      "monthlyLimit": 50.0,
      "currentUsage": 24.50,
      "usageRate": 0.49,
      "remainingBudget": 25.50,
      "daysRemaining": 15,
      "projectedMonthlyUsage": 49.0,
      "onTrackForBudget": true
    },
    "topModels": [
      {
        "modelId": "model_001",
        "modelName": "gpt-4",
        "displayName": "GPT-4",
        "requestCount": 450,
        "tokenCount": 45000,
        "cost": 13.50,
        "usagePercentage": 0.55,
        "averageRating": 4.8
      }
    ],
    "taskTypeBreakdown": {
      "creative": {"requests": 600, "cost": 15.20, "percentage": 0.48},
      "analysis": {"requests": 300, "cost": 6.80, "percentage": 0.24},
      "chat": {"requests": 350, "cost": 2.50, "percentage": 0.28}
    },
    "dailyUsage": [
      {
        "date": "2024-01-01",
        "requests": 45,
        "tokens": 4500,
        "cost": 1.23
      }
    ]
  }
}
```

### 3.2 详细使用记录

**接口地址**: `GET /api/ai/usage/records`

**功能**: 获取详细的AI使用记录列表

**请求参数**:
```
?page=1                // 页码
&limit=50              // 每页数量
&modelId=model_001     // 可选: 筛选模型
&taskType=creative     // 可选: 筛选任务类型
&novelId=novel_123     // 可选: 筛选小说项目
&startDate=2024-01-01  // 可选: 开始日期
&endDate=2024-01-31    // 可选: 结束日期
&success=true          // 可选: 筛选成功/失败记录
&sortBy=createdAt      // 可选: 排序字段
&sortOrder=desc        // 可选: 排序方向
```

**响应格式**:
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "id": "usage_001",
        "createdAt": "2024-01-15T10:30:00Z",
        "taskType": "creative",
        "modelUsed": {
          "id": "model_001",
          "name": "gpt-4",
          "displayName": "GPT-4"
        },
        "usage": {
          "promptTokens": 150,
          "completionTokens": 200,
          "totalTokens": 350,
          "estimatedCost": 0.0165
        },
        "performance": {
          "duration": 3240,
          "success": true
        },
        "context": {
          "novelTitle": "我的小说",
          "conversationTitle": "角色设定讨论"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 25,
      "totalRecords": 1250,
      "hasMore": true
    },
    "filters": {
      "appliedFilters": {
        "modelId": "model_001",
        "taskType": "creative"
      },
      "availableFilters": {
        "models": [...],
        "taskTypes": [...],
        "novels": [...]
      }
    },
    "summary": {
      "filteredRecords": 450,
      "totalCost": 8.75,
      "averageCost": 0.0194
    }
  }
}
```

### 3.3 成本分析报告

**接口地址**: `GET /api/ai/usage/cost-analysis`

**功能**: 获取详细的成本分析和优化建议

**请求参数**:
```
?period=month          // 分析周期
&compareWithPrevious=true // 是否与上期对比
&includeProjections=true  // 是否包含预测数据
```

**响应格式**:
```json
{
  "success": true,
  "data": {
    "costTrend": [
      {
        "date": "2024-01-01",
        "dailyCost": 1.23,
        "cumulativeCost": 1.23,
        "requestCount": 45
      }
    ],
    "modelEfficiency": [
      {
        "modelId": "model_001",
        "modelName": "gpt-4",
        "averageCostPerRequest": 0.025,
        "averageResponseTime": 3200,
        "successRate": 0.98,
        "userSatisfaction": 4.7,
        "costEfficiencyScore": 8.5,
        "recommendedUseCases": ["complex_analysis", "creative_writing"]
      }
    ],
    "comparison": {
      "currentPeriod": {
        "totalCost": 24.50,
        "requestCount": 1250,
        "averageCostPerRequest": 0.0196
      },
      "previousPeriod": {
        "totalCost": 18.30,
        "requestCount": 980,
        "averageCostPerRequest": 0.0187
      },
      "growth": {
        "costGrowth": 0.339,
        "requestGrowth": 0.276,
        "efficiencyChange": -0.048
      }
    },
    "projections": {
      "monthlyProjection": 49.0,
      "budgetAdherence": "on_track", // on_track | over_budget | under_budget
      "recommendedBudgetAdjustment": null
    },
    "recommendations": [
      {
        "type": "model_optimization",
        "priority": "high",
        "title": "考虑在简单任务中使用GPT-3.5",
        "description": "对于日常对话和简单分析任务，使用GPT-3.5可以节省60%的成本",
        "potentialSaving": 8.40,
        "implementationDifficulty": "easy"
      }
    ],
    "insights": {
      "mostCostlyTaskType": "creative",
      "mostEfficientModel": "gpt-3.5-turbo",
      "peakUsageHours": ["14:00-16:00", "20:00-22:00"],
      "unusedBudgetPercentage": 0.51
    }
  }
}
```

---

## 4. 模型评估API

### 4.1 提交模型评价

**接口地址**: `POST /api/ai/models/{modelId}/rating`

**功能**: 提交对特定模型在特定任务上的评价

**请求格式**:
```json
{
  "taskType": "creative",
  "rating": 4.5,           // 1-5分评价
  "usageRecordId": "usage_001", // 关联的使用记录
  "feedback": {
    "quality": 5,          // 输出质量评分
    "speed": 4,            // 响应速度评分
    "costValue": 3,        // 性价比评分
    "accuracy": 5          // 准确性评分
  },
  "comments": "输出质量很高，但成本较高"
}
```

**响应格式**:
```json
{
  "success": true,
  "data": {
    "message": "评价已提交",
    "ratingId": "rating_001",
    "modelStats": {
      "averageRating": 4.6,
      "ratingCount": 127,
      "yourRatings": 3
    }
  }
}
```

### 4.2 获取模型评估统计

**接口地址**: `GET /api/ai/models/{modelId}/evaluation`

**功能**: 获取模型的评估统计数据

**响应格式**:
```json
{
  "success": true,
  "data": {
    "modelInfo": {
      "id": "model_001",
      "name": "gpt-4",
      "displayName": "GPT-4"
    },
    "overallRating": {
      "averageRating": 4.6,
      "ratingCount": 127,
      "distribution": {
        "5": 65,
        "4": 45,
        "3": 12,
        "2": 3,
        "1": 2
      }
    },
    "taskTypeRatings": {
      "creative": {"rating": 4.8, "count": 67},
      "analysis": {"rating": 4.5, "count": 35},
      "chat": {"rating": 4.3, "count": 25}
    },
    "performanceMetrics": {
      "averageResponseTime": 3200,
      "successRate": 0.982,
      "costEfficiency": 7.8
    },
    "userComments": [
      {
        "rating": 5,
        "comment": "创意输出非常好",
        "taskType": "creative",
        "createdAt": "2024-01-15T10:00:00Z"
      }
    ]
  }
}
```

---

## 5. 预算管理API

### 5.1 预算状态检查

**接口地址**: `GET /api/ai/budget/status`

**功能**: 检查当前预算使用状态和警告

**响应格式**:
```json
{
  "success": true,
  "data": {
    "monthlyBudget": {
      "limit": 50.0,
      "used": 24.50,
      "remaining": 25.50,
      "usageRate": 0.49,
      "status": "normal", // normal | warning | exceeded
      "daysRemaining": 15,
      "dailyAverageUsage": 1.63,
      "projectedMonthlyUsage": 49.0
    },
    "dailyBudget": {
      "limit": 2.0,
      "used": 1.2,
      "remaining": 0.8,
      "usageRate": 0.6,
      "status": "normal"
    },
    "alerts": [
      {
        "type": "approaching_limit",
        "severity": "warning",
        "message": "您已使用本月预算的80%",
        "threshold": 0.8,
        "currentRate": 0.82,
        "createdAt": "2024-01-15T09:00:00Z",
        "acknowledged": false
      }
    ],
    "recommendations": [
      {
        "type": "budget_optimization",
        "title": "优化模型选择可节省20%成本",
        "description": "在chat任务中使用GPT-3.5替代GPT-4",
        "potentialSaving": 10.0
      }
    ]
  }
}
```

### 5.2 确认预算警告

**接口地址**: `POST /api/ai/budget/alerts/{alertId}/acknowledge`

**功能**: 确认已查看预算警告

**响应格式**:
```json
{
  "success": true,
  "data": {
    "message": "警告已确认",
    "acknowledgedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

## 6. 统计报表API

### 6.1 导出使用报告

**接口地址**: `GET /api/ai/reports/export`

**功能**: 导出详细使用报告

**请求参数**:
```
?format=csv            // 导出格式: csv|json|pdf
&period=month          // 报告周期
&includeDetails=true   // 是否包含详细记录
&novelId=novel_123     // 可选: 特定项目
```

**响应**: 文件下载或JSON数据

### 6.2 获取团队统计 (管理员)

**接口地址**: `GET /api/ai/admin/team-statistics`

**功能**: 获取团队整体AI使用统计 (需要管理员权限)

**响应格式**:
```json
{
  "success": true,
  "data": {
    "teamOverview": {
      "totalUsers": 150,
      "activeUsers": 89,
      "totalRequests": 15000,
      "totalCost": 450.0,
      "averageCostPerUser": 5.06
    },
    "topUsers": [
      {
        "userId": "user_001",
        "username": "author1",
        "requests": 1250,
        "cost": 24.50,
        "efficiency": 8.5
      }
    ],
    "modelUsageDistribution": {
      "gpt-4": 0.35,
      "gpt-3.5-turbo": 0.45,
      "claude-3-sonnet": 0.20
    },
    "costTrends": [
      {
        "month": "2024-01",
        "totalCost": 450.0,
        "userCount": 89,
        "averageCostPerUser": 5.06
      }
    ]
  }
}
```

---

## 7. 错误处理

### 7.1 标准错误格式

所有API错误响应都遵循以下格式:

```json
{
  "success": false,
  "error": {
    "code": "BUDGET_EXCEEDED",
    "message": "本月预算已超出限制",
    "details": {
      "currentUsage": 52.30,
      "budgetLimit": 50.0,
      "overage": 2.30
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

### 7.2 常见错误代码

| 错误代码 | HTTP状态码 | 描述 |
|---------|-----------|------|
| `INVALID_MODEL_ID` | 400 | 指定的模型ID无效 |
| `MODEL_UNAVAILABLE` | 503 | 模型当前不可用 |
| `BUDGET_EXCEEDED` | 402 | 预算超出限制 |
| `INSUFFICIENT_PERMISSIONS` | 403 | 权限不足 |
| `RATE_LIMIT_EXCEEDED` | 429 | 请求频率超出限制 |
| `TOKEN_LIMIT_EXCEEDED` | 400 | Token数量超出模型限制 |
| `AI_SERVICE_ERROR` | 502 | AI服务错误 |
| `INVALID_TASK_TYPE` | 400 | 无效的任务类型 |

---

## 8. 认证和权限

### 8.1 API认证

所有API请求都需要在Header中包含认证信息:

```http
Authorization: Bearer <session_token>
Content-Type: application/json
```

### 8.2 权限级别

- **用户**: 访问自己的使用数据和偏好设置
- **管理员**: 访问团队统计和全局配置
- **系统**: 内部API调用和数据同步

---

## 9. 使用示例

### 9.1 智能模型选择流程

```javascript
// 1. 获取推荐模型
const recommendation = await fetch('/api/ai/models/recommend', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + token },
  body: JSON.stringify({
    taskType: 'creative',
    contextLength: 2000,
    budgetConstraint: 0.05
  })
});

// 2. 使用推荐模型进行对话
const chatResponse = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + token },
  body: JSON.stringify({
    modelId: recommendation.data.recommended.modelId,
    message: '帮我创作一个角色',
    type: 'creative'
  })
});

// 3. 检查预算状态
const budgetStatus = await fetch('/api/ai/budget/status', {
  headers: { 'Authorization': 'Bearer ' + token }
});
```

### 9.2 使用统计查询

```javascript
// 获取本月使用概览
const overview = await fetch('/api/ai/usage/overview?period=month');

// 获取特定模型的详细记录
const records = await fetch('/api/ai/usage/records?modelId=model_001&limit=20');

// 获取成本分析报告
const analysis = await fetch('/api/ai/usage/cost-analysis?period=month&compareWithPrevious=true');
```

这套API设计提供了完整的AI模型管理和使用统计功能，支持智能推荐、实时监控、成本控制和深度分析，为用户提供透明、可控的AI使用体验。