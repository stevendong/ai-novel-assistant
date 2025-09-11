const express = require('express');
const { PrismaClient } = require('@prisma/client');
const aiService = require('../services/aiService');
const prisma = new PrismaClient();

const router = express.Router();

// 通用AI对话接口
router.post('/chat', async (req, res) => {
  try {
    const { novelId, message, context, type, provider, model } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

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

    // 使用AI服务生成响应
    const response = await aiService.generateResponse(novelContext, message, type, {
      provider,
      model,
      taskType: type, // 让aiService使用任务特定的参数
      temperature: undefined // 让配置系统决定温度
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

module.exports = router;