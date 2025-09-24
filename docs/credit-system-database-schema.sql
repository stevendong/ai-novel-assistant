-- 积分系统数据库架构扩展
-- 基于现有schema.prisma增加积分管理相关表

-- 1. 用户积分账户表
CREATE TABLE UserCreditAccount (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL UNIQUE,
    totalCredits INTEGER NOT NULL DEFAULT 0,           -- 总积分余额
    paidCredits INTEGER NOT NULL DEFAULT 0,            -- 充值积分余额
    giftCredits INTEGER NOT NULL DEFAULT 0,            -- 赠送积分余额
    rewardCredits INTEGER NOT NULL DEFAULT 0,          -- 奖励积分余额
    frozenCredits INTEGER NOT NULL DEFAULT 0,          -- 冻结积分
    lifetimeEarned INTEGER NOT NULL DEFAULT 0,         -- 累计获得积分
    lifetimeSpent INTEGER NOT NULL DEFAULT 0,          -- 累计消费积分
    lastCheckinAt DATETIME,                            -- 最后签到时间
    checkinStreak INTEGER NOT NULL DEFAULT 0,          -- 连续签到天数
    lastUpdated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
    CONSTRAINT chk_credits_positive CHECK (
        totalCredits >= 0 AND
        paidCredits >= 0 AND
        giftCredits >= 0 AND
        rewardCredits >= 0 AND
        frozenCredits >= 0
    ),
    CONSTRAINT chk_credits_balance CHECK (
        totalCredits = paidCredits + giftCredits + rewardCredits
    )
);

-- 2. 积分交易记录表
CREATE TABLE CreditTransaction (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    transactionType TEXT NOT NULL CHECK (transactionType IN ('EARN', 'SPEND', 'TRANSFER', 'FREEZE', 'UNFREEZE', 'EXPIRE')),
    creditType TEXT NOT NULL CHECK (creditType IN ('PAID', 'GIFT', 'REWARD', 'BONUS')),
    amount INTEGER NOT NULL,                           -- 积分数量（正数为获得，负数为扣除）
    balanceBefore INTEGER NOT NULL,                    -- 交易前余额
    balanceAfter INTEGER NOT NULL,                     -- 交易后余额
    sourceType TEXT NOT NULL CHECK (sourceType IN ('PURCHASE', 'GIFT', 'TASK', 'AI_USAGE', 'REFERRAL', 'ADMIN', 'CHECKIN', 'WELCOME', 'EXPIRE')),
    sourceId TEXT,                                     -- 来源ID（订单号、任务ID、AI记录ID等）
    relatedUserId INTEGER,                             -- 关联用户ID（用于转账、赠送等）
    description TEXT NOT NULL,                         -- 交易描述
    metadata JSON,                                     -- 扩展信息（如AI模型信息、token数量等）
    expiresAt DATETIME,                               -- 积分过期时间
    status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
    FOREIGN KEY (relatedUserId) REFERENCES User(id) ON DELETE SET NULL
);

-- 3. 积分赠送记录表
CREATE TABLE CreditGift (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fromUserId INTEGER,                               -- 赠送者ID（系统赠送为NULL）
    toUserId INTEGER NOT NULL,                        -- 接收者ID
    amount INTEGER NOT NULL CHECK (amount > 0),       -- 赠送积分数量
    giftType TEXT NOT NULL CHECK (giftType IN ('WELCOME', 'DAILY_CHECKIN', 'REFERRAL', 'ADMIN', 'USER_GIFT', 'TASK_REWARD', 'ACTIVITY')),
    giftCode TEXT UNIQUE,                            -- 礼品码（可选）
    message TEXT,                                     -- 赠送留言
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED', 'EXPIRED')),
    expiresAt DATETIME,                              -- 礼品过期时间
    claimedAt DATETIME,                              -- 领取时间
    transactionId INTEGER,                           -- 关联的交易记录ID
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fromUserId) REFERENCES User(id) ON DELETE SET NULL,
    FOREIGN KEY (toUserId) REFERENCES User(id) ON DELETE CASCADE,
    FOREIGN KEY (transactionId) REFERENCES CreditTransaction(id)
);

-- 4. 积分配置表
CREATE TABLE CreditConfig (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    configKey TEXT NOT NULL UNIQUE,                  -- 配置键名
    configValue TEXT NOT NULL,                       -- 配置值（JSON格式）
    configType TEXT NOT NULL DEFAULT 'GENERAL' CHECK (configType IN ('GENERAL', 'PRICING', 'REWARD', 'LIMIT')),
    description TEXT,                                -- 配置描述
    isActive BOOLEAN NOT NULL DEFAULT TRUE,          -- 是否激活
    version INTEGER NOT NULL DEFAULT 1,             -- 配置版本
    createdBy INTEGER,                               -- 创建者ID
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (createdBy) REFERENCES User(id) ON DELETE SET NULL
);

-- 5. 积分使用汇总表（用于统计和分析）
CREATE TABLE CreditUsageSummary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    summaryDate DATE NOT NULL,                       -- 汇总日期
    totalEarned INTEGER NOT NULL DEFAULT 0,          -- 当日获得积分
    totalSpent INTEGER NOT NULL DEFAULT 0,           -- 当日消费积分
    aiUsageCredits INTEGER NOT NULL DEFAULT 0,       -- AI使用消费积分
    giftGivenCredits INTEGER NOT NULL DEFAULT 0,     -- 赠送给他人积分
    giftReceivedCredits INTEGER NOT NULL DEFAULT 0,  -- 接收他人赠送积分
    checkinCredits INTEGER NOT NULL DEFAULT 0,       -- 签到获得积分
    taskRewardCredits INTEGER NOT NULL DEFAULT 0,    -- 任务奖励积分
    balanceEndOfDay INTEGER NOT NULL,                -- 日终余额
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
    UNIQUE(userId, summaryDate)
);

-- 6. 积分推荐记录表
CREATE TABLE CreditReferral (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrerId INTEGER NOT NULL,                     -- 推荐者ID
    refereeId INTEGER NOT NULL,                      -- 被推荐者ID
    referralCode TEXT,                               -- 推荐码
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'QUALIFIED', 'REWARDED', 'INVALID')),
    referrerReward INTEGER NOT NULL DEFAULT 0,       -- 推荐者奖励积分
    refereeReward INTEGER NOT NULL DEFAULT 0,        -- 被推荐者奖励积分
    qualificationMet BOOLEAN NOT NULL DEFAULT FALSE, -- 是否满足奖励条件
    qualifiedAt DATETIME,                           -- 满足条件时间
    rewardedAt DATETIME,                            -- 发放奖励时间
    referrerTransactionId INTEGER,                  -- 推荐者交易记录ID
    refereeTransactionId INTEGER,                   -- 被推荐者交易记录ID
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (referrerId) REFERENCES User(id) ON DELETE CASCADE,
    FOREIGN KEY (refereeId) REFERENCES User(id) ON DELETE CASCADE,
    FOREIGN KEY (referrerTransactionId) REFERENCES CreditTransaction(id),
    FOREIGN KEY (refereeTransactionId) REFERENCES CreditTransaction(id),
    UNIQUE(refereeId) -- 每个用户只能被推荐一次
);

-- 扩展现有AIUsageRecord表以支持积分系统
-- 注意：需要在现有schema基础上添加以下字段
/*
ALTER TABLE AIUsageRecord ADD COLUMN creditsUsed INTEGER DEFAULT 0;
ALTER TABLE AIUsageRecord ADD COLUMN creditTransactionId INTEGER;
ALTER TABLE AIUsageRecord ADD CONSTRAINT fk_credit_transaction
    FOREIGN KEY (creditTransactionId) REFERENCES CreditTransaction(id);
*/

-- 创建索引以优化查询性能
CREATE INDEX idx_user_credit_account_userid ON UserCreditAccount(userId);
CREATE INDEX idx_credit_transaction_userid ON CreditTransaction(userId);
CREATE INDEX idx_credit_transaction_created ON CreditTransaction(createdAt);
CREATE INDEX idx_credit_transaction_type ON CreditTransaction(transactionType);
CREATE INDEX idx_credit_transaction_source ON CreditTransaction(sourceType, sourceId);
CREATE INDEX idx_credit_gift_to_user ON CreditGift(toUserId);
CREATE INDEX idx_credit_gift_from_user ON CreditGift(fromUserId);
CREATE INDEX idx_credit_gift_status ON CreditGift(status);
CREATE INDEX idx_credit_gift_code ON CreditGift(giftCode);
CREATE INDEX idx_credit_config_key ON CreditConfig(configKey);
CREATE INDEX idx_credit_usage_summary_user_date ON CreditUsageSummary(userId, summaryDate);
CREATE INDEX idx_credit_referral_referrer ON CreditReferral(referrerId);
CREATE INDEX idx_credit_referral_referee ON CreditReferral(refereeId);
CREATE INDEX idx_credit_referral_code ON CreditReferral(referralCode);

-- 插入初始配置数据
INSERT INTO CreditConfig (configKey, configValue, configType, description) VALUES
-- 基础奖励配置
('welcome_bonus', '{"amount": 1000, "expiryDays": 30, "description": "新用户注册奖励"}', 'REWARD', '新用户注册奖励配置'),
('daily_checkin_base', '{"amount": 10, "expiryDays": 90}', 'REWARD', '每日签到基础奖励'),
('daily_checkin_streak', '{"7": 50, "15": 100, "30": 300}', 'REWARD', '连续签到奖励'),

-- 推荐奖励配置
('referral_reward', '{"referrer": 500, "referee": 300, "qualificationThreshold": 100, "timeLimit": 30}', 'REWARD', '推荐奖励配置'),

-- AI使用成本配置
('ai_cost_gpt4o', '{"inputCostPer1k": 0.5, "outputCostPer1k": 1.5}', 'PRICING', 'GPT-4o模型积分消费配置'),
('ai_cost_gpt4o_mini', '{"inputCostPer1k": 0.15, "outputCostPer1k": 0.6}', 'PRICING', 'GPT-4o-mini模型积分消费配置'),
('ai_cost_claude35_sonnet', '{"inputCostPer1k": 0.3, "outputCostPer1k": 1.5}', 'PRICING', 'Claude-3.5-Sonnet模型积分消费配置'),

-- 积分过期配置
('credit_expiry', '{"GIFT": 90, "REWARD": 180, "PAID": null, "BONUS": 30}', 'GENERAL', '积分过期时间配置'),

-- 限制配置
('daily_limits', '{"maxGiftAmount": 1000, "maxCheckinAmount": 200}', 'LIMIT', '每日操作限制配置'),
('transfer_limits', '{"minAmount": 1, "maxAmount": 10000, "dailyLimit": 5000}', 'LIMIT', '积分转账限制配置');

-- 创建触发器以维护数据一致性
-- 1. 积分账户余额更新触发器
CREATE TRIGGER tr_credit_transaction_update_balance
AFTER INSERT ON CreditTransaction
WHEN NEW.status = 'COMPLETED'
BEGIN
    UPDATE UserCreditAccount
    SET
        totalCredits = NEW.balanceAfter,
        paidCredits = CASE
            WHEN NEW.creditType = 'PAID' THEN
                paidCredits + NEW.amount
            ELSE paidCredits
        END,
        giftCredits = CASE
            WHEN NEW.creditType = 'GIFT' THEN
                giftCredits + NEW.amount
            ELSE giftCredits
        END,
        rewardCredits = CASE
            WHEN NEW.creditType = 'REWARD' OR NEW.creditType = 'BONUS' THEN
                rewardCredits + NEW.amount
            ELSE rewardCredits
        END,
        lifetimeEarned = CASE
            WHEN NEW.amount > 0 THEN
                lifetimeEarned + NEW.amount
            ELSE lifetimeEarned
        END,
        lifetimeSpent = CASE
            WHEN NEW.amount < 0 THEN
                lifetimeSpent + ABS(NEW.amount)
            ELSE lifetimeSpent
        END,
        lastUpdated = CURRENT_TIMESTAMP,
        updatedAt = CURRENT_TIMESTAMP
    WHERE userId = NEW.userId;
END;

-- 2. 积分赠送完成触发器
CREATE TRIGGER tr_credit_gift_completed
AFTER UPDATE ON CreditGift
WHEN NEW.status = 'COMPLETED' AND OLD.status = 'PENDING'
BEGIN
    -- 创建对应的交易记录
    INSERT INTO CreditTransaction (
        userId,
        transactionType,
        creditType,
        amount,
        balanceBefore,
        balanceAfter,
        sourceType,
        sourceId,
        relatedUserId,
        description
    )
    SELECT
        NEW.toUserId,
        'EARN',
        'GIFT',
        NEW.amount,
        totalCredits,
        totalCredits + NEW.amount,
        'GIFT',
        CAST(NEW.id AS TEXT),
        NEW.fromUserId,
        COALESCE('来自用户的赠送: ' || NEW.message, '系统赠送')
    FROM UserCreditAccount
    WHERE userId = NEW.toUserId;

    -- 更新赠送记录的交易ID
    UPDATE CreditGift
    SET
        transactionId = last_insert_rowid(),
        claimedAt = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

-- 3. 签到更新触发器
CREATE TRIGGER tr_checkin_streak_update
AFTER UPDATE ON UserCreditAccount
WHEN NEW.lastCheckinAt != OLD.lastCheckinAt
BEGIN
    UPDATE UserCreditAccount
    SET
        checkinStreak = CASE
            WHEN DATE(NEW.lastCheckinAt) = DATE(OLD.lastCheckinAt, '+1 day') THEN
                OLD.checkinStreak + 1
            ELSE 1
        END
    WHERE id = NEW.id;
END;

-- 视图：用户积分概览
CREATE VIEW UserCreditOverview AS
SELECT
    u.id AS userId,
    u.username,
    u.email,
    uca.totalCredits,
    uca.paidCredits,
    uca.giftCredits,
    uca.rewardCredits,
    uca.frozenCredits,
    uca.lifetimeEarned,
    uca.lifetimeSpent,
    uca.checkinStreak,
    uca.lastCheckinAt,
    -- 计算今日消费
    COALESCE(cus_today.totalSpent, 0) AS todaySpent,
    -- 计算本月消费
    COALESCE(cus_month.monthlySpent, 0) AS monthlySpent,
    -- 计算即将过期的积分
    (SELECT COALESCE(SUM(amount), 0)
     FROM CreditTransaction ct
     WHERE ct.userId = u.id
       AND ct.expiresAt BETWEEN CURRENT_TIMESTAMP AND DATE(CURRENT_TIMESTAMP, '+7 days')
       AND ct.status = 'COMPLETED'
       AND ct.amount > 0
    ) AS expiringInWeek
FROM User u
LEFT JOIN UserCreditAccount uca ON u.id = uca.userId
LEFT JOIN CreditUsageSummary cus_today ON u.id = cus_today.userId AND cus_today.summaryDate = DATE('now')
LEFT JOIN (
    SELECT userId, SUM(totalSpent) AS monthlySpent
    FROM CreditUsageSummary
    WHERE summaryDate BETWEEN DATE('now', 'start of month') AND DATE('now')
    GROUP BY userId
) cus_month ON u.id = cus_month.userId;

-- 视图：积分统计汇总
CREATE VIEW CreditStatsSummary AS
SELECT
    DATE(createdAt) AS transactionDate,
    COUNT(*) AS totalTransactions,
    SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS totalEarned,
    SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) AS totalSpent,
    COUNT(DISTINCT userId) AS activeUsers,
    AVG(CASE WHEN amount > 0 THEN amount END) AS avgEarnAmount,
    AVG(CASE WHEN amount < 0 THEN ABS(amount) END) AS avgSpendAmount
FROM CreditTransaction
WHERE status = 'COMPLETED'
GROUP BY DATE(createdAt)
ORDER BY transactionDate DESC;