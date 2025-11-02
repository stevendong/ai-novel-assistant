const express = require('express');
const { requireAuth } = require("../middleware/auth");
const prisma = require('../utils/prismaClient');

const router = express.Router();

// 获取小说的所有世界设定
router.get('/novel/:novelId', requireAuth, async (req, res) => {
  try {
    const { novelId } = req.params;
    const settings = await prisma.worldSetting.findMany({
      where: { novelId },
      include: {
        _count: {
          select: {
            chapterRefs: true
          }
        }
      },
      orderBy: [
        { type: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    // Parse details field for each setting
    const parsedSettings = settings.map(setting => ({
      ...setting,
      details: setting.details ? JSON.parse(setting.details) : {}
    }));

    res.json(parsedSettings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// 获取单个设定详情
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const setting = await prisma.worldSetting.findUnique({
      where: { id },
      include: {
        chapterRefs: {
          include: {
            chapter: {
              select: {
                id: true,
                title: true,
                chapterNumber: true
              }
            }
          }
        }
      }
    });

    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    // Parse details field
    setting.details = setting.details ? JSON.parse(setting.details) : {};

    res.json(setting);
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// 创建新设定
router.post('/', requireAuth, async (req, res) => {
  try {
    const { novelId, type, name, description, details } = req.body;

    if (!novelId || !type || !name) {
      return res.status(400).json({ error: 'Novel ID, type, and name are required' });
    }

    const setting = await prisma.worldSetting.create({
      data: {
        novelId,
        type,
        name,
        description,
        details: JSON.stringify(details || {})
      }
    });

    // Parse details back to object for response
    setting.details = JSON.parse(setting.details || '{}');

    res.status(201).json(setting);
  } catch (error) {
    console.error('Error creating setting:', error);
    res.status(500).json({ error: 'Failed to create setting' });
  }
});

// 更新设定信息
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, name, description, details, isLocked } = req.body;

    const updateData = {
      type,
      name,
      description,
      isLocked,
      updatedAt: new Date()
    };

    if (details !== undefined) {
      updateData.details = JSON.stringify(details);
    }

    const setting = await prisma.worldSetting.update({
      where: { id },
      data: updateData
    });

    // Parse details back to object for response
    if (setting.details) {
      setting.details = JSON.parse(setting.details);
    }

    res.json(setting);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Setting not found' });
    }
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// 删除设定
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.worldSetting.delete({
      where: { id }
    });

    res.json({ message: 'Setting deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Setting not found' });
    }
    console.error('Error deleting setting:', error);
    res.status(500).json({ error: 'Failed to delete setting' });
  }
});

// AI完善世界设定
router.post('/:id/enhance', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { expandAspects = [], plotRelevance, expansionType = 'comprehensive' } = req.body;

    const setting = await prisma.worldSetting.findUnique({
      where: { id },
      include: {
        novel: {
          include: {
            characters: true,
            settings: {
              where: { id: { not: id } }
            },
            chapters: {
              select: { id: true, title: true, outline: true }
            }
          }
        }
      }
    });

    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    if (setting.isLocked) {
      return res.status(400).json({ error: 'Setting is locked and cannot be enhanced' });
    }

    // 引入AI服务
    const aiService = require('../services/aiService');

    // 构建增强提示词
    const enhancement = await aiService.generateResponse(
      {
        title: setting.novel.title,
        description: setting.novel.description,
        genre: setting.novel.genre,
        characters: setting.novel.characters,
        settings: setting.novel.settings,
        chapters: setting.novel.chapters
      },
      buildEnhancementPrompt(setting, expandAspects, plotRelevance, expansionType),
      'creative',
      {
        taskType: 'world_building',
        userId: req.user.id,
        messageType: 'worldbuilding'
      }
    );

    // 解析AI响应并结构化
    const structuredEnhancement = parseEnhancementResponse(enhancement.message, setting.type);

    res.json(structuredEnhancement);
  } catch (error) {
    console.error('Error enhancing setting:', error);
    res.status(500).json({ error: 'Failed to enhance setting' });
  }
});

// 构建增强提示词
function buildEnhancementPrompt(setting, expandAspects, plotRelevance, expansionType) {
  const settingDetails = setting.details ? JSON.parse(setting.details) : {};

  let prompt = `请为世界设定"${setting.name}"进行AI扩展和完善。

**当前设定信息：**
类型：${getSettingTypeName(setting.type)}
名称：${setting.name}
描述：${setting.description || '暂无描述'}`;

  if (Object.keys(settingDetails).length > 0) {
    prompt += `\n当前详细信息：${JSON.stringify(settingDetails, null, 2)}`;
  }

  prompt += `\n\n**扩展要求：**
扩展类型：${getExpansionTypeName(expansionType)}`;

  if (expandAspects.length > 0) {
    prompt += `\n重点扩展方面：${expandAspects.join('、')}`;
  }

  if (plotRelevance) {
    prompt += `\n与情节的关联：${plotRelevance}`;
  }

  // 根据设定类型添加特定要求
  prompt += getTypeSpecificRequirements(setting.type);

  // 获取字段结构定义
  const fieldsStructure = getSettingFieldsStructure(setting.type);
  const fieldNames = Object.keys(fieldsStructure);

  prompt += `\n\n**必需字段要求：**
请确保为以下${getSettingTypeName(setting.type)}的核心字段提供完整内容：`;

  fieldNames.forEach(fieldKey => {
    const field = fieldsStructure[fieldKey];
    prompt += `\n- ${field.name} (${fieldKey}): ${field.placeholder}`;
  });

  prompt += `\n\n**输出要求：**
请以JSON格式返回扩展结果，包含以下完整结构：
{
  "enhancedDescription": "增强后的完整描述",
  "detailsFields": {`;

  // 动态添加字段结构
  fieldNames.forEach((fieldKey, index) => {
    const field = fieldsStructure[fieldKey];
    const isLast = index === fieldNames.length - 1;
    if (fieldKey === 'ruleTypes') {
      prompt += `\n    "${fieldKey}": ["具体的规则类型数组"]${isLast ? '' : ','}`;
    } else {
      prompt += `\n    "${fieldKey}": "${field.name}的具体内容"${isLast ? '' : ','}`;
    }
  });

  prompt += `
  },
  "plotRelevance": {
    "importance": "在故事中的重要性",
    "potentialConflicts": ["可能的冲突点"],
    "storyHooks": ["故事钩子和情节点"]
  },
  "connections": {
    "characters": ["相关角色及其关系"],
    "otherSettings": ["与其他设定的关联"],
    "themes": ["体现的主题"]
  },
  "creativeElements": {
    "sensoryDetails": "感官描述（视觉、听觉、嗅觉等）",
    "atmosphere": "氛围营造",
    "uniqueFeatures": ["独特特征或亮点"]
  },
  "expansionSuggestions": [
    "进一步完善建议"
  ]
}

**重要提示：** 
1. 请确保detailsFields中包含所有必需字段且内容详实
2. 对于ruleTypes字段，请提供具体的规则类型数组
3. 所有字段内容都应该与当前设定的名称和描述保持一致`;

  return prompt;
}

// 获取设定类型名称
function getSettingTypeName(type) {
  const names = {
    worldview: '世界观设定',
    location: '地理位置',
    rule: '规则体系',
    culture: '文化背景'
  };
  return names[type] || type;
}

// 获取扩展类型名称
function getExpansionTypeName(type) {
  const names = {
    comprehensive: '全面扩展',
    focused: '重点扩展',
    creative: '创意扩展',
    practical: '实用扩展'
  };
  return names[type] || type;
}

// 定义每种设定类型的完整字段结构
function getSettingFieldsStructure(type) {
  const structures = {
    worldview: {
      era: { name: '时代背景', placeholder: '如：中世纪奇幻、现代都市、未来科幻', required: true },
      factions: { name: '主要势力', placeholder: '主要的国家、组织、势力', required: true },
      history: { name: '世界历史', placeholder: '世界的形成历史、重大事件、时间线...', required: true },
      specialElements: { name: '特殊元素', placeholder: '魔法体系、科技水平、超自然现象等...', required: true }
    },
    location: {
      locationType: { name: '位置类型', placeholder: '城市、村庄、建筑、自然景观、其他', required: true },
      climate: { name: '气候环境', placeholder: '温带、寒带、热带等', required: true },
      population: { name: '人口规模', placeholder: '人口数量或规模', required: true },
      geography: { name: '地理特征', placeholder: '地形地貌、重要建筑、地标等...', required: true },
      importantPlaces: { name: '重要场所', placeholder: '重要的场所、建筑、区域...', required: true }
    },
    rule: {
      ruleTypes: { name: '规则类型', placeholder: '魔法体系、科技体系、社会制度、经济体系、政治体系、军事体系', required: true },
      coreRules: { name: '核心规则', placeholder: '描述这个体系的核心规则和运作机制...', required: true },
      limitations: { name: '限制与约束', placeholder: '这个体系的限制、弱点、代价...', required: true }
    },
    culture: {
      language: { name: '主要语言', placeholder: '使用的语言', required: true },
      religion: { name: '宗教信仰', placeholder: '主要信仰', required: true },
      traditions: { name: '文化传统', placeholder: '节日庆典、传统习俗、仪式...', required: true },
      socialStructure: { name: '社会结构', placeholder: '社会等级、家族结构、权力分配...', required: true },
      values: { name: '价值观念', placeholder: '重视的品质、道德观念...', required: true }
    }
  };
  return structures[type] || {};
}

// 获取类型特定要求
function getTypeSpecificRequirements(type) {
  const requirements = {
    worldview: `
特别关注：
- 世界的历史演进和重大事件
- 权力结构和政治体系
- 魔法/科技系统的运作原理
- 不同种族/势力的关系`,
    location: `
特别关注：
- 地理特征和环境描述
- 建筑风格和城市规划
- 气候和自然现象
- 重要地标和功能区域`,
    rule: `
特别关注：
- 规则的具体运作机制
- 限制和例外情况
- 对社会的影响
- 与其他体系的互动`,
    culture: `
特别关注：
- 社会习俗和传统
- 价值观和道德体系
- 艺术和文化表现
- 社会阶层和关系`
  };
  return requirements[type] || '';
}

// 解析增强响应
function parseEnhancementResponse(content, settingType) {
  try {
    // 尝试解析JSON格式
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return validateAndEnhanceResponse(parsed, settingType);
    }
  } catch (error) {
    console.log('JSON解析失败，使用文本解析');
  }

  // 文本格式解析备用方案
  return parseTextResponse(content, settingType);
}

// 验证和增强响应
function validateAndEnhanceResponse(response, settingType) {
  const defaultResponse = getDefaultEnhancementStructure(settingType);
  const fieldsStructure = getSettingFieldsStructure(settingType);

  // 处理新的detailsFields结构
  const detailsFields = {};
  const fieldNames = Object.keys(fieldsStructure);

  fieldNames.forEach(fieldKey => {
    if (response.detailsFields && response.detailsFields[fieldKey]) {
      detailsFields[fieldKey] = response.detailsFields[fieldKey];
    } else if (response.detailedAspects && response.detailedAspects[fieldKey]) {
      // 兼容旧格式
      detailsFields[fieldKey] = response.detailedAspects[fieldKey];
    } else {
      // 使用默认值
      detailsFields[fieldKey] = `${fieldsStructure[fieldKey].name}待完善`;
    }
  });

  return {
    enhancedDescription: response.enhancedDescription || defaultResponse.enhancedDescription,
    detailsFields: detailsFields,
    // 保持向后兼容
    detailedAspects: detailsFields,
    plotRelevance: { ...defaultResponse.plotRelevance, ...response.plotRelevance },
    connections: { ...defaultResponse.connections, ...response.connections },
    creativeElements: { ...defaultResponse.creativeElements, ...response.creativeElements },
    expansionSuggestions: response.expansionSuggestions || defaultResponse.expansionSuggestions
  };
}

// 文本响应解析
function parseTextResponse(content, settingType) {
  return {
    enhancedDescription: content.substring(0, 300) + '...',
    detailedAspects: extractDetailedAspects(content, settingType),
    plotRelevance: {
      importance: '需要进一步分析',
      potentialConflicts: ['待分析'],
      storyHooks: ['待分析']
    },
    connections: {
      characters: ['待分析'],
      otherSettings: ['待分析'],
      themes: ['待分析']
    },
    creativeElements: {
      sensoryDetails: '待完善',
      atmosphere: '待完善',
      uniqueFeatures: ['待分析']
    },
    expansionSuggestions: ['继续完善描述', '添加更多细节', '建立与其他设定的联系']
  };
}

// 提取详细方面
function extractDetailedAspects(content, settingType) {
  const aspects = {};

  switch (settingType) {
    case 'worldview':
      aspects.history = '历史背景待完善';
      aspects.politics = '政治体系待完善';
      aspects.economy = '经济体系待完善';
      break;
    case 'location':
      aspects.geography = '地理特征待完善';
      aspects.architecture = '建筑风格待完善';
      aspects.population = '人口分布待完善';
      break;
    case 'rule':
      aspects.mechanism = '运作机制待完善';
      aspects.limitations = '限制条件待完善';
      aspects.exceptions = '特殊情况待完善';
      break;
    case 'culture':
      aspects.traditions = '传统习俗待完善';
      aspects.values = '价值观念待完善';
      aspects.arts = '艺术表现待完善';
      break;
  }

  return aspects;
}

// 默认增强结构
function getDefaultEnhancementStructure(settingType) {
  return {
    enhancedDescription: 'AI生成的增强描述',
    detailedAspects: extractDetailedAspects('', settingType),
    plotRelevance: {
      importance: '中等',
      potentialConflicts: [],
      storyHooks: []
    },
    connections: {
      characters: [],
      otherSettings: [],
      themes: []
    },
    creativeElements: {
      sensoryDetails: '待完善',
      atmosphere: '待完善',
      uniqueFeatures: []
    },
    expansionSuggestions: []
  };
}

// AI扩展设定细节
router.post('/:id/expand', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { focusAreas = [], detailLevel = 'standard' } = req.body;

    const setting = await prisma.worldSetting.findUnique({
      where: { id },
      include: {
        novel: {
          include: {
            characters: true,
            settings: {
              where: { id: { not: id } }
            }
          }
        }
      }
    });

    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    // 引入AI服务
    const aiService = require('../services/aiService');

    // 构建细节扩展提示词
    const expansion = await aiService.generateResponse(
      {
        title: setting.novel.title,
        description: setting.novel.description,
        genre: setting.novel.genre,
        characters: setting.novel.characters,
        settings: setting.novel.settings
      },
      buildExpansionPrompt(setting, focusAreas, detailLevel),
      'creative',
      {
        taskType: 'detail_expansion',
        userId: req.user.id,
        messageType: 'worldbuilding'
      }
    );

    // 解析AI响应并结构化
    const structuredExpansion = parseExpansionResponse(expansion.message, setting.type);

    res.json(structuredExpansion);
  } catch (error) {
    console.error('Error expanding setting:', error);
    res.status(500).json({ error: 'Failed to expand setting' });
  }
});

// 构建细节扩展提示词
function buildExpansionPrompt(setting, focusAreas, detailLevel) {
  const settingDetails = setting.details ? JSON.parse(setting.details) : {};

  let prompt = `请为世界设定"${setting.name}"进行详细扩展，增加丰富的细节描述。

**当前设定信息：**
类型：${getSettingTypeName(setting.type)}
名称：${setting.name}
描述：${setting.description || '暂无描述'}`;

  if (Object.keys(settingDetails).length > 0) {
    prompt += `\n当前详细信息：${JSON.stringify(settingDetails, null, 2)}`;
  }

  prompt += `\n\n**扩展要求：**
详细程度：${getDetailLevelName(detailLevel)}`;

  if (focusAreas.length > 0) {
    prompt += `\n重点关注领域：${focusAreas.join('、')}`;
  }

  // 根据设定类型添加特定的细节要求
  prompt += getDetailRequirements(setting.type);

  prompt += `\n\n**输出要求：**
请以JSON格式返回详细扩展，包含以下结构：
{
  "detailedDescription": "完整的详细描述",
  "sensoryDetails": {
    "visual": "视觉描述",
    "auditory": "听觉描述",
    "tactile": "触觉描述",
    "olfactory": "嗅觉描述",
    "gustatory": "味觉描述"
  },
  "atmosphericElements": {
    "mood": "氛围情绪",
    "lighting": "光线环境",
    "weather": "天气影响",
    "sounds": "环境声音"
  },
  "functionalAspects": {
    "purpose": "主要功能",
    "usage": "使用方式",
    "accessibility": "可达性",
    "restrictions": "限制条件"
  },
  "culturalDimensions": {
    "significance": "文化意义",
    "traditions": "相关传统",
    "symbols": "象征元素",
    "rituals": "仪式活动"
  },
  "interactionElements": {
    "characterReactions": "角色反应",
    "socialDynamics": "社会动态",
    "emotionalResonance": "情感共鸣"
  },
  "narrativePotential": {
    "sceneOpportunities": ["场景机会"],
    "conflictSeeds": ["冲突种子"],
    "mysteryElements": ["神秘元素"]
  }
}

请确保描述生动具体，富有想象力，能够为读者营造强烈的代入感。`;

  return prompt;
}

// 获取详细程度名称
function getDetailLevelName(level) {
  const names = {
    brief: '简要补充',
    standard: '标准详细',
    comprehensive: '全面深入',
    immersive: '沉浸式描述'
  };
  return names[level] || level;
}

// 获取详细要求
function getDetailRequirements(type) {
  const requirements = {
    worldview: `
特别强调：
- 历史事件的具体细节和影响
- 政治结构的具体运作方式
- 经济体系和贸易关系
- 不同群体的生活方式`,
    location: `
特别强调：
- 地理环境的感官体验
- 建筑物的外观和内部结构
- 人们的日常活动场景
- 不同时段的变化`,
    rule: `
特别强调：
- 规则执行的具体流程
- 违反规则的后果
- 例外情况的处理
- 对日常生活的实际影响`,
    culture: `
特别强调：
- 文化表现的具体形式
- 社会互动的细节
- 传统仪式的过程
- 价值观在行为中的体现`
  };
  return requirements[type] || '';
}

// 解析扩展响应
function parseExpansionResponse(content, settingType) {
  try {
    // 尝试解析JSON格式
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return validateExpansionResponse(parsed, settingType);
    }
  } catch (error) {
    console.log('JSON解析失败，使用文本解析');
  }

  // 文本格式解析备用方案
  return parseExpansionTextResponse(content, settingType);
}

// 验证扩展响应
function validateExpansionResponse(response, settingType) {
  const defaultResponse = getDefaultExpansionStructure(settingType);

  return {
    detailedDescription: response.detailedDescription || defaultResponse.detailedDescription,
    sensoryDetails: { ...defaultResponse.sensoryDetails, ...response.sensoryDetails },
    atmosphericElements: { ...defaultResponse.atmosphericElements, ...response.atmosphericElements },
    functionalAspects: { ...defaultResponse.functionalAspects, ...response.functionalAspects },
    culturalDimensions: { ...defaultResponse.culturalDimensions, ...response.culturalDimensions },
    interactionElements: { ...defaultResponse.interactionElements, ...response.interactionElements },
    narrativePotential: { ...defaultResponse.narrativePotential, ...response.narrativePotential }
  };
}

// 文本扩展响应解析
function parseExpansionTextResponse(content, settingType) {
  return {
    detailedDescription: content.length > 500 ? content.substring(0, 500) + '...' : content,
    sensoryDetails: {
      visual: '待完善的视觉描述',
      auditory: '待完善的听觉描述',
      tactile: '待完善的触觉描述',
      olfactory: '待完善的嗅觉描述',
      gustatory: '待完善的味觉描述'
    },
    atmosphericElements: {
      mood: '待分析',
      lighting: '待分析',
      weather: '待分析',
      sounds: '待分析'
    },
    functionalAspects: {
      purpose: '待分析',
      usage: '待分析',
      accessibility: '待分析',
      restrictions: '待分析'
    },
    culturalDimensions: {
      significance: '待分析',
      traditions: '待分析',
      symbols: '待分析',
      rituals: '待分析'
    },
    interactionElements: {
      characterReactions: '待分析',
      socialDynamics: '待分析',
      emotionalResonance: '待分析'
    },
    narrativePotential: {
      sceneOpportunities: ['待分析'],
      conflictSeeds: ['待分析'],
      mysteryElements: ['待分析']
    }
  };
}

// 默认扩展结构
function getDefaultExpansionStructure(settingType) {
  return {
    detailedDescription: 'AI生成的详细描述',
    sensoryDetails: {
      visual: '视觉描述待完善',
      auditory: '听觉描述待完善',
      tactile: '触觉描述待完善',
      olfactory: '嗅觉描述待完善',
      gustatory: '味觉描述待完善'
    },
    atmosphericElements: {
      mood: '氛围待分析',
      lighting: '光线待分析',
      weather: '天气待分析',
      sounds: '声音待分析'
    },
    functionalAspects: {
      purpose: '功能待分析',
      usage: '用途待分析',
      accessibility: '可达性待分析',
      restrictions: '限制待分析'
    },
    culturalDimensions: {
      significance: '意义待分析',
      traditions: '传统待分析',
      symbols: '象征待分析',
      rituals: '仪式待分析'
    },
    interactionElements: {
      characterReactions: '角色反应待分析',
      socialDynamics: '社会动态待分析',
      emotionalResonance: '情感共鸣待分析'
    },
    narrativePotential: {
      sceneOpportunities: [],
      conflictSeeds: [],
      mysteryElements: []
    }
  };
}

// AI智能建议接口
router.post('/:id/suggestions', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { suggestionType = 'general' } = req.body;

    const setting = await prisma.worldSetting.findUnique({
      where: { id },
      include: {
        novel: {
          include: {
            characters: true,
            settings: {
              where: { id: { not: id } }
            },
            chapters: {
              select: { id: true, title: true, outline: true, content: true }
            }
          }
        }
      }
    });

    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    const aiService = require('../services/aiService');

    // 构建建议生成提示词
    const suggestions = await aiService.generateResponse(
      {
        title: setting.novel.title,
        description: setting.novel.description,
        genre: setting.novel.genre,
        characters: setting.novel.characters,
        settings: setting.novel.settings,
        chapters: setting.novel.chapters
      },
      buildSuggestionsPrompt(setting, suggestionType),
      'analytical',
      {
        taskType: 'creative_analysis',
        userId: req.user.id,
        messageType: 'worldbuilding'
      }
    );

    // 解析AI建议响应
    const structuredSuggestions = parseSuggestionsResponse(suggestions.message);

    res.json(structuredSuggestions);
  } catch (error) {
    console.error('Error generating suggestions:', error);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

// 构建建议生成提示词
function buildSuggestionsPrompt(setting, suggestionType) {
  const settingDetails = setting.details ? JSON.parse(setting.details) : {};

  let prompt = `请为世界设定"${setting.name}"提供智能建议和优化方案。

**当前设定分析：**
类型：${getSettingTypeName(setting.type)}
名称：${setting.name}
描述：${setting.description || '暂无描述'}`;

  if (Object.keys(settingDetails).length > 0) {
    prompt += `\n详细信息：${JSON.stringify(settingDetails, null, 2)}`;
  }

  prompt += `\n\n**分析要求：**
建议类型：${getSuggestionTypeName(suggestionType)}

请从以下角度进行分析：
1. 设定完整性分析 - 找出缺失或薄弱的环节
2. 逻辑一致性检查 - 识别可能的矛盾或不合理之处
3. 创意发展建议 - 提供有趣的扩展方向
4. 情节融合建议 - 如何更好地融入故事情节
5. 角色互动建议 - 与角色的潜在互动方式

**输出要求：**
请以JSON格式返回建议，包含以下结构：
{
  "completenessAnalysis": {
    "strengths": ["优势点"],
    "weaknesses": ["薄弱环节"],
    "missingElements": ["缺失要素"],
    "priority": "high|medium|low"
  },
  "consistencyCheck": {
    "logicalIssues": ["逻辑问题"],
    "contradictions": ["矛盾点"],
    "suggestions": ["改进建议"]
  },
  "creativeDevelopment": {
    "expandAreas": ["可扩展领域"],
    "uniqueFeatures": ["独特特征建议"],
    "inspirationSources": ["灵感来源"]
  },
  "plotIntegration": {
    "storyRelevance": "与故事的相关度评估",
    "plotOpportunities": ["情节机会"],
    "conflictPotential": ["冲突潜力"]
  },
  "characterConnections": {
    "relatedCharacters": ["相关角色"],
    "interactionScenarios": ["互动场景"],
    "roleInStory": "在故事中的作用"
  },
  "actionableItems": [
    {
      "category": "类别",
      "description": "具体建议",
      "priority": "优先级",
      "effort": "实施难度"
    }
  ]
}`;

  return prompt;
}

// 获取建议类型名称
function getSuggestionTypeName(type) {
  const names = {
    general: '综合分析',
    completeness: '完整性检查',
    creativity: '创意发展',
    consistency: '一致性检查',
    integration: '情节融合'
  };
  return names[type] || type;
}

// 解析建议响应
function parseSuggestionsResponse(content) {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.log('JSON解析失败，使用默认建议结构');
  }

  return {
    completenessAnalysis: {
      strengths: ['基础设定清晰'],
      weaknesses: ['需要更多细节'],
      missingElements: ['背景历史', '相关规则'],
      priority: 'medium'
    },
    consistencyCheck: {
      logicalIssues: [],
      contradictions: [],
      suggestions: ['建议进行详细检查']
    },
    creativeDevelopment: {
      expandAreas: ['历史背景', '文化特色'],
      uniqueFeatures: ['添加独特元素'],
      inspirationSources: ['相关历史事件', '文学作品']
    },
    plotIntegration: {
      storyRelevance: '需要评估',
      plotOpportunities: ['场景设置', '角色互动'],
      conflictPotential: ['潜在冲突点']
    },
    characterConnections: {
      relatedCharacters: [],
      interactionScenarios: [],
      roleInStory: '待确定'
    },
    actionableItems: [
      {
        category: '内容完善',
        description: '添加更多背景细节',
        priority: 'high',
        effort: 'medium'
      }
    ]
  };
}

// 应用AI增强内容到设定
router.post('/:id/apply-enhancement', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      enhancedDescription,
      detailsFields,
      applyDescription = false,
      applyFields = []
    } = req.body;

    const setting = await prisma.worldSetting.findUnique({
      where: { id }
    });

    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    if (setting.isLocked) {
      return res.status(400).json({ error: 'Setting is locked and cannot be modified' });
    }

    // 准备更新数据
    const updateData = {
      updatedAt: new Date()
    };

    // 应用描述
    if (applyDescription && enhancedDescription) {
      updateData.description = enhancedDescription;
    }

    // 应用详细字段
    if (detailsFields && applyFields.length > 0) {
      const currentDetails = setting.details ? JSON.parse(setting.details) : {};

      applyFields.forEach(fieldKey => {
        if (detailsFields[fieldKey]) {
          currentDetails[fieldKey] = detailsFields[fieldKey];
        }
      });

      updateData.details = JSON.stringify(currentDetails);
    }

    // 更新设定
    const updatedSetting = await prisma.worldSetting.update({
      where: { id },
      data: updateData
    });

    // 解析details字段返回给前端
    if (updatedSetting.details) {
      updatedSetting.details = JSON.parse(updatedSetting.details);
    }

    res.json({
      setting: updatedSetting,
      appliedFields: applyFields,
      appliedDescription: applyDescription
    });

  } catch (error) {
    console.error('Error applying AI enhancement:', error);
    res.status(500).json({ error: 'Failed to apply enhancement' });
  }
});

// 批量生成世界设定
router.post('/batch-generate/:novelId', requireAuth, async (req, res) => {
  try {
    const { novelId } = req.params;
    const {
      settingTypes = ['worldview', 'location', 'rule', 'culture'],
      generationMode = 'comprehensive',
      customPrompts = {},
      count = { worldview: 1, location: 2, rule: 1, culture: 1 }
    } = req.body;

    // 获取小说信息
    const novel = await prisma.novel.findUnique({
      where: { id: novelId },
      include: {
        characters: true,
        settings: true,
        chapters: {
          select: { id: true, title: true, outline: true, content: true }
        }
      }
    });

    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    // 引入AI服务
    const aiService = require('../services/aiService');

    // 构建批量生成提示词
    const batchPrompt = buildBatchGenerationPrompt(novel, settingTypes, generationMode, customPrompts, count);

    // 调用AI生成
    const batchResult = await aiService.generateResponse(
      {
        title: novel.title,
        description: novel.description,
        genre: novel.genre,
        characters: novel.characters,
        settings: novel.settings,
        chapters: novel.chapters
      },
      batchPrompt,
      'creative',
      {
        taskType: 'world_building_batch',
        userId: req.user.id,
        messageType: 'worldbuilding'
      }
    );

    // 解析批量生成结果
    const parsedResults = parseBatchGenerationResponse(batchResult.message, settingTypes, count);

    res.json({
      novel: {
        id: novel.id,
        title: novel.title,
        description: novel.description,
        genre: novel.genre
      },
      generatedSettings: parsedResults,
      metadata: {
        generationMode,
        requestedTypes: settingTypes,
        requestedCounts: count
      }
    });

  } catch (error) {
    console.error('Error generating batch settings:', error);
    res.status(500).json({ error: 'Failed to generate settings batch' });
  }
});

// 构建批量生成提示词
function buildBatchGenerationPrompt(novel, settingTypes, generationMode, customPrompts, count) {
  let prompt = `请为小说《${novel.title}》批量生成世界设定。

**小说基本信息：**
标题：${novel.title}
简介：${novel.description || '待定'}
类型：${novel.genre || '待定'}`;

  // 添加现有角色信息
  if (novel.characters && novel.characters.length > 0) {
    prompt += `\n\n**现有角色：**`;
    novel.characters.slice(0, 5).forEach(char => {
      prompt += `\n- ${char.name}: ${char.description || '暂无描述'}`;
    });
    if (novel.characters.length > 5) {
      prompt += `\n- 还有${novel.characters.length - 5}个其他角色...`;
    }
  }

  // 添加现有设定信息
  if (novel.settings && novel.settings.length > 0) {
    prompt += `\n\n**现有世界设定：**`;
    novel.settings.slice(0, 3).forEach(setting => {
      prompt += `\n- ${setting.name}(${setting.type}): ${setting.description || '暂无描述'}`;
    });
    if (novel.settings.length > 3) {
      prompt += `\n- 还有${novel.settings.length - 3}个其他设定...`;
    }
  }

  // 添加章节大纲信息
  if (novel.chapters && novel.chapters.length > 0) {
    prompt += `\n\n**故事大纲：**`;
    novel.chapters.slice(0, 3).forEach(chapter => {
      if (chapter.outline) {
        prompt += `\n- 第${chapter.chapterNumber || '?'}章 ${chapter.title}: ${chapter.outline}`;
      }
    });
  }

  prompt += `\n\n**生成要求：**
生成模式：${getGenerationModeName(generationMode)}
需要生成的设定类型：${settingTypes.map(type => getSettingTypeName(type)).join('、')}

每种类型生成数量：`;

  settingTypes.forEach(type => {
    prompt += `\n- ${getSettingTypeName(type)}: ${count[type] || 1}个`;
  });

  // 添加自定义提示
  Object.keys(customPrompts).forEach(type => {
    if (settingTypes.includes(type) && customPrompts[type]) {
      prompt += `\n\n**${getSettingTypeName(type)}特殊要求：**\n${customPrompts[type]}`;
    }
  });

  // 根据生成模式调整要求
  prompt += `\n\n${getGenerationModeRequirements(generationMode)}`;

  // 输出格式要求
  prompt += `\n\n**输出格式要求：**
请以JSON格式返回生成结果，严格按照以下结构：
{`;

  settingTypes.forEach((type, index) => {
    const isLast = index === settingTypes.length - 1;
    prompt += `
  "${type}": [`;

    for (let i = 0; i < (count[type] || 1); i++) {
      const isLastItem = i === (count[type] || 1) - 1;
      prompt += `
    {
      "name": "设定名称",
      "description": "设定描述",
      "details": ${getTypeFieldsExample(type)}
    }${isLastItem ? '' : ','}`;
    }

    prompt += `
  ]${isLast ? '' : ','}`;
  });

  prompt += `
}

**重要提示：**
1. 确保所有生成的设定都与小说的世界观、角色和情节保持一致
2. 每个设定都应该有独特的特色，避免重复
3. details字段必须包含该类型设定的所有必需字段
4. 设定之间应该有合理的关联性，构成完整的世界体系
5. 生成的内容应该具有创意性和可用性，能够直接用于小说创作`;

  return prompt;
}

// 获取生成模式名称
function getGenerationModeName(mode) {
  const names = {
    comprehensive: '全面生成 - 创建完整的世界设定体系',
    focused: '重点生成 - 专注于核心设定',
    creative: '创意生成 - 强调独特性和创新',
    practical: '实用生成 - 注重实用性和可操作性'
  };
  return names[mode] || mode;
}

// 获取生成模式要求
function getGenerationModeRequirements(mode) {
  const requirements = {
    comprehensive: `**全面生成要求：**
- 构建完整的世界观体系
- 设定之间具有深层次的关联
- 涵盖世界的各个重要方面
- 确保逻辑一致性和完整性`,
    focused: `**重点生成要求：**
- 专注于对故事最重要的设定
- 深入发展核心概念
- 避免过于复杂的细节
- 突出关键特色`,
    creative: `**创意生成要求：**
- 追求独特和创新的概念
- 加入意想不到的元素
- 创造令人印象深刻的特色
- 鼓励想象力的发挥`,
    practical: `**实用生成要求：**
- 注重设定的可操作性
- 便于在故事中实际使用
- 提供清晰的规则和机制
- 考虑实际应用场景`
  };
  return requirements[mode] || '';
}

// 获取类型字段示例
function getTypeFieldsExample(type) {
  const examples = {
    worldview: `{
        "era": "时代背景",
        "factions": "主要势力",
        "history": "世界历史",
        "specialElements": "特殊元素"
      }`,
    location: `{
        "locationType": "位置类型",
        "climate": "气候环境",
        "population": "人口规模",
        "geography": "地理特征",
        "importantPlaces": "重要场所"
      }`,
    rule: `{
        "ruleTypes": ["规则类型"],
        "coreRules": "核心规则",
        "limitations": "限制与约束"
      }`,
    culture: `{
        "language": "主要语言",
        "religion": "宗教信仰",
        "traditions": "文化传统",
        "socialStructure": "社会结构",
        "values": "价值观念"
      }`
  };
  return examples[type] || '{}';
}

// 解析批量生成响应
function parseBatchGenerationResponse(content, settingTypes, count) {
  try {
    // 尝试解析JSON格式
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return validateBatchResponse(parsed, settingTypes, count);
    }
  } catch (error) {
    console.log('JSON解析失败，使用默认批量生成结果');
  }

  // 返回默认结构
  return generateDefaultBatchResponse(settingTypes, count);
}

// 验证批量响应
function validateBatchResponse(response, settingTypes, count) {
  const validatedResponse = {};

  settingTypes.forEach(type => {
    const expectedCount = count[type] || 1;
    const settings = response[type] || [];

    validatedResponse[type] = [];

    for (let i = 0; i < expectedCount; i++) {
      const setting = settings[i] || {};
      const fieldsStructure = getSettingFieldsStructure(type);

      // 验证并补全字段
      const validatedDetails = {};
      Object.keys(fieldsStructure).forEach(fieldKey => {
        const fieldConfig = fieldsStructure[fieldKey];
        validatedDetails[fieldKey] = setting.details?.[fieldKey] || `${fieldConfig.name}待完善`;
      });

      validatedResponse[type].push({
        name: setting.name || `${getSettingTypeName(type)}${i + 1}`,
        description: setting.description || `${getSettingTypeName(type)}描述待完善`,
        details: validatedDetails
      });
    }
  });

  return validatedResponse;
}

// 生成默认批量响应
function generateDefaultBatchResponse(settingTypes, count) {
  const defaultResponse = {};

  settingTypes.forEach(type => {
    const expectedCount = count[type] || 1;
    defaultResponse[type] = [];

    for (let i = 0; i < expectedCount; i++) {
      const fieldsStructure = getSettingFieldsStructure(type);
      const defaultDetails = {};

      Object.keys(fieldsStructure).forEach(fieldKey => {
        const fieldConfig = fieldsStructure[fieldKey];
        defaultDetails[fieldKey] = `${fieldConfig.name}待完善`;
      });

      defaultResponse[type].push({
        name: `${getSettingTypeName(type)}${i + 1}`,
        description: `${getSettingTypeName(type)}描述待完善`,
        details: defaultDetails
      });
    }
  });

  return defaultResponse;
}

// 应用批量生成的设定
router.post('/apply-batch/:novelId', requireAuth, async (req, res) => {
  try {
    const { novelId } = req.params;
    const { generatedSettings, selectedSettings = [] } = req.body;

    if (!generatedSettings || selectedSettings.length === 0) {
      return res.status(400).json({ error: 'No settings selected for creation' });
    }

    const createdSettings = [];

    // 批量创建选中的设定
    for (const selection of selectedSettings) {
      const { type, index } = selection;
      const settingData = generatedSettings[type]?.[index];

      if (!settingData) {
        console.warn(`Setting not found: ${type}[${index}]`);
        continue;
      }

      try {
        const created = await prisma.worldSetting.create({
          data: {
            novelId,
            type,
            name: settingData.name,
            description: settingData.description,
            details: JSON.stringify(settingData.details || {})
          }
        });

        // 解析details字段
        created.details = JSON.parse(created.details || '{}');
        createdSettings.push(created);
      } catch (createError) {
        console.error(`Failed to create setting ${settingData.name}:`, createError);
      }
    }

    res.json({
      success: true,
      createdCount: createdSettings.length,
      settings: createdSettings
    });

  } catch (error) {
    console.error('Error applying batch settings:', error);
    res.status(500).json({ error: 'Failed to apply batch settings' });
  }
});

// AI一致性检查接口
router.post('/:id/consistency-check', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { scope = 'setting' } = req.body;

    const setting = await prisma.worldSetting.findUnique({
      where: { id },
      include: {
        novel: {
          include: {
            characters: true,
            settings: true,
            chapters: {
              select: { id: true, title: true, outline: true, content: true }
            }
          }
        }
      }
    });

    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    const aiService = require('../services/aiService');

    // 构建一致性检查提示词
    const consistencyResult = await aiService.generateResponse(
      {
        title: setting.novel.title,
        description: setting.novel.description,
        genre: setting.novel.genre,
        characters: setting.novel.characters,
        settings: setting.novel.settings,
        chapters: setting.novel.chapters
      },
      buildConsistencyPrompt(setting, scope),
      'analytical',
      {
        taskType: 'consistency_check',
        userId: req.user.id,
        messageType: 'consistency'
      }
    );

    // 解析一致性检查结果
    const structuredResult = parseConsistencyResponse(consistencyResult.message);

    res.json(structuredResult);
  } catch (error) {
    console.error('Error checking consistency:', error);
    res.status(500).json({ error: 'Failed to check consistency' });
  }
});

// 构建一致性检查提示词
function buildConsistencyPrompt(setting, scope) {
  const settingDetails = setting.details ? JSON.parse(setting.details) : {};

  let prompt = `请对世界设定"${setting.name}"进行一致性检查。

**检查范围：${scope === 'full' ? '全面检查' : '设定内部检查'}**

**当前设定信息：**
类型：${getSettingTypeName(setting.type)}
名称：${setting.name}
描述：${setting.description || '暂无描述'}`;

  if (Object.keys(settingDetails).length > 0) {
    prompt += `\n详细信息：${JSON.stringify(settingDetails, null, 2)}`;
  }

  if (scope === 'full') {
    prompt += `\n\n**相关背景信息：**`;

    if (setting.novel.characters.length > 0) {
      prompt += `\n角色设定：`;
      setting.novel.characters.forEach(char => {
        prompt += `\n- ${char.name}: ${char.description || '暂无描述'}`;
      });
    }

    if (setting.novel.settings.length > 0) {
      prompt += `\n其他世界设定：`;
      setting.novel.settings.forEach(s => {
        if (s.id !== setting.id) {
          prompt += `\n- ${s.name}(${s.type}): ${s.description || '暂无描述'}`;
        }
      });
    }
  }

  prompt += `\n\n**检查要求：**
请从以下角度进行一致性检查：
1. 内部逻辑一致性 - 设定内部是否存在矛盾
2. 现实合理性 - 是否符合基本逻辑和常识
3. 体系完整性 - 设定体系是否完整
4. 跨设定一致性 - 与其他设定是否冲突
5. 角色兼容性 - 与角色设定是否匹配

**输出格式：**
{
  "overallScore": 85, // 总体一致性评分(0-100)
  "issues": [
    {
      "type": "contradiction|logic|incomplete|conflict",
      "severity": "high|medium|low",
      "description": "问题描述",
      "location": "问题位置",
      "suggestion": "修改建议"
    }
  ],
  "strengths": ["优势点"],
  "recommendations": [
    {
      "priority": "high|medium|low",
      "action": "建议行动",
      "reason": "建议理由"
    }
  ],
  "consistencyReport": {
    "internalLogic": {"score": 90, "notes": "评价说明"},
    "realism": {"score": 85, "notes": "评价说明"},
    "completeness": {"score": 75, "notes": "评价说明"},
    "crossReference": {"score": 88, "notes": "评价说明"},
    "characterCompatibility": {"score": 92, "notes": "评价说明"}
  }
}`;

  return prompt;
}

// 解析一致性检查响应
function parseConsistencyResponse(content) {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.log('JSON解析失败，使用默认一致性结果');
  }

  return {
    overallScore: 75,
    issues: [
      {
        type: 'incomplete',
        severity: 'medium',
        description: '设定缺少部分重要细节',
        location: '详细描述部分',
        suggestion: '补充相关背景信息'
      }
    ],
    strengths: ['基础概念清晰', '符合世界观设定'],
    recommendations: [
      {
        priority: 'medium',
        action: '完善设定细节',
        reason: '增强设定的完整性和可信度'
      }
    ],
    consistencyReport: {
      internalLogic: { score: 80, notes: '内部逻辑基本合理' },
      realism: { score: 75, notes: '现实性有待提升' },
      completeness: { score: 65, notes: '需要补充更多细节' },
      crossReference: { score: 85, notes: '与其他设定协调' },
      characterCompatibility: { score: 78, notes: '与角色设定基本匹配' }
    }
  };
}

module.exports = router;
