const aiService = require('./aiService')

/**
 * AI Model Service - handles model management and recommendations
 * This is a stub to resolve import errors
 */
class AIModelService {
  static async recommendModel(taskType) {
    // Delegate to existing aiService
    return aiService.recommendModel ? aiService.recommendModel(taskType) : 'gpt-3.5-turbo'
  }

  static async generateWithRecommendedModel(messages, options = {}) {
    // Delegate to existing aiService
    return aiService.chat(messages, options)
  }
}

module.exports = { aiModelService: new AIModelService() }