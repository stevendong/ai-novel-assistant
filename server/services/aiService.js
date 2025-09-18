const OpenAI = require('openai');
const { aiConfig, validateConfig } = require('../config/aiConfig');
const {
  withRetry,
  buildRequestParams,
  normalizeResponse,
  validateResponse
} = require('../utils/aiHelpers');
const logger = require('../utils/logger');

class AIService {
  constructor() {
    this.providers = new Map();
    this.initializeProviders();
    
    // 验证AI配置
    try {
      validateConfig();
    } catch (error) {
      console.warn('AI配置验证警告:', error.message);
    }
  }

  initializeProviders() {
    // Initialize OpenAI-compatible providers
    if (aiConfig.openai.apiKey) {
      this.providers.set('openai', {
        client: new OpenAI({
          apiKey: aiConfig.openai.apiKey,
          baseURL: aiConfig.openai.baseURL,
          timeout: aiConfig.openai.timeout
        }),
        type: 'openai',
        models: {
          chat: aiConfig.openai.model,
          embedding: aiConfig.openai.embeddingModel
        }
      });
    }

    // Initialize Claude provider
    if (aiConfig.claude.apiKey) {
      this.providers.set('claude', {
        client: null, // Will be initialized when needed
        config: {
          apiKey: aiConfig.claude.apiKey,
          baseURL: aiConfig.claude.baseURL,
          timeout: aiConfig.claude.timeout
        },
        type: 'claude',
        models: {
          chat: aiConfig.claude.model
        }
      });
    }

    // Support for custom OpenAI-compatible providers
    if (aiConfig.custom.name && aiConfig.custom.apiKey && aiConfig.custom.baseURL) {
      this.providers.set(aiConfig.custom.name, {
        client: new OpenAI({
          apiKey: aiConfig.custom.apiKey,
          baseURL: aiConfig.custom.baseURL
        }),
        type: 'openai',
        models: {
          chat: aiConfig.custom.model || 'gpt-3.5-turbo'
        }
      });
    }
  }

  getDefaultProvider() {
    const preferredProvider = aiConfig.global.defaultProvider;
    return this.providers.get(preferredProvider) || this.providers.values().next().value;
  }

  async chat(messages, options = {}) {
    const provider = options.provider ? this.providers.get(options.provider) : this.getDefaultProvider();
    
    if (!provider) {
      throw new Error('No AI provider available');
    }

    if (provider.type === 'openai') {
      return await this.openaiChat(provider, messages, options);
    } else if (provider.type === 'claude') {
      return await this.claudeChat(provider, messages, options);
    }
    
    throw new Error(`Unsupported provider type: ${provider.type}`);
  }

  async chatStream(messages, options = {}) {
    const provider = options.provider ? this.providers.get(options.provider) : this.getDefaultProvider();
    
    if (!provider) {
      throw new Error('No AI provider available');
    }

    if (provider.type === 'openai') {
      return await this.openaiChatStream(provider, messages, options);
    } else if (provider.type === 'claude') {
      return await this.claudeChatStream(provider, messages, options);
    }
    
    throw new Error(`Unsupported provider type: ${provider.type}`);
  }

  async openaiChat(provider, messages, options) {
    const taskType = options.taskType || 'default';
    const startTime = Date.now();

    const requestFn = async () => {
      const params = buildRequestParams('openai', taskType, {
        model: options.model || provider.models.chat,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        ...options.additionalParams
      });

      const requestData = {
        messages: messages,
        ...params
      };

      const response = await provider.client.chat.completions.create(requestData);

      // Log successful API call
      const duration = Date.now() - startTime;
      logger.logApiCall('openai', '/chat/completions', requestData, response, duration);

      return normalizeResponse(response, 'openai');
    };

    try {
      const result = await withRetry(requestFn, 'openai');

      return {
        content: result.content,
        usage: result.usage,
        provider: 'openai',
        model: result.model,
        finishReason: result.finishReason
      };
    } catch (error) {
      // Log failed API call
      const duration = Date.now() - startTime;
      const requestData = {
        model: options.model || provider.models.chat,
        messages: messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens
      };
      logger.logApiCall('openai', '/chat/completions', requestData, null, duration, error);

      logger.error('OpenAI API Error:', {
        error: error.message,
        stack: error.stack,
        model: options.model || provider.models.chat,
        messageCount: messages.length
      });
      throw new Error(`OpenAI API Error: ${error.message}`);
    }
  }

  async claudeChat(provider, messages, options) {
    const startTime = Date.now();

    try {
      // Convert OpenAI format messages to Claude format
      const systemMessage = messages.find(m => m.role === 'system')?.content || '';
      const userMessages = messages.filter(m => m.role !== 'system');

      const requestData = {
        model: options.model || provider.models.chat,
        system: systemMessage,
        messages: userMessages,
        max_tokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7,
        ...options.additionalParams
      };

      const response = await fetch(`${provider.config.baseURL}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': provider.config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        const duration = Date.now() - startTime;
        const error = new Error(`Claude API Error: ${response.status} ${response.statusText} - ${errorText}`);
        logger.logApiCall('claude', '/v1/messages', requestData, null, duration, error);
        throw error;
      }

      const data = await response.json();

      // Log successful API call
      const duration = Date.now() - startTime;
      logger.logApiCall('claude', '/v1/messages', requestData, data, duration);

      return {
        content: data.content[0].text,
        usage: data.usage,
        provider: 'claude'
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Claude API Error:', {
        error: error.message,
        stack: error.stack,
        model: options.model || provider.models.chat,
        messageCount: messages.length
      });
      throw new Error(`Claude API Error: ${error.message}`);
    }
  }

  async openaiChatStream(provider, messages, options) {
    const taskType = options.taskType || 'default';

    const params = buildRequestParams('openai', taskType, {
      model: options.model || provider.models.chat,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      stream: true, // Enable streaming
      ...options.additionalParams
    });

    const requestData = {
      messages: messages,
      ...params
    };

    try {
      const stream = await provider.client.chat.completions.create(requestData);
      return stream;
    } catch (error) {
      logger.error('OpenAI Stream Error:', {
        error: error.message,
        stack: error.stack,
        model: options.model || provider.models.chat,
        messageCount: messages.length
      });
      throw new Error(`OpenAI Stream Error: ${error.message}`);
    }
  }

  async claudeChatStream(provider, messages, options) {
    const startTime = Date.now();

    try {
      // Convert OpenAI format messages to Claude format
      const systemMessage = messages.find(m => m.role === 'system')?.content || '';
      const userMessages = messages.filter(m => m.role !== 'system');

      const requestData = {
        model: options.model || provider.models.chat,
        system: systemMessage,
        messages: userMessages,
        max_tokens: options.maxTokens || 2000,
        temperature: options.temperature || 0.7,
        stream: true, // Enable streaming
        ...options.additionalParams
      };

      const response = await fetch(`${provider.config.baseURL}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': provider.config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`Claude Stream Error: ${response.status} ${response.statusText} - ${errorText}`);
        throw error;
      }

      return response.body;
    } catch (error) {
      logger.error('Claude Stream Error:', {
        error: error.message,
        stack: error.stack,
        model: options.model || provider.models.chat,
        messageCount: messages.length
      });
      throw new Error(`Claude Stream Error: ${error.message}`);
    }
  }

  // Novel-specific AI methods
  async generateResponse(novelContext, userMessage, type = 'general', options = {}) {
    const systemPrompt = this.buildSystemPrompt(novelContext, type);
    
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ];

    const response = await this.chat(messages, {
      temperature: options.temperature || (type === 'creative' ? 0.9 : 0.7),
      provider: options.provider,
      model: options.model
    });

    return this.parseResponse(response.content, type);
  }

  async generateResponseStream(novelContext, userMessage, type = 'general', options = {}) {
    const systemPrompt = this.buildSystemPrompt(novelContext, type);
    
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ];

    const stream = await this.chatStream(messages, {
      temperature: options.temperature || (type === 'creative' ? 0.9 : 0.7),
      provider: options.provider,
      model: options.model
    });

    return stream;
  }

  buildSystemPrompt(novelContext, type) {
    let basePrompt = '你是一个专业的小说创作助手。';
    
    if (novelContext) {
      basePrompt += `\n当前小说信息：\n标题：${novelContext.title}\n描述：${novelContext.description}\n类型：${novelContext.genre}`;
      
      if (novelContext.characters?.length > 0) {
        basePrompt += `\n主要角色：\n${novelContext.characters.map(c => `- ${c.name}: ${c.description}`).join('\n')}`;
      }
      
      if (novelContext.settings?.length > 0) {
        basePrompt += `\n世界设定：\n${novelContext.settings.map(s => `- ${s.name}: ${s.description}`).join('\n')}`;
      }
      
      if (novelContext.aiSettings) {
        basePrompt += `\n内容限制：分级${novelContext.aiSettings.rating}`;
      }
    }

    switch (type) {
      case 'creative':
        basePrompt += '\n请以创意和想象力为重点回答。';
        break;
      case 'analytical':
        basePrompt += '\n请以逻辑分析和结构化思考为重点回答。';
        break;
      case 'consistency':
        basePrompt += '\n请重点关注内容的一致性和连贯性。';
        break;
      default:
        basePrompt += '\n请提供有帮助的建议和分析。';
    }

    return basePrompt;
  }

  parseResponse(content, type, novelContext = null) {
    // Enhanced response structure
    const result = {
      message: content,
      suggestions: [],
      questions: [],
      actions: [],
      metadata: {
        type,
        timestamp: new Date().toISOString(),
        wordCount: content.length,
        hasStructuredContent: false
      }
    };

    // Extract structured information with multiple patterns
    const suggestionMarkers = ['建议：', '建议:', '💡', '✅', '推荐：', '推荐:'];
    const questionMarkers = ['问题：', '问题:', '❓', '🤔', '需要考虑：', '需要考虑:'];
    const actionMarkers = ['下一步：', '下一步:', '🎯', '⚡', '行动建议：', '行动建议:'];

    result.suggestions = this.extractBulletPoints(content, suggestionMarkers);
    result.questions = this.extractBulletPoints(content, questionMarkers);
    result.actions = this.extractBulletPoints(content, actionMarkers);

    // Detect if response has structured content
    result.metadata.hasStructuredContent =
      result.suggestions.length > 0 ||
      result.questions.length > 0 ||
      result.actions.length > 0 ||
      content.includes('**') ||
      content.includes('•') ||
      content.includes('1.') ||
      content.includes('##');

    // Add type-specific parsing
    switch (type) {
      case 'consistency':
        result.issues = this.extractConsistencyIssues(content);
        break;
      case 'character':
        result.characterTraits = this.extractCharacterTraits(content);
        break;
      case 'worldbuilding':
        result.worldElements = this.extractWorldElements(content);
        break;
      case 'outline':
        result.plotPoints = this.extractPlotPoints(content);
        break;
    }

    // Generate follow-up suggestions based on content
    result.followUps = this.generateFollowUps(content, type, novelContext);

    return result;
  }

  extractConsistencyIssues(content) {
    const issues = [];
    const issuePatterns = [
      /❌\s*(.+)/g,
      /⚠️\s*(.+)/g,
      /🔴\s*(.+)/g,
      /问题[：:]\s*(.+)/g
    ];

    for (const pattern of issuePatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        issues.push(match[1].trim());
      }
    }

    return issues;
  }

  extractCharacterTraits(content) {
    const traits = [];
    const traitPatterns = [
      /性格[：:]\s*(.+)/g,
      /特征[：:]\s*(.+)/g,
      /特点[：:]\s*(.+)/g
    ];

    for (const pattern of traitPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        traits.push(match[1].trim());
      }
    }

    return traits;
  }

  extractWorldElements(content) {
    const elements = [];
    const elementPatterns = [
      /🏛️\s*(.+)/g,
      /🌍\s*(.+)/g,
      /设定[：:]\s*(.+)/g
    ];

    for (const pattern of elementPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        elements.push(match[1].trim());
      }
    }

    return elements;
  }

  extractPlotPoints(content) {
    const points = [];
    const pointPatterns = [
      /📊\s*(.+)/g,
      /情节[：:]\s*(.+)/g,
      /第\d+章[：:]\s*(.+)/g
    ];

    for (const pattern of pointPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        points.push(match[1].trim());
      }
    }

    return points;
  }

  generateFollowUps(content, type, novelContext) {
    const followUps = [];

    // Generate context-aware follow-up questions
    if (type === 'character' && content.includes('性格')) {
      followUps.push('要不要继续完善这个角色的背景故事？');
      followUps.push('需要为这个角色设计一些具体的对话风格吗？');
    }

    if (type === 'worldbuilding' && content.includes('设定')) {
      followUps.push('需要进一步扩展这个世界的历史背景吗？');
      followUps.push('要为这个设定添加一些具体的规则限制吗？');
    }

    if (type === 'consistency' && content.includes('问题')) {
      followUps.push('要我帮你制定修复这些问题的具体方案吗？');
      followUps.push('需要检查其他章节是否有类似问题吗？');
    }

    return followUps.slice(0, 3); // Limit to 3 follow-ups
  }

  extractBulletPoints(text, markers) {
    const points = [];
    const uniquePoints = new Set();

    for (const marker of markers) {
      const regex = new RegExp(`${marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([\\s\\S]*?)(?=\\n\\n|\\n[^\\n•\\-\\d]|$)`, 'g');
      let match;

      while ((match = regex.exec(text)) !== null) {
        const section = match[1];
        const lines = section.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          const bulletPatterns = [
            /^[-•✓✅]\s*(.+)$/,
            /^\d+\.\s*(.+)$/,
            /^[a-zA-Z]\)\s*(.+)$/,
            /^[\u4e00-\u9fff]、\s*(.+)$/
          ];

          for (const pattern of bulletPatterns) {
            const bulletMatch = trimmed.match(pattern);
            if (bulletMatch && bulletMatch[1]) {
              const point = bulletMatch[1].trim();
              if (point.length > 5 && !uniquePoints.has(point)) {
                uniquePoints.add(point);
                points.push(point);
              }
              break;
            }
          }
        }
      }
    }

    return points.slice(0, 10); // Limit to avoid too many points
  }

  async checkConsistency(novelData, scope = 'full') {
    const startTime = Date.now();

    const systemPrompt = `你是一个专业的小说一致性检查助手。请仔细检查以下内容中的一致性问题：

检查重点：
1. 角色性格和行为的一致性
2. 世界设定的逻辑一致性
3. 时间线的合理性
4. 情节发展的连贯性

请以JSON格式返回检查结果，包含：
- issues: 问题列表，每个问题包含 type(类型), severity(严重程度), issue(问题描述), suggestion(修改建议)
- summary: 问题统计摘要`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: this.formatNovelDataForConsistency(novelData) }
    ];

    try {
      const response = await this.chat(messages, {
        temperature: 0.3, // Lower temperature for consistency checking
        taskType: 'consistency'
      });

      let result;
      try {
        // Try to parse as JSON first
        result = JSON.parse(response.content);
      } catch (parseError) {
        // If JSON parsing fails, try to extract structured info from text
        result = this.parseConsistencyFromText(response.content);
      }

      // Ensure result has required structure
      if (!result.issues) result.issues = [];
      if (!result.summary) {
        const issues = result.issues;
        result.summary = {
          total: issues.length,
          high: issues.filter(i => i.severity === 'high').length,
          medium: issues.filter(i => i.severity === 'medium').length,
          low: issues.filter(i => i.severity === 'low').length
        };
      }

      // Log consistency check
      const duration = Date.now() - startTime;
      logger.logConsistencyCheck(novelData.id, scope, result.issues || [], duration);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Consistency check failed:', {
        novelId: novelData.id,
        scope,
        error: error.message,
        duration: `${duration}ms`
      });

      // Enhanced fallback response
      return {
        issues: [{
          type: 'system',
          severity: 'low',
          issue: 'AI一致性检查服务暂时不可用',
          suggestion: '请稍后重试，或手动检查内容一致性。您可以重点关注角色行为、时间线和世界设定的连贯性。'
        }],
        summary: { total: 1, high: 0, medium: 0, low: 1 }
      };
    }
  }

  parseConsistencyFromText(content) {
    const issues = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Look for issue indicators
      if (trimmed.includes('❌') || trimmed.includes('问题') || trimmed.includes('矛盾')) {
        issues.push({
          type: 'consistency',
          severity: 'medium',
          issue: trimmed.replace(/[❌⚠️🔴]/g, '').trim(),
          suggestion: '请检查并修正此一致性问题'
        });
      } else if (trimmed.includes('⚠️') || trimmed.includes('注意')) {
        issues.push({
          type: 'warning',
          severity: 'low',
          issue: trimmed.replace(/[❌⚠️🔴]/g, '').trim(),
          suggestion: '建议进一步确认此处内容'
        });
      }
    }

    return {
      issues,
      summary: {
        total: issues.length,
        high: 0,
        medium: issues.filter(i => i.severity === 'medium').length,
        low: issues.filter(i => i.severity === 'low').length
      },
      rawContent: content
    };
  }

  formatNovelDataForConsistency(novelData) {
    let formatted = `小说：${novelData.title}\n`;
    
    if (novelData.characters?.length > 0) {
      formatted += '\n角色信息：\n';
      novelData.characters.forEach(char => {
        formatted += `${char.name}: ${char.description}\n性格：${char.personality || '未设定'}\n背景：${char.background || '未设定'}\n\n`;
      });
    }

    if (novelData.chapters?.length > 0) {
      formatted += '\n章节内容：\n';
      novelData.chapters.forEach(chapter => {
        formatted += `第${chapter.chapterNumber}章 - ${chapter.title}\n`;
        if (chapter.outline) formatted += `大纲：${chapter.outline}\n`;
        if (chapter.content) formatted += `内容：${chapter.content.substring(0, 500)}...\n`;
        formatted += '\n';
      });
    }

    return formatted.substring(0, 8000); // Limit context size to avoid token limits
  }

  // New method for enhanced conversation support
  async generateConversationalResponse(novelContext, userMessage, conversationHistory = [], options = {}) {
    const systemPrompt = this.buildConversationalPrompt(novelContext, options.mode);

    const messages = [{ role: 'system', content: systemPrompt }];

    // Add relevant conversation history
    if (conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-8); // Last 8 messages
      messages.push(...recentHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })));
    }

    messages.push({ role: 'user', content: userMessage });

    const response = await this.chat(messages, {
      temperature: 0.8, // Slightly higher for natural conversation
      provider: options.provider,
      model: options.model
    });

    return {
      content: response.content,
      suggestions: this.extractBulletPoints(response.content, ['建议：', '建议:', '💡']),
      followUps: this.generateFollowUps(response.content, 'general', novelContext),
      metadata: {
        provider: response.provider,
        model: response.model,
        timestamp: new Date().toISOString()
      }
    };
  }

  buildConversationalPrompt(novelContext, mode = 'chat') {
    let prompt = '你是一个经验丰富的小说创作导师，具有深厚的文学功底和丰富的创作经验。请以友好、专业的态度与用户对话。';

    if (mode === 'enhance') {
      prompt += '当前专注于帮助用户完善创作内容，包括角色发展、情节设计和世界构建。';
    } else if (mode === 'check') {
      prompt += '当前专注于帮助用户进行质量检查，包括一致性分析和逻辑审核。';
    } else {
      prompt += '当前处于自由对话模式，可以讨论任何与创作相关的话题。';
    }

    if (novelContext) {
      prompt += `\n\n当前讨论的小说：《${novelContext.title}》`;
      if (novelContext.description) {
        prompt += `\n简介：${novelContext.description.substring(0, 200)}...`;
      }
    }

    prompt += `\n\n请注意：
• 保持对话的连续性和上下文理解
• 提供具体、可行的建议
• 适时提出引导性问题
• 鼓励用户的创作热情
• 用温暖、专业的语调回应`;

    return prompt;
  }
}

module.exports = new AIService();