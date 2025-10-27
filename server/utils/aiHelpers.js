const { aiConfig, getTaskParams, getRetryConfig } = require('../config/aiConfig')

// 延迟函数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * 带重试的AI请求包装器
 * @param {Function} requestFn - 执行请求的函数
 * @param {string} provider - AI提供商名称
 * @param {Object} options - 选项
 * @returns {Promise} 请求结果
 */
async function withRetry(requestFn, provider = 'openai', options = {}) {
  const retryConfig = getRetryConfig(provider)
  const { maxAttempts, backoffMultiplier, initialDelay } = retryConfig
  
  let lastError
  let currentDelay = initialDelay

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await requestFn()
      
      // 记录成功的请求（如果启用了使用统计）
      if (aiConfig.global.enableUsageStats) {
        logUsage(provider, 'success', attempt)
      }
      
      return result
    } catch (error) {
      lastError = error
      
      // 记录失败的请求
      if (aiConfig.global.enableUsageStats) {
        logUsage(provider, 'error', attempt, error.message)
      }

      // 如果是最后一次尝试，直接抛出错误
      if (attempt === maxAttempts) {
        break
      }

      // 检查是否应该重试（某些错误不应该重试）
      if (!shouldRetry(error)) {
        throw error
      }

      // 等待后重试
      console.warn(`AI请求失败 (尝试 ${attempt}/${maxAttempts}), ${currentDelay}ms后重试:`, error.message)
      await delay(currentDelay)
      currentDelay *= backoffMultiplier
    }
  }

  throw new Error(`AI请求在${maxAttempts}次尝试后仍然失败: ${lastError.message}`)
}

/**
 * 判断错误是否应该重试
 * @param {Error} error - 错误对象
 * @returns {boolean} 是否应该重试
 */
function shouldRetry(error) {
  // 网络错误和临时服务错误应该重试
  if (error.code === 'ECONNRESET' || 
      error.code === 'ENOTFOUND' || 
      error.code === 'ETIMEDOUT') {
    return true
  }

  // HTTP状态码判断
  if (error.status) {
    // 4xx 客户端错误通常不应该重试（除了429限流）
    if (error.status >= 400 && error.status < 500) {
      return error.status === 429 // 只有限流错误才重试
    }
    
    // 5xx 服务端错误应该重试
    if (error.status >= 500) {
      return true
    }
  }

  // OpenAI特定错误判断
  if (error.type) {
    switch (error.type) {
      case 'rate_limit_error':
      case 'server_error':
      case 'timeout':
        return true
      case 'invalid_api_key':
      case 'insufficient_quota':
      case 'invalid_request_error':
        return false
      default:
        return true
    }
  }

  // 默认重试
  return true
}

/**
 * 构建AI请求参数
 * @param {string} provider - AI提供商
 * @param {string} task - 任务类型 (creative, analysis, consistency等)
 * @param {Object} overrides - 参数覆盖
 * @returns {Object} 请求参数
 */
function buildRequestParams(provider, task = 'default', overrides = {}) {
  const baseParams = getTaskParams(provider, task)

  // 合并参数
  const mergedParams = {
    ...baseParams,
    ...overrides
  }

  // 根据提供商转换参数名称
  if (provider === 'openai') {
    return {
      model: mergedParams.model,
      temperature: Math.min(2, Math.max(0, mergedParams.temperature || 0.7)),
      max_tokens: Math.min(32000, Math.max(1, mergedParams.maxTokens || mergedParams.max_tokens || 2000)),
      top_p: mergedParams.topP || mergedParams.top_p || 1,
      frequency_penalty: mergedParams.frequencyPenalty || mergedParams.frequency_penalty || 0,
      presence_penalty: mergedParams.presencePenalty || mergedParams.presence_penalty || 0,
      stream: mergedParams.stream || false
    }
  } else if (provider === 'claude') {
    return {
      model: mergedParams.model,
      temperature: Math.min(1, Math.max(0, mergedParams.temperature || 0.7)),
      max_tokens: Math.min(4096, Math.max(1, mergedParams.maxTokens || mergedParams.max_tokens || 2000)),
      stream: mergedParams.stream || false
    }
  } else if (provider === 'gemini') {
    return {
      model: mergedParams.model,
      temperature: Math.min(2, Math.max(0, mergedParams.temperature || 0.7)),
      maxOutputTokens: Math.min(8192, Math.max(1, mergedParams.maxTokens || mergedParams.maxOutputTokens || 2048)),
      topP: mergedParams.topP || mergedParams.top_p || 0.95,
      topK: mergedParams.topK || mergedParams.top_k || 40
    }
  } else {
    // 默认返回通用格式（OpenAI兼容）
    return {
      model: mergedParams.model,
      temperature: Math.min(2, Math.max(0, mergedParams.temperature || 0.7)),
      max_tokens: Math.min(32000, Math.max(1, mergedParams.maxTokens || mergedParams.max_tokens || 2000)),
      top_p: mergedParams.topP || mergedParams.top_p || 1,
      frequency_penalty: mergedParams.frequencyPenalty || mergedParams.frequency_penalty || 0,
      presence_penalty: mergedParams.presencePenalty || mergedParams.presence_penalty || 0,
      stream: mergedParams.stream || false
    }
  }
}

/**
 * 记录AI使用统计
 * @param {string} provider - AI提供商
 * @param {string} status - 请求状态 (success/error)
 * @param {number} attempt - 尝试次数
 * @param {string} errorMsg - 错误消息
 */
function logUsage(provider, status, attempt, errorMsg = null) {
  const timestamp = new Date().toISOString()
  const logData = {
    timestamp,
    provider,
    status,
    attempt,
    ...(errorMsg && { error: errorMsg })
  }

  // 根据日志级别决定输出
  switch (aiConfig.global.logLevel) {
    case 'debug':
      console.debug('AI请求统计:', JSON.stringify(logData))
      break
    case 'info':
      if (status === 'error' || attempt > 1) {
        console.info('AI请求统计:', JSON.stringify(logData))
      }
      break
    case 'warn':
      if (status === 'error') {
        console.warn('AI请求失败:', JSON.stringify(logData))
      }
      break
    case 'error':
      if (status === 'error' && attempt >= 3) {
        console.error('AI请求多次失败:', JSON.stringify(logData))
      }
      break
  }
}

/**
 * 标准化AI响应
 * @param {Object} response - 原始响应
 * @param {string} provider - AI提供商
 * @returns {Object} 标准化后的响应
 */
function normalizeResponse(response, provider) {
  switch (provider) {
    case 'openai':
      return {
        content: response.choices[0]?.message?.content || '',
        usage: response.usage,
        model: response.model,
        finishReason: response.choices[0]?.finish_reason
      }
    
    case 'claude':
      return {
        content: response.content[0]?.text || '',
        usage: response.usage,
        model: response.model,
        finishReason: response.stop_reason
      }
    
    default:
      // 尝试通用格式
      return {
        content: response.choices?.[0]?.message?.content || response.content || '',
        usage: response.usage,
        model: response.model
      }
  }
}

/**
 * 验证响应内容
 * @param {string} content - 响应内容
 * @param {string} expectedFormat - 期望的格式 (json/text)
 * @returns {Object|string} 验证后的内容
 */
function validateResponse(content, expectedFormat = 'text') {
  if (!content || content.trim() === '') {
    throw new Error('AI返回了空响应')
  }

  if (expectedFormat === 'json') {
    try {
      return JSON.parse(content)
    } catch (error) {
      throw new Error(`AI返回的不是有效的JSON格式: ${error.message}`)
    }
  }

  return content
}

/**
 * 创建标准的系统消息
 * @param {string} role - 角色描述
 * @param {string} task - 任务描述
 * @param {string} format - 输出格式要求
 * @param {Object} context - 上下文信息
 * @returns {string} 系统消息
 */
function createSystemMessage(role, task, format = null, context = {}) {
  let message = `你是一个${role}。${task}`

  if (format) {
    message += `\n\n${format}`
  }

  if (context.constraints) {
    message += `\n\n约束条件：\n${context.constraints.map(c => `- ${c}`).join('\n')}`
  }

  if (context.examples) {
    message += `\n\n示例：\n${context.examples}`
  }

  return message
}

module.exports = {
  withRetry,
  shouldRetry,
  buildRequestParams,
  logUsage,
  normalizeResponse,
  validateResponse,
  createSystemMessage,
  delay
}