const express = require('express');
const aiService = require('../services/aiService');
const memoryService = require('../services/memoryService');
const { requireAuth } = require('../middleware/auth');
const prisma = require('../utils/prismaClient');

const router = express.Router();

// 通用AI对话接口（增强版本，支持记忆）
router.post('/chat', requireAuth, async (req, res) => {
  try {
    const { novelId, message, context, type, provider, model } = req.body;
    const userId = req.user.id; // 从认证中间件获取用户ID

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // 获取小说上下文
    let novelContext = null;
    if (novelId) {
      novelContext = await prisma.novel.findUnique({
        where: { id: novelId, userId: userId }, // 确保用户权限
        include: {
          characters: { take: 10 },
          settings: { take: 10 },
          chapters: {
            take: 5,
            orderBy: { chapterNumber: 'desc' }
          },
          aiSettings: true
        }
      });

      if (!novelContext) {
        return res.status(403).json({ error: 'Novel not found or access denied' });
      }
    }

    // 使用增强的AI服务生成响应（包含记忆功能）
    const response = await aiService.generateResponse(novelContext, message, type, {
      provider,
      model,
      taskType: type,
      temperature: undefined,
      userId: userId, // 传递用户ID用于记忆功能
      messageType: context?.messageType || 'general'
    });

    res.json(response);
  } catch (error) {
    console.error('Error in AI chat:', error);
    res.status(500).json({
      error: 'AI service error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'AI service temporarily unavailable'
    });
  }
});

// 流式AI对话接口
router.post('/chat/stream', requireAuth, async (req, res) => {
  try {
    const { novelId, message, context, type, provider, model } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // 设置SSE响应头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // 发送连接确认
    res.write('data: {"type":"connected"}\n\n');

    try {
      // 获取小说上下文
      let novelContext = null;
      if (novelId) {
        novelContext = await prisma.novel.findUnique({
          where: { id: novelId },
          include: {
            characters: { take: 10 },
            settings: { take: 10 },
            chapters: { 
              take: 5,
              orderBy: { chapterNumber: 'desc' }
            },
            aiSettings: true
          }
        });
      }

      // 获取流式响应
      const stream = await aiService.generateResponseStream(novelContext, message, type, {
        provider,
        model,
        taskType: type,
        temperature: undefined,
        userId: req.user?.id,
        messageType: type
      });

      // 处理流式响应
      if (provider === 'openai' || !provider) {
        // OpenAI streaming
        for await (const chunk of stream) {
          const choice = chunk.choices[0];
          if (choice && choice.delta && choice.delta.content) {
            const data = {
              type: 'chunk',
              content: choice.delta.content
            };
            res.write(`data: ${JSON.stringify(data)}\n\n`);
          }
          
          if (choice && choice.finish_reason) {
            const data = {
              type: 'finish',
              reason: choice.finish_reason
            };
            res.write(`data: ${JSON.stringify(data)}\n\n`);
            break;
          }
        }
      } else if (provider === 'claude') {
        // Claude streaming
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const eventData = JSON.parse(line.slice(6));
                if (eventData.type === 'content_block_delta' && eventData.delta?.text) {
                  const data = {
                    type: 'chunk',
                    content: eventData.delta.text
                  };
                  res.write(`data: ${JSON.stringify(data)}\n\n`);
                } else if (eventData.type === 'message_stop') {
                  const data = {
                    type: 'finish',
                    reason: 'stop'
                  };
                  res.write(`data: ${JSON.stringify(data)}\n\n`);
                  break;
                }
              } catch (parseError) {
                // Skip malformed JSON
                continue;
              }
            }
          }
        }
      } else if (provider === 'gemini') {
        // Gemini streaming
        const reader = stream.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const eventData = JSON.parse(line.slice(6));
                // Gemini格式: { candidates: [{ content: { parts: [{ text: "..." }] } }] }
                const text = eventData.candidates?.[0]?.content?.parts?.[0]?.text;

                if (text) {
                  const data = {
                    type: 'chunk',
                    content: text
                  };
                  res.write(`data: ${JSON.stringify(data)}\n\n`);
                }

                // 检查是否完成
                const finishReason = eventData.candidates?.[0]?.finishReason;
                if (finishReason) {
                  const data = {
                    type: 'finish',
                    reason: finishReason
                  };
                  res.write(`data: ${JSON.stringify(data)}\n\n`);
                  break;
                }
              } catch (parseError) {
                // Skip malformed JSON
                continue;
              }
            }
          }
        }
      }

      // 发送完成信号
      res.write('data: {"type":"done"}\n\n');
    } catch (streamError) {
      console.error('Streaming error:', streamError);
      const errorData = {
        type: 'error',
        message: process.env.NODE_ENV === 'development' ? streamError.message : 'AI service error'
      };
      res.write(`data: ${JSON.stringify(errorData)}\n\n`);
    }
    
    res.end();
  } catch (error) {
    console.error('Error in streaming chat:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'AI streaming service error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Streaming service temporarily unavailable'
      });
    }
  }
});

// 一致性检查
router.post('/consistency/check', async (req, res) => {
  try {
    const { novelId, scope, chapterId } = req.body;
    
    if (!novelId) {
      return res.status(400).json({ error: 'Novel ID is required' });
    }

    // 获取检查范围的数据
    let data;
    if (scope === 'chapter' && chapterId) {
      data = await prisma.chapter.findUnique({
        where: { id: chapterId },
        include: {
          characters: { include: { character: true } },
          settings: { include: { setting: true } },
          novel: { 
            include: { 
              aiSettings: true,
              characters: true,
              settings: true 
            } 
          }
        }
      });
    } else {
      data = await prisma.novel.findUnique({
        where: { id: novelId },
        include: {
          characters: true,
          settings: true,
          chapters: {
            include: {
              characters: { include: { character: true } },
              settings: { include: { setting: true } }
            }
          },
          aiSettings: true
        }
      });
    }

    if (!data) {
      return res.status(404).json({ error: 'Data not found' });
    }

    // 使用AI服务进行一致性检查
    const consistencyResult = await aiService.checkConsistency(data, scope);
    
    // 保存检查记录到数据库
    if (chapterId && consistencyResult.issues?.length > 0) {
      await Promise.all(consistencyResult.issues.map(issue => 
        prisma.consistencyCheck.create({
          data: {
            chapterId,
            type: issue.type,
            issue: issue.issue,
            severity: issue.severity
          }
        })
      ));
    }

    res.json({
      scope,
      totalIssues: consistencyResult.issues?.length || 0,
      issues: consistencyResult.issues || [],
      summary: consistencyResult.summary || {
        high: 0,
        medium: 0,
        low: 0
      }
    });

  } catch (error) {
    console.error('Error in consistency check:', error);
    res.status(500).json({ 
      error: 'Consistency check failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Unable to perform consistency check'
    });
  }
});

// 修复一致性问题
router.post('/consistency/fix', async (req, res) => {
  try {
    const { issueId, fixType, targetContent } = req.body;
    
    // 模拟修复建议
    const fixSuggestion = {
      originalContent: '原始内容...',
      suggestedContent: '建议修改后的内容...',
      explanation: '修改理由和说明',
      confidence: 0.85,
      alternatives: [
        '备选方案1',
        '备选方案2'
      ]
    };

    res.json(fixSuggestion);
  } catch (error) {
    console.error('Error fixing consistency:', error);
    res.status(500).json({ error: 'Failed to fix consistency issue' });
  }
});

// AI建议插图
router.post('/illustrations/suggest', async (req, res) => {
  try {
    const { chapterId, content } = req.body;
    
    if (!chapterId) {
      return res.status(400).json({ error: 'Chapter ID is required' });
    }

    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId }
    });

    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    // 模拟AI插图建议
    const suggestions = [
      {
        position: 'opening',
        description: '废弃工厂的外观，夜晚氛围',
        type: 'scene',
        importance: 'high'
      },
      {
        position: 'mid-chapter',
        description: '主角发现线索的瞬间',
        type: 'action',
        importance: 'medium'
      },
      {
        position: 'ending',
        description: '神秘人物的剪影',
        type: 'character',
        importance: 'high'
      }
    ];

    res.json({
      chapterId,
      suggestions,
      totalSuggestions: suggestions.length
    });

  } catch (error) {
    console.error('Error suggesting illustrations:', error);
    res.status(500).json({ error: 'Failed to suggest illustrations' });
  }
});

// 更新AI约束设置
router.put('/constraints/:novelId', async (req, res) => {
  try {
    const { novelId } = req.params;
    const { rating, violence, romance, language, customRules } = req.body;

    const constraints = await prisma.aIConstraint.upsert({
      where: { novelId },
      update: {
        rating,
        violence,
        romance,
        language,
        customRules,
        updatedAt: new Date()
      },
      create: {
        novelId,
        rating: rating || 'PG',
        violence: violence || 2,
        romance: romance || 1,
        language: language || 1,
        customRules
      }
    });

    res.json(constraints);
  } catch (error) {
    console.error('Error updating AI constraints:', error);
    res.status(500).json({ error: 'Failed to update AI constraints' });
  }
});

// 应用AI大纲到小说
router.post('/outline/apply', async (req, res) => {
  try {
    const { novelId, outline } = req.body;
    
    if (!novelId || !outline) {
      return res.status(400).json({ error: 'Novel ID and outline are required' });
    }

    // 验证小说存在
    const novel = await prisma.novel.findUnique({
      where: { id: novelId }
    });

    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    // 获取现有章节的最大章节号
    const lastChapter = await prisma.chapter.findFirst({
      where: { novelId },
      orderBy: { chapterNumber: 'desc' },
      select: { chapterNumber: true }
    });

    let startChapterNumber = (lastChapter?.chapterNumber || 0) + 1;

    // 创建章节
    const createdChapters = [];
    for (const [index, chapterData] of outline.chapters.entries()) {
      const chapter = await prisma.chapter.create({
        data: {
          novelId,
          chapterNumber: startChapterNumber + index,
          title: chapterData.title,
          outline: chapterData.summary,
          plotPoints: JSON.stringify(chapterData.plotPoints || []),
          status: 'planning',
          wordCount: 0,
          progress: 0
        }
      });

      createdChapters.push(chapter);

      // 如果有角色关联，创建关联关系
      if (chapterData.characters && chapterData.characters.length > 0) {
        // 查找匹配的角色
        const characters = await prisma.character.findMany({
          where: {
            novelId,
            name: { in: chapterData.characters }
          }
        });

        // 创建章节-角色关联
        const chapterCharacters = characters.map(char => ({
          chapterId: chapter.id,
          characterId: char.id,
          role: 'main' // 默认为主要角色
        }));

        if (chapterCharacters.length > 0) {
          await prisma.chapterCharacter.createMany({
            data: chapterCharacters
          });
        }
      }

      // 如果有设定关联，创建关联关系
      if (chapterData.settings && chapterData.settings.length > 0) {
        const settings = await prisma.worldSetting.findMany({
          where: {
            novelId,
            name: { in: chapterData.settings }
          }
        });

        const chapterSettings = settings.map(setting => ({
          chapterId: chapter.id,
          settingId: setting.id,
          usage: '大纲中提及的相关设定'
        }));

        if (chapterSettings.length > 0) {
          await prisma.chapterSetting.createMany({
            data: chapterSettings
          });
        }
      }
    }

    // 更新小说状态和字数预估
    const estimatedWords = outline.estimatedTotalWords || 
      outline.chapters.reduce((total, ch) => total + (ch.estimatedWords || 2500), 0);

    await prisma.novel.update({
      where: { id: novelId },
      data: {
        status: novel.status === 'draft' ? 'writing' : novel.status,
        targetWordCount: estimatedWords,
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: '大纲已成功应用',
      createdChapters: createdChapters.length,
      estimatedWords
    });

  } catch (error) {
    console.error('Error applying outline:', error);
    res.status(500).json({ 
      error: 'Failed to apply outline',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// 保存大纲草稿
router.post('/outline/draft', async (req, res) => {
  try {
    const { novelId, outline } = req.body;
    
    if (!novelId || !outline) {
      return res.status(400).json({ error: 'Novel ID and outline are required' });
    }

    // 这里可以保存到数据库的草稿表，或者文件系统
    // 暂时返回成功响应
    res.json({
      success: true,
      message: '大纲草稿已保存',
      savedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error saving outline draft:', error);
    res.status(500).json({ 
      error: 'Failed to save outline draft',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// 创建可分享的大纲链接
router.post('/outline/share', async (req, res) => {
  try {
    const { outline } = req.body;
    
    if (!outline) {
      return res.status(400).json({ error: 'Outline is required' });
    }

    // 生成分享ID
    const shareId = `outline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 这里应该将大纲数据保存到数据库或缓存
    // 暂时返回模拟的分享链接
    const shareUrl = `${req.protocol}://${req.get('host')}/shared/outline/${shareId}`;

    res.json({
      success: true,
      shareUrl,
      shareId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7天后过期
    });

  } catch (error) {
    console.error('Error creating shareable outline:', error);
    res.status(500).json({ 
      error: 'Failed to create shareable outline',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ===== 记忆管理相关API =====

// 获取记忆健康状态
router.get('/memory/health', requireAuth, async (req, res) => {
  try {
    const healthStatus = await memoryService.healthCheck();
    res.json(healthStatus);
  } catch (error) {
    console.error('Memory health check failed:', error);
    res.status(500).json({
      error: 'Memory health check failed',
      message: error.message
    });
  }
});

// 获取用户记忆统计
router.get('/memory/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { novelId } = req.query;

    // 获取记忆服务指标
    const serviceMetrics = memoryService.getMetrics();

    // 获取用户记忆统计
    const where = { userId };
    if (novelId) where.novelId = novelId;

    const memoryStats = await prisma.memoryBackup.groupBy({
      by: ['memoryType'],
      where: where,
      _count: { id: true },
      _avg: { importance: true }
    });

    const totalMemories = await prisma.memoryBackup.count({ where });

    const recentMemories = await prisma.memoryBackup.findMany({
      where: where,
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        content: true,
        memoryType: true,
        importance: true,
        createdAt: true
      }
    });

    res.json({
      service: serviceMetrics,
      user: {
        totalMemories,
        memoryByType: memoryStats.reduce((acc, stat) => {
          acc[stat.memoryType] = {
            count: stat._count.id,
            avgImportance: stat._avg.importance
          };
          return acc;
        }, {}),
        recentMemories
      }
    });

  } catch (error) {
    console.error('Error fetching memory stats:', error);
    res.status(500).json({
      error: 'Failed to fetch memory statistics',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Statistics service error'
    });
  }
});

// 手动添加记忆
router.post('/memory/add', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { content, novelId, memoryType = 'user_note', importance = 3 } = req.body;

    if (!content || content.length < 5) {
      return res.status(400).json({ error: 'Content is required and must be at least 5 characters' });
    }

    const context = {
      userId,
      novelId,
      mode: 'manual',
      messageType: 'user_added'
    };

    const metadata = {
      memory_type: memoryType,
      importance,
      source: 'manual_input',
      userConfirmed: true
    };

    const result = await memoryService.addMemory(content, context, metadata);

    if (result) {
      res.status(201).json({
        success: true,
        memoryId: result.id,
        message: 'Memory added successfully'
      });
    } else {
      res.status(500).json({
        error: 'Failed to add memory',
        message: 'Memory service is currently unavailable'
      });
    }

  } catch (error) {
    console.error('Error adding manual memory:', error);
    res.status(500).json({
      error: 'Failed to add memory',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Memory service error'
    });
  }
});

// 搜索记忆
router.post('/memory/search', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { query, novelId, memoryType, limit = 10 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const context = {
      userId,
      novelId,
      mode: 'search',
      messageType: memoryType
    };

    const memories = await memoryService.retrieveRelevantMemories(query, context);

    res.json({
      query,
      count: memories.length,
      memories: memories.slice(0, limit).map(memory => ({
        content: memory.content,
        memoryType: memory.metadata?.memory_type,
        importance: memory.metadata?.importance,
        score: memory.score,
        createdAt: memory.metadata?.timestamp ? new Date(memory.metadata.timestamp) : null
      }))
    });

  } catch (error) {
    console.error('Error searching memories:', error);
    res.status(500).json({
      error: 'Memory search failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Search service error'
    });
  }
});

// 清除用户记忆（谨慎操作）
router.delete('/memory/clear', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { novelId, confirmCode } = req.body;

    // 安全确认码
    if (confirmCode !== 'CLEAR_MY_MEMORIES') {
      return res.status(400).json({
        error: 'Invalid confirmation code',
        message: 'Please provide the correct confirmation code to proceed'
      });
    }

    const where = { userId };
    if (novelId) where.novelId = novelId;

    // 清除本地备份
    const deletedCount = await prisma.memoryBackup.deleteMany({ where });

    res.json({
      success: true,
      deletedCount: deletedCount.count,
      message: novelId
        ? `Cleared ${deletedCount.count} memories for novel ${novelId}`
        : `Cleared ${deletedCount.count} total memories`
    });

  } catch (error) {
    console.error('Error clearing memories:', error);
    res.status(500).json({
      error: 'Failed to clear memories',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Clear operation failed'
    });
  }
});

module.exports = router;
