/**
 * 解析提供商特定headers配置
 * 从环境变量中读取JSON格式的headers配置
 *
 * 环境变量格式示例:
 * AI_PROVIDER_HEADERS='[
 *   {"urlPattern": "aihubmix.com", "headers": {"APP-Code": "AVSS2212"}},
 *   {"urlPattern": "example.com", "headers": {"X-Custom-Key": "value"}}
 * ]'
 *
 * 或使用单个配置:
 * AI_PROVIDER_HEADER_PATTERN_1=aihubmix.com
 * AI_PROVIDER_HEADER_NAME_1=APP-Code
 * AI_PROVIDER_HEADER_VALUE_1=AVSS2212
 */
function parseProviderHeaders() {
  const headers = []

  // 方式1: 从JSON环境变量读取
  if (process.env.AI_PROVIDER_HEADERS) {
    try {
      const parsed = JSON.parse(process.env.AI_PROVIDER_HEADERS)
      if (Array.isArray(parsed)) {
        headers.push(...parsed.map(config => ({
          urlPattern: config.urlPattern || '',
          headers: config.headers || {},
          matchType: config.matchType || 'includes' // includes, startsWith, endsWith, exact, regex
        })))
      }
    } catch (error) {
      console.warn('Failed to parse AI_PROVIDER_HEADERS:', error.message)
    }
  }

  // 方式2: 从编号的环境变量读取 (AI_PROVIDER_HEADER_PATTERN_N)
  let index = 1
  while (process.env[`AI_PROVIDER_HEADER_PATTERN_${index}`]) {
    const pattern = process.env[`AI_PROVIDER_HEADER_PATTERN_${index}`]
    const headerName = process.env[`AI_PROVIDER_HEADER_NAME_${index}`]
    const headerValue = process.env[`AI_PROVIDER_HEADER_VALUE_${index}`]
    const matchType = process.env[`AI_PROVIDER_HEADER_MATCH_${index}`] || 'includes'

    if (pattern && headerName && headerValue) {
      headers.push({
        urlPattern: pattern,
        headers: { [headerName]: headerValue },
        matchType
      })
    }

    index++
  }

  // 方式3: 兼容旧配置 (向后兼容)
  if (headers.length === 0 && process.env.LEGACY_AIHUBMIX_SUPPORT !== 'false') {
    headers.push({
      urlPattern: 'aihubmix.com',
      headers: { 'APP-Code': 'AVSS2212' },
      matchType: 'includes'
    })
  }

  return headers
}

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

  // Gemini配置 (Google)
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',
    model: process.env.GEMINI_MODEL || 'gemini-pro',
    defaultParams: {
      temperature: parseFloat(process.env.GEMINI_TEMPERATURE) || 0.7,
      maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS) || 2048,
      topP: parseFloat(process.env.GEMINI_TOP_P) || 0.95,
      topK: parseInt(process.env.GEMINI_TOP_K) || 40
    },
    taskParams: {
      consistency: {
        temperature: parseFloat(process.env.GEMINI_CONSISTENCY_TEMPERATURE) || 0.3,
        maxTokens: parseInt(process.env.GEMINI_CONSISTENCY_MAX_TOKENS) || 1500
      },
      creative: {
        temperature: parseFloat(process.env.GEMINI_CREATIVE_TEMPERATURE) || 0.9,
        maxTokens: parseInt(process.env.GEMINI_CREATIVE_MAX_TOKENS) || 4096
      },
      analysis: {
        temperature: parseFloat(process.env.GEMINI_ANALYSIS_TEMPERATURE) || 0.2,
        maxTokens: parseInt(process.env.GEMINI_ANALYSIS_MAX_TOKENS) || 2048
      },
      content_generation: {
        temperature: parseFloat(process.env.GEMINI_CONTENT_TEMPERATURE) || 0.8,
        maxTokens: parseInt(process.env.GEMINI_CONTENT_MAX_TOKENS) || 8192
      }
    },
    retry: {
      maxAttempts: parseInt(process.env.GEMINI_RETRY_ATTEMPTS) || 3,
      backoffMultiplier: parseFloat(process.env.GEMINI_BACKOFF_MULTIPLIER) || 2,
      initialDelay: parseInt(process.env.GEMINI_INITIAL_DELAY) || 1000
    },
    timeout: parseInt(process.env.GEMINI_TIMEOUT) || 60000
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
  },

  // 提供商特定headers配置
  // 支持基于URL模式匹配的自定义headers
  providerHeaders: parseProviderHeaders()
}

// 验证必要的配置
function validateConfig() {
  const errors = []

  // 检查至少有一个提供商配置
  const hasOpenAI = aiConfig.openai.apiKey
  const hasClaude = aiConfig.claude.apiKey
  const hasGemini = aiConfig.gemini.apiKey
  const hasCustom = aiConfig.custom.apiKey && aiConfig.custom.baseURL

  if (!hasOpenAI && !hasClaude && !hasGemini && !hasCustom) {
    errors.push('至少需要配置一个AI提供商 (OpenAI, Claude, Gemini, 或自定义提供商)')
  }

  // 检查默认提供商是否可用
  const defaultProvider = aiConfig.global.defaultProvider
  if (defaultProvider === 'openai' && !hasOpenAI) {
    errors.push('默认提供商设置为OpenAI但未配置OPENAI_API_KEY')
  }
  if (defaultProvider === 'claude' && !hasClaude) {
    errors.push('默认提供商设置为Claude但未配置CLAUDE_API_KEY')
  }
  if (defaultProvider === 'gemini' && !hasGemini) {
    errors.push('默认提供商设置为Gemini但未配置GEMINI_API_KEY')
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

/**
 * 检查URL是否匹配特定模式
 * @param {string} url - 要检查的URL
 * @param {string} pattern - 匹配模式
 * @param {string} matchType - 匹配类型: includes, startsWith, endsWith, exact, regex
 * @returns {boolean}
 */
function urlMatchesPattern(url, pattern, matchType = 'includes') {
  if (!url || !pattern) return false

  const urlStr = typeof url === 'string' ? url : String(url)

  switch (matchType) {
    case 'includes':
      return urlStr.includes(pattern)
    case 'startsWith':
      return urlStr.startsWith(pattern)
    case 'endsWith':
      return urlStr.endsWith(pattern)
    case 'exact':
      return urlStr === pattern
    case 'regex':
      try {
        const regex = new RegExp(pattern)
        return regex.test(urlStr)
      } catch (error) {
        console.warn(`Invalid regex pattern: ${pattern}`, error.message)
        return false
      }
    default:
      return urlStr.includes(pattern)
  }
}

/**
 * 获取URL对应的自定义headers
 * @param {string} baseURL - API的baseURL
 * @returns {Object} headers对象
 */
function getCustomHeaders(baseURL) {
  const customHeaders = {}

  if (!baseURL) return customHeaders

  for (const config of aiConfig.providerHeaders) {
    if (urlMatchesPattern(baseURL, config.urlPattern, config.matchType)) {
      Object.assign(customHeaders, config.headers)
    }
  }

  return customHeaders
}

/**
 * 检查URL是否需要自定义headers
 * @param {string} baseURL - API的baseURL
 * @returns {boolean}
 */
function needsCustomHeaders(baseURL) {
  return Object.keys(getCustomHeaders(baseURL)).length > 0
}

module.exports = {
  aiConfig,
  validateConfig,
  getTaskParams,
  getRetryConfig,
  getCustomHeaders,
  needsCustomHeaders,
  urlMatchesPattern
}