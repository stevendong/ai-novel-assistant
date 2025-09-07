const express = require('express');
const aiService = require('../services/aiService');
const router = express.Router();

// 获取可用的AI提供商列表
router.get('/providers', (req, res) => {
  try {
    const providers = [];
    
    if (aiService.providers.has('openai')) {
      providers.push({
        name: 'openai',
        type: 'openai',
        models: aiService.providers.get('openai').models,
        available: true
      });
    }
    
    if (aiService.providers.has('claude')) {
      providers.push({
        name: 'claude',
        type: 'claude',
        models: aiService.providers.get('claude').models,
        available: true
      });
    }

    // Add custom providers
    for (const [name, provider] of aiService.providers.entries()) {
      if (name !== 'openai' && name !== 'claude') {
        providers.push({
          name,
          type: provider.type,
          models: provider.models,
          available: true
        });
      }
    }

    res.json({
      defaultProvider: process.env.DEFAULT_AI_PROVIDER || 'openai',
      providers
    });
  } catch (error) {
    console.error('Error getting providers:', error);
    res.status(500).json({ error: 'Failed to get AI providers' });
  }
});

// 测试AI提供商连接
router.post('/providers/test', async (req, res) => {
  try {
    const { provider, model } = req.body;
    
    if (!provider) {
      return res.status(400).json({ error: 'Provider is required' });
    }

    const testMessage = [
      { role: 'user', content: '请回复"测试成功"' }
    ];

    const response = await aiService.chat(testMessage, {
      provider,
      model,
      maxTokens: 50
    });

    res.json({
      success: true,
      provider,
      model,
      response: response.content,
      usage: response.usage
    });
  } catch (error) {
    console.error('Provider test failed:', error);
    res.json({
      success: false,
      provider: req.body.provider,
      error: error.message
    });
  }
});

module.exports = router;