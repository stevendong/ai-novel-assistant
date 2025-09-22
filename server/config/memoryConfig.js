/**
 * Mem0记忆服务配置
 */

module.exports = {
  // 部署模式：cloud | local | hybrid
  deployment: 'cloud',

  // 功能开关
  enabled: true,
  fallbackEnabled: process.env.MEM0_FALLBACK_ENABLED !== 'false', // 默认开启降级

  // 云服务配置
  cloud: {
    apiKey: process.env.MEM0_API_KEY || 'm0-Mgu8F2creRXInwie1FrdW5JMZ7HUFhY0VxxO9l1l',
    baseUrl: process.env.MEM0_BASE_URL || 'https://api.mem0.ai',
    timeout: parseInt(process.env.MEM0_TIMEOUT) || 5000,
    retries: parseInt(process.env.MEM0_RETRIES) || 3
  },

  // 记忆相关配置
  memory: {
    maxRetrievalCount: 8,           // 最大检索记忆数量
    importanceThreshold: 2,         // 记忆重要性阈值
    retentionDays: 365,             // 记忆保存天数
    cacheTimeoutMs: 5000,           // 缓存超时时间
    batchUpdateDelay: 1000,         // 批量更新延迟(ms)
    minContentLength: 10            // 最小内容长度
  },

  // 性能配置
  performance: {
    memoryTimeoutMs: 3000,          // 记忆操作超时时间
    fallbackTimeoutMs: 1000,        // 降级超时时间
    batchUpdateSize: 5,             // 批量更新大小
    maxConcurrentRequests: 3        // 最大并发请求数
  },

  // 记忆类型定义
  memoryTypes: {
    USER_PREFERENCE: 'user_preference',     // 用户偏好
    CHARACTER_TRAIT: 'character_trait',     // 角色特征
    WORLD_SETTING: 'world_setting',         // 世界设定
    PLOT_POINT: 'plot_point',               // 情节要点
    STYLE_GUIDE: 'style_guide',             // 写作风格
    CONSISTENCY_RULE: 'consistency_rule',   // 一致性规则
    CREATIVE_DECISION: 'creative_decision', // 创作决策
    FEEDBACK: 'feedback'                    // 用户反馈
  },

  // 模式对应的记忆类型映射
  modeMemoryTypes: {
    'chat': ['user_preference', 'character_trait', 'world_setting', 'creative_decision'],
    'enhance': ['character_trait', 'world_setting', 'style_guide', 'creative_decision'],
    'check': ['consistency_rule', 'character_trait', 'world_setting', 'feedback']
  },

  // 日志配置
  logging: {
    enablePerformanceLog: process.env.NODE_ENV === 'development',
    enableMemoryContentLog: false, // 生产环境关闭内容日志
    logLevel: process.env.MEM0_LOG_LEVEL || 'info'
  }
};
