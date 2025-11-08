const express = require('express');
const aiService = require('../services/aiService');
const {
  aiConfig,
  getAvailableModels,
  getDefaultModelList,
  isModelAvailable
} = require('../config/aiConfig');
const { requireAuth } = require('../middleware/auth');
const prisma = require('../utils/prismaClient');
const router = express.Router();

// 模型列表缓存 (TTL: 1小时)
const modelCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getCachedModels(cacheKey) {
  const cached = modelCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.models;
  }
  return null;
}

function setCachedModels(cacheKey, models) {
  modelCache.set(cacheKey, {
    models,
    timestamp: Date.now()
  });
}

// 获取当前AI配置信息
router.get('/config', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const defaultProvider = aiService.getDefaultProvider();
    const availableProviders = [];

    // 收集所有可用的提供商信息
    for (const [name, provider] of aiService.providers.entries()) {
      availableProviders.push({
        name,
        type: provider.type,
        models: provider.models,
        available: !!(provider.client || (provider.config && provider.config.apiKey)),
        isCustom: false
      });
    }

    // 如果用户已登录,添加用户自定义的提供商
    if (userId) {
      const preferences = await prisma.userAIPreferences.findUnique({
        where: { userId }
      });

      if (preferences && preferences.customConfigs) {
        const customConfigs = JSON.parse(preferences.customConfigs || '[]');
        customConfigs.forEach(config => {
          availableProviders.push({
            name: config.name,
            type: config.type || 'openai',
            models: {
              chat: config.model || 'custom-model'
            },
            available: true,
            isCustom: true,
            baseURL: config.baseURL
          });
        });
      }
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
        maxHistoryLength: 50,
        customConfigs: []
      });
    }

    res.json({
      preferredProvider: preferences.preferredProvider,
      preferredModel: preferences.preferredModel,
      taskPreferences: JSON.parse(preferences.taskPreferences || '{}'),
      autoSave: preferences.autoSave ?? true,
      maxHistoryLength: preferences.maxHistoryLength ?? 50,
      customConfigs: JSON.parse(preferences.customConfigs || '[]')
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
      maxHistoryLength,
      customConfigs
    } = req.body;

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
        customConfigs: JSON.stringify(customConfigs || []),
        updatedAt: new Date()
      },
      create: {
        userId,
        preferredProvider: preferredProvider || aiConfig.global.defaultProvider,
        preferredModel: preferredModel || aiService.getDefaultProvider()?.models?.chat,
        taskPreferences: JSON.stringify(taskPreferences || {}),
        autoSave: autoSave ?? true,
        maxHistoryLength: Math.max(10, Math.min(maxHistoryLength || 50, 200)),
        customConfigs: JSON.stringify(customConfigs || []),
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
        maxHistoryLength: preferences.maxHistoryLength,
        customConfigs: JSON.parse(preferences.customConfigs || '[]')
      }
    });
  } catch (error) {
    console.error('Error updating user AI preferences:', error);
    res.status(500).json({ error: 'Failed to update user preferences' });
  }
});

// 获取指定提供商的可用模型列表
router.post('/models/list', requireAuth, async (req, res) => {
  try {
    const { provider, apiKey, baseURL } = req.body;
    const userId = req.user?.id;

    if (!provider) {
      return res.status(400).json({ error: 'Provider is required' });
    }

    // 生成缓存键
    const cacheKey = apiKey ? `custom:${baseURL}:${apiKey.substring(0, 10)}` : `system:${provider}`;

    // 检查缓存
    const cachedModels = getCachedModels(cacheKey);
    if (cachedModels) {
      return res.json({
        provider,
        models: cachedModels,
        count: cachedModels.length,
        cached: true
      });
    }

    let models = [];

    // 如果是系统提供商
    if (aiService.providers.has(provider)) {
      const providerInfo = aiService.providers.get(provider);

      // 首先检查是否配置了可用模型列表
      const configuredModels = getAvailableModels(provider);

      if (configuredModels && configuredModels.length > 0) {
        // 使用配置的模型列表
        models = configuredModels;
      } else if (providerInfo.type === 'openai') {
        // 对于 OpenAI 兼容的提供商，尝试从 API 获取模型列表
        try {
          const client = providerInfo.client;
          if (client && client.models) {
            const modelList = await client.models.list();
            const apiModels = modelList.data
              .filter(m => m.id.includes('gpt') || m.id.includes('turbo') || m.id.includes('instruct'))
              .map(m => ({
                id: m.id,
                name: m.id,
                description: `Created: ${new Date(m.created * 1000).toLocaleDateString()}`,
                owned_by: m.owned_by
              }));

            // 如果配置了可用模型列表,过滤API返回的模型
            const configuredModels = getAvailableModels(provider);
            if (configuredModels && configuredModels.length > 0) {
              const configuredIds = new Set(configuredModels.map(m => m.id));
              models = apiModels.filter(m => configuredIds.has(m.id));
            } else {
              models = apiModels;
            }
          }
        } catch (error) {
          console.warn('Failed to fetch models from API:', error.message);
          // 如果 API 调用失败，使用配置的模型列表
          models = getAvailableModels(provider);
        }
      } else {
        // 对于非 OpenAI 的提供商，使用配置的模型列表
        models = configuredModels;
      }
    }
    // 如果是用户自定义提供商
    else if (apiKey && baseURL) {
      try {
        const OpenAI = require('openai');
        const customClient = new OpenAI({
          apiKey: apiKey,
          baseURL: baseURL,
          timeout: 10000
        });

        const modelList = await customClient.models.list();
        models = modelList.data.map(m => ({
          id: m.id,
          name: m.id,
          description: m.owned_by ? `Owned by: ${m.owned_by}` : '',
          owned_by: m.owned_by
        }));
      } catch (error) {
        console.error('Failed to fetch models from custom provider:', error);
        return res.status(500).json({
          error: 'Failed to fetch models',
          message: 'Unable to connect to the API. Please check your API key and base URL.'
        });
      }
    }
    // 如果是用户保存的自定义配置
    else if (userId) {
      const preferences = await prisma.userAIPreferences.findUnique({
        where: { userId }
      });

      if (preferences && preferences.customConfigs) {
        const customConfigs = JSON.parse(preferences.customConfigs || '[]');
        const customConfig = customConfigs.find(c => c.name === provider);

        if (customConfig) {
          try {
            const OpenAI = require('openai');
            const customClient = new OpenAI({
              apiKey: customConfig.apiKey,
              baseURL: customConfig.baseURL,
              timeout: 10000
            });

            const modelList = await customClient.models.list();
            models = modelList.data.map(m => ({
              id: m.id,
              name: m.id,
              description: m.owned_by ? `Owned by: ${m.owned_by}` : '',
              owned_by: m.owned_by
            }));
          } catch (error) {
            console.error('Failed to fetch models from saved custom provider:', error);
            // 返回配置中保存的模型作为备选
            models = [{
              id: customConfig.model,
              name: customConfig.model,
              description: 'Saved model'
            }];
          }
        }
      }
    }

    // 缓存结果
    if (models.length > 0) {
      setCachedModels(cacheKey, models);
    }

    res.json({
      provider,
      models,
      count: models.length,
      cached: false
    });
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({
      error: 'Failed to fetch models',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
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
