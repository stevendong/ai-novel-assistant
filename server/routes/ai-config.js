const express = require('express');
const aiService = require('../services/aiService');
const { aiConfig } = require('../config/aiConfig');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// 获取当前AI配置信息
router.get('/config', (req, res) => {
  try {
    const defaultProvider = aiService.getDefaultProvider();
    const availableProviders = [];

    // 收集所有可用的提供商信息
    for (const [name, provider] of aiService.providers.entries()) {
      availableProviders.push({
        name,
        type: provider.type,
        models: provider.models,
        available: !!(provider.client || (provider.config && provider.config.apiKey))
      });
    }

    res.json({
      defaultProvider: aiConfig.global.defaultProvider,
      defaultModel: defaultProvider?.models?.chat || null,
      currentProvider: defaultProvider ? Object.keys(aiService.providers).find(key =>
        aiService.providers.get(key) === defaultProvider
      ) : null,
      availableProviders,
      taskConfigs: {
        consistency: aiConfig.openai.taskParams?.consistency || {},
        creative: aiConfig.openai.taskParams?.creative || {},
        analysis: aiConfig.openai.taskParams?.analysis || {},
        content_generation: aiConfig.openai.taskParams?.content_generation || {}
      },
      globalSettings: {
        enableCache: aiConfig.global.enableCache,
        enableUsageStats: aiConfig.global.enableUsageStats
      }
    });
  } catch (error) {
    console.error('Error getting AI config:', error);
    res.status(500).json({ error: 'Failed to get AI configuration' });
  }
});

// 获取用户AI偏好设置（需要认证）
router.get('/preferences', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    // 查找用户偏好设置
    const preferences = await prisma.userAIPreferences.findUnique({
      where: { userId }
    });

    if (!preferences) {
      // 返回默认偏好设置
      const defaultProvider = aiService.getDefaultProvider();
      return res.json({
        preferredProvider: aiConfig.global.defaultProvider,
        preferredModel: defaultProvider?.models?.chat || null,
        taskPreferences: {},
        autoSave: true,
        maxHistoryLength: 50
      });
    }

    res.json({
      preferredProvider: preferences.preferredProvider,
      preferredModel: preferences.preferredModel,
      taskPreferences: JSON.parse(preferences.taskPreferences || '{}'),
      autoSave: preferences.autoSave ?? true,
      maxHistoryLength: preferences.maxHistoryLength ?? 50
    });
  } catch (error) {
    console.error('Error getting user AI preferences:', error);
    res.status(500).json({ error: 'Failed to get user preferences' });
  }
});

// 更新用户AI偏好设置（需要认证）
router.put('/preferences', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      preferredProvider,
      preferredModel,
      taskPreferences,
      autoSave,
      maxHistoryLength
    } = req.body;

    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    // 验证提供商是否可用
    if (preferredProvider && !aiService.providers.has(preferredProvider)) {
      return res.status(400).json({
        error: 'Invalid provider',
        message: `Provider '${preferredProvider}' is not available`
      });
    }

    // 更新或创建用户偏好
    const preferences = await prisma.userAIPreferences.upsert({
      where: { userId },
      update: {
        preferredProvider,
        preferredModel,
        taskPreferences: JSON.stringify(taskPreferences || {}),
        autoSave: autoSave ?? true,
        maxHistoryLength: Math.max(10, Math.min(maxHistoryLength || 50, 200)),
        updatedAt: new Date()
      },
      create: {
        userId,
        preferredProvider: preferredProvider || aiConfig.global.defaultProvider,
        preferredModel: preferredModel || aiService.getDefaultProvider()?.models?.chat,
        taskPreferences: JSON.stringify(taskPreferences || {}),
        autoSave: autoSave ?? true,
        maxHistoryLength: Math.max(10, Math.min(maxHistoryLength || 50, 200)),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'AI preferences updated successfully',
      preferences: {
        preferredProvider: preferences.preferredProvider,
        preferredModel: preferences.preferredModel,
        taskPreferences: JSON.parse(preferences.taskPreferences || '{}'),
        autoSave: preferences.autoSave,
        maxHistoryLength: preferences.maxHistoryLength
      }
    });
  } catch (error) {
    console.error('Error updating user AI preferences:', error);
    res.status(500).json({ error: 'Failed to update user preferences' });
  }
});

// 获取推荐的模型（基于任务类型）
router.post('/recommend-model', (req, res) => {
  try {
    const { taskType, contextSize, userPreferences } = req.body;

    // 简单的模型推荐逻辑
    let recommendedModel = null;
    let recommendedProvider = null;

    const taskConfigs = {
      'content_generation': {
        preferredModels: ['gpt-4', 'claude-3-sonnet', 'gpt-3.5-turbo'],
        minTokens: 2000
      },
      'consistency_check': {
        preferredModels: ['gpt-3.5-turbo', 'claude-3-haiku'],
        requiresAccuracy: true
      },
      'creative': {
        preferredModels: ['gpt-4', 'claude-3-sonnet'],
        minTokens: 3000
      },
      'analysis': {
        preferredModels: ['gpt-3.5-turbo', 'gpt-4'],
        requiresAccuracy: true
      }
    };

    const taskConfig = taskConfigs[taskType] || taskConfigs['content_generation'];

    // 查找可用的推荐模型
    for (const model of taskConfig.preferredModels) {
      for (const [providerName, provider] of aiService.providers.entries()) {
        if (provider.models.chat === model &&
            (provider.client || (provider.config && provider.config.apiKey))) {
          recommendedModel = model;
          recommendedProvider = providerName;
          break;
        }
      }
      if (recommendedModel) break;
    }

    // 如果没有找到推荐模型，使用默认提供商
    if (!recommendedModel) {
      const defaultProvider = aiService.getDefaultProvider();
      if (defaultProvider) {
        recommendedModel = defaultProvider.models.chat;
        recommendedProvider = Object.keys(aiService.providers).find(key =>
          aiService.providers.get(key) === defaultProvider
        );
      }
    }

    res.json({
      taskType,
      recommendedProvider,
      recommendedModel,
      reasoning: `基于 '${taskType}' 任务类型推荐`,
      alternatives: Array.from(aiService.providers.entries())
        .filter(([name, provider]) => name !== recommendedProvider)
        .map(([name, provider]) => ({
          provider: name,
          model: provider.models.chat
        }))
        .slice(0, 3)
    });
  } catch (error) {
    console.error('Error recommending model:', error);
    res.status(500).json({ error: 'Failed to recommend model' });
  }
});

module.exports = router;