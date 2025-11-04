const aiService = require('./aiService')
const prisma = require('../utils/prismaClient')

const DEFAULT_LOCALE = 'zh'

function normalizeLocale(locale) {
  if (!locale) return DEFAULT_LOCALE
  const value = String(locale).trim().toLowerCase()
  if (!value) return DEFAULT_LOCALE
  const base = value.split('-')[0]
  return base || DEFAULT_LOCALE
}

function getLanguageRequirement(localeInput) {
  const locale = normalizeLocale(localeInput)
  if (locale.startsWith('en')) {
    return 'Language requirement: Please provide the entire outline in English, keeping the tone and terminology suitable for English-language web fiction planning.'
  }
  return '语言要求：请使用简体中文输出全部内容，保持结构清晰、逻辑严密，并符合中文网络小说的创作风格。'
}

/**
 * 批量章节生成服务
 * 提供AI驱动的批量章节创建功能
 */
class BatchChapterService {
  /**
   * 分析小说上下文
   * @param {string} novelId - 小说ID
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 分析结果
   */
  async analyzeNovelContext(novelId, userId, locale) {
    try {
      // 获取小说基本信息
      const novel = await prisma.novel.findFirst({
        where: { id: novelId, userId },
        include: {
          chapters: {
            orderBy: { chapterNumber: 'asc' },
            take: 10 // 最近10章用于分析
          },
          characters: true,
          settings: true,
          aiSettings: true
        }
      })

      if (!novel) {
        throw new Error('小说不存在或无权限')
      }

      const languageRequirement = getLanguageRequirement(locale)

      // 构建分析提示词
      const analysisPrompt = this.buildAnalysisPrompt(novel, languageRequirement)

      // 调用AI进行分析
      const aiResponse = await aiService.chat([
        {
          role: 'user',
          content: analysisPrompt
        }
      ], {
        temperature: 0.3,
        max_tokens: 2000
      })

      // 解析AI响应
      let analysisResult
      try {
        // aiService.chat返回的是对象，需要提取content
        const responseContent = aiResponse.content || aiResponse
        analysisResult = JSON.parse(responseContent)
      } catch (error) {
        // 如果AI没返回标准JSON，创建默认结构
        const responseContent = aiResponse.content || aiResponse
        analysisResult = {
          currentStage: '分析中',
          mainConflicts: [],
          characterDevelopment: {},
          worldElements: [],
          writingStyle: {},
          potentialDirections: [],
          rawAnalysis: responseContent
        }
      }

      return {
        novel: {
          id: novel.id,
          title: novel.title,
          genre: novel.genre,
          status: novel.status,
          wordCount: novel.wordCount,
          chapterCount: novel.chapters.length
        },
        analysis: analysisResult,
        characters: novel.characters.map(char => ({
          id: char.id,
          name: char.name,
          role: char.role,
          description: char.description
        })),
        settings: novel.settings.map(setting => ({
          id: setting.id,
          name: setting.name,
          type: setting.type,
          description: setting.description
        })),
        recentChapters: novel.chapters.map(chapter => ({
          number: chapter.chapterNumber,
          title: chapter.title,
          outline: chapter.outline,
          wordCount: chapter.wordCount
        }))
      }
    } catch (error) {
      console.error('小说上下文分析失败:', error)
      throw error
    }
  }

  /**
   * 创建批量生成任务
   * @param {Object} params - 生成参数
   * @returns {Promise<string>} 批次ID
   */
  async createBatchGeneration(params) {
    const {
      novelId,
      userId,
      batchName,
      mode, // continue, insert, branch, expand
      totalChapters,
      startPosition,
      parameters,
      locale
    } = params

    try {
      // 验证小说权限
      const novel = await prisma.novel.findFirst({
        where: { id: novelId, userId }
      })

      if (!novel) {
        throw new Error('小说不存在或无权限')
      }

      // 创建批量生成记录
      const extendedParameters = { ...(parameters || {}) }
      if (locale) {
        extendedParameters.__locale = locale
      }

      const batchGeneration = await prisma.batchChapterGeneration.create({
        data: {
          novelId,
          userId,
          batchName,
          mode,
          totalChapters,
          startPosition,
          parameters: JSON.stringify(extendedParameters),
          status: 'pending'
        }
      })

      return batchGeneration.id
    } catch (error) {
      console.error('创建批量生成任务失败:', error)
      throw error
    }
  }

  /**
   * 执行批量章节生成
   * @param {string} batchId - 批次ID
   */
  async executeBatchGeneration(batchId, localeOverride) {
    try {
      // 获取批次信息
      const batch = await prisma.batchChapterGeneration.findUnique({
        where: { id: batchId },
        include: {
          novel: {
            include: {
              chapters: { orderBy: { chapterNumber: 'asc' } },
              characters: true,
              settings: true
            }
          }
        }
      })

      if (!batch) {
        throw new Error('批次不存在')
      }

      // 更新状态为分析中
      await this.updateBatchStatus(batchId, 'analyzing', 10)

      const parameters = JSON.parse(batch.parameters || '{}')
      const locale = localeOverride !== undefined ? localeOverride : parameters.__locale

      // 分析小说上下文
      const contextAnalysis = await this.analyzeNovelContext(batch.novelId, batch.userId, locale)

      // 保存分析结果
      await prisma.batchChapterGeneration.update({
        where: { id: batchId },
        data: {
          analysisResult: JSON.stringify(contextAnalysis),
          status: 'generating',
          progress: 20
        }
      })

      // 生成章节计划
      const sanitizedParameters = { ...parameters }
      delete sanitizedParameters.__locale

      const generationPrompt = this.buildGenerationPrompt(
        contextAnalysis,
        batch,
        sanitizedParameters,
        getLanguageRequirement(locale)
      )

      const aiResponse = await aiService.chat([
        {
          role: 'user',
          content: generationPrompt
        }
      ], {
        temperature: 0.7,
        max_tokens: 4000
      })

      // 解析AI生成的章节计划
      let generatedChapters
      try {
        const responseContent = aiResponse.content || aiResponse
        const parsedResponse = JSON.parse(responseContent)
        generatedChapters = parsedResponse.chapters || []
      } catch (error) {
        // 如果解析失败，尝试从文本中提取章节信息
        const responseContent = aiResponse.content || aiResponse
        generatedChapters = this.parseChaptersFromText(responseContent)
      }

      // 保存生成的章节
      await this.saveGeneratedChapters(batchId, generatedChapters, batch)

      // 更新批次状态为完成
      await this.updateBatchStatus(batchId, 'completed', 100)

      return true
    } catch (error) {
      console.error('批量生成执行失败:', error)
      await this.updateBatchStatus(batchId, 'failed', null, error.message)
      throw error
    }
  }

  /**
   * 保存生成的章节
   */
  async saveGeneratedChapters(batchId, chapters, batch) {
    const baseChapterNumber = batch.startPosition ||
      (await this.getNextChapterNumber(batch.novelId))

    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i]
      const chapterNumber = baseChapterNumber + i

      await prisma.generatedChapter.create({
        data: {
          batchId,
          chapterNumber,
          title: chapter.title || `第${chapterNumber}章`,
          outline: chapter.outline || chapter.description || '',
          plotPoints: JSON.stringify(chapter.plotPoints || []),
          characters: JSON.stringify(chapter.characters || []),
          settings: JSON.stringify(chapter.settings || []),
          estimatedWords: chapter.estimatedWords || 2000,
          priority: chapter.priority || 1,
          dependencies: JSON.stringify(chapter.dependencies || []),
          aiConfidence: chapter.confidence || 0.8,
          status: 'draft'
        }
      })

      // 更新进度
      const progress = Math.floor(20 + (80 * (i + 1)) / chapters.length)
      await this.updateBatchStatus(batchId, 'generating', progress)
    }
  }

  /**
   * 应用生成的章节到小说中
   * @param {string} batchId - 批次ID
   * @param {Array<string>} selectedChapterIds - 选中的章节ID列表
   */
  async applyGeneratedChapters(batchId, selectedChapterIds) {
    try {
      const batch = await prisma.batchChapterGeneration.findUnique({
        where: { id: batchId },
        include: {
          generatedChapters: {
            where: {
              id: { in: selectedChapterIds },
              status: { in: ['draft', 'approved'] }
            }
          }
        }
      })

      if (!batch) {
        throw new Error('批次不存在')
      }

      const createdChapters = []

      for (const generatedChapter of batch.generatedChapters) {
        // 检查章节号是否已存在
        const existingChapter = await prisma.chapter.findFirst({
          where: {
            novelId: batch.novelId,
            chapterNumber: generatedChapter.chapterNumber
          }
        })

        if (existingChapter) {
          // 如果章节已存在，调整后续章节号
          await this.adjustChapterNumbers(batch.novelId, generatedChapter.chapterNumber)
        }

        // 创建新章节
        const newChapter = await prisma.chapter.create({
          data: {
            novelId: batch.novelId,
            chapterNumber: generatedChapter.chapterNumber,
            title: generatedChapter.title,
            outline: generatedChapter.outline,
            plotPoints: generatedChapter.plotPoints,
            status: 'planning'
          }
        })

        // 关联角色和设定
        await this.linkChapterElements(newChapter.id, generatedChapter)

        // 更新生成章节状态
        await prisma.generatedChapter.update({
          where: { id: generatedChapter.id },
          data: { status: 'applied' }
        })

        createdChapters.push(newChapter)
      }

      return createdChapters
    } catch (error) {
      console.error('应用生成章节失败:', error)
      throw error
    }
  }

  /**
   * 构建分析提示词
   */
  buildAnalysisPrompt(novel, languageRequirement) {
    const recentChapters = novel.chapters
      .map(ch => `第${ch.chapterNumber}章：${ch.title}\n大纲：${ch.outline || '无'}\n`)
      .join('\n')

    const characters = novel.characters
      .map(char => `${char.name}（${char.role}）：${char.description || '无描述'}`)
      .join('\n')

    const settings = novel.settings
      .map(setting => `${setting.name}（${setting.type}）：${setting.description || '无描述'}`)
      .join('\n')

    return `你是一个专业的小说分析助手。请分析以下小说内容：

**小说基本信息：**
- 标题：${novel.title}
- 类型：${novel.genre || '未设定'}
- 状态：${novel.status}
- 当前字数：${novel.wordCount}
- 总章节数：${novel.chapters.length}

**最近章节：**
${recentChapters || '暂无章节'}

**角色设定：**
${characters || '暂无角色'}

**世界设定：**
${settings || '暂无设定'}

请分析并以JSON格式返回：
{
  "currentStage": "当前剧情发展阶段",
  "mainConflicts": ["主要冲突点1", "主要冲突点2"],
  "characterDevelopment": {
    "角色名": "发展轨迹分析"
  },
  "worldElements": ["已展现的世界观元素"],
  "writingStyle": {
    "chapterStructure": "章节结构特点",
    "pacing": "节奏特点",
    "tone": "语调风格"
  },
  "potentialDirections": ["可能的剧情发展方向"]
}

${languageRequirement}`
  }

  /**
   * 构建生成提示词
   */
  buildGenerationPrompt(contextAnalysis, batch, parameters, languageRequirement) {
    const mode = batch.mode
    const totalChapters = batch.totalChapters
    const modeInstructions = {
      'continue': '基于现有剧情继续发展后续章节',
      'insert': '在现有章节间插入新的剧情内容',
      'branch': '探索不同的剧情发展分支',
      'expand': '将现有章节扩展为更详细的多个章节'
    }

    return `基于以下分析结果，生成${totalChapters}个新章节：

**生成模式：** ${mode} - ${modeInstructions[mode]}

**上下文分析：**
${JSON.stringify(contextAnalysis.analysis, null, 2)}

**生成参数：**
- 目标章节数：${totalChapters}
- 起始位置：${batch.startPosition || '续写'}
- 每章预期字数：${parameters.targetWordsPerChapter || 2000}
- 重点关注：${parameters.focusAreas?.join(', ') || '均衡发展'}

**现有角色：**
${contextAnalysis.characters.map(c => `${c.name}（${c.role}）`).join(', ')}

**可用设定：**
${contextAnalysis.settings.map(s => `${s.name}（${s.type}）`).join(', ')}

请以JSON格式返回章节计划：
{
  "chapters": [
    {
      "title": "章节标题",
      "outline": "详细大纲（300-500字）",
      "plotPoints": ["关键剧情点1", "关键剧情点2"],
      "characters": ["涉及角色名"],
      "settings": ["使用设定名"],
      "estimatedWords": 预估字数,
      "priority": 重要性等级(1-5),
      "dependencies": ["依赖章节号"],
      "confidence": AI信心度(0-1)
    }
  ]
}

要求：
1. 剧情逻辑连贯，符合已有设定
2. 角色行为符合性格设定
3. 章节间节奏张弛有度
4. 标题有吸引力且符合风格
5. 大纲详细具体，便于后续写作

${languageRequirement}`
  }

  /**
   * 从文本中解析章节信息（备用方法）
   */
  parseChaptersFromText(text) {
    // 简单的文本解析逻辑，实际项目中可以更复杂
    const chapters = []
    const lines = text.split('\n')
    let currentChapter = null

    for (const line of lines) {
      if (line.includes('章') && line.includes('：')) {
        if (currentChapter) chapters.push(currentChapter)
        currentChapter = {
          title: line.trim(),
          outline: '',
          plotPoints: [],
          estimatedWords: 2000,
          priority: 1
        }
      } else if (currentChapter && line.trim()) {
        currentChapter.outline += line.trim() + '\n'
      }
    }

    if (currentChapter) chapters.push(currentChapter)
    return chapters.slice(0, 10) // 最多10章
  }

  /**
   * 获取下一章节号
   */
  async getNextChapterNumber(novelId) {
    const lastChapter = await prisma.chapter.findFirst({
      where: { novelId },
      orderBy: { chapterNumber: 'desc' }
    })
    return lastChapter ? lastChapter.chapterNumber + 1 : 1
  }

  /**
   * 调整章节号
   */
  async adjustChapterNumbers(novelId, fromNumber) {
    await prisma.chapter.updateMany({
      where: {
        novelId,
        chapterNumber: { gte: fromNumber }
      },
      data: {
        chapterNumber: { increment: 1 }
      }
    })
  }

  /**
   * 关联章节元素
   */
  async linkChapterElements(chapterId, generatedChapter) {
    const characters = JSON.parse(generatedChapter.characters || '[]')
    const settings = JSON.parse(generatedChapter.settings || '[]')

    // 关联角色
    for (const characterName of characters) {
      const character = await prisma.character.findFirst({
        where: { name: characterName }
      })
      if (character) {
        await prisma.chapterCharacter.create({
          data: {
            chapterId,
            characterId: character.id,
            role: 'mentioned'
          }
        }).catch(() => {}) // 忽略重复关联错误
      }
    }

    // 关联设定
    for (const settingName of settings) {
      const setting = await prisma.worldSetting.findFirst({
        where: { name: settingName }
      })
      if (setting) {
        await prisma.chapterSetting.create({
          data: {
            chapterId,
            settingId: setting.id,
            usage: '在章节中使用'
          }
        }).catch(() => {}) // 忽略重复关联错误
      }
    }
  }

  /**
   * 更新批次状态
   */
  async updateBatchStatus(batchId, status, progress, errorMessage = null) {
    const updateData = { status, updatedAt: new Date() }
    if (progress !== null) updateData.progress = progress
    if (errorMessage) updateData.errorMessage = errorMessage

    await prisma.batchChapterGeneration.update({
      where: { id: batchId },
      data: updateData
    })
  }

  /**
   * 获取批次列表
   */
  async getBatchList(userId, novelId = null) {
    const where = { userId }
    if (novelId) where.novelId = novelId

    return await prisma.batchChapterGeneration.findMany({
      where,
      include: {
        novel: { select: { title: true } },
        generatedChapters: true,
        _count: { select: { generatedChapters: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  /**
   * 获取批次详情
   */
  async getBatchDetails(batchId, userId) {
    return await prisma.batchChapterGeneration.findFirst({
      where: { id: batchId, userId },
      include: {
        novel: { select: { title: true, id: true } },
        generatedChapters: { orderBy: { chapterNumber: 'asc' } }
      }
    })
  }

  /**
   * 删除批次
   */
  async deleteBatch(batchId, userId) {
    const batch = await prisma.batchChapterGeneration.findFirst({
      where: { id: batchId, userId }
    })

    if (!batch) {
      throw new Error('批次不存在或无权限')
    }

    await prisma.batchChapterGeneration.delete({
      where: { id: batchId }
    })

    return true
  }
}

module.exports = { BatchChapterService, batchChapterService: new BatchChapterService() }
