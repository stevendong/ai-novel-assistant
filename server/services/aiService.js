const OpenAI = require('openai');
const { aiConfig, validateConfig } = require('../config/aiConfig');
const {
  withRetry,
  buildRequestParams,
  normalizeResponse,
  validateResponse
} = require('../utils/aiHelpers');
const logger = require('../utils/logger');
const memoryService = require('./memoryService');

const DEFAULT_LOCALE = 'zh';

const LOCALE_PROMPTS = {
  zh: {
    intro: '你是一个专业的小说创作助手。',
    responseDirective: '请使用简体中文回答，并根据需要对用户提供的信息进行润色，使其自然流畅。',
    novelInfoHeading: '当前小说信息：',
    titleLabel: '标题：',
    descriptionLabel: '描述：',
    genreLabel: '类型：',
    mainCharactersHeading: '主要角色：',
    worldSettingsHeading: '世界设定：',
    contentRestrictionsLabel: '内容限制：分级',
    typeGuidance: {
      creative: '请以创意和想象力为重点回答。',
      analytical: '请以逻辑分析和结构化思考为重点回答。',
      consistency: '请重点关注内容的一致性和连贯性。',
      default: '请提供有帮助的建议和分析。'
    },
    memory: {
      heading: '=== 相关记忆上下文 ===',
      intro: '以下是与当前对话相关的历史记忆，请在回答时参考这些信息以保持连贯性和个性化：',
      closing: '请基于这些记忆信息和当前小说背景，提供连贯、一致且个性化的回答。',
      conflictNotice: '如果发现记忆中的信息与当前设定有冲突，请优先使用当前设定并提醒我。',
      typeLabel: '类型',
      importantTag: '重要'
    }
  },
  en: {
    intro: 'You are a professional novel writing assistant.',
    responseDirective: 'Always respond in English to match the current application language while keeping the tone clear and helpful.',
    novelInfoHeading: 'Current novel information:',
    titleLabel: 'Title: ',
    descriptionLabel: 'Description: ',
    genreLabel: 'Genre: ',
    mainCharactersHeading: 'Main characters:',
    worldSettingsHeading: 'World settings:',
    contentRestrictionsLabel: 'Content rating: ',
    typeGuidance: {
      creative: 'Focus on creativity and imagination in your response.',
      analytical: 'Prioritize logical analysis and structured thinking.',
      consistency: 'Keep the response focused on consistency and coherence.',
      default: 'Provide helpful suggestions and analysis.'
    },
    memory: {
      heading: '=== Related memory context ===',
      intro: 'The following memories are relevant to this conversation. Use them to keep replies coherent and personalized:',
      closing: 'Use these memories together with the current novel context to deliver coherent, consistent, and personalized answers.',
      conflictNotice: 'If the memories conflict with the current setup, prioritize the current setup and point out the discrepancy.',
      typeLabel: 'Type',
      importantTag: 'Important'
    }
  }
};

function normalizeLocale(locale) {
  if (!locale) return DEFAULT_LOCALE;
  const normalized = String(locale).toLowerCase();
  if (LOCALE_PROMPTS[normalized]) {
    return normalized;
  }
  const base = normalized.split('-')[0];
  return LOCALE_PROMPTS[base] ? base : DEFAULT_LOCALE;
}

function getLocaleConfig(locale) {
  return LOCALE_PROMPTS[normalizeLocale(locale)];
}

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

    // Initialize Gemini provider
    if (aiConfig.gemini.apiKey) {
      this.providers.set('gemini', {
        client: null, // Will be initialized when needed
        config: {
          apiKey: aiConfig.gemini.apiKey,
          baseURL: aiConfig.gemini.baseURL,
          timeout: aiConfig.gemini.timeout
        },
        type: 'gemini',
        models: {
          chat: aiConfig.gemini.model
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
    } else if (provider.type === 'gemini') {
      return await this.geminiChat(provider, messages, options);
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
    } else if (provider.type === 'gemini') {
      return await this.geminiChatStream(provider, messages, options);
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

  async geminiChat(provider, messages, options) {
    const startTime = Date.now();
    const taskType = options.taskType || 'default';

    try {
      // Convert OpenAI format messages to Gemini format
      const systemMessage = messages.find(m => m.role === 'system')?.content || '';
      const userMessages = messages.filter(m => m.role !== 'system');

      // Gemini uses "contents" array with "parts"
      const contents = userMessages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      // Add system instruction if present
      const requestData = {
        contents: contents,
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens || 2048,
          topP: options.topP || 0.95,
          topK: options.topK || 40
        }
      };

      // Add system instruction if available
      if (systemMessage) {
        requestData.systemInstruction = {
          parts: [{ text: systemMessage }]
        };
      }

      const model = options.model || provider.models.chat;
      const url = `${provider.config.baseURL}/models/${model}:generateContent?key=${provider.config.apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData),
        signal: options.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        const duration = Date.now() - startTime;
        const error = new Error(`Gemini API Error: ${response.status} ${response.statusText} - ${errorText}`);
        logger.logApiCall('gemini', `/models/${model}:generateContent`, requestData, null, duration, error);
        throw error;
      }

      const data = await response.json();

      // Log successful API call
      const duration = Date.now() - startTime;
      logger.logApiCall('gemini', `/models/${model}:generateContent`, requestData, data, duration);

      // Extract content from Gemini response
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      return {
        content: content,
        usage: {
          promptTokens: data.usageMetadata?.promptTokenCount || 0,
          completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: data.usageMetadata?.totalTokenCount || 0
        },
        provider: 'gemini',
        model: model,
        finishReason: data.candidates?.[0]?.finishReason || 'stop'
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Gemini API Error:', {
        error: error.message,
        stack: error.stack,
        model: options.model || provider.models.chat,
        messageCount: messages.length
      });
      throw new Error(`Gemini API Error: ${error.message}`);
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

  async geminiChatStream(provider, messages, options) {
    const startTime = Date.now();

    try {
      // Convert OpenAI format messages to Gemini format
      const systemMessage = messages.find(m => m.role === 'system')?.content || '';
      const userMessages = messages.filter(m => m.role !== 'system');

      // Gemini uses "contents" array with "parts"
      const contents = userMessages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const requestData = {
        contents: contents,
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens || 2048,
          topP: options.topP || 0.95,
          topK: options.topK || 40
        }
      };

      // Add system instruction if available
      if (systemMessage) {
        requestData.systemInstruction = {
          parts: [{ text: systemMessage }]
        };
      }

      const model = options.model || provider.models.chat;
      const url = `${provider.config.baseURL}/models/${model}:streamGenerateContent?key=${provider.config.apiKey}&alt=sse`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData),
        signal: options.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`Gemini Stream Error: ${response.status} ${response.statusText} - ${errorText}`);
        throw error;
      }

      // Return readable stream that can be consumed by the route handler
      return response.body;
    } catch (error) {
      logger.error('Gemini Stream Error:', {
        error: error.message,
        stack: error.stack,
        model: options.model || provider.models.chat,
        messageCount: messages.length
      });
      throw new Error(`Gemini Stream Error: ${error.message}`);
    }
  }

  // Novel-specific AI methods (Enhanced with Memory)
  async generateResponse(novelContext, userMessage, type = 'general', options = {}) {
    const startTime = Date.now();

    try {
      const locale = normalizeLocale(options.locale);

      // 1. 检索相关记忆（如果启用且有用户ID）
      let memories = [];
      if (options.userId) {
        memories = await memoryService.retrieveRelevantMemories(userMessage, {
          userId: options.userId,
          novelId: novelContext?.id,
          mode: type,
          messageType: options.messageType
        });
      }

      // 2. 构建增强的系统提示词
      const systemPrompt = memories.length > 0
        ? this.buildMemoryEnhancedPrompt(novelContext, type, memories, locale)
        : this.buildSystemPrompt(novelContext, type, locale);

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ];

      // 3. 调用AI模型
      const response = await this.chat(messages, {
        temperature: options.temperature || (type === 'creative' ? 0.9 : 0.7),
        provider: options.provider,
        model: options.model
      });

      // 4. 解析响应
      const parsedResponse = this.parseResponse(response.content, type, novelContext, locale);
      const metadata = {
        ...parsedResponse.metadata,
        memoriesUsed: memories.length,
        memoryEnhanced: memories.length > 0,
        processingTime: Date.now() - startTime,
        language: locale
      };

      // 5. 异步更新记忆（不阻塞响应）
      if (options.userId) {
        this.updateMemoriesAsync(userMessage, response.content, {
          userId: options.userId,
          novelId: novelContext?.id,
          mode: type,
          messageType: options.messageType,
          locale
        });
      }

      // 6. 记录性能指标
      const duration = metadata.processingTime;
      logger.info(`AI Response with Memory: ${duration}ms, memories used: ${memories.length}`);

      return {
        ...parsedResponse,
        metadata
      };

    } catch (error) {
      logger.error('Memory-enhanced AI generation failed:', error);
      // 降级到无记忆模式
      return await this.generateResponseFallback(novelContext, userMessage, type, options);
    }
  }

  // 原有方法作为降级方案
  async generateResponseFallback(novelContext, userMessage, type = 'general', options = {}) {
    logger.info('Using fallback mode (no memory enhancement)');

    const locale = normalizeLocale(options.locale);
    const startTime = Date.now();
    const systemPrompt = this.buildSystemPrompt(novelContext, type, locale);

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ];

    const response = await this.chat(messages, {
      temperature: options.temperature || (type === 'creative' ? 0.9 : 0.7),
      provider: options.provider,
      model: options.model
    });

    const parsedResponse = this.parseResponse(response.content, type, novelContext, locale);
    const processingTime = Date.now() - startTime;
    return {
      ...parsedResponse,
      metadata: {
        ...parsedResponse.metadata,
        language: locale,
        memoriesUsed: 0,
        memoryEnhanced: false,
        processingTime
      }
    };
  }

  // 构建记忆增强的提示词
  buildMemoryEnhancedPrompt(novelContext, type, memories, locale = DEFAULT_LOCALE) {
    const config = getLocaleConfig(locale);
    let basePrompt = this.buildSystemPrompt(novelContext, type, locale);

    if (memories && memories.length > 0) {
      basePrompt += `\n\n${config.memory.heading}\n`;
      basePrompt += `${config.memory.intro}\n`;

      memories.forEach((memory, index) => {
        basePrompt += `\n${index + 1}. ${memory.content}`;
        if (memory.metadata?.memory_type) {
          basePrompt += ` [${config.memory.typeLabel}: ${memory.metadata.memory_type}]`;
        }
        if (memory.metadata?.importance > 3) {
          basePrompt += ` [${config.memory.importantTag}]`;
        }
      });

      basePrompt += `\n\n${config.memory.closing}`;
      basePrompt += `\n${config.memory.conflictNotice}`;
    }

    return basePrompt;
  }

  // 异步更新记忆
  async updateMemoriesAsync(userMessage, aiResponse, context) {
    try {
      // 提取重要信息进行记忆
      const importantInfo = this.extractImportantInformation(userMessage, aiResponse, context);

      if (importantInfo.length > 0) {
        // 使用批量添加以避免阻塞
        await memoryService.addMemoryBatch(
          importantInfo.map(info => ({
            content: info.content,
            context: context,
            metadata: {
              memory_type: info.type,
              confidence: info.confidence,
              source: 'ai_conversation',
              extractedFrom: 'ai_response'
            }
          }))
        );
      }

      // 如果用户消息包含明确的偏好表达，也记录下来
      if (this.containsUserPreference(userMessage)) {
        await memoryService.addMemoryBatch([{
          content: `用户偏好表达: ${userMessage}`,
          context: context,
          metadata: {
            memory_type: 'user_preference',
            confidence: 0.9,
            source: 'user_message'
          }
        }]);
      }

    } catch (error) {
      logger.error('Memory update failed:', error);
    }
  }

  // 提取重要信息
  extractImportantInformation(userMessage, aiResponse, context) {
    const importantInfo = [];

    // 角色相关信息提取
    const characterPatterns = [
      /(?:角色|人物)[^。]*?([^。]{10,})/g,
      /(?:性格|特征|背景)[^。]*?([^。]{10,})/g,
      /(?:他|她|它)(?:是|会|能)[^。]*?([^。]{10,})/g
    ];

    characterPatterns.forEach(pattern => {
      const matches = aiResponse.match(pattern);
      if (matches) {
        matches.forEach(match => {
          importantInfo.push({
            content: match.trim(),
            type: 'character_trait',
            confidence: 0.8
          });
        });
      }
    });

    // 世界设定相关信息
    const settingPatterns = [
      /(?:世界|设定|规则)[^。]*?([^。]{10,})/g,
      /(?:地点|位置|环境)[^。]*?([^。]{10,})/g,
      /(?:文化|传统|习俗)[^。]*?([^。]{10,})/g
    ];

    settingPatterns.forEach(pattern => {
      const matches = aiResponse.match(pattern);
      if (matches) {
        matches.forEach(match => {
          importantInfo.push({
            content: match.trim(),
            type: 'world_setting',
            confidence: 0.8
          });
        });
      }
    });

    // 创作决策
    const decisionPatterns = [
      /(?:建议|推荐|应该)[^。]*?([^。]{10,})/g,
      /(?:可以|能够|不妨)[^。]*?([^。]{10,})/g
    ];

    decisionPatterns.forEach(pattern => {
      const matches = aiResponse.match(pattern);
      if (matches) {
        matches.forEach(match => {
          importantInfo.push({
            content: match.trim(),
            type: 'creative_decision',
            confidence: 0.6
          });
        });
      }
    });

    // 一致性规则
    if (context.mode === 'check' || aiResponse.includes('一致性') || aiResponse.includes('矛盾')) {
      const consistencyPatterns = [
        /(?:需要注意|要避免|应该保持)[^。]*?([^。]{10,})/g,
        /(?:一致性|矛盾)[^。]*?([^。]{10,})/g
      ];

      consistencyPatterns.forEach(pattern => {
        const matches = aiResponse.match(pattern);
        if (matches) {
          matches.forEach(match => {
            importantInfo.push({
              content: match.trim(),
              type: 'consistency_rule',
              confidence: 0.9
            });
          });
        }
      });
    }

    // 去重和质量过滤
    const uniqueInfo = [];
    const seenContent = new Set();

    importantInfo.forEach(info => {
      const normalized = info.content.toLowerCase().replace(/\s+/g, '');
      if (!seenContent.has(normalized) && info.content.length >= 10) {
        seenContent.add(normalized);
        uniqueInfo.push(info);
      }
    });

    return uniqueInfo.slice(0, 5); // 限制数量避免过多记忆
  }

  // 检测用户偏好表达
  containsUserPreference(userMessage) {
    const preferenceKeywords = [
      '喜欢', '不喜欢', '希望', '不希望', '想要', '不想要',
      '偏好', '倾向于', '避免', '总是', '从不', '永远'
    ];

    return preferenceKeywords.some(keyword => userMessage.includes(keyword));
  }

  async generateResponseStream(novelContext, userMessage, type = 'general', options = {}) {
    const startTime = Date.now();

    try {
      const locale = normalizeLocale(options.locale);
      // 1. 检索相关记忆（如果启用且有用户ID）
      let memories = [];
      if (options.userId) {
        memories = await memoryService.retrieveRelevantMemories(userMessage, {
          userId: options.userId,
          novelId: novelContext?.id,
          mode: type,
          messageType: options.messageType
        });
      }

      // 2. 构建增强的系统提示词
      const systemPrompt = memories.length > 0
        ? this.buildMemoryEnhancedPrompt(novelContext, type, memories, locale)
        : this.buildSystemPrompt(novelContext, type, locale);

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ];

      // 3. 创建流式响应
      const stream = await this.chatStream(messages, {
        temperature: options.temperature || (type === 'creative' ? 0.9 : 0.7),
        provider: options.provider,
        model: options.model
      });

      // 4. 包装流式响应以支持记忆更新
      return this.wrapStreamWithMemoryUpdate(stream, {
        userMessage,
        context: {
          userId: options.userId,
          novelId: novelContext?.id,
          mode: type,
          messageType: options.messageType,
          locale
        },
        memoriesUsed: memories.length,
        startTime
      });

    } catch (error) {
      logger.error('Memory-enhanced streaming failed:', error);
      // 降级到无记忆模式
      return await this.generateResponseStreamFallback(novelContext, userMessage, type, options);
    }
  }

  // 降级方案：无记忆的流式响应
  async generateResponseStreamFallback(novelContext, userMessage, type = 'general', options = {}) {
    logger.info('Using fallback mode for streaming (no memory enhancement)');

    const locale = normalizeLocale(options.locale);
    const systemPrompt = this.buildSystemPrompt(novelContext, type, locale);

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ];

    return await this.chatStream(messages, {
      temperature: options.temperature || (type === 'creative' ? 0.9 : 0.7),
      provider: options.provider,
      model: options.model
    });
  }

  /**
   * 包装流式响应以支持记忆更新
   */
  wrapStreamWithMemoryUpdate(originalStream, memoryContext) {
    const { userMessage, context, memoriesUsed, startTime } = memoryContext;
    let fullResponse = '';

    // 创建一个新的异步生成器
    const wrappedStream = async function* () {
      try {
        // 流式传递原始响应
        for await (const chunk of originalStream) {
          // 收集完整响应内容
          const choice = chunk.choices?.[0];
          if (choice?.delta?.content) {
            fullResponse += choice.delta.content;
          }

          // 原样传递chunk
          yield chunk;

          // 检测到流式响应结束
          if (choice?.finish_reason) {
            // 异步更新记忆，不阻塞响应
            if (context.userId && fullResponse.trim()) {
              setImmediate(async () => {
                try {
                  await aiService.updateMemoriesAsync(userMessage, fullResponse, context);

                  // 记录性能指标
                  const duration = Date.now() - startTime;
                  logger.info(`Streaming response with memory: ${duration}ms, memories used: ${memoriesUsed}`);
                } catch (error) {
                  logger.error('Failed to update memories after streaming:', error);
                }
              });
            }
          }
        }
      } catch (error) {
        logger.error('Error in wrapped stream:', error);
        throw error;
      }
    };

    return wrappedStream();
  }

  buildSystemPrompt(novelContext, type, locale = DEFAULT_LOCALE) {
    const config = getLocaleConfig(locale);
    let basePrompt = config.intro;

    if (novelContext) {
      basePrompt += `\n${config.novelInfoHeading}`;

      if (novelContext.title) {
        basePrompt += `\n${config.titleLabel}${novelContext.title}`;
      }
      if (novelContext.description) {
        basePrompt += `\n${config.descriptionLabel}${novelContext.description}`;
      }
      if (novelContext.genre) {
        basePrompt += `\n${config.genreLabel}${novelContext.genre}`;
      }

      if (novelContext.characters?.length > 0) {
        const characterLines = novelContext.characters
          .map(c => `- ${c.name}${c.description ? `: ${c.description}` : ''}`)
          .join('\n');
        basePrompt += `\n${config.mainCharactersHeading}\n${characterLines}`;
      }

      if (novelContext.settings?.length > 0) {
        const settingLines = novelContext.settings
          .map(s => `- ${s.name}${s.description ? `: ${s.description}` : ''}`)
          .join('\n');
        basePrompt += `\n${config.worldSettingsHeading}\n${settingLines}`;
      }

      if (novelContext.aiSettings?.rating) {
        basePrompt += `\n${config.contentRestrictionsLabel}${novelContext.aiSettings.rating}`;
      }
    }

    const typeInstruction = config.typeGuidance?.[type] || config.typeGuidance?.default;
    if (typeInstruction) {
      basePrompt += `\n${typeInstruction}`;
    }

    if (config.responseDirective) {
      basePrompt += `\n${config.responseDirective}`;
    }

    return basePrompt;
  }

  parseResponse(content, type, novelContext = null, locale = DEFAULT_LOCALE) {
    const normalizedLocale = normalizeLocale(locale);
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
    result.metadata.language = normalizedLocale;

    // Extract structured information with multiple patterns
    const suggestionMarkers = [
      '建议：',
      '建议:',
      '💡',
      '✅',
      '推荐：',
      '推荐:',
      'Suggestion:',
      'Suggestions:',
      'Tip:',
      'Tips:',
      'Recommendation:',
      'Recommendations:'
    ];
    const questionMarkers = [
      '问题：',
      '问题:',
      '❓',
      '🤔',
      '需要考虑：',
      '需要考虑:',
      'Question:',
      'Questions:',
      'Consider:',
      'Considerations:',
      'Open question:',
      'Reflection:'
    ];
    const actionMarkers = [
      '下一步：',
      '下一步:',
      '🎯',
      '⚡',
      '行动建议：',
      '行动建议:',
      'Next step:',
      'Next steps:',
      'Next Step:',
      'Next Steps:',
      'Action:',
      'Actions:',
      'Recommended action:',
      'Recommended actions:'
    ];

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
    result.followUps = this.generateFollowUps(content, type, novelContext, normalizedLocale);

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

  generateFollowUps(content, type, novelContext, locale = DEFAULT_LOCALE) {
    const normalizedLocale = normalizeLocale(locale);
    const followUps = [];
    const text = content || '';
    const lowerText = text.toLowerCase();

    const isCharacterTopic =
      type === 'character' ||
      text.includes('角色') ||
      text.includes('性格') ||
      lowerText.includes('character') ||
      lowerText.includes('personality');

    if (isCharacterTopic) {
      if (normalizedLocale === 'en') {
        followUps.push("Should I expand this character's backstory even further?");
        followUps.push("Do you want suggestions for this character's dialogue style or traits?");
      } else {
        followUps.push('要不要继续完善这个角色的背景故事？');
        followUps.push('需要为这个角色设计一些具体的对话风格吗？');
      }
    }

    const isWorldbuildingTopic =
      type === 'worldbuilding' ||
      text.includes('设定') ||
      text.includes('世界') ||
      lowerText.includes('world') ||
      lowerText.includes('setting') ||
      lowerText.includes('lore');

    if (isWorldbuildingTopic) {
      if (normalizedLocale === 'en') {
        followUps.push("Would you like me to expand the world's history or lore?");
        followUps.push('Should we define more rules or constraints for this setting?');
      } else {
        followUps.push('需要进一步扩展这个世界的历史背景吗？');
        followUps.push('要为这个设定添加一些具体的规则限制吗？');
      }
    }

    const mentionsConsistency =
      type === 'consistency' ||
      text.includes('问题') ||
      text.includes('矛盾') ||
      lowerText.includes('issue') ||
      lowerText.includes('conflict') ||
      lowerText.includes('inconsistency');

    if (mentionsConsistency) {
      if (normalizedLocale === 'en') {
        followUps.push('Would you like a concrete plan to resolve these issues?');
        followUps.push('Should I check other chapters for similar inconsistencies?');
      } else {
        followUps.push('要我帮你制定修复这些问题的具体方案吗？');
        followUps.push('需要检查其他章节是否有类似问题吗？');
      }
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
