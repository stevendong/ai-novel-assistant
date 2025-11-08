const prisma = require('../utils/prismaClient');
const { calculateCost } = require('../config/aiPricing');
const logger = require('../utils/logger');

class AILoggingService {
  constructor() {
    this.logQueue = [];
    this.batchSize = parseInt(process.env.AI_LOGGING_BATCH_SIZE) || 100;
    this.enabled = process.env.AI_LOGGING_ENABLED !== 'false';
    this.maxContentLength = parseInt(process.env.AI_LOGGING_MAX_CONTENT_LENGTH) || 10000;
    this.sanitizePrompts = process.env.AI_LOGGING_SANITIZE_PROMPTS === 'true';
  }

  async logAICall(logData) {
    if (!this.enabled) {
      return null;
    }

    try {
      const cost = calculateCost(
        logData.provider,
        logData.model,
        logData.promptTokens || 0,
        logData.completionTokens || 0
      );

      const sanitizedData = {
        userId: logData.userId,
        novelId: logData.novelId || null,
        provider: logData.provider,
        model: logData.model,
        endpoint: logData.endpoint,
        apiUrl: logData.apiUrl || null,
        taskType: logData.taskType || null,
        requestMessages: this.sanitizeData(logData.requestMessages),
        requestParams: this.sanitizeData(logData.requestParams),
        responseContent: this.sanitizeData(logData.responseContent),
        responseMetadata: this.sanitizeData(logData.responseMetadata),
        promptTokens: logData.promptTokens || 0,
        completionTokens: logData.completionTokens || 0,
        totalTokens: logData.totalTokens || 0,
        latencyMs: logData.latencyMs || null,
        estimatedCost: cost,
        currency: 'USD',
        status: logData.status || 'success',
        errorMessage: logData.errorMessage || null,
        errorCode: logData.errorCode || null,
        retryCount: logData.retryCount || 0,
        userAgent: logData.userAgent || null,
        ipAddress: logData.ipAddress || null,
        sessionId: logData.sessionId || null,
        conversationId: logData.conversationId || null
      };

      const log = await prisma.aICallLog.create({
        data: sanitizedData
      });

      this.updateDailyStatsAsync(logData.userId, logData.novelId, logData.provider, logData.model);

      return log;
    } catch (error) {
      logger.error('Failed to log AI call:', error);
      return null;
    }
  }

  async batchLogCalls(logDataArray) {
    if (!this.enabled || !logDataArray || logDataArray.length === 0) {
      return [];
    }

    try {
      const sanitizedLogs = logDataArray.map(logData => {
        const cost = calculateCost(
          logData.provider,
          logData.model,
          logData.promptTokens || 0,
          logData.completionTokens || 0
        );

        return {
          userId: logData.userId,
          novelId: logData.novelId || null,
          provider: logData.provider,
          model: logData.model,
          endpoint: logData.endpoint,
          apiUrl: logData.apiUrl || null,
          taskType: logData.taskType || null,
          requestMessages: this.sanitizeData(logData.requestMessages),
          requestParams: this.sanitizeData(logData.requestParams),
          responseContent: this.sanitizeData(logData.responseContent),
          responseMetadata: this.sanitizeData(logData.responseMetadata),
          promptTokens: logData.promptTokens || 0,
          completionTokens: logData.completionTokens || 0,
          totalTokens: logData.totalTokens || 0,
          latencyMs: logData.latencyMs || null,
          estimatedCost: cost,
          currency: 'USD',
          status: logData.status || 'success',
          errorMessage: logData.errorMessage || null,
          errorCode: logData.errorCode || null,
          retryCount: logData.retryCount || 0,
          userAgent: logData.userAgent || null,
          ipAddress: logData.ipAddress || null,
          sessionId: logData.sessionId || null,
          conversationId: logData.conversationId || null
        };
      });

      const result = await prisma.aICallLog.createMany({
        data: sanitizedLogs,
        skipDuplicates: true
      });

      return result;
    } catch (error) {
      logger.error('Failed to batch log AI calls:', error);
      return [];
    }
  }

  sanitizeData(data) {
    if (!data) return null;

    let str = typeof data === 'string' ? data : JSON.stringify(data);

    if (this.sanitizePrompts) {
      str = str.replace(/api[_-]?key["\s:=]+[a-zA-Z0-9_-]+/gi, 'API_KEY_REDACTED');
      str = str.replace(/sk-[a-zA-Z0-9]{20,}/g, 'API_KEY_REDACTED');
    }

    if (str.length > this.maxContentLength) {
      str = str.substring(0, this.maxContentLength) + '... [truncated]';
    }

    return str;
  }

  async updateDailyStatsAsync(userId, novelId, provider, model) {
    setImmediate(async () => {
      try {
        await this.updateDailyStats(userId, novelId, provider, model);
      } catch (error) {
        logger.error('Failed to update daily stats:', error);
      }
    });
  }

  async updateDailyStats(userId, novelId, provider, model) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await prisma.aICallLog.aggregate({
      where: {
        userId,
        provider,
        model,
        novelId: novelId || null,
        createdAt: {
          gte: today
        }
      },
      _count: {
        id: true
      },
      _sum: {
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        estimatedCost: true
      },
      _avg: {
        latencyMs: true
      }
    });

    const successCount = await prisma.aICallLog.count({
      where: {
        userId,
        provider,
        model,
        novelId: novelId || null,
        status: 'success',
        createdAt: {
          gte: today
        }
      }
    });

    const failCount = stats._count.id - successCount;

    await prisma.aIUsageStats.upsert({
      where: {
        userId_provider_model_date_novelId: {
          userId,
          provider,
          model,
          date: today,
          novelId: novelId || null
        }
      },
      update: {
        totalCalls: stats._count.id,
        successfulCalls: successCount,
        failedCalls: failCount,
        totalTokens: stats._sum.totalTokens || 0,
        promptTokens: stats._sum.promptTokens || 0,
        completionTokens: stats._sum.completionTokens || 0,
        totalCost: stats._sum.estimatedCost || 0,
        avgLatencyMs: stats._avg.latencyMs || 0,
        updatedAt: new Date()
      },
      create: {
        userId,
        provider,
        model,
        date: today,
        novelId: novelId || null,
        totalCalls: stats._count.id,
        successfulCalls: successCount,
        failedCalls: failCount,
        totalTokens: stats._sum.totalTokens || 0,
        promptTokens: stats._sum.promptTokens || 0,
        completionTokens: stats._sum.completionTokens || 0,
        totalCost: stats._sum.estimatedCost || 0,
        avgLatencyMs: stats._avg.latencyMs || 0
      }
    });
  }

  async cleanupOldLogs(retentionDays = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await prisma.aICallLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });

    logger.info(`Cleaned up ${result.count} old AI call logs`);
    return result.count;
  }
}

module.exports = new AILoggingService();
