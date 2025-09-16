const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireAuth, requireOwnership } = require('../middleware/auth');

const prisma = new PrismaClient();
const router = express.Router();

// 获取所有小说项目（合并了统计功能）
router.get('/', requireAuth, async (req, res) => {
  try {
    // 如果请求包含 stats=true 参数，返回统计数据
    if (req.query.stats === 'true') {
      const [
        totalProjects,
        draftProjects,
        writingProjects,
        completedProjects,
        totalWords,
        totalChapters
      ] = await Promise.all([
        prisma.novel.count({ where: { userId: req.user.id } }),
        prisma.novel.count({ where: { userId: req.user.id, status: 'draft' } }),
        prisma.novel.count({ where: { userId: req.user.id, status: 'writing' } }),
        prisma.novel.count({ where: { userId: req.user.id, status: 'completed' } }),
        prisma.novel.aggregate({
          where: { userId: req.user.id },
          _sum: { wordCount: true }
        }),
        prisma.chapter.count({
          where: { novel: { userId: req.user.id } }
        })
      ]);

      return res.json({
        projects: {
          total: totalProjects,
          draft: draftProjects,
          writing: writingProjects,
          completed: completedProjects
        },
        content: {
          totalWords: totalWords._sum.wordCount || 0,
          totalChapters
        }
      });
    }

    // 否则返回项目列表
    const novels = await prisma.novel.findMany({
      where: { userId: req.user.id },
      include: {
        _count: {
          select: {
            chapters: true,
            characters: true,
            settings: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(novels);
  } catch (error) {
    console.error('Error fetching novels:', error);
    res.status(500).json({ error: 'Failed to fetch novels' });
  }
});

// 获取单个小说详情
router.get('/:id', requireAuth, requireOwnership('novel'), async (req, res) => {
  try {
    const { id } = req.params;
    const novel = await prisma.novel.findUnique({
      where: { id },
      include: {
        characters: {
          orderBy: { createdAt: 'asc' }
        },
        settings: {
          orderBy: { createdAt: 'asc' }
        },
        chapters: {
          orderBy: { chapterNumber: 'asc' },
          include: {
            _count: {
              select: {
                characters: true,
                settings: true
              }
            }
          }
        },
        aiSettings: true
      }
    });

    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    res.json(novel);
  } catch (error) {
    console.error('Error fetching novel:', error);
    res.status(500).json({ error: 'Failed to fetch novel' });
  }
});

// 创建新小说
router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, description, genre, rating } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const novel = await prisma.novel.create({
      data: {
        title,
        description,
        genre,
        rating: rating || 'PG',
        userId: req.user.id,
        aiSettings: {
          create: {
            rating: rating || 'PG',
            violence: rating === 'G' ? 0 : rating === 'R' ? 7 : 2,
            romance: rating === 'G' ? 0 : rating === 'R' ? 6 : 1,
            language: rating === 'G' ? 0 : rating === 'R' ? 6 : 1
          }
        }
      },
      include: {
        aiSettings: true
      }
    });

    res.status(201).json(novel);
  } catch (error) {
    console.error('Error creating novel:', error);
    res.status(500).json({ error: 'Failed to create novel' });
  }
});

// 更新小说信息
router.put('/:id', requireAuth, requireOwnership('novel'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, genre, rating, status } = req.body;

    const novel = await prisma.novel.update({
      where: { id },
      data: {
        title,
        description,
        genre,
        rating,
        status,
        updatedAt: new Date()
      }
    });

    res.json(novel);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Novel not found' });
    }
    console.error('Error updating novel:', error);
    res.status(500).json({ error: 'Failed to update novel' });
  }
});

// 删除小说
router.delete('/:id', requireAuth, requireOwnership('novel'), async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.novel.delete({
      where: { id }
    });

    res.json({ message: 'Novel deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Novel not found' });
    }
    console.error('Error deleting novel:', error);
    res.status(500).json({ error: 'Failed to delete novel' });
  }
});

// 分析概要生成初始结构
router.post('/:id/analyze-summary', async (req, res) => {
  try {
    const { id } = req.params;
    const { summary } = req.body;

    if (!summary) {
      return res.status(400).json({ error: 'Summary is required' });
    }

    // 这里后续会集成AI服务来分析概要
    // 目前返回模拟数据
    const analysis = {
      suggestedCharacters: [
        { name: '主角', description: '从概要中识别的主要角色' },
        { name: '配角', description: '重要的支持角色' }
      ],
      suggestedSettings: [
        { name: '主要场景', type: 'location', description: '故事发生的主要地点' }
      ],
      suggestedChapters: [
        { title: '第一章', outline: '开端章节大纲' },
        { title: '第二章', outline: '发展章节大纲' }
      ],
      themes: ['主题1', '主题2'],
      genre: '推理小说'
    };

    res.json(analysis);
  } catch (error) {
    console.error('Error analyzing summary:', error);
    res.status(500).json({ error: 'Failed to analyze summary' });
  }
});

// 获取小说项目统计信息
router.get('/:id/statistics', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 获取小说基本信息
    const novel = await prisma.novel.findUnique({
      where: { id },
      include: {
        chapters: {
          select: {
            status: true,
            wordCount: true,
            progress: true,
            updatedAt: true
          }
        },
        characters: {
          select: { id: true }
        },
        settings: {
          select: { id: true }
        }
      }
    });

    if (!novel) {
      return res.status(404).json({ error: 'Novel not found' });
    }

    // 计算统计数据
    const totalChapters = novel.chapters.length;
    const completedChapters = novel.chapters.filter(ch => ch.status === 'completed').length;
    const writingChapters = novel.chapters.filter(ch => ch.status === 'writing').length;
    const planningChapters = novel.chapters.filter(ch => ch.status === 'planning').length;

    // 计算总字数和平均进度
    const totalWords = novel.chapters.reduce((sum, ch) => sum + ch.wordCount, 0);
    const averageProgress = totalChapters > 0 
      ? Math.round(novel.chapters.reduce((sum, ch) => sum + ch.progress, 0) / totalChapters)
      : 0;

    // 计算写作天数（从创建到现在）
    const writingDays = Math.ceil((new Date() - new Date(novel.createdAt)) / (1000 * 60 * 60 * 24));
    const averageWordsPerDay = writingDays > 0 ? Math.round(totalWords / writingDays) : 0;

    // 预计完成时间
    let estimatedCompletionDate = null;
    if (novel.targetWordCount && totalWords > 0 && averageWordsPerDay > 0) {
      const remainingWords = novel.targetWordCount - totalWords;
      const daysNeeded = Math.ceil(remainingWords / averageWordsPerDay);
      if (daysNeeded > 0) {
        const completionDate = new Date();
        completionDate.setDate(completionDate.getDate() + daysNeeded);
        estimatedCompletionDate = completionDate.toISOString().split('T')[0];
      }
    }

    const statistics = {
      overview: {
        totalWords,
        targetWordCount: novel.targetWordCount || 0,
        writingDays,
        averageWordsPerDay,
        overallProgress: averageProgress,
        estimatedCompletionDate
      },
      chapters: {
        total: totalChapters,
        completed: completedChapters,
        writing: writingChapters,
        planning: planningChapters
      },
      counts: {
        characters: novel.characters.length,
        settings: novel.settings.length
      },
      recentActivity: await getRecentActivity(id)
    };

    res.json(statistics);
  } catch (error) {
    console.error('Error fetching novel statistics:', error);
    res.status(500).json({ error: 'Failed to fetch novel statistics' });
  }
});

// 获取小说章节进度详情
router.get('/:id/progress', async (req, res) => {
  try {
    const { id } = req.params;
    
    const chapters = await prisma.chapter.findMany({
      where: { novelId: id },
      select: {
        id: true,
        chapterNumber: true,
        title: true,
        status: true,
        wordCount: true,
        progress: true,
        updatedAt: true
      },
      orderBy: { chapterNumber: 'asc' }
    });

    const progressData = chapters.map(chapter => ({
      ...chapter,
      updatedAt: chapter.updatedAt.toISOString().split('T')[0]
    }));

    res.json(progressData);
  } catch (error) {
    console.error('Error fetching novel progress:', error);
    res.status(500).json({ error: 'Failed to fetch novel progress' });
  }
});


// 获取写作目标数据
router.get('/:id/goals', async (req, res) => {
  try {
    const { id } = req.params;
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const thisWeek = `${now.getFullYear()}-W${getWeekNumber(now)}`;
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const goals = await prisma.writingGoal.findMany({
      where: {
        novelId: id,
        OR: [
          { type: 'daily', period: today },
          { type: 'weekly', period: thisWeek },
          { type: 'monthly', period: thisMonth }
        ]
      }
    });
    
    // 格式化返回数据
    const formattedGoals = {
      daily: { target: 1000, achieved: 0, progress: 0 },
      weekly: { target: 7000, achieved: 0, progress: 0 },
      monthly: { target: 30000, achieved: 0, progress: 0 }
    };
    
    goals.forEach(goal => {
      if (formattedGoals[goal.type]) {
        formattedGoals[goal.type] = {
          target: goal.target,
          achieved: goal.achieved,
          progress: goal.target > 0 ? Math.round((goal.achieved / goal.target) * 100) : 0
        };
      }
    });
    
    res.json(formattedGoals);
  } catch (error) {
    console.error('Error fetching writing goals:', error);
    res.status(500).json({ error: 'Failed to fetch writing goals' });
  }
});

// 工具函数：获取最近活动数据
async function getRecentActivity(novelId) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  try {
    const [todayStats, weekStats, monthStats] = await Promise.all([
      prisma.novelStatistics.findMany({
        where: {
          novelId,
          date: { gte: today }
        }
      }),
      prisma.novelStatistics.findMany({
        where: {
          novelId,
          date: { gte: weekStart }
        }
      }),
      prisma.novelStatistics.findMany({
        where: {
          novelId,
          date: { gte: monthStart }
        }
      })
    ]);
    
    return {
      todayWords: todayStats.reduce((sum, stat) => sum + stat.wordCount, 0),
      weekWords: weekStats.reduce((sum, stat) => sum + stat.wordCount, 0),
      monthWords: monthStats.reduce((sum, stat) => sum + stat.wordCount, 0)
    };
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    return {
      todayWords: 0,
      weekWords: 0,
      monthWords: 0
    };
  }
}

// 工具函数：获取周数
function getWeekNumber(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

module.exports = router;