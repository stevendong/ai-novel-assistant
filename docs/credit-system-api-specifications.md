# 积分系统API接口规范

## 基础说明

### 接口前缀
所有积分相关接口使用 `/api/credits` 作为基础路径。

### 认证方式
- 所有接口都需要用户认证（JWT Token或Clerk认证）
- 管理员接口需要额外的权限验证

### 通用响应格式
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}
```

### 通用错误码
- `INSUFFICIENT_CREDITS`: 积分余额不足
- `INVALID_AMOUNT`: 无效的积分数量
- `USER_NOT_FOUND`: 用户不存在
- `TRANSACTION_FAILED`: 交易失败
- `RATE_LIMITED`: 操作频率超限
- `VALIDATION_ERROR`: 参数验证错误

## 1. 积分账户管理

### 1.1 获取用户积分余额
```http
GET /api/credits/balance
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "userId": 123,
    "totalCredits": 1500,
    "breakdown": {
      "paidCredits": 1000,
      "giftCredits": 300,
      "rewardCredits": 200
    },
    "frozenCredits": 0,
    "lifetimeStats": {
      "totalEarned": 5000,
      "totalSpent": 3500
    },
    "expiringCredits": [
      {
        "amount": 100,
        "expiresAt": "2024-12-31T23:59:59Z",
        "type": "GIFT",
        "daysUntilExpiry": 15
      }
    ],
    "checkinInfo": {
      "lastCheckinAt": "2024-01-14T08:00:00Z",
      "streakDays": 7,
      "canCheckinToday": false,
      "nextStreakBonus": {
        "streakTarget": 15,
        "bonusAmount": 100
      }
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 1.2 获取积分概览统计
```http
GET /api/credits/overview
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "todayStats": {
      "earned": 50,
      "spent": 120,
      "transactions": 8
    },
    "monthlyStats": {
      "earned": 1200,
      "spent": 800,
      "transactions": 45
    },
    "usageByCategory": [
      {
        "category": "AI_USAGE",
        "amount": 350,
        "percentage": 70
      },
      {
        "category": "GIFT_GIVEN",
        "amount": 150,
        "percentage": 30
      }
    ],
    "topAiModels": [
      {
        "model": "gpt-4o",
        "creditsUsed": 250,
        "usageCount": 15
      }
    ]
  }
}
```

## 2. 积分交易记录

### 2.1 获取交易历史
```http
GET /api/credits/transactions
```

**查询参数:**
- `page`: 页码，默认1
- `limit`: 每页数量，默认20，最大100
- `type`: 交易类型筛选 (EARN|SPEND|TRANSFER)
- `sourceType`: 来源类型筛选 (AI_USAGE|GIFT|CHECKIN|PURCHASE等)
- `startDate`: 开始日期
- `endDate`: 结束日期

**响应示例:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": 1001,
        "type": "SPEND",
        "creditType": "PAID",
        "amount": -15,
        "balanceBefore": 1500,
        "balanceAfter": 1485,
        "description": "AI对话生成 - GPT-4o",
        "sourceType": "AI_USAGE",
        "sourceId": "ai_usage_1234",
        "metadata": {
          "model": "gpt-4o",
          "inputTokens": 150,
          "outputTokens": 300,
          "costBreakdown": {
            "inputCost": 8,
            "outputCost": 7
          }
        },
        "createdAt": "2024-01-15T10:30:00Z"
      },
      {
        "id": 1000,
        "type": "EARN",
        "creditType": "GIFT",
        "amount": 50,
        "balanceBefore": 1450,
        "balanceAfter": 1500,
        "description": "每日签到奖励",
        "sourceType": "CHECKIN",
        "metadata": {
          "streakDays": 7,
          "bonusEarned": 40
        },
        "expiresAt": "2024-04-15T23:59:59Z",
        "createdAt": "2024-01-15T08:00:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalRecords": 100,
      "hasNext": true,
      "hasPrev": false
    },
    "summary": {
      "totalEarned": 300,
      "totalSpent": 450,
      "netChange": -150
    }
  }
}
```

## 3. 积分赠送功能

### 3.1 赠送积分给其他用户
```http
POST /api/credits/gift
```

**请求体:**
```json
{
  "toUserId": 456,
  "amount": 100,
  "message": "感谢你的帮助！",
  "giftType": "USER_GIFT"
}
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "giftId": 789,
    "fromUser": {
      "id": 123,
      "username": "alice"
    },
    "toUser": {
      "id": 456,
      "username": "bob"
    },
    "amount": 100,
    "message": "感谢你的帮助！",
    "status": "COMPLETED",
    "transactionId": 1002,
    "senderBalanceAfter": 1385,
    "createdAt": "2024-01-15T11:00:00Z"
  }
}
```

### 3.2 生成积分礼品码
```http
POST /api/credits/gift/generate-code
```

**请求体:**
```json
{
  "amount": 200,
  "message": "新年快乐！",
  "expiryHours": 168,
  "maxClaims": 1
}
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "giftCode": "GIFT2024ABC123",
    "amount": 200,
    "message": "新年快乐！",
    "expiresAt": "2024-01-22T11:00:00Z",
    "maxClaims": 1,
    "claimsUsed": 0,
    "shareUrl": "https://app.example.com/gift/GIFT2024ABC123"
  }
}
```

### 3.3 领取礼品码
```http
POST /api/credits/gift/claim
```

**请求体:**
```json
{
  "giftCode": "GIFT2024ABC123"
}
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "amount": 200,
    "message": "新年快乐！",
    "fromUser": {
      "username": "alice"
    },
    "balanceAfter": 1685,
    "transactionId": 1003,
    "claimedAt": "2024-01-15T11:30:00Z"
  }
}
```

## 4. 每日签到功能

### 4.1 执行每日签到
```http
POST /api/credits/checkin
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "baseReward": 10,
    "streakBonus": 50,
    "totalEarned": 60,
    "newBalance": 1545,
    "streakInfo": {
      "currentStreak": 8,
      "previousStreak": 7,
      "nextMilestone": {
        "streakTarget": 15,
        "bonusAmount": 100,
        "daysRemaining": 7
      }
    },
    "transactionId": 1004,
    "canCheckinAgainAt": "2024-01-16T00:00:00Z"
  }
}
```

### 4.2 获取签到状态
```http
GET /api/credits/checkin/status
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "canCheckinToday": true,
    "lastCheckinAt": "2024-01-14T08:00:00Z",
    "currentStreak": 7,
    "todayReward": {
      "baseAmount": 10,
      "potentialBonus": 50,
      "totalPotential": 60
    },
    "streakMilestones": [
      {
        "days": 15,
        "bonus": 100,
        "achieved": false
      },
      {
        "days": 30,
        "bonus": 300,
        "achieved": false
      }
    ]
  }
}
```

## 5. 推荐奖励系统

### 5.1 生成推荐码
```http
POST /api/credits/referral/generate
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "referralCode": "REF_ALICE_2024",
    "shareUrl": "https://app.example.com/register?ref=REF_ALICE_2024",
    "rewards": {
      "referrerReward": 500,
      "refereeReward": 300
    },
    "terms": {
      "qualificationThreshold": 100,
      "timeLimit": 30
    }
  }
}
```

### 5.2 获取推荐状态
```http
GET /api/credits/referral/status
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "referralCode": "REF_ALICE_2024",
    "totalReferrals": 5,
    "qualifiedReferrals": 3,
    "pendingReferrals": 2,
    "totalRewardsEarned": 1500,
    "referrals": [
      {
        "refereeUsername": "bob",
        "registeredAt": "2024-01-10T10:00:00Z",
        "status": "REWARDED",
        "qualifiedAt": "2024-01-12T14:30:00Z",
        "rewardEarned": 500
      }
    ]
  }
}
```

## 6. 积分购买功能

### 6.1 获取积分套餐
```http
GET /api/credits/packages
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "packages": [
      {
        "id": "basic",
        "name": "基础套餐",
        "credits": 1000,
        "price": 10.00,
        "currency": "USD",
        "bonus": 0,
        "popular": false
      },
      {
        "id": "standard",
        "name": "标准套餐",
        "credits": 3000,
        "price": 25.00,
        "currency": "USD",
        "bonus": 300,
        "popular": true,
        "discount": "10% 额外积分"
      },
      {
        "id": "premium",
        "name": "高级套餐",
        "credits": 10000,
        "price": 80.00,
        "currency": "USD",
        "bonus": 2000,
        "popular": false,
        "discount": "20% 额外积分"
      }
    ],
    "promotions": [
      {
        "type": "FIRST_PURCHASE",
        "discount": 20,
        "description": "首次购买享受8折优惠"
      }
    ]
  }
}
```

### 6.2 创建购买订单
```http
POST /api/credits/purchase
```

**请求体:**
```json
{
  "packageId": "standard",
  "paymentMethod": "stripe",
  "promoCode": "FIRST20"
}
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "orderId": "order_abc123",
    "packageInfo": {
      "name": "标准套餐",
      "credits": 3000,
      "bonus": 300,
      "totalCredits": 3300
    },
    "pricing": {
      "originalPrice": 25.00,
      "discount": 5.00,
      "finalPrice": 20.00,
      "currency": "USD"
    },
    "paymentInfo": {
      "method": "stripe",
      "clientSecret": "pi_1234567890_secret_xyz",
      "paymentIntentId": "pi_1234567890"
    },
    "expiresAt": "2024-01-15T12:00:00Z"
  }
}
```

## 7. 管理员接口

### 7.1 管理员赠送积分
```http
POST /api/credits/admin/grant
```

**请求体:**
```json
{
  "userIds": [123, 456, 789],
  "amount": 500,
  "reason": "活动奖励",
  "expiryDays": 90,
  "notifyUsers": true
}
```

**认证要求:** 需要管理员权限

### 7.2 批量积分操作
```http
POST /api/credits/admin/batch-operation
```

**请求体:**
```json
{
  "operation": "EXPIRE_CREDITS",
  "filters": {
    "creditType": "GIFT",
    "expiryBefore": "2024-01-01T00:00:00Z"
  },
  "dryRun": true
}
```

### 7.3 积分统计报告
```http
GET /api/credits/admin/statistics
```

**查询参数:**
- `period`: 统计周期 (daily|weekly|monthly)
- `startDate`: 开始日期
- `endDate`: 结束日期

**响应示例:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalCreditsIssued": 1000000,
      "totalCreditsUsed": 750000,
      "totalActiveUsers": 2500,
      "averageCreditsPerUser": 300
    },
    "trends": [
      {
        "date": "2024-01-15",
        "creditsIssued": 15000,
        "creditsUsed": 12000,
        "activeUsers": 150,
        "newUsers": 25
      }
    ],
    "topCategories": [
      {
        "category": "AI_USAGE",
        "creditsUsed": 450000,
        "percentage": 60
      }
    ]
  }
}
```

## 8. 实时通知接口

### 8.1 积分变动通知
```http
GET /api/credits/notifications/stream
```

**SSE (Server-Sent Events) 格式:**
```
event: credit_change
data: {"type": "EARN", "amount": 50, "newBalance": 1550, "description": "每日签到奖励"}

event: low_balance
data: {"currentBalance": 50, "threshold": 100, "message": "您的积分余额不足，建议及时充值"}

event: credit_expiry
data: {"expiringAmount": 200, "expiryDate": "2024-01-20", "daysLeft": 5}
```

## 9. 错误处理示例

### 积分不足错误
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_CREDITS",
    "message": "积分余额不足",
    "details": {
      "required": 100,
      "available": 50,
      "shortfall": 50
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 操作频率限制
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "操作过于频繁，请稍后再试",
    "details": {
      "retryAfter": 60,
      "limit": "每分钟最多5次操作"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## 10. 安全考虑

### 10.1 身份验证
- 所有接口都需要有效的JWT token
- 敏感操作需要二次验证

### 10.2 参数验证
- 积分数量必须为正整数
- 金额限制检查
- 用户权限验证

### 10.3 防刷机制
- IP限流
- 用户操作频率限制
- 异常行为检测

### 10.4 数据完整性
- 交易原子性保证
- 积分余额一致性检查
- 审计日志记录