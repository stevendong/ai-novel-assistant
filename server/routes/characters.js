const express = require('express');
const multer = require('multer');
const uploadService = require('../services/uploadService');
const characterCardUtils = require('../utils/characterCardUtils');
const prisma = require('../utils/prismaClient');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const DEFAULT_LOCALE = 'zh';

function normalizeLocale(locale) {
  if (!locale) return DEFAULT_LOCALE;
  const value = String(locale).trim().toLowerCase();
  if (!value) return DEFAULT_LOCALE;
  const base = value.split('-')[0];
  return base || DEFAULT_LOCALE;
}

function getLanguageRequirement(localeInput) {
  const locale = normalizeLocale(localeInput);
  if (locale.startsWith('en')) {
    return 'Language requirement: Please respond entirely in English, using a tone and style that fit English-language web fiction readers.';
  }
  return '语言要求：请使用简体中文输出全部内容，保持自然流畅并符合中文网络小说的阅读习惯。';
}

// 配置 multer 用于内存存储
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 限制
  },
  fileFilter: (req, file, cb) => {
    // 只接受图片文件
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只支持图片文件上传'));
    }
  }
});

// 生成随机角色姓名的工具函数
function generateRandomName(genre) {
  const names = {
    fantasy: ['林墨', '萧云', '叶风', '陈霜', '白雪', '苏寒', '周星', '李月'],
    'sci-fi': ['王泽', '张航', '李明', '陈宇', '刘星', '杨光', '钱博', '孙澈'],
    romance: ['安然', '夏沫', '林初', '苏心', '江暖', '顾念', '程锦', '沈微'],
    mystery: ['秦寻', '易寒', '纪深', '墨琛', '冷夜', '江枫', '洛尘', '叶隐'],
    default: ['云飞', '雨晨', '星河', '月影', '风华', '雪儿', '天行', '若水']
  };

  const nameArray = names[genre] || names.default;
  return nameArray[Math.floor(Math.random() * nameArray.length)];
}


// 获取小说的所有角色
router.get('/novel/:novelId', async (req, res) => {
  try {
    const { novelId } = req.params;
    const characters = await prisma.character.findMany({
      where: { novelId },
      include: {
        _count: {
          select: {
            chapterRefs: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    
    // Parse relationships JSON strings back to objects
    const parsedCharacters = characters.map(char => ({
      ...char,
      relationships: char.relationships ? JSON.parse(char.relationships) : null
    }));
    
    res.json(parsedCharacters);
  } catch (error) {
    console.error('Error fetching characters:', error);
    res.status(500).json({ error: 'Failed to fetch characters' });
  }
});

// 获取单个角色详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const character = await prisma.character.findUnique({
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

    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Parse relationships JSON string back to object
    const parsedCharacter = {
      ...character,
      relationships: character.relationships ? JSON.parse(character.relationships) : null
    };

    res.json(parsedCharacter);
  } catch (error) {
    console.error('Error fetching character:', error);
    res.status(500).json({ error: 'Failed to fetch character' });
  }
});

// 创建新角色
router.post('/', async (req, res) => {
  try {
    const {
      novelId,
      name,
      description,
      age,
      gender,
      identity,
      appearance,
      personality,
      background,
      relationships,
      values,
      fears,
      skills
    } = req.body;

    if (!novelId || !name) {
      return res.status(400).json({ error: 'Novel ID and name are required' });
    }

    const character = await prisma.character.create({
      data: {
        novelId,
        name,
        description,
        age,
        gender,
        identity,
        appearance,
        personality,
        background,
        values,
        fears,
        skills,
        relationships: relationships ? JSON.stringify(relationships) : null
      }
    });

    // Parse relationships JSON string back to object for response
    const parsedCharacter = {
      ...character,
      relationships: character.relationships ? JSON.parse(character.relationships) : null
    };

    res.status(201).json(parsedCharacter);
  } catch (error) {
    console.error('Error creating character:', error);
    res.status(500).json({ error: 'Failed to create character' });
  }
});

// 更新角色信息
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      age,
      gender,
      identity,
      appearance,
      personality,
      values,
      fears,
      background,
      skills,
      relationships,
      isLocked,
      avatar,
      avatarKey,
      // SillyTavern 字段
      firstMessage,
      messageExample,
      alternateGreetings,
      systemPrompt,
      postHistoryInstructions,
      tags,
      creator,
      characterVersion,
      characterBook
    } = req.body;

    const character = await prisma.character.update({
      where: { id },
      data: {
        name,
        description,
        age,
        gender,
        identity,
        appearance,
        personality,
        values,
        fears,
        background,
        skills,
        relationships: relationships ? JSON.stringify(relationships) : relationships,
        isLocked,
        avatar,
        avatarKey,
        // SillyTavern 字段
        firstMessage,
        messageExample,
        alternateGreetings,
        systemPrompt,
        postHistoryInstructions,
        tags,
        creator,
        characterVersion,
        characterBook,
        updatedAt: new Date()
      }
    });

    // Parse relationships JSON string back to object for response
    const parsedCharacter = {
      ...character,
      relationships: character.relationships ? JSON.parse(character.relationships) : null
    };

    res.json(parsedCharacter);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Character not found' });
    }
    console.error('Error updating character:', error);
    res.status(500).json({ error: 'Failed to update character' });
  }
});

// 删除角色
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.character.delete({
      where: { id }
    });

    res.json({ message: 'Character deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Character not found' });
    }
    console.error('Error deleting character:', error);
    res.status(500).json({ error: 'Failed to delete character' });
  }
});

// AI完善角色
router.post('/:id/enhance', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { enhanceAspects, context, constraints, locale } = req.body;

    const character = await prisma.character.findUnique({
      where: { id },
      include: {
        novel: {
          select: {
            title: true,
            description: true,
            genre: true,
            aiSettings: true
          }
        }
      }
    });

    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    if (character.isLocked) {
      return res.status(400).json({ error: 'Character is locked and cannot be enhanced' });
    }

    // 使用AI服务生成角色完善建议
    const aiService = require('../services/aiService');
    const languageRequirement = getLanguageRequirement(locale);

    // 构建AI请求的系统提示
    const systemPrompt = `你是一个专业的小说角色创作助手。请根据提供的角色信息，生成全面的完善建议。

当前小说信息：
- 标题：${character.novel.title}
- 描述：${character.novel.description}
- 类型：${character.novel.genre}

角色当前信息：
- 姓名：${character.name}
- 性别：${character.gender || '暂无'}
- 年龄/身份：${character.age || '暂无'}
- 描述：${character.description || '暂无'}
- 外貌：${character.appearance || '暂无'}
- 性格：${character.personality || '暂无'}
- 核心价值观：${character.values || '暂无'}
- 恐惧与弱点：${character.fears || '暂无'}
- 背景：${character.background || '暂无'}
- 技能与能力：${character.skills || '暂无'}
- 人际关系：${character.relationships ? JSON.stringify(character.relationships) : '暂无'}

请生成以下所有方面的完善建议（以JSON格式返回）：
{
  "suggestions": {
    "gender": "性别建议（如果未设定，根据角色名字和设定给出建议）",
    "age": "年龄设定或身份定位建议（50-100字）",
    "description": "角色总体描述建议（100-150字）",
    "appearance": "详细外貌特征建议（150-200字）",
    "personality": "深入性格特点建议（200-300字）",
    "values": "核心价值观与信念建议（100-150字）",
    "fears": "恐惧、弱点与内心冲突建议（100-150字）",
    "background": "丰富背景故事建议（200-300字）",
    "skills": "技能、能力与特长建议（100-150字）",
    "relationships": "重要人际关系建议（150-200字，包含具体关系类型和影响）"
  },
  "questions": ["启发思考的问题1", "启发思考的问题2", "启发思考的问题3", "启发思考的问题4", "启发思考的问题5"]
}

要求：
1. 所有建议要符合小说类型和整体氛围
2. 考虑角色在故事中的作用和重要性
3. 建议具体、可操作，避免空泛描述
4. 如果某方面已有内容，在原基础上扩展和深化
5. 确保各个方面相互呼应，形成完整角色画像
6. 提供的问题要能启发作者思考角色的深层动机和发展

${languageRequirement}`;

    const userMessage = `请为角色"${character.name}"生成完善建议。

${context ? `额外背景信息：${context}` : ''}
${enhanceAspects?.length > 0 ? `重点完善方面：${enhanceAspects.join('、')}` : ''}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ];

    try {
      const aiResponse = await aiService.chat(messages, {
        temperature: 0.8,
        maxTokens: 3000,
        taskType: 'creative',
        userId: req.user.id,
        novelId: character.novelId,
        requestUrl: req.aiRequestUrl || req.originalUrl
      });

      // 尝试解析AI响应为JSON
      let enhancement;
      try {
        // 提取JSON部分（可能包含在代码块中）
        const content = aiResponse.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : content;
        enhancement = JSON.parse(jsonStr);

        // 验证响应结构
        if (!enhancement.suggestions || !enhancement.questions) {
          throw new Error('Invalid response structure');
        }
      } catch (parseError) {
        console.warn('Failed to parse AI response as JSON, using fallback');
        // 降级处理：提取文本内容
        enhancement = {
          suggestions: {
            gender: character.gender || '建议根据角色姓名和设定明确性别',
            age: character.age || '建议设定具体年龄和身份定位',
            description: character.description || '建议添加角色总体描述',
            appearance: character.appearance || '建议添加详细外貌特征描述',
            personality: character.personality || '建议添加具体的性格特征描述',
            values: character.values || '建议描述角色的核心价值观和信念',
            fears: character.fears || '建议描述角色的恐惧、弱点和内心冲突',
            background: character.background || '建议添加详细的背景故事',
            skills: character.skills || '建议描述角色的技能、能力和特长',
            relationships: '建议建立重要的人际关系网络'
          },
          questions: [
            '这个角色的核心动机和目标是什么？',
            '他/她有什么独特的技能或天赋？',
            '童年或重要经历如何塑造了角色性格？',
            '角色最大的恐惧或弱点是什么？',
            '在人际关系中，角色扮演什么角色？'
          ],
          aiNote: 'AI服务暂时不可用，已提供基础建议框架'
        };
      }

      res.json(enhancement);

    } catch (aiError) {
      console.error('AI service error:', aiError);

      // AI服务失败时的降级响应
      const fallbackEnhancement = {
        suggestions: {
          gender: character.gender ?
            `${character.gender}` :
            '建议根据角色姓名和设定明确性别（男/女/其他）。',
          age: character.age ?
            `${character.age}\n\n建议完善：可以更具体地描述角色的社会地位、职业特点或人生阶段。` :
            '建议设定具体年龄和身份定位，考虑角色在故事中的作用。',
          description: character.description ?
            `${character.description}\n\n建议完善：可以突出角色最核心的特质和在故事中的重要性。` :
            '建议添加角色的总体印象和核心特质概述。',
          appearance: character.appearance ?
            `${character.appearance}\n\n建议完善：可以增加更多独特的外貌特征和给人的第一印象。` :
            '建议从身高体型、五官特征、穿着风格、气质表现等方面描述外貌。',
          personality: character.personality ?
            `${character.personality}\n\n建议完善：可以添加更多具体的行为习惯、说话方式和内心想法，让性格更加立体。` :
            '建议从角色的核心价值观、行为模式、情绪表达方式等方面详细描述性格特征。',
          values: character.values ?
            `${character.values}\n\n建议完善：可以深入探讨这些价值观的形成原因和具体表现。` :
            '建议描述角色的核心价值观、信念和道德准则。',
          fears: character.fears ?
            `${character.fears}\n\n建议完善：可以分析这些恐惧对角色行为和决策的具体影响。` :
            '建议描述角色的恐惧、弱点、内心冲突和心理阴影。',
          background: character.background ?
            `${character.background}\n\n建议完善：可以补充重要的成长经历、转折点事件和对角色的影响。` :
            '建议详细描述角色的出身背景、成长环境、重要经历和人生转折点。',
          skills: character.skills ?
            `${character.skills}\n\n建议完善：可以说明这些技能的获得过程和在故事中的作用。` :
            '建议描述角色的专业技能、特殊能力、天赋和实用技巧。',
          relationships: '建议建立重要的人际关系网络，包括家人、朋友、敌人、导师等，以及这些关系对角色的影响。'
        },
        questions: [
          '这个角色的核心动机和终极目标是什么？',
          '他/她有什么独特的技能、天赋或爱好？',
          '童年或重要经历如何塑造了角色的性格？',
          '角色最大的恐惧或弱点是什么？',
          '在人际关系中，角色扮演什么角色？',
          '什么样的冲突能最大程度地挑战这个角色？'
        ],
        fallback: true,
        message: 'AI服务暂时不可用，已提供基础建议框架'
      };

      res.json(fallbackEnhancement);
    }

  } catch (error) {
    console.error('Error enhancing character:', error);
    res.status(500).json({ error: 'Failed to enhance character' });
  }
});

// AI发展角色弧线
router.post('/:id/develop', async (req, res) => {
  try {
    const { id } = req.params;
    const { developmentStage, targetTrait } = req.body;

    const character = await prisma.character.findUnique({
      where: { id }
    });

    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // AI发展角色弧线的模拟响应
    const development = {
      arc: {
        beginning: '角色初始状态',
        development: '成长过程中的关键转折点',
        climax: '角色面临的最大挑战',
        resolution: '角色的最终成长状态'
      },
      keyMoments: [
        { chapter: 1, event: '角色首次登场', impact: '建立初始印象' },
        { chapter: 3, event: '第一次重要决定', impact: '显示核心价值观' },
        { chapter: 7, event: '面临道德冲突', impact: '角色深度发展' }
      ]
    };

    res.json(development);
  } catch (error) {
    console.error('Error developing character:', error);
    res.status(500).json({ error: 'Failed to develop character' });
  }
});

// AI生成新角色
router.post('/generate', requireAuth, async (req, res) => {
  try {
    const { novelId, prompt, baseInfo, locale } = req.body;

    if (!novelId || !prompt) {
      return res.status(400).json({ error: 'Novel ID and prompt are required' });
    }

    // 获取小说信息作为上下文
    const novel = await prisma.novel.findUnique({
      where: { id: novelId },
      select: {
        title: true,
        description: true,
        genre: true,
        aiSettings: true
      }
    });

    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    // 使用AI服务生成角色
    const aiService = require('../services/aiService');
    const languageRequirement = getLanguageRequirement(locale);

    // 构建AI请求的系统提示
    const systemPrompt = `你是一个专业的小说角色创作助手。请根据用户的提示生成一个完整的角色信息。

当前小说信息：
- 标题：${novel.title}
- 描述：${novel.description}
- 类型：${novel.genre}

${baseInfo?.name ? `角色姓名：${baseInfo.name}` : ''}
${baseInfo?.description ? `已有描述：${baseInfo.description}` : ''}

请生成以下格式的角色信息（以JSON格式返回）：
{
  "character": {
    "name": "建议的角色姓名（如果用户未提供或提供的姓名可以优化）",
    "gender": "性别（男/女/其他，根据角色设定和名字判断）",
    "age": "具体年龄（如：25岁、三十有八、不详等）",
    "identity": "身份/职业/地位（如：私人侦探、青霄剑宗内门弟子、宫廷御医等）",
    "description": "角色总体描述，突出核心特质（80-120字）",
    "appearance": "详细外貌特征描述（150-200字）",
    "personality": "深入性格特点描述（200-300字）",
    "values": "核心价值观与信念（100-150字）",
    "fears": "恐惧、弱点与内心冲突（100-150字）",
    "background": "丰富背景故事（200-300字）",
    "skills": "技能、能力与特长（100-150字）"
  },
  "reasoning": "角色设计理念和创作思路的简要说明"
}

要求：
1. 符合小说类型和整体氛围
2. 角色要有鲜明的个性和深度
3. 各个方面要相互呼应，形成完整角色画像
4. 考虑角色在故事中的潜在作用
5. 确保内容丰富且具体，避免空泛描述

${languageRequirement}`;

    const userMessage = `请根据以下提示生成一个完整的小说角色：

${prompt}

${baseInfo?.name ? `\n用户提供的角色姓名：${baseInfo.name}（如果此姓名合适则使用，如果可以优化则提供更好的建议）` : '\n请为角色生成一个符合设定的姓名'}
${baseInfo?.description ? `\n现有描述：${baseInfo.description}` : ''}

重要提示：请务必在JSON响应的character对象中包含"name"字段，提供一个符合角色设定和小说世界观的姓名。${languageRequirement}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ];

    try {
      const aiResponse = await aiService.chat(messages, {
        temperature: 1,
        maxTokens: 3000,
        taskType: 'creative',
        userId: req.user.id,
        novelId: novelId,
        requestUrl: req.aiRequestUrl || req.originalUrl
      });

      // 尝试解析AI响应为JSON
      let generationResult;
      try {
        // 提取JSON部分（可能包含在代码块中）
        const content = aiResponse.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : content;
        generationResult = JSON.parse(jsonStr);

        // 验证响应结构
        if (!generationResult.character) {
          throw new Error('Invalid response structure');
        }

        // 如果AI没有生成name字段，尝试提供一个合适的名字
        if (!generationResult.character.name) {
          generationResult.character.name = baseInfo?.name || generateRandomName(novel.genre);
        }
      } catch (parseError) {
        console.warn('Failed to parse AI response as JSON, using fallback');
        // 降级处理：提供基础角色信息
        generationResult = {
          character: {
            name: baseInfo?.name || '待定角色',
            gender: '男',
            age: '25岁',
            identity: '年轻且富有活力的冒险者',
            description: baseInfo?.description || '一个拥有独特魅力和复杂内心的角色',
            appearance: '中等身高，眼神坚定，外表普通但气质不凡，穿着得体',
            personality: '性格复杂多面，既有勇敢的一面也有脆弱的内心，善于思考但有时冲动',
            values: '重视友情和正义，相信每个人都有改变的可能',
            fears: '害怕失去重要的人，担心自己的选择会伤害他人',
            background: '出身普通，经历过一些重要的人生转折点，这些经历塑造了他现在的性格',
            skills: '拥有良好的观察力和沟通能力，在某个专业领域有一定的技能'
          },
          reasoning: 'AI服务暂时不可用，已提供基础角色框架',
          fallback: true
        };
      }

      res.json(generationResult);

    } catch (aiError) {
      console.error('AI service error:', aiError);

      // AI服务失败时的降级响应
      const fallbackCharacter = {
        character: {
          name: baseInfo?.name || '待命名角色',
          gender: '男',
          age: `${Math.floor(Math.random() * 30) + 20}岁`,
          identity: '正值人生的关键阶段',
          description: baseInfo?.description || '一个具有独特背景和鲜明个性的角色，在故事中扮演重要角色',
          appearance: '外表具有吸引力，有着令人印象深刻的特征，穿着体现了其身份和个性',
          personality: '性格层次丰富，有着鲜明的优点和可理解的缺点，行为模式符合其背景',
          values: '拥有清晰的道德观念和价值取向，这些信念指导着其行为选择',
          fears: '内心深处有着真实的恐惧和不安，这些弱点使角色更加人性化',
          background: '有着丰富的人生经历，重要的成长事件塑造了现在的性格和世界观',
          skills: '在某些领域拥有特殊的技能或天赋，这些能力在故事中发挥重要作用'
        },
        reasoning: '由于AI服务暂时不可用，提供了通用的角色框架，建议后续手动完善',
        fallback: true,
        message: 'AI服务暂时不可用，已提供基础角色框架'
      };

      res.json(fallbackCharacter);
    }

  } catch (error) {
    console.error('Error generating character:', error);
    res.status(500).json({ error: 'Failed to generate character' });
  }
});

// 上传角色头像
router.post('/:id/avatar', upload.single('avatar'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: '未找到上传的文件' });
    }

    // 获取角色信息
    const character = await prisma.character.findUnique({
      where: { id }
    });

    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // 删除旧头像（如果存在）
    if (character.avatarKey) {
      await uploadService.deleteFile(character.avatarKey);
    }

    // 上传新头像到 R2
    const uploadResult = await uploadService.uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      'avatars/characters'
    );

    if (!uploadResult.success) {
      return res.status(500).json({ error: '头像上传失败', details: uploadResult.error });
    }

    // 更新角色头像信息
    const updatedCharacter = await prisma.character.update({
      where: { id },
      data: {
        avatar: uploadResult.url,
        avatarKey: uploadResult.key,
        avatarMetadata: JSON.stringify({
          originalName: uploadResult.originalName,
          size: req.file.size,
          mimeType: req.file.mimetype,
          uploadedAt: new Date().toISOString()
        })
      }
    });

    res.json({
      success: true,
      avatar: updatedCharacter.avatar,
      avatarKey: updatedCharacter.avatarKey
    });

  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ error: '头像上传失败' });
  }
});

// 导入 SillyTavern 角色卡
router.post('/import-card', requireAuth, upload.single('card'), async (req, res) => {
  try {
    const { novelId, existingFileUrl, existingFileKey } = req.body;

    if (!novelId) {
      return res.status(400).json({ error: 'Novel ID is required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: '未找到上传的角色卡文件' });
    }

    // 验证文件类型为 PNG
    if (req.file.mimetype !== 'image/png') {
      return res.status(400).json({ error: '只支持 PNG 格式的角色卡' });
    }

    // 从 PNG 中提取角色卡数据
    const cardData = await characterCardUtils.extractCharacterCardFromPNG(req.file.buffer);

    if (!cardData) {
      return res.status(400).json({ error: '未能从图片中提取角色卡数据，请确保这是有效的 SillyTavern 角色卡' });
    }

    // 验证角色卡数据
    if (!characterCardUtils.isValidCharacterCard(cardData)) {
      return res.status(400).json({ error: '无效的角色卡格式' });
    }

    // 转换为系统格式（提取所有原始数据）
    let characterData = characterCardUtils.convertFromSillyTavernFormat(cardData);

    // 调试日志：输出原始数据结构
    console.log('SillyTavern 角色卡原始数据预览:', {
      name: characterData._rawData?.name,
      hasDescription: !!characterData._rawData?.description,
      hasPersonality: !!characterData._rawData?.personality,
      hasScenario: !!characterData._rawData?.scenario,
      hasExtensions: !!characterData._rawData?.extensions,
      extensionKeys: characterData._rawData?.extensions ? Object.keys(characterData._rawData.extensions) : []
    });

    // 使用AI智能映射所有字段（如果AI服务可用）
    try {
      const aiService = require('../services/aiService');

      // 构建完整的系统字段说明
      const systemFieldsGuide = `
## 本系统的人物设定字段定义：

1. **name** (必填) - 角色姓名
2. **gender** - 性别，男/女/其他
3. **description** - 角色总体描述，简要概括角色的核心特质和背景
4. **age** - 年龄/年龄段，如"25岁"、"二十出头"、"中年"等
5. **identity** - 身份/职业/地位，如"私人侦探"、"宫廷御医"、"流浪剑客"
6. **appearance** - 外貌特征，详细描述身高、体型、五官、发型、穿着打扮、气质等
7. **personality** - 性格特征，描述性格特点、行为习惯、说话方式、情绪表达等
8. **values** - 核心价值观，角色的信念、道德准则、重要的人生观念
9. **fears** - 恐惧与弱点，害怕什么、有什么弱点、内心的冲突和阴影
10. **background** - 背景故事，出身、成长经历、重要事件、人生转折点
11. **skills** - 技能与能力，专业技能、特殊能力、天赋、实用技巧
12. **relationships** - 人际关系（JSON对象格式），如 {"张三": {"type": "朋友", "importance": "高", "description": "青梅竹马"}}

## SillyTavern 特有字段（保留）：
- firstMessage: 第一条消息/问候语
- messageExample: 对话示例
- systemPrompt: 系统提示词
- tags: 标签
- creator: 创作者
等等...`;

      // 准备完整的原始数据
      const rawDataStr = JSON.stringify(characterData._rawData, null, 2);

      // 构建AI映射提示
      const mappingPrompt = `你是一个专业的角色卡数据映射助手。我会给你一个SillyTavern格式的角色卡原始数据，请将其准确映射到本系统的人物设定字段中。

${systemFieldsGuide}

## SillyTavern 角色卡原始数据：
\`\`\`json
${rawDataStr}
\`\`\`

## 任务要求：
1. **准确提取**：从原始数据中提取信息，填充到对应的系统字段
2. **智能补充**：如果某些字段在原始数据中没有直接对应，但可以从其他字段推断或提取，请智能补充
3. **保持一致**：所有提取的信息必须与原始角色设定保持一致，不要编造
4. **字段映射参考**：
   - name ← name
   - gender ← 从 name, description, personality 中推断性别，或从 tags 中查找
   - description ← description（如果太长可以提炼核心）
   - age ← 从 description, personality, scenario 中提取年龄信息
   - identity ← 从 description, scenario 中提取身份/职业信息
   - appearance ← 从 description, creator_notes 中提取外貌描述
   - personality ← personality（可以整合 creator_notes 中的性格部分）
   - values ← 从 personality, scenario, creator_notes 中分析提取价值观
   - fears ← 从 personality, creator_notes 中分析提取恐惧和弱点
   - background ← scenario（背景故事、情境设定）
   - skills ← 从 description, scenario, creator_notes 中提取技能能力
   - relationships ← 从 character_book 的 entries 或 creator_notes 中提取人际关系

5. **关系格式**：relationships 必须是对象格式，例如：
   {
     "角色A": {"type": "朋友", "importance": "高", "description": "关系描述"},
     "角色B": {"type": "导师", "importance": "中", "description": "关系描述"}
   }

请以JSON格式返回映射后的结果：
\`\`\`json
{
  "name": "角色姓名",
  "gender": "性别（男/女/其他）",
  "description": "角色总体描述",
  "age": "年龄",
  "identity": "身份/职业",
  "appearance": "外貌特征",
  "personality": "性格特征",
  "values": "核心价值观",
  "fears": "恐惧与弱点",
  "background": "背景故事",
  "skills": "技能与能力",
  "relationships": {}
}
\`\`\`

注意：只返回JSON，不要有其他说明文字。`;

      const messages = [
        { role: 'system', content: '你是专业的角色卡数据映射助手，擅长准确提取和转换角色信息。' },
        { role: 'user', content: mappingPrompt }
      ];

      const aiResponse = await aiService.chat(messages, {
        temperature: 0.2,
        maxTokens: 2000,
        taskType: 'analysis',
        userId: req.user.id,
        novelId: novelId,
        requestUrl: req.aiRequestUrl || req.originalUrl
      });

      // 解析AI响应
      try {
        const content = aiResponse.content;
        // 提取JSON部分（支持代码块包裹）
        const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[1] || jsonMatch[0];
          const aiMappedData = JSON.parse(jsonStr);

          // 用AI映射的数据覆盖基础提取的数据
          Object.keys(aiMappedData).forEach(key => {
            if (aiMappedData[key] && aiMappedData[key] !== '') {
              // 特殊处理 relationships 字段
              if (key === 'relationships') {
                if (typeof aiMappedData[key] === 'object' && !Array.isArray(aiMappedData[key])) {
                  characterData[key] = JSON.stringify(aiMappedData[key]);
                } else if (typeof aiMappedData[key] === 'string') {
                  try {
                    // 验证是否为有效 JSON
                    JSON.parse(aiMappedData[key]);
                    characterData[key] = aiMappedData[key];
                  } catch (e) {
                    console.warn('relationships 字段格式无效，跳过');
                  }
                }
              } else {
                characterData[key] = aiMappedData[key];
              }
            }
          });

          console.log('AI字段映射成功:', {
            name: aiMappedData.name,
            hasAge: !!aiMappedData.age,
            hasIdentity: !!aiMappedData.identity,
            hasAppearance: !!aiMappedData.appearance,
            hasPersonality: !!aiMappedData.personality,
            hasValues: !!aiMappedData.values,
            hasFears: !!aiMappedData.fears,
            hasBackground: !!aiMappedData.background,
            hasSkills: !!aiMappedData.skills,
            hasRelationships: !!aiMappedData.relationships
          });
        } else {
          console.warn('AI响应中未找到JSON数据，使用基础提取结果');
        }
      } catch (parseError) {
        console.warn('AI字段解析失败，使用基础提取结果:', parseError.message);
      }
    } catch (aiError) {
      console.warn('AI映射服务不可用，使用基础提取结果:', aiError.message);
    }

    // 移除内部字段
    delete characterData._rawData;

    // 检查名称冲突
    const existingCharacter = await prisma.character.findFirst({
      where: {
        novelId,
        name: characterData.name
      }
    });

    if (existingCharacter) {
      // 返回冲突信息，让前端处理
      return res.json({
        conflict: true,
        existingCharacter: {
          id: existingCharacter.id,
          name: existingCharacter.name
        },
        importedData: characterData,
        cardImage: req.file.buffer.toString('base64') // 保存图片数据供后续使用
      });
    }

    // 处理头像：优先使用文件库中的图片，避免重复上传
    let avatarUrl = null;
    let avatarKey = null;
    let avatarMetadata = null;

    if (existingFileUrl && existingFileKey) {
      // 使用文件库中已存在的图片
      avatarUrl = existingFileUrl;
      avatarKey = existingFileKey;
      avatarMetadata = JSON.stringify({
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        uploadedAt: new Date().toISOString(),
        source: 'sillytavern_import_from_library'
      });
    } else {
      // 上传新的头像图片
      const uploadResult = await uploadService.uploadFile(
        req.file.buffer,
        `${characterData.name}_avatar.png`,
        'image/png',
        'avatars/characters'
      );

      if (uploadResult.success) {
        avatarUrl = uploadResult.url;
        avatarKey = uploadResult.key;
        avatarMetadata = JSON.stringify({
          originalName: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype,
          uploadedAt: new Date().toISOString(),
          source: 'sillytavern_import'
        });
      }
    }

    // 创建角色
    const character = await prisma.character.create({
      data: {
        novelId,
        ...characterData,
        avatar: avatarUrl,
        avatarKey: avatarKey,
        avatarMetadata: avatarMetadata
      }
    });

    // Parse relationships JSON string back to object for response
    const parsedCharacter = {
      ...character,
      relationships: character.relationships ? JSON.parse(character.relationships) : null
    };

    res.json({
      success: true,
      character: parsedCharacter,
      imported: true
    });

  } catch (error) {
    console.error('Error importing character card:', error);
    res.status(500).json({ error: '角色卡导入失败', details: error.message });
  }
});

// 导出为 SillyTavern 角色卡
router.get('/:id/export-card', async (req, res) => {
  try {
    const { id } = req.params;

    // 获取角色完整信息
    const character = await prisma.character.findUnique({
      where: { id }
    });

    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // 转换为 SillyTavern 格式
    const cardData = characterCardUtils.convertToSillyTavernFormat(character);

    // 获取角色头像，如果没有则创建默认头像
    let avatarBuffer;
    if (character.avatar && character.avatarKey) {
      try {
        // 尝试从 R2 获取头像
        const presignedUrl = await uploadService.generatePresignedUrl(character.avatarKey, 300);
        const response = await fetch(presignedUrl);
        avatarBuffer = Buffer.from(await response.arrayBuffer());
      } catch (error) {
        console.warn('Failed to fetch avatar, using default:', error);
        avatarBuffer = await characterCardUtils.createDefaultAvatar(character.name);
      }
    } else {
      // 创建默认头像
      avatarBuffer = await characterCardUtils.createDefaultAvatar(character.name);
    }

    // 将角色卡数据嵌入到 PNG
    const cardPNG = await characterCardUtils.embedCharacterCardToPNG(avatarBuffer, cardData);

    // 设置响应头
    const fileName = `${character.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_card.png`;
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', cardPNG.length);

    res.send(cardPNG);

  } catch (error) {
    console.error('Error exporting character card:', error);
    res.status(500).json({ error: '角色卡导出失败', details: error.message });
  }
});

module.exports = router;
