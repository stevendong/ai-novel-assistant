const NodeCache = require('node-cache');
const { encoding_for_model } = require('@dqbd/tiktoken');
const prisma = require('../utils/prismaClient');
const aiService = require('./aiService');
const config = require('../config/characterChat');

class ConversationHistoryManager {
  constructor(conversationConfig) {
    this.config = conversationConfig;
    this.encoder = null;

    process.on('exit', () => {
      if (this.encoder) {
        try {
          this.encoder.free();
        } catch (error) {
          // ignore
        }
      }
    });
  }

  getEncoder() {
    if (this.encoder) return this.encoder;

    const model = this.config.encodingModel || 'gpt-4';
    try {
      this.encoder = encoding_for_model(model);
    } catch (error) {
      this.encoder = encoding_for_model('gpt-4');
    }

    return this.encoder;
  }

  countTokens(text) {
    if (!text) {
      return 0;
    }
    try {
      return this.getEncoder().encode(text).length;
    } catch (error) {
      return Math.ceil(text.length / 4);
    }
  }

  async loadHistory(conversationId, systemPrompt) {
    if (!conversationId) {
      return [];
    }

    const allMessages = await prisma.aIMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: this.config.maxHistoryMessages
    });

    if (!allMessages.length) {
      return [];
    }

    const availableTokens = Math.max(
      this.config.maxHistoryTokens - this.countTokens(systemPrompt || ''),
      0
    );

    const selected = [];
    let totalTokens = 0;

    for (const message of allMessages.reverse()) {
      const messageTokens = this.countTokens(message.content || '');

      if (
        selected.length >= this.config.minHistoryMessages &&
        totalTokens + messageTokens > availableTokens
      ) {
        break;
      }

      selected.push({
        role: message.role,
        content: message.content
      });
      totalTokens += messageTokens;
    }

    return selected;
  }
}

class CharacterChatService {
  constructor() {
    this.config = config;
    this.promptCache = new NodeCache({
      stdTTL: this.config.cache.promptTTL,
      checkperiod: this.config.cache.checkPeriod,
      useClones: false,
      maxKeys: this.config.cache.maxKeys
    });
    this.historyManager = new ConversationHistoryManager(this.config.conversation);
  }

  buildSystemPrompt(character, novel, worldSettings, aiConstraints, locale) {
    const languageRequirement = this.getLanguageRequirement(locale);

    const constraintsText = aiConstraints ? `
【内容约束】
- 内容分级：${aiConstraints.rating}
- 暴力程度：${aiConstraints.violence}/5
- 浪漫程度：${aiConstraints.romance}/5
- 语言程度：${aiConstraints.language}/5
${aiConstraints.customRules ? `- 其他规则：${aiConstraints.customRules}` : ''}` : '';

    const worldSettingsText = worldSettings && worldSettings.length > 0 ? `
【世界观设定】
${worldSettings.map(s => `- ${s.name}（${s.type}）：${s.description}`).join('\n')}` : '';

    const characterPrompt = character.systemPrompt || '';

    return `你现在要扮演角色"${character.name}"，与用户进行对话。请完全沉浸在这个角色中。

【角色基本信息】
- 姓名：${character.name}
- 性别：${character.gender || '未设定'}
- 年龄：${character.age || '未设定'}
- 身份：${character.identity || '未设定'}
- 描述：${character.description || '无'}

【外貌特征】
${character.appearance || '暂无描述'}

【性格特征】
${character.personality || '暂无描述'}

【核心价值观】
${character.values || '暂无描述'}

【恐惧与弱点】
${character.fears || '暂无描述'}

【背景故事】
${character.background || '暂无描述'}

【技能与能力】
${character.skills || '暂无描述'}

${character.relationships ? `【人际关系】
${typeof character.relationships === 'string' ? character.relationships : JSON.stringify(JSON.parse(character.relationships), null, 2)}
` : ''}

${worldSettingsText}

${constraintsText}

【对话指引】
1. 始终以第一人称"我"来回应，完全从角色的视角说话
2. 保持角色性格的一致性，所有回复都要符合角色的性格特征
3. 回复要符合世界观设定和内容约束
4. 用角色会使用的语气和措辞来表达
5. 根据角色的背景、经历和价值观来思考和回应
6. 展现角色的情感、想法和独特的说话方式
7. 可以适当引用角色的背景故事或人际关系来丰富对话

${characterPrompt ? `【角色专属提示】
${characterPrompt}` : ''}

${languageRequirement}

记住：你就是${character.name}，请完全沉浸在这个角色中进行对话。`;
  }

  getLanguageRequirement(localeInput) {
    if (!localeInput) {
      return '请使用简体中文与用户对话。';
    }

    const locale = String(localeInput).toLowerCase();
    if (locale.startsWith('zh')) {
      return '请使用简体中文与用户对话。';
    }
    if (locale.startsWith('en')) {
      return 'Please respond in English.';
    }
    return '请使用用户当前界面的语言进行回复。';
  }

  async getCharacterWithOwnership(characterId, userId) {
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      select: {
        id: true,
        name: true,
        avatar: true,
        novelId: true,
        novel: {
          select: {
            id: true,
            userId: true,
            title: true
          }
        }
      }
    });

    if (!character) {
      const error = new Error('Character not found');
      error.statusCode = 404;
      throw error;
    }

    if (character.novel?.userId !== userId) {
      const error = new Error('You do not have access to this character');
      error.statusCode = 403;
      throw error;
    }

    return character;
  }

  async getSystemPrompt(character, locale) {
    const cacheKey = `${character.id}:${locale || 'default'}`;
    const cached = this.promptCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const fullCharacter = await prisma.character.findUnique({
      where: { id: character.id },
      include: {
        novel: {
          include: {
            settings: true,
            aiSettings: true
          }
        }
      }
    });

    if (!fullCharacter) {
      const error = new Error('Character not found');
      error.statusCode = 404;
      throw error;
    }

    const prompt = this.buildSystemPrompt(
      fullCharacter,
      fullCharacter.novel,
      fullCharacter.novel?.settings || [],
      fullCharacter.novel?.aiSettings || null,
      locale
    );

    this.promptCache.set(cacheKey, prompt);
    return prompt;
  }

  invalidatePrompt(characterId) {
    const keys = this.promptCache.keys().filter((key) => key.startsWith(`${characterId}:`));
    if (keys.length > 0) {
      this.promptCache.del(keys);
    }
  }

  async getConversation(conversationId, userId) {
    if (!conversationId) {
      return null;
    }

    const conversation = await prisma.aIConversation.findUnique({
      where: { id: conversationId },
      include: {
        user: { select: { id: true } }
      }
    });

    if (!conversation) {
      const error = new Error('Conversation not found');
      error.statusCode = 404;
      throw error;
    }

    if (conversation.userId !== userId) {
      const error = new Error('You do not have access to this conversation');
      error.statusCode = 403;
      throw error;
    }

    return conversation;
  }

  async createConversation(user, character, locale) {
    const metadata = {
      characterId: character.id,
      characterName: character.name,
      characterAvatar: character.avatar,
      locale: locale || 'default',
      startedAt: new Date().toISOString()
    };

    return prisma.aIConversation.create({
      data: {
        userId: user.id,
        novelId: character.novelId,
        mode: 'character_chat',
        title: `Chat with ${character.name}`,
        settings: JSON.stringify(metadata)
      }
    });
  }

  async getOrCreateConversation(conversationId, user, character, locale) {
    if (conversationId) {
      const existing = await this.getConversation(conversationId, user.id);
      return { conversation: existing, created: false };
    }

    const conversation = await this.createConversation(user, character, locale);
    return { conversation, created: true };
  }

  async saveUserMessage(conversationId, content) {
    return prisma.aIMessage.create({
      data: {
        conversationId,
        role: 'user',
        content
      }
    });
  }

  async saveAssistantMessage(conversationId, content, character, extraMetadata = {}) {
    const metadata = {
      characterId: character.id,
      characterName: character.name,
      characterAvatar: character.avatar,
      ...extraMetadata
    };

    const messageCreate = prisma.aIMessage.create({
      data: {
        conversationId,
        role: 'assistant',
        content,
        metadata: JSON.stringify(metadata)
      }
    });

    const conversationUpdate = prisma.aIConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    });

    await prisma.$transaction([messageCreate, conversationUpdate]);
  }

  buildMessages(history, systemPrompt, userMessage) {
    const messages = [{ role: 'system', content: systemPrompt }];
    if (history?.length) {
      messages.push(...history);
    }
    messages.push({ role: 'user', content: userMessage });
    return messages;
  }

  buildAIOptions(meta, character) {
    return {
      temperature: this.config.ai.temperature,
      maxTokens: this.config.ai.maxTokens,
      model: this.config.ai.model,
      provider: this.config.ai.provider,
      taskType: 'character_chat',
      userId: meta.userId,
      novelId: character.novelId,
      requestUrl: meta.requestUrl
    };
  }

  async chat({ characterId, user, payload, requestMeta }) {
    const { message, conversationId, locale } = payload;

    if (!message) {
      const error = new Error('Message is required');
      error.statusCode = 400;
      throw error;
    }

    const character = await this.getCharacterWithOwnership(characterId, user.id);
    const { conversation, created } = await this.getOrCreateConversation(conversationId, user, character, locale);
    const systemPrompt = await this.getSystemPrompt(character, locale);
    const history = await this.historyManager.loadHistory(conversation.id, systemPrompt);

    await this.saveUserMessage(conversation.id, message);

    const aiOptions = this.buildAIOptions(
      {
        userId: user.id,
        requestUrl: requestMeta?.requestUrl
      },
      character
    );

    const aiResponse = await aiService.chat(this.buildMessages(history, systemPrompt, message), aiOptions);

    await this.saveAssistantMessage(conversation.id, aiResponse.content, character, { locale });

    return {
      conversationId: conversation.id,
      created,
      content: aiResponse.content,
      usage: aiResponse.usage || null,
      characterName: character.name,
      characterAvatar: character.avatar
    };
  }

  async prepareStream({ characterId, user, payload, requestMeta }) {
    const { message, conversationId, locale } = payload;

    if (!message) {
      const error = new Error('Message is required');
      error.statusCode = 400;
      throw error;
    }

    const character = await this.getCharacterWithOwnership(characterId, user.id);
    const { conversation } = await this.getOrCreateConversation(conversationId, user, character, locale);
    const systemPrompt = await this.getSystemPrompt(character, locale);
    const history = await this.historyManager.loadHistory(conversation.id, systemPrompt);

    await this.saveUserMessage(conversation.id, message);

    const aiOptions = this.buildAIOptions(
      {
        userId: user.id,
        requestUrl: requestMeta?.requestUrl
      },
      character
    );

    const stream = await aiService.chatStream(this.buildMessages(history, systemPrompt, message), aiOptions);

    return {
      stream,
      conversation,
      character,
      locale,
      systemPrompt
    };
  }
}

module.exports = new CharacterChatService();
