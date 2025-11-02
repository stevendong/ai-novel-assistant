const { MemoryClient } = require('mem0ai');
const memoryConfig = require('../config/memoryConfig');
const logger = require('../utils/logger');
const prisma = require('../utils/prismaClient');

class MemoryService {
  constructor() {
    this.client = null;
    this.prisma = prisma;
    this.initializeClient();

    // 性能指标
    this.metrics = {
      retrievalCount: 0,
      retrievalTimeTotal: 0,
      additionCount: 0,
      additionTimeTotal: 0,
      fallbackCount: 0,
      errorCount: 0
    };

    // 批量更新队列
    this.updateQueue = [];
    this.isProcessingQueue = false;
  }

  /**
   * 初始化Mem0客户端
   */
  initializeClient() {
    if (!memoryConfig.enabled) {
      logger.info('Memory service is disabled');
      return;
    }

    try {
      const config = memoryConfig.cloud;
      if (!config.apiKey) {
        logger.warn('MEM0_API_KEY not provided, memory service will use fallback mode');
        return;
      }

      this.client = new MemoryClient({
        apiKey: config.apiKey,
        host: config.baseUrl
      });

      logger.info('Memory service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize memory service:', error);
      this.client = null;
    }
  }

  /**
   * 检索相关记忆
   */
  async retrieveRelevantMemories(query, context) {
    if (!this.isAvailable()) {
      return [];
    }

    const startTime = Date.now();

    try {
      const { userId, novelId, mode, messageType } = context;

      // 构建搜索选项
      const searchOptions = {
        user_id: userId,
        limit: memoryConfig.memory.maxRetrievalCount,
        metadata: {
          novel_id: novelId || null
        }
      };

      // 添加记忆类型过滤
      const relevantTypes = this.getRelevantMemoryTypes(mode, messageType);
      if (relevantTypes.length > 0) {
        searchOptions.filters = {
          memory_type: relevantTypes
        };
      }

      // 调用正确的search API
      const memories = await this.client.search(query, searchOptions);

      // 记录性能指标
      const duration = Date.now() - startTime;
      this.recordRetrieval(duration, memories.length);

      // 排序和过滤记忆
      const rankedMemories = this.rankMemories(memories, context);

      if (memoryConfig.logging.enablePerformanceLog) {
        logger.info(`Memory retrieval: ${duration}ms, ${rankedMemories.length} memories found`);
      }

      return rankedMemories;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.metrics.errorCount++;

      logger.error('Memory retrieval failed:', {
        error: error.message,
        duration: `${duration}ms`,
        context
      });

      // 尝试从本地备份检索
      if (memoryConfig.fallbackEnabled) {
        return await this.retrieveFromLocalBackup(query, context);
      }

      return [];
    }
  }

  /**
   * 添加新记忆
   */
  async addMemory(content, context, metadata = {}) {
    // 验证内容长度
    if (!content || content.length < memoryConfig.memory.minContentLength) {
      return null;
    }

    const startTime = Date.now();

    try {
      if (this.isAvailable()) {
        // 构建消息格式
        const messages = [{
          role: 'user',
          content: content
        }];

        // 构建选项
        const options = {
          user_id: context.userId,
          metadata: {
            novel_id: context.novelId,
            mode: context.mode,
            message_type: context.messageType,
            memory_type: metadata.memory_type || 'general',
            importance: this.calculateImportance(content, context, metadata),
            timestamp: Date.now(),
            ...metadata
          }
        };

        const result = await this.client.add(messages, options);

        // 记录性能指标
        const duration = Date.now() - startTime;
        this.recordAddition(duration, true);

        // 异步备份到本地
        this.backupMemoryToLocal(result, { messages, options });

        if (memoryConfig.logging.enablePerformanceLog) {
          logger.info(`Memory added: ${duration}ms, ID: ${result.id}`);
        }

        return result;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordAddition(duration, false);

      logger.error('Memory addition failed:', {
        error: error.message,
        duration: `${duration}ms`,
        context
      });
    }

    // 降级：仅保存到本地
    if (memoryConfig.fallbackEnabled) {
      return await this.addToLocalBackup(content, context, metadata);
    }

    return null;
  }

  /**
   * 批量添加记忆（异步队列处理）
   */
  async addMemoryBatch(memories) {
    this.updateQueue.push(...memories);

    if (!this.isProcessingQueue) {
      setTimeout(() => this.processUpdateQueue(), memoryConfig.memory.batchUpdateDelay);
    }
  }

  /**
   * 处理批量更新队列
   */
  async processUpdateQueue() {
    if (this.isProcessingQueue || this.updateQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    const batchSize = memoryConfig.performance.batchUpdateSize;

    try {
      while (this.updateQueue.length > 0) {
        const batch = this.updateQueue.splice(0, batchSize);

        await Promise.allSettled(
          batch.map(memory =>
            this.addMemory(memory.content, memory.context, memory.metadata)
          )
        );

        // 避免过快的请求
        if (this.updateQueue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (error) {
      logger.error('Batch memory processing failed:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }


  /**
   * 计算记忆重要性
   */
  calculateImportance(content, context, metadata) {
    let importance = 1; // 基础重要性

    // 内容关键词加权
    const importantKeywords = ['重要', '核心', '关键', '必须', '永远'];
    const characterKeywords = ['角色', '性格', '特征', '背景'];
    const settingKeywords = ['设定', '世界', '规则', '文化'];

    importantKeywords.forEach(keyword => {
      if (content.includes(keyword)) importance += 2;
    });

    characterKeywords.forEach(keyword => {
      if (content.includes(keyword)) importance += 1;
    });

    settingKeywords.forEach(keyword => {
      if (content.includes(keyword)) importance += 1;
    });

    // 模式加权
    if (context.mode === 'enhance') importance += 1;
    if (context.mode === 'check') importance += 1;

    // 用户明确的偏好表达
    if (content.includes('喜欢') || content.includes('不喜欢')) importance += 2;
    if (content.includes('希望') || content.includes('避免')) importance += 1;

    // 元数据加权
    if (metadata && metadata.userConfirmed) importance += 2;
    if (metadata && metadata.aiSuggested) importance += 0.5;

    return Math.min(importance, 5); // 最高5级
  }

  /**
   * 获取相关记忆类型
   */
  getRelevantMemoryTypes(mode, messageType) {
    const types = memoryConfig.modeMemoryTypes[mode] || ['user_preference'];

    // 根据消息类型进一步筛选
    if (messageType === 'character') {
      return types.filter(type =>
        ['character_trait', 'user_preference', 'creative_decision'].includes(type)
      );
    }

    if (messageType === 'worldbuilding') {
      return types.filter(type =>
        ['world_setting', 'user_preference', 'creative_decision'].includes(type)
      );
    }

    return types;
  }

  /**
   * 记忆排序和筛选
   */
  rankMemories(memories, context) {
    if (!memories || memories.length === 0) {
      return [];
    }

    return memories
      .filter(memory => {
        // 过滤掉重要性过低的记忆
        const importance = memory.metadata?.importance || 1;
        return importance >= memoryConfig.memory.importanceThreshold;
      })
      .sort((a, b) => {
        // 综合评分：相关性分数 + 重要性 + 时间新近度
        const scoreA = this.calculateMemoryScore(a, context);
        const scoreB = this.calculateMemoryScore(b, context);
        return scoreB - scoreA;
      })
      .slice(0, 5) // 限制返回数量
      .map(memory => ({
        // 统一返回格式，兼容原有代码
        content: memory.memory || memory.content,
        score: memory.score || 0,
        metadata: memory.metadata || {}
      }));
  }

  /**
   * 计算记忆评分
   */
  calculateMemoryScore(memory, context) {
    let score = memory.score || 0; // 基础相关性评分

    // 重要性加权
    const importance = memory.metadata?.importance || 1;
    score += importance * 0.3;

    // 时间新近度加权（最近的记忆权重更高）
    if (memory.metadata?.timestamp) {
      const ageInDays = (Date.now() - memory.metadata.timestamp) / (1000 * 60 * 60 * 24);
      const recencyBonus = Math.max(0, 1 - ageInDays / 30); // 30天内线性衰减
      score += recencyBonus * 0.2;
    }

    // 同小说加权
    if (memory.metadata?.novel_id && memory.metadata.novel_id === context.novelId) {
      score += 0.5;
    }

    return score;
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    if (!this.isAvailable()) {
      return { status: 'unavailable', reason: 'Client not initialized' };
    }

    try {
      // 使用ping方法进行健康检查
      await this.client.ping();

      return {
        status: 'healthy',
        metrics: this.getMetrics(),
        config: {
          enabled: memoryConfig.enabled,
          fallbackEnabled: memoryConfig.fallbackEnabled
        }
      };
    } catch (error) {
      return {
        status: 'error',
        reason: error.message,
        fallbackAvailable: memoryConfig.fallbackEnabled
      };
    }
  }

  /**
   * 获取性能指标
   */
  getMetrics() {
    return {
      ...this.metrics,
      avgRetrievalTime: this.metrics.retrievalCount > 0
        ? this.metrics.retrievalTimeTotal / this.metrics.retrievalCount
        : 0,
      avgAdditionTime: this.metrics.additionCount > 0
        ? this.metrics.additionTimeTotal / this.metrics.additionCount
        : 0,
      successRate: this.metrics.additionCount > 0
        ? 1 - (this.metrics.fallbackCount / this.metrics.additionCount)
        : 0,
      queueSize: this.updateQueue.length
    };
  }

  /**
   * 检查服务是否可用
   */
  isAvailable() {
    return memoryConfig.enabled && this.client !== null;
  }

  /**
   * 记录检索性能
   */
  recordRetrieval(duration, memoryCount) {
    this.metrics.retrievalCount++;
    this.metrics.retrievalTimeTotal += duration;
  }

  /**
   * 记录添加性能
   */
  recordAddition(duration, success) {
    this.metrics.additionCount++;
    this.metrics.additionTimeTotal += duration;
    if (!success) this.metrics.fallbackCount++;
  }

  /**
   * 本地备份相关方法
   */
  async backupMemoryToLocal(memResult, memoryData) {
    try {
      const { messages, options } = memoryData;
      const resultArray = Array.isArray(memResult) ? memResult : [memResult];

      // 检查用户是否存在
      const userExists = await this.prisma.user.findUnique({
        where: { id: options.user_id },
        select: { id: true }
      });

      if (!userExists) {
        // 如果用户不存在，跳过本地备份（测试场景或临时用户）
        logger.warn(`User ${options.user_id} not found in database, skipping local backup`);
        return;
      }

      // 为每个返回的记忆创建备份
      for (const result of resultArray) {
        await this.prisma.memoryBackup.create({
          data: {
            userId: options.user_id,
            novelId: options.metadata?.novel_id || null,
            mem0Id: result?.id || null,
            content: messages[0].content,
            memoryType: options.metadata?.memory_type || 'general',
            importance: options.metadata?.importance || 1,
            metadata: JSON.stringify(options.metadata || {})
          }
        });
      }
    } catch (error) {
      logger.error('Failed to backup memory to local:', error);
    }
  }

  async addToLocalBackup(content, context, metadata) {
    try {
      const result = await this.prisma.memoryBackup.create({
        data: {
          userId: context.userId,
          novelId: context.novelId,
          content: content,
          memoryType: metadata.memory_type || 'general',
          importance: this.calculateImportance(content, context, metadata),
          metadata: JSON.stringify({ ...context, ...metadata })
        }
      });

      return { id: result.id, local: true };
    } catch (error) {
      logger.error('Failed to add to local backup:', error);
      return null;
    }
  }

  async retrieveFromLocalBackup(query, context) {
    try {
      const backups = await this.prisma.memoryBackup.findMany({
        where: {
          userId: context.userId,
          novelId: context.novelId || null
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      return backups.map(backup => ({
        content: backup.content,
        score: 0.5, // 降级评分
        metadata: {
          ...JSON.parse(backup.metadata || '{}'),
          importance: backup.importance,
          local: true
        }
      }));
    } catch (error) {
      logger.error('Failed to retrieve from local backup:', error);
      return [];
    }
  }

  // 异步更新记忆（用于流式响应完成后）
  async updateMemoriesAsync(userMessage, aiResponse, context, metadata = {}) {
    try {
      // 提取重要信息
      const importantInfo = this.extractImportantInformation(userMessage, aiResponse, context);

      if (importantInfo.length > 0) {
        // 批量添加记忆
        const memories = importantInfo.map(info => ({
          content: info.content,
          context: context,
          metadata: {
            memory_type: info.type,
            confidence: info.confidence,
            source: 'ai_conversation',
            ...metadata
          }
        }));

        return await this.addMemoryBatch(memories);
      }

      return { success: true, added: 0 };
    } catch (error) {
      logger.error('Failed to update memories async:', error);
      return { success: false, error: error.message };
    }
  }

  // 从AI对话中提取重要信息
  extractImportantInformation(userMessage, aiResponse, context) {
    const information = [];
    const importance = this.calculateImportance(aiResponse, context);

    // 检查是否包含重要信息
    if (importance >= memoryConfig.memory.importanceThreshold) {
      // 角色相关信息
      const characterMentions = this.extractCharacterInfo(userMessage, aiResponse);
      if (characterMentions) {
        information.push({
          content: characterMentions,
          type: 'character_trait',
          confidence: 0.7
        });
      }

      // 世界设定信息
      const worldInfo = this.extractWorldInfo(userMessage, aiResponse);
      if (worldInfo) {
        information.push({
          content: worldInfo,
          type: 'world_setting',
          confidence: 0.6
        });
      }

      // 用户偏好信息
      const userPrefs = this.extractUserPreferences(userMessage, aiResponse);
      if (userPrefs) {
        information.push({
          content: userPrefs,
          type: 'user_preference',
          confidence: 0.8
        });
      }

      // 创作决策信息
      if (context.mode === 'enhance' || context.mode === 'check') {
        information.push({
          content: `AI创作决策: ${aiResponse.substring(0, 100)}...`,
          type: 'creative_decision',
          confidence: 0.5
        });
      }
    }

    return information;
  }

  // 提取角色相关信息
  extractCharacterInfo(userMessage, aiResponse) {
    const characterPatterns = [
      /角色.*?([^，。！？；\s]+).*?(性格|特点|行为|反应)/g,
      /([^，。！？；\s]+).*?(会|将|可能).*?(做|说|想|反应)/g
    ];

    for (const pattern of characterPatterns) {
      const match = pattern.exec(userMessage + ' ' + aiResponse);
      if (match) {
        return `角色${match[1]}的特征: ${match[0]}`;
      }
    }

    return null;
  }

  // 提取世界设定信息
  extractWorldInfo(userMessage, aiResponse) {
    const worldPatterns = [
      /(世界|环境|背景|设定).*?([^，。！？；]+)/g,
      /(魔法|科技|社会|政治|文化).*?([^，。！？；]+)/g
    ];

    for (const pattern of worldPatterns) {
      const match = pattern.exec(userMessage + ' ' + aiResponse);
      if (match) {
        return `世界设定: ${match[0]}`;
      }
    }

    return null;
  }

  // 提取用户偏好信息
  extractUserPreferences(userMessage, aiResponse) {
    const prefPatterns = [
      /(喜欢|偏爱|希望|想要).*?([^，。！？；]+)/g,
      /(不喜欢|不想|避免).*?([^，。！？；]+)/g
    ];

    for (const pattern of prefPatterns) {
      const match = pattern.exec(userMessage);
      if (match) {
        return `用户偏好: ${match[0]}`;
      }
    }

    return null;
  }
}

module.exports = new MemoryService();
