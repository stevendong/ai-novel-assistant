// AI服务配置
const aiConfig = {
  // OpenAI配置
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-ada-002',
    // 请求参数配置
    defaultParams: {
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7,
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 2000,
      topP: parseFloat(process.env.OPENAI_TOP_P) || 1,
      frequencyPenalty: parseFloat(process.env.OPENAI_FREQUENCY_PENALTY) || 0,
      presencePenalty: parseFloat(process.env.OPENAI_PRESENCE_PENALTY) || 0
    },
    // 特定任务的参数覆盖
    taskParams: {
      consistency: {
        temperature: parseFloat(process.env.OPENAI_CONSISTENCY_TEMPERATURE) || 0.3,
        maxTokens: parseInt(process.env.OPENAI_CONSISTENCY_MAX_TOKENS) || 1500
      },
      creative: {
        temperature: parseFloat(process.env.OPENAI_CREATIVE_TEMPERATURE) || 0.9,
        maxTokens: parseInt(process.env.OPENAI_CREATIVE_MAX_TOKENS) || 3000
      },
      analysis: {
        temperature: parseFloat(process.env.OPENAI_ANALYSIS_TEMPERATURE) || 0.2,
        maxTokens: parseInt(process.env.OPENAI_ANALYSIS_MAX_TOKENS) || 2000
      },
      content_generation: {
        temperature: parseFloat(process.env.OPENAI_CONTENT_TEMPERATURE) || 0.8,
        maxTokens: parseInt(process.env.OPENAI_CONTENT_MAX_TOKENS) || 4000
      }
    },
    // 重试配置
    retry: {
      maxAttempts: parseInt(process.env.OPENAI_RETRY_ATTEMPTS) || 3,
      backoffMultiplier: parseFloat(process.env.OPENAI_BACKOFF_MULTIPLIER) || 2,
      initialDelay: parseInt(process.env.OPENAI_INITIAL_DELAY) || 1000
    },
    // 超时配置
    timeout: parseInt(process.env.OPENAI_TIMEOUT) || 60000
  },

  // Claude配置
  claude: {
    apiKey: process.env.CLAUDE_API_KEY,
    baseURL: process.env.CLAUDE_BASE_URL || 'https://api.anthropic.com',
    model: process.env.CLAUDE_MODEL || 'claude-3-sonnet-20240229',
    defaultParams: {
      maxTokens: parseInt(process.env.CLAUDE_MAX_TOKENS) || 2000,
      temperature: parseFloat(process.env.CLAUDE_TEMPERATURE) || 0.7
    },
    retry: {
      maxAttempts: parseInt(process.env.CLAUDE_RETRY_ATTEMPTS) || 3,
      backoffMultiplier: parseFloat(process.env.CLAUDE_BACKOFF_MULTIPLIER) || 2,
      initialDelay: parseInt(process.env.CLAUDE_INITIAL_DELAY) || 1000
    },
    timeout: parseInt(process.env.CLAUDE_TIMEOUT) || 60000
  },

  // 自定义提供商配置
  custom: {
    name: process.env.CUSTOM_PROVIDER_NAME,
    apiKey: process.env.CUSTOM_API_KEY,
    baseURL: process.env.CUSTOM_BASE_URL,
    model: process.env.CUSTOM_MODEL,
    defaultParams: {
      temperature: parseFloat(process.env.CUSTOM_TEMPERATURE) || 0.7,
      maxTokens: parseInt(process.env.CUSTOM_MAX_TOKENS) || 2000
    }
  },

  // 全局配置
  global: {
    // 默认提供商
    defaultProvider: process.env.DEFAULT_AI_PROVIDER || 'openai',
    // 日志级别
    logLevel: process.env.AI_LOG_LEVEL || 'info',
    // 是否启用缓存
    enableCache: process.env.AI_ENABLE_CACHE === 'true',
    // 缓存TTL (秒)
    cacheTTL: parseInt(process.env.AI_CACHE_TTL) || 3600,
    // 是否启用使用统计
    enableUsageStats: process.env.AI_ENABLE_USAGE_STATS !== 'false'
  }
}

// 验证必要的配置
function validateConfig() {
  const errors = []

  // 检查至少有一个提供商配置
  const hasOpenAI = aiConfig.openai.apiKey
  const hasClaude = aiConfig.claude.apiKey
  const hasCustom = aiConfig.custom.apiKey && aiConfig.custom.baseURL

  if (!hasOpenAI && !hasClaude && !hasCustom) {
    errors.push('至少需要配置一个AI提供商 (OpenAI, Claude, 或自定义提供商)')
  }

  // 检查默认提供商是否可用
  const defaultProvider = aiConfig.global.defaultProvider
  if (defaultProvider === 'openai' && !hasOpenAI) {
    errors.push('默认提供商设置为OpenAI但未配置OPENAI_API_KEY')
  }
  if (defaultProvider === 'claude' && !hasClaude) {
    errors.push('默认提供商设置为Claude但未配置CLAUDE_API_KEY')
  }
  if (defaultProvider === 'custom' && !hasCustom) {
    errors.push('默认提供商设置为自定义但未配置相关参数')
  }

  if (errors.length > 0) {
    throw new Error('AI配置验证失败:\n' + errors.join('\n'))
  }
}

// 获取特定任务的参数
function getTaskParams(provider, task) {
  const providerConfig = aiConfig[provider]
  if (!providerConfig) {
    throw new Error(`未知的AI提供商: ${provider}`)
  }

  const defaultParams = providerConfig.defaultParams || {}
  const taskParams = providerConfig.taskParams?.[task] || {}
  
  return {
    ...defaultParams,
    ...taskParams
  }
}

// 获取重试配置
function getRetryConfig(provider) {
  const providerConfig = aiConfig[provider]
  return providerConfig?.retry || {
    maxAttempts: 3,
    backoffMultiplier: 2,
    initialDelay: 1000
  }
}

module.exports = {
  aiConfig,
  validateConfig,
  getTaskParams,
  getRetryConfig
}