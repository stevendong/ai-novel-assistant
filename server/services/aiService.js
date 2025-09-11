const OpenAI = require('openai');
const { aiConfig, validateConfig } = require('../config/aiConfig');
const { 
  withRetry, 
  buildRequestParams, 
  normalizeResponse, 
  validateResponse
} = require('../utils/aiHelpers');

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

  async openaiChat(provider, messages, options) {
    const taskType = options.taskType || 'default';
    
    const requestFn = async () => {
      const params = buildRequestParams('openai', taskType, {
        model: options.model || provider.models.chat,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        ...options.additionalParams
      });

      const response = await provider.client.chat.completions.create({
        messages: messages,
        ...params
      });

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
      console.error('OpenAI API Error:', error);
      throw new Error(`OpenAI API Error: ${error.message}`);
    }
  }

  async claudeChat(provider, messages, options) {
    try {
      // Convert OpenAI format messages to Claude format
      const systemMessage = messages.find(m => m.role === 'system')?.content || '';
      const userMessages = messages.filter(m => m.role !== 'system');
      
      const response = await fetch(`${provider.config.baseURL}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': provider.config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: options.model || provider.models.chat,
          system: systemMessage,
          messages: userMessages,
          max_tokens: options.maxTokens || 2000,
          temperature: options.temperature || 0.7,
          ...options.additionalParams
        })
      });

      if (!response.ok) {
        throw new Error(`Claude API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        content: data.content[0].text,
        usage: data.usage,
        provider: 'claude'
      };
    } catch (error) {
      console.error('Claude API Error:', error);
      throw new Error(`Claude API Error: ${error.message}`);
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

  parseResponse(content, type) {
    // Basic response structure
    const result = {
      message: content,
      suggestions: [],
      questions: [],
      actions: []
    };

    // Try to extract structured information from the response
    if (content.includes('建议：') || content.includes('建议:')) {
      const suggestions = this.extractBulletPoints(content, ['建议：', '建议:']);
      result.suggestions = suggestions;
    }

    if (content.includes('问题：') || content.includes('问题:')) {
      const questions = this.extractBulletPoints(content, ['问题：', '问题:']);
      result.questions = questions;
    }

    return result;
  }

  extractBulletPoints(text, markers) {
    const points = [];
    for (const marker of markers) {
      const index = text.indexOf(marker);
      if (index !== -1) {
        const section = text.substring(index + marker.length);
        const lines = section.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.match(/^\d+\./))) {
            points.push(trimmed.replace(/^[-•\d\.\s]+/, ''));
          }
        }
      }
    }
    return points;
  }

  async checkConsistency(novelData, scope = 'full') {
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

    const response = await this.chat(messages, {
      temperature: 0.3 // Lower temperature for consistency checking
    });

    try {
      return JSON.parse(response.content);
    } catch (error) {
      // Fallback if JSON parsing fails
      return {
        issues: [{
          type: 'general',
          severity: 'low',
          issue: '无法解析一致性检查结果',
          suggestion: '请手动检查内容一致性'
        }],
        summary: { total: 1, high: 0, medium: 0, low: 1 }
      };
    }
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

    return formatted;
  }
}

module.exports = new AIService();