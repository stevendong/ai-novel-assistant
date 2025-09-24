# 积分赠送扣除体系设计方案

## 系统概述

基于现有AI消耗统计系统，设计一套完整的积分赠送扣除体系，替代直接的金额预算控制，通过积分机制管理用户AI服务使用权限。

## 核心设计理念

### 1. 积分货币化
- 积分作为虚拟货币，1积分 = 1分钱等值
- 支持积分购买、赠送、扣除、过期等操作
- 建立积分与token消耗的转换关系

### 2. 多元化获取方式
- **充值获取**：用户直接购买积分
- **系统赠送**：注册奖励、签到奖励、活动奖励
- **任务奖励**：完成特定任务获得积分
- **推荐奖励**：邀请新用户注册获得奖励

### 3. 灵活扣除机制
- **实时扣除**：AI调用时即时扣除对应积分
- **批量扣除**：定时任务批量处理小额扣除
- **优先级扣除**：按积分类型优先级扣除（赠送积分优先）

## 数据库设计

### 1. 用户积分账户表 (UserCreditAccount)

```sql
CREATE TABLE UserCreditAccount (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    totalCredits INTEGER NOT NULL DEFAULT 0,           -- 总积分余额
    paidCredits INTEGER NOT NULL DEFAULT 0,            -- 充值积分余额
    giftCredits INTEGER NOT NULL DEFAULT 0,            -- 赠送积分余额
    frozenCredits INTEGER NOT NULL DEFAULT 0,          -- 冻结积分
    lifetimeEarned INTEGER NOT NULL DEFAULT 0,         -- 累计获得积分
    lifetimeSpent INTEGER NOT NULL DEFAULT 0,          -- 累计消费积分
    lastUpdated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);
```

### 2. 积分交易记录表 (CreditTransaction)

```sql
CREATE TABLE CreditTransaction (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    transactionType TEXT NOT NULL,                     -- EARN, SPEND, TRANSFER, FREEZE, UNFREEZE
    creditType TEXT NOT NULL,                          -- PAID, GIFT, REWARD, BONUS
    amount INTEGER NOT NULL,                           -- 积分数量（正数为获得，负数为扣除）
    balanceAfter INTEGER NOT NULL,                     -- 交易后余额
    sourceType TEXT NOT NULL,                          -- PURCHASE, GIFT, TASK, AI_USAGE, REFERRAL, ADMIN
    sourceId TEXT,                                     -- 来源ID（订单号、任务ID、AI记录ID等）
    description TEXT,                                  -- 交易描述
    metadata JSON,                                     -- 扩展信息
    expiresAt DATETIME,                               -- 积分过期时间
    status TEXT NOT NULL DEFAULT 'COMPLETED',         -- PENDING, COMPLETED, FAILED, CANCELLED
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);
```

### 3. 积分赠送记录表 (CreditGift)

```sql
CREATE TABLE CreditGift (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fromUserId INTEGER,                               -- 赠送者ID（系统赠送为NULL）
    toUserId INTEGER NOT NULL,                        -- 接收者ID
    amount INTEGER NOT NULL,                          -- 赠送积分数量
    giftType TEXT NOT NULL,                           -- WELCOME, DAILY_CHECKIN, REFERRAL, ADMIN, USER_GIFT
    message TEXT,                                     -- 赠送留言
    status TEXT NOT NULL DEFAULT 'PENDING',           -- PENDING, COMPLETED, CANCELLED
    expiresAt DATETIME,                              -- 积分过期时间
    claimedAt DATETIME,                              -- 领取时间
    transactionId INTEGER,                           -- 关联的交易记录ID
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fromUserId) REFERENCES User(id) ON DELETE SET NULL,
    FOREIGN KEY (toUserId) REFERENCES User(id) ON DELETE CASCADE,
    FOREIGN KEY (transactionId) REFERENCES CreditTransaction(id)
);
```

### 4. 积分配置表 (CreditConfig)

```sql
CREATE TABLE CreditConfig (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    configKey TEXT NOT NULL UNIQUE,                  -- 配置键名
    configValue TEXT NOT NULL,                       -- 配置值（JSON格式）
    description TEXT,                                -- 配置描述
    isActive BOOLEAN NOT NULL DEFAULT TRUE,          -- 是否激活
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 5. 扩展现有AIUsageRecord表

```sql
-- 在现有AIUsageRecord表中添加积分相关字段
ALTER TABLE AIUsageRecord ADD COLUMN creditsUsed INTEGER DEFAULT 0;
ALTER TABLE AIUsageRecord ADD COLUMN creditTransactionId INTEGER;
ALTER TABLE AIUsageRecord ADD CONSTRAINT fk_credit_transaction
    FOREIGN KEY (creditTransactionId) REFERENCES CreditTransaction(id);
```

## 积分系统核心功能

### 1. 积分获取方式

#### A. 注册奖励
```javascript
const WELCOME_BONUS = {
    amount: 1000,           // 10元等值积分
    type: 'GIFT',
    expiryDays: 30,
    description: '新用户注册奖励'
};
```

#### B. 每日签到
```javascript
const DAILY_CHECKIN = {
    baseAmount: 10,         // 基础签到积分
    streakBonus: {          // 连续签到奖励
        7: 50,              // 连续7天额外50积分
        15: 100,            // 连续15天额外100积分
        30: 300             // 连续30天额外300积分
    },
    expiryDays: 90
};
```

#### C. 推荐奖励
```javascript
const REFERRAL_REWARD = {
    referrer: 500,          // 推荐者获得5元积分
    referee: 300,           // 被推荐者获得3元积分
    conditions: {
        minimumUsage: 100,  // 被推荐者需消费100积分后推荐者才能获得奖励
        timeLimit: 30       // 30天内有效
    }
};
```

### 2. 积分扣除机制

#### A. AI调用实时扣除
```javascript
const AI_COST_MAPPING = {
    'gpt-4o': {
        inputCostPer1k: 0.5,    // 每1000输入token消耗0.5积分
        outputCostPer1k: 1.5    // 每1000输出token消耗1.5积分
    },
    'gpt-4o-mini': {
        inputCostPer1k: 0.15,
        outputCostPer1k: 0.6
    },
    'claude-3.5-sonnet': {
        inputCostPer1k: 0.3,
        outputCostPer1k: 1.5
    }
};
```

#### B. 扣除优先级
1. 赠送积分（过期时间近的优先）
2. 奖励积分
3. 充值积分

### 3. 积分管理规则

#### A. 过期策略
```javascript
const EXPIRY_RULES = {
    GIFT: 90,               // 赠送积分90天过期
    REWARD: 180,            // 奖励积分180天过期
    PAID: null,             // 充值积分永不过期
    BONUS: 30               // 活动积分30天过期
};
```

#### B. 冻结机制
```javascript
const FREEZE_SCENARIOS = {
    SUSPICIOUS_ACTIVITY: 'system',      // 可疑活动
    DISPUTE_RESOLUTION: 'manual',       // 争议处理
    MAINTENANCE: 'system'               // 系统维护
};
```

## API接口设计

### 1. 积分查询接口

```javascript
// GET /api/credits/balance
{
    "userId": 123,
    "totalCredits": 1500,
    "breakdown": {
        "paidCredits": 1000,
        "giftCredits": 300,
        "rewardCredits": 200
    },
    "frozenCredits": 0,
    "expiringCredits": [
        {
            "amount": 100,
            "expiresAt": "2024-12-31T23:59:59Z",
            "type": "GIFT"
        }
    ]
}
```

### 2. 积分历史记录

```javascript
// GET /api/credits/transactions?page=1&limit=20&type=SPEND
{
    "transactions": [
        {
            "id": 1001,
            "type": "SPEND",
            "amount": -15,
            "description": "AI对话生成 - GPT-4o",
            "balanceAfter": 1485,
            "createdAt": "2024-01-15T10:30:00Z",
            "sourceType": "AI_USAGE",
            "sourceId": "ai_usage_1234"
        }
    ],
    "pagination": {
        "currentPage": 1,
        "totalPages": 5,
        "totalRecords": 100
    }
}
```

### 3. 积分赠送接口

```javascript
// POST /api/credits/gift
{
    "toUserId": 456,
    "amount": 100,
    "message": "感谢你的帮助！",
    "giftType": "USER_GIFT"
}
```

### 4. 每日签到接口

```javascript
// POST /api/credits/checkin
{
    "earned": 10,
    "streakDays": 7,
    "bonusEarned": 50,
    "totalEarned": 60,
    "nextStreakBonus": {
        "days": 15,
        "bonus": 100
    }
}
```

## 前端界面设计

### 1. 积分仪表板组件
```vue
<template>
  <div class="credit-dashboard">
    <div class="credit-balance-card">
      <h3>积分余额</h3>
      <div class="balance-display">
        <span class="total-credits">{{ totalCredits }}</span>
        <span class="credits-unit">积分</span>
      </div>
      <div class="balance-breakdown">
        <div class="credit-type">
          <span>充值积分</span>
          <span>{{ paidCredits }}</span>
        </div>
        <div class="credit-type">
          <span>赠送积分</span>
          <span>{{ giftCredits }}</span>
        </div>
      </div>
    </div>

    <div class="quick-actions">
      <button @click="showRechargeModal">充值积分</button>
      <button @click="showGiftModal">赠送积分</button>
      <button @click="dailyCheckin">每日签到</button>
    </div>

    <div class="expiring-credits" v-if="expiringCredits.length">
      <h4>即将过期积分</h4>
      <div v-for="credit in expiringCredits" :key="credit.id">
        <span>{{ credit.amount }}积分</span>
        <span>{{ formatDate(credit.expiresAt) }}过期</span>
      </div>
    </div>
  </div>
</template>
```

### 2. 积分历史记录组件
```vue
<template>
  <div class="credit-history">
    <div class="filter-bar">
      <select v-model="filterType">
        <option value="">全部类型</option>
        <option value="EARN">获得</option>
        <option value="SPEND">消费</option>
      </select>
      <date-range-picker v-model="dateRange" />
    </div>

    <div class="transaction-list">
      <div v-for="transaction in transactions" :key="transaction.id"
           class="transaction-item">
        <div class="transaction-info">
          <span class="description">{{ transaction.description }}</span>
          <span class="date">{{ formatDate(transaction.createdAt) }}</span>
        </div>
        <div class="transaction-amount"
             :class="{ 'positive': transaction.amount > 0, 'negative': transaction.amount < 0 }">
          {{ transaction.amount > 0 ? '+' : '' }}{{ transaction.amount }}
        </div>
      </div>
    </div>
  </div>
</template>
```

## 业务流程设计

### 1. 用户注册流程
```
注册成功 → 创建积分账户 → 发放注册奖励 → 记录赠送交易 → 发送欢迎通知
```

### 2. AI调用扣费流程
```
AI调用开始 → 检查积分余额 → 预扣积分 → AI服务调用 → 计算实际消费 → 调整积分余额 → 记录交易
```

### 3. 积分赠送流程
```
发起赠送 → 验证赠送者余额 → 创建赠送记录 → 扣除赠送者积分 → 增加接收者积分 → 通知双方
```

### 4. 积分过期处理
```
定时任务扫描 → 识别过期积分 → 扣除过期积分 → 记录过期交易 → 通知用户
```

## 安全与风控

### 1. 反欺诈机制
- 限制单日赠送积分数量
- 监控异常交易模式
- 实名认证用户提升限额

### 2. 数据完整性
- 积分交易原子性保证
- 定期余额校验
- 异常数据报警

### 3. 审计追踪
- 完整的交易日志
- 管理员操作记录
- 异常操作监控

## 运营策略

### 1. 积分定价策略
- 充值优惠：充值越多单价越低
- 限时促销：节假日积分赠送活动
- 会员特权：VIP用户积分兑换比例优化

### 2. 用户激励机制
- 成就系统：完成特定任务获得积分奖励
- 等级制度：根据消费累计解锁更多权益
- 社交分享：分享作品获得积分奖励

### 3. 生态闭环
- 积分商城：积分兑换实物或虚拟商品
- 创作激励：优质内容获得平台积分奖励
- 社区贡献：帮助他人获得积分奖励

## 技术实现要点

### 1. 高并发处理
- Redis分布式锁防止积分重复扣除
- 异步任务处理积分发放
- 数据库连接池优化

### 2. 性能优化
- 积分余额缓存
- 批量处理小额交易
- 定时汇总统计数据

### 3. 监控告警
- 积分池总量监控
- 异常交易实时告警
- 系统性能指标监控

此积分体系设计提供了完整的积分获取、消费、管理功能，支持多种业务场景，具备良好的扩展性和安全性。