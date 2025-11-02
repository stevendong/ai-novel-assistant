const OpenAI = require('openai');
const { aiConfig, validateConfig } = require('../config/aiConfig');
const { 
  withRetry, 
  buildRequestParams, 
  normalizeResponse, 
  validateResponse,
  createSystemMessage 
} = require('../utils/aiHelpers');

const prisma = require('../utils/prismaClient');

// 验证AI配置
try {
  validateConfig();
} catch (error) {
  console.warn('AI配置验证警告:', error.message);
}

// 初始化OpenAI客户端
const openai = new OpenAI({
  baseURL: aiConfig.openai.baseURL,
  apiKey: aiConfig.openai.apiKey,
  timeout: aiConfig.openai.timeout
});

class ConsistencyService {
  // 检查章节一致性
  async checkChapterConsistency(chapterId, types = ['character', 'setting', 'timeline', 'logic']) {
    try {
      const chapter = await prisma.chapter.findUnique({
        where: { id: chapterId },
        include: {
          novel: {
            include: {
              characters: true,
              settings: true
            }
          },
          characters: {
            include: { character: true }
          },
          settings: {
            include: { setting: true }
          }
        }
      });

      if (!chapter) {
        throw new Error('章节不存在');
      }

      // 获取之前的章节内容作为上下文
      const previousChapters = await prisma.chapter.findMany({
        where: {
          novelId: chapter.novelId,
          chapterNumber: { lt: chapter.chapterNumber }
        },
        orderBy: { chapterNumber: 'asc' },
        select: {
          id: true,
          chapterNumber: true,
          title: true,
          content: true,
          characters: {
            include: { character: true }
          },
          settings: {
            include: { setting: true }
          }
        }
      });

      const allIssues = [];

      // 并行执行不同类型的检查
      const checkPromises = types.map(type => this.performSpecificCheck(chapter, previousChapters, type));
      const results = await Promise.all(checkPromises);

      // 合并所有检查结果
      results.forEach(issues => allIssues.push(...issues));

      // 保存检查结果到数据库
      await this.saveConsistencyIssues(chapterId, allIssues);

      return allIssues;
    } catch (error) {
      console.error('一致性检查失败:', error);
      throw error;
    }
  }

  // 执行特定类型的检查
  async performSpecificCheck(chapter, previousChapters, checkType) {
    switch (checkType) {
      case 'character':
        return await this.checkCharacterConsistency(chapter, previousChapters);
      case 'setting':
        return await this.checkSettingConsistency(chapter, previousChapters);
      case 'timeline':
        return await this.checkTimelineConsistency(chapter, previousChapters);
      case 'logic':
        return await this.checkLogicConsistency(chapter, previousChapters);
      default:
        return [];
    }
  }

  // 角色一致性检查
  async checkCharacterConsistency(chapter, previousChapters) {
    const issues = [];

    // 构建角色信息上下文
    const characterContext = this.buildCharacterContext(chapter, previousChapters);

    for (const chapterChar of chapter.characters) {
      const character = chapterChar.character;
      const previousAppearances = this.getCharacterPreviousAppearances(character.id, previousChapters);

      if (previousAppearances.length > 0) {
        // 使用AI检查角色一致性
        const prompt = this.buildCharacterConsistencyPrompt(character, chapter.content, previousAppearances);
        const aiResult = await this.callAIForConsistencyCheck(prompt);

        if (aiResult.hasIssues) {
          issues.push({
            type: 'character',
            issue: aiResult.description,
            severity: aiResult.severity
          });
        }
      }
    }

    return issues;
  }

  // 设定一致性检查
  async checkSettingConsistency(chapter, previousChapters) {
    const issues = [];

    for (const chapterSetting of chapter.settings) {
      const setting = chapterSetting.setting;
      const previousUsages = this.getSettingPreviousUsages(setting.id, previousChapters);

      if (previousUsages.length > 0) {
        const prompt = this.buildSettingConsistencyPrompt(setting, chapter.content, previousUsages);
        const aiResult = await this.callAIForConsistencyCheck(prompt);

        if (aiResult.hasIssues) {
          issues.push({
            type: 'setting',
            issue: aiResult.description,
            severity: aiResult.severity
          });
        }
      }
    }

    return issues;
  }

  // 时间线一致性检查
  async checkTimelineConsistency(chapter, previousChapters) {
    const issues = [];

    if (previousChapters.length > 0) {
      const prompt = this.buildTimelineConsistencyPrompt(chapter, previousChapters);
      const aiResult = await this.callAIForConsistencyCheck(prompt);

      if (aiResult.hasIssues) {
        issues.push({
          type: 'timeline',
          issue: aiResult.description,
          severity: aiResult.severity
        });
      }
    }

    return issues;
  }

  // 逻辑一致性检查
  async checkLogicConsistency(chapter, previousChapters) {
    const issues = [];

    if (previousChapters.length > 0) {
      const prompt = this.buildLogicConsistencyPrompt(chapter, previousChapters);
      const aiResult = await this.callAIForConsistencyCheck(prompt);

      if (aiResult.hasIssues) {
        issues.push({
          type: 'logic',
          issue: aiResult.description,
          severity: aiResult.severity
        });
      }
    }

    return issues;
  }

  // 调用AI进行一致性检查
  async callAIForConsistencyCheck(prompt) {
    const systemMessage = createSystemMessage(
      '专业的小说编辑',
      '负责检查小说的一致性问题。请仔细分析提供的内容，识别任何不一致的地方。',
      `返回格式必须是JSON：
{
  "hasIssues": boolean,
  "description": "具体的问题描述",
  "severity": "low|medium|high",
  "relatedContent": "相关的文本片段",
  "relatedChapters": ["相关章节ID"],
  "logicChain": "逻辑链条说明"
}

严重程度标准：
- high: 严重矛盾，明显违背之前设定
- medium: 需要注意的不一致，可能造成困惑
- low: 轻微问题，建议完善的地方`,
      {
        constraints: [
          '只分析提供的内容，不要添加推测',
          '严格按照JSON格式返回结果',
          '准确评估问题的严重程度'
        ]
      }
    );

    const requestFn = async () => {
      const params = buildRequestParams('openai', 'consistency');
      
      const response = await openai.chat.completions.create({
        model: aiConfig.openai.model,
        messages: [
          {
            role: "system",
            content: systemMessage
          },
          {
            role: "user",
            content: prompt
          }
        ],
        ...params
      });

      const normalized = normalizeResponse(response, 'openai');
      return validateResponse(normalized.content, 'json');
    };

    try {
      const result = await withRetry(requestFn, 'openai');
      
      // 验证返回结果的必要字段
      if (typeof result.hasIssues !== 'boolean') {
        throw new Error('AI返回结果缺少必要字段: hasIssues');
      }
      
      return result;
    } catch (error) {
      console.error('AI一致性检查失败:', error);
      return { 
        hasIssues: false,
        description: '检查过程中出现错误，请稍后重试',
        severity: 'low',
        error: error.message
      };
    }
  }

  // 构建角色一致性检查提示
  buildCharacterConsistencyPrompt(character, currentContent, previousAppearances) {
    return `请检查以下角色在当前章节中的表现是否与之前章节保持一致：

角色信息：
- 姓名：${character.name}
- 描述：${character.description || '无'}
- 外貌：${character.appearance || '无'}
- 性格：${character.personality || '无'}
- 背景：${character.background || '无'}

当前章节内容：
${currentContent}

之前章节中的相关内容：
${previousAppearances.map(app => `第${app.chapterNumber}章：${app.content}`).join('\n\n')}

请分析角色的性格、行为、能力、外貌等是否存在前后矛盾的地方。`;
  }

  // 构建设定一致性检查提示
  buildSettingConsistencyPrompt(setting, currentContent, previousUsages) {
    return `请检查以下世界设定在当前章节中的使用是否与之前章节保持一致：

设定信息：
- 名称：${setting.name}
- 类型：${setting.type}
- 描述：${setting.description}
- 详细信息：${JSON.stringify(setting.details)}

当前章节内容：
${currentContent}

之前章节中的相关使用：
${previousUsages.map(usage => `第${usage.chapterNumber}章：${usage.content}`).join('\n\n')}

请分析世界设定的规则、描述、特征等是否存在前后矛盾的地方。`;
  }

  // 构建时间线一致性检查提示
  buildTimelineConsistencyPrompt(chapter, previousChapters) {
    return `请检查当前章节的时间线是否与之前章节保持一致：

当前章节（第${chapter.chapterNumber}章）：
标题：${chapter.title}
内容：${chapter.content}

之前章节时间线：
${previousChapters.map(ch => `第${ch.chapterNumber}章《${ch.title}》：${ch.content.substring(0, 500)}...`).join('\n\n')}

请分析：
1. 事件发生的时间顺序是否合理
2. 角色年龄变化是否符合时间跨度
3. 季节、时间等描述是否一致
4. 事件的因果关系时间线是否合理`;
  }

  // 构建逻辑一致性检查提示
  buildLogicConsistencyPrompt(chapter, previousChapters) {
    return `请检查当前章节的逻辑是否与之前章节保持一致：

当前章节（第${chapter.chapterNumber}章）：
标题：${chapter.title}
内容：${chapter.content}

之前章节关键情节：
${previousChapters.map(ch => `第${ch.chapterNumber}章《${ch.title}》：${ch.content.substring(0, 500)}...`).join('\n\n')}

请分析：
1. 角色行为动机是否合理
2. 情节发展是否符合逻辑
3. 矛盾冲突的解决是否合理
4. 是否存在逻辑漏洞或前后矛盾`;
  }

  // 获取角色之前的出现记录
  getCharacterPreviousAppearances(characterId, previousChapters) {
    return previousChapters.filter(chapter =>
      chapter.characters && chapter.characters.some(char => char.character.id === characterId)
    );
  }

  // 获取设定之前的使用记录
  getSettingPreviousUsages(settingId, previousChapters) {
    return previousChapters.filter(chapter =>
      chapter.settings && chapter.settings.some(setting => setting.setting.id === settingId)
    );
  }

  // 构建角色上下文
  buildCharacterContext(chapter, previousChapters) {
    const allCharacters = {};

    // 收集所有相关角色
    previousChapters.forEach(ch => {
      if (ch.characters) {
        ch.characters.forEach(char => {
          allCharacters[char.character.id] = char.character;
        });
      }
    });

    if (chapter.characters) {
      chapter.characters.forEach(char => {
        allCharacters[char.character.id] = char.character;
      });
    }

    return allCharacters;
  }

  // 保存一致性检查问题到数据库
  async saveConsistencyIssues(chapterId, issues) {
    // 先删除之前的检查结果
    await prisma.consistencyCheck.deleteMany({
      where: { chapterId }
    });

    // 保存新的检查结果
    if (issues.length > 0) {
      await prisma.consistencyCheck.createMany({
        data: issues.map(issue => ({
          chapterId,
          type: issue.type,
          issue: issue.issue,
          severity: issue.severity,
          resolved: false
        }))
      });
    }
  }

  // 获取问题的上下文信息
  async getIssueContext(issue) {
    const context = {
      relatedCharacters: [],
      relatedSettings: [],
      relatedChapters: []
    };

    // 获取当前章节信息
    const chapter = await prisma.chapter.findUnique({
      where: { id: issue.chapterId },
      include: {
        characters: {
          include: { character: true }
        },
        settings: {
          include: { setting: true }
        }
      }
    });

    if (chapter) {
      // 根据问题类型获取相关上下文
      if (issue.type === 'character') {
        context.relatedCharacters = chapter.characters.map(cc => cc.character);
      }

      if (issue.type === 'setting') {
        context.relatedSettings = chapter.settings.map(cs => cs.setting);
      }

      // 获取相关章节（前面的章节）
      const relatedChapters = await prisma.chapter.findMany({
        where: {
          novelId: chapter.novelId,
          chapterNumber: { lt: chapter.chapterNumber }
        },
        select: { id: true, chapterNumber: true, title: true },
        orderBy: { chapterNumber: 'desc' },
        take: 3 // 只获取最近的3个章节
      });
      context.relatedChapters = relatedChapters;
    }

    return context;
  }

  // 获取章节的一致性健康度评分
  async getChapterHealthScore(chapterId) {
    const issues = await prisma.consistencyCheck.findMany({
      where: { chapterId, resolved: false }
    });

    let score = 100;
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'high':
          score -= 20;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    });

    return Math.max(0, score);
  }

  // 检查章节是否可以推进到下一状态
  async canChapterAdvance(chapterId) {
    const highSeverityIssues = await prisma.consistencyCheck.findMany({
      where: {
        chapterId,
        severity: 'high',
        resolved: false
      }
    });

    return {
      canAdvance: highSeverityIssues.length === 0,
      blockingIssues: highSeverityIssues
    };
  }
}

module.exports = new ConsistencyService();
