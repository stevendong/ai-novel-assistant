-- AI模型切换及Token消耗统计系统 - 数据库架构
-- 在现有 Prisma schema 基础上添加的新表结构

-- AI模型配置表
-- 管理所有可用的AI模型配置信息
CREATE TABLE AIModelConfig (
    id TEXT PRIMARY KEY DEFAULT(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || '4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('ab89',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    name TEXT NOT NULL UNIQUE,                    -- 模型名称 (gpt-4, gpt-3.5-turbo, claude-3-sonnet等)
    provider TEXT NOT NULL,                       -- 提供商 (openai, claude, custom)
    displayName TEXT NOT NULL,                    -- 用户友好的显示名称
    description TEXT,                             -- 模型描述和特性说明
    maxTokens INTEGER DEFAULT 4096,               -- 最大支持token数
    costPer1kTokensInput REAL DEFAULT 0.002,     -- 输入token成本 (USD per 1k tokens)
    costPer1kTokensOutput REAL DEFAULT 0.002,    -- 输出token成本 (USD per 1k tokens)
    recommendedFor TEXT,                          -- JSON数组: 推荐使用场景 ["creative", "analysis", "chat"]
    isActive BOOLEAN DEFAULT true,                -- 是否可用
    priority INTEGER DEFAULT 0,                  -- 优先级排序 (越大越优先)
    metadata TEXT,                               -- JSON: 扩展配置信息
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AI使用记录表
-- 记录每次AI API调用的详细信息
CREATE TABLE AIUsageRecord (
    id TEXT PRIMARY KEY DEFAULT(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || '4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('ab89',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    userId TEXT NOT NULL,                         -- 用户ID
    novelId TEXT,                                -- 关联小说项目ID (可为空)
    conversationId TEXT,                         -- 关联对话会话ID (可为空)
    modelConfigId TEXT NOT NULL,                 -- 关联的模型配置ID
    taskType TEXT NOT NULL,                      -- 任务类型 (chat, creative, analysis, consistency, outline等)
    requestType TEXT NOT NULL,                   -- 请求类型 (chat, stream)
    promptTokens INTEGER DEFAULT 0,              -- 输入token数量
    completionTokens INTEGER DEFAULT 0,          -- 输出token数量
    totalTokens INTEGER DEFAULT 0,               -- 总token数量
    estimatedCostInput REAL DEFAULT 0,           -- 输入token预估成本 (USD)
    estimatedCostOutput REAL DEFAULT 0,          -- 输出token预估成本 (USD)
    estimatedCostTotal REAL DEFAULT 0,           -- 总预估成本 (USD)
    duration INTEGER DEFAULT 0,                  -- 请求耗时 (毫秒)
    success BOOLEAN DEFAULT true,                -- 请求是否成功
    errorType TEXT,                              -- 错误类型 (rate_limit, server_error, invalid_request等)
    errorMessage TEXT,                           -- 错误详细信息
    metadata TEXT,                               -- JSON: 请求详细信息和上下文
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
    FOREIGN KEY (novelId) REFERENCES Novel(id) ON DELETE SET NULL,
    FOREIGN KEY (conversationId) REFERENCES AIConversation(id) ON DELETE SET NULL,
    FOREIGN KEY (modelConfigId) REFERENCES AIModelConfig(id) ON DELETE RESTRICT
);

-- 用户AI偏好设置表
-- 存储用户的AI使用偏好和预算设置
CREATE TABLE UserAIPreference (
    userId TEXT PRIMARY KEY,                     -- 用户ID (一对一关系)
    defaultModelId TEXT,                         -- 默认使用的模型ID
    autoSelectModel BOOLEAN DEFAULT true,        -- 是否启用智能模型选择
    budgetLimitMonthly REAL DEFAULT 10.0,       -- 月度预算限制 (USD)
    budgetLimitDaily REAL,                       -- 日预算限制 (USD, 可为空)
    warningThreshold REAL DEFAULT 0.8,          -- 预算预警阈值 (0.8 = 80%)
    taskModelMapping TEXT,                       -- JSON: 任务类型到模型的映射配置
    preferences TEXT,                            -- JSON: 其他偏好设置
    notificationSettings TEXT,                   -- JSON: 通知设置
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
    FOREIGN KEY (defaultModelId) REFERENCES AIModelConfig(id) ON DELETE SET NULL
);

-- AI使用统计汇总表
-- 用于快速查询和统计分析的预聚合数据
CREATE TABLE AIUsageSummary (
    id TEXT PRIMARY KEY DEFAULT(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || '4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('ab89',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    userId TEXT NOT NULL,                        -- 用户ID
    novelId TEXT,                               -- 小说项目ID (可为空，表示全局统计)
    date DATE NOT NULL,                          -- 统计日期 (YYYY-MM-DD)
    modelConfigId TEXT NOT NULL,                -- 模型配置ID
    taskType TEXT NOT NULL,                     -- 任务类型
    requestCount INTEGER DEFAULT 0,             -- 请求次数
    totalTokensInput INTEGER DEFAULT 0,         -- 总输入token数
    totalTokensOutput INTEGER DEFAULT 0,        -- 总输出token数
    totalTokens INTEGER DEFAULT 0,              -- 总token数
    totalCost REAL DEFAULT 0,                  -- 总成本 (USD)
    avgDuration REAL DEFAULT 0,                -- 平均响应时间 (毫秒)
    successCount INTEGER DEFAULT 0,             -- 成功请求数
    errorCount INTEGER DEFAULT 0,               -- 失败请求数
    successRate REAL DEFAULT 1.0,              -- 成功率 (0.0 - 1.0)
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
    FOREIGN KEY (novelId) REFERENCES Novel(id) ON DELETE CASCADE,
    FOREIGN KEY (modelConfigId) REFERENCES AIModelConfig(id) ON DELETE RESTRICT,

    -- 确保每个用户、小说、日期、模型、任务类型组合的唯一性
    UNIQUE(userId, novelId, date, modelConfigId, taskType)
);

-- AI模型评估表
-- 存储模型在不同任务上的表现评估数据
CREATE TABLE AIModelEvaluation (
    id TEXT PRIMARY KEY DEFAULT(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || '4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('ab89',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    modelConfigId TEXT NOT NULL,                -- 模型配置ID
    taskType TEXT NOT NULL,                     -- 任务类型
    userId TEXT,                                -- 用户ID (可为空，表示全局评估)
    averageRating REAL DEFAULT 0,              -- 平均评分 (1-5分)
    ratingCount INTEGER DEFAULT 0,             -- 评分次数
    averageResponseTime REAL DEFAULT 0,        -- 平均响应时间
    averageCostEfficiency REAL DEFAULT 0,      -- 平均成本效率评分
    lastEvaluatedAt DATETIME,                   -- 最后评估时间
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (modelConfigId) REFERENCES AIModelConfig(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,

    UNIQUE(modelConfigId, taskType, userId)
);

-- 预算警告记录表
-- 记录预算警告的历史
CREATE TABLE BudgetAlert (
    id TEXT PRIMARY KEY DEFAULT(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || '4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('ab89',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    userId TEXT NOT NULL,                       -- 用户ID
    alertType TEXT NOT NULL,                    -- 警告类型 (approaching, exceeded, daily_limit等)
    threshold REAL NOT NULL,                    -- 触发阈值
    currentUsage REAL NOT NULL,                 -- 当前使用量
    budgetLimit REAL NOT NULL,                  -- 预算限制
    period TEXT NOT NULL,                       -- 时间周期 (daily, monthly)
    acknowledged BOOLEAN DEFAULT false,         -- 是否已确认
    acknowledgedAt DATETIME,                    -- 确认时间
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);

-- ============================================
-- 索引创建 - 用于查询性能优化
-- ============================================

-- AIModelConfig 索引
CREATE INDEX idx_ai_model_config_provider ON AIModelConfig(provider);
CREATE INDEX idx_ai_model_config_active ON AIModelConfig(isActive, priority DESC);

-- AIUsageRecord 索引 (用于复杂查询和统计)
CREATE INDEX idx_ai_usage_user_date ON AIUsageRecord(userId, date(createdAt));
CREATE INDEX idx_ai_usage_novel_date ON AIUsageRecord(novelId, date(createdAt)) WHERE novelId IS NOT NULL;
CREATE INDEX idx_ai_usage_model_date ON AIUsageRecord(modelConfigId, date(createdAt));
CREATE INDEX idx_ai_usage_task_type ON AIUsageRecord(taskType, createdAt);
CREATE INDEX idx_ai_usage_user_model_task ON AIUsageRecord(userId, modelConfigId, taskType);
CREATE INDEX idx_ai_usage_success ON AIUsageRecord(success, createdAt);

-- AIUsageSummary 索引 (用于快速统计查询)
CREATE INDEX idx_ai_summary_user_date ON AIUsageSummary(userId, date DESC);
CREATE INDEX idx_ai_summary_novel_date ON AIUsageSummary(novelId, date DESC) WHERE novelId IS NOT NULL;
CREATE INDEX idx_ai_summary_user_model ON AIUsageSummary(userId, modelConfigId, date DESC);
CREATE INDEX idx_ai_summary_task_date ON AIUsageSummary(taskType, date DESC);

-- UserAIPreference 索引
CREATE INDEX idx_user_preference_default_model ON UserAIPreference(defaultModelId) WHERE defaultModelId IS NOT NULL;

-- AIModelEvaluation 索引
CREATE INDEX idx_ai_evaluation_model_task ON AIModelEvaluation(modelConfigId, taskType);
CREATE INDEX idx_ai_evaluation_rating ON AIModelEvaluation(averageRating DESC, ratingCount DESC);

-- BudgetAlert 索引
CREATE INDEX idx_budget_alert_user_date ON BudgetAlert(userId, createdAt DESC);
CREATE INDEX idx_budget_alert_unacknowledged ON BudgetAlert(acknowledged, createdAt DESC) WHERE acknowledged = false;

-- ============================================
-- 初始数据插入 - 预置模型配置
-- ============================================

-- OpenAI 模型配置
INSERT INTO AIModelConfig (name, provider, displayName, description, maxTokens, costPer1kTokensInput, costPer1kTokensOutput, recommendedFor, priority) VALUES
('gpt-4', 'openai', 'GPT-4', '最强大的通用AI模型，擅长复杂推理和创意任务', 8192, 0.03, 0.06, '["creative", "analysis", "complex_tasks"]', 10),
('gpt-4-turbo-preview', 'openai', 'GPT-4 Turbo', '更快更经济的GPT-4版本，支持更长上下文', 128000, 0.01, 0.03, '["creative", "analysis", "long_context"]', 9),
('gpt-3.5-turbo', 'openai', 'GPT-3.5 Turbo', '高性价比的对话模型，适合日常交互', 4096, 0.001, 0.002, '["chat", "general", "quick_tasks"]', 7),
('gpt-3.5-turbo-16k', 'openai', 'GPT-3.5 Turbo 16K', '支持更长上下文的GPT-3.5版本', 16384, 0.003, 0.004, '["chat", "long_context", "analysis"]', 6);

-- Claude 模型配置
INSERT INTO AIModelConfig (name, provider, displayName, description, maxTokens, costPer1kTokensInput, costPer1kTokensOutput, recommendedFor, priority) VALUES
('claude-3-opus-20240229', 'claude', 'Claude 3 Opus', 'Anthropic最强模型，专长分析和推理', 200000, 0.015, 0.075, '["analysis", "creative", "consistency"]', 9),
('claude-3-sonnet-20240229', 'claude', 'Claude 3 Sonnet', '平衡性能和成本的模型', 200000, 0.003, 0.015, '["analysis", "general", "consistency"]', 8),
('claude-3-haiku-20240307', 'claude', 'Claude 3 Haiku', '快速响应的轻量级模型', 200000, 0.00025, 0.00125, '["chat", "quick_tasks"]', 5);

-- ============================================
-- 触发器 - 自动维护统计数据
-- ============================================

-- 自动更新 AIUsageSummary 的触发器
CREATE TRIGGER update_usage_summary_after_insert
AFTER INSERT ON AIUsageRecord
BEGIN
    INSERT INTO AIUsageSummary (
        userId, novelId, date, modelConfigId, taskType,
        requestCount, totalTokensInput, totalTokensOutput, totalTokens, totalCost,
        avgDuration, successCount, errorCount, successRate
    )
    VALUES (
        NEW.userId, NEW.novelId, date(NEW.createdAt), NEW.modelConfigId, NEW.taskType,
        1, NEW.promptTokens, NEW.completionTokens, NEW.totalTokens, NEW.estimatedCostTotal,
        NEW.duration, CASE WHEN NEW.success THEN 1 ELSE 0 END, CASE WHEN NEW.success THEN 0 ELSE 1 END,
        CASE WHEN NEW.success THEN 1.0 ELSE 0.0 END
    )
    ON CONFLICT(userId, novelId, date, modelConfigId, taskType) DO UPDATE SET
        requestCount = requestCount + 1,
        totalTokensInput = totalTokensInput + NEW.promptTokens,
        totalTokensOutput = totalTokensOutput + NEW.completionTokens,
        totalTokens = totalTokens + NEW.totalTokens,
        totalCost = totalCost + NEW.estimatedCostTotal,
        avgDuration = (avgDuration * (requestCount - 1) + NEW.duration) / requestCount,
        successCount = successCount + CASE WHEN NEW.success THEN 1 ELSE 0 END,
        errorCount = errorCount + CASE WHEN NEW.success THEN 0 ELSE 1 END,
        successRate = CAST(successCount AS REAL) / requestCount,
        updatedAt = CURRENT_TIMESTAMP;
END;

-- 自动更新 AIModelConfig 的 updatedAt 字段
CREATE TRIGGER update_model_config_timestamp
AFTER UPDATE ON AIModelConfig
BEGIN
    UPDATE AIModelConfig SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 自动更新 UserAIPreference 的 updatedAt 字段
CREATE TRIGGER update_user_preference_timestamp
AFTER UPDATE ON UserAIPreference
BEGIN
    UPDATE UserAIPreference SET updatedAt = CURRENT_TIMESTAMP WHERE userId = NEW.userId;
END;

-- ============================================
-- 视图 - 便于查询的预定义视图
-- ============================================

-- 用户月度使用统计视图
CREATE VIEW UserMonthlyUsage AS
SELECT
    userId,
    strftime('%Y-%m', date) as month,
    SUM(requestCount) as totalRequests,
    SUM(totalTokens) as totalTokens,
    SUM(totalCost) as totalCost,
    AVG(successRate) as avgSuccessRate,
    COUNT(DISTINCT modelConfigId) as modelsUsed
FROM AIUsageSummary
GROUP BY userId, strftime('%Y-%m', date);

-- 模型性能统计视图
CREATE VIEW ModelPerformanceStats AS
SELECT
    mc.id,
    mc.name,
    mc.displayName,
    mc.provider,
    COUNT(ur.id) as totalUsage,
    AVG(ur.duration) as avgResponseTime,
    AVG(ur.estimatedCostTotal) as avgCost,
    AVG(CASE WHEN ur.success THEN 1.0 ELSE 0.0 END) as successRate,
    SUM(ur.totalTokens) as totalTokensProcessed
FROM AIModelConfig mc
LEFT JOIN AIUsageRecord ur ON mc.id = ur.modelConfigId
WHERE mc.isActive = true
GROUP BY mc.id, mc.name, mc.displayName, mc.provider;

-- 用户预算使用情况视图
CREATE VIEW UserBudgetStatus AS
SELECT
    u.id as userId,
    u.username,
    uap.budgetLimitMonthly,
    uap.budgetLimitDaily,
    uap.warningThreshold,
    COALESCE(umus.totalCost, 0) as currentMonthUsage,
    COALESCE(umus.totalCost / NULLIF(uap.budgetLimitMonthly, 0), 0) as budgetUsageRate,
    CASE
        WHEN COALESCE(umus.totalCost / NULLIF(uap.budgetLimitMonthly, 0), 0) >= 1.0 THEN 'exceeded'
        WHEN COALESCE(umus.totalCost / NULLIF(uap.budgetLimitMonthly, 0), 0) >= uap.warningThreshold THEN 'warning'
        ELSE 'normal'
    END as budgetStatus
FROM User u
LEFT JOIN UserAIPreference uap ON u.id = uap.userId
LEFT JOIN (
    SELECT userId, SUM(totalCost) as totalCost
    FROM UserMonthlyUsage
    WHERE month = strftime('%Y-%m', 'now')
    GROUP BY userId
) umus ON u.id = umus.userId;