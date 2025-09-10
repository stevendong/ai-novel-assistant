const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const router = express.Router();

// 获取小说的写作统计
router.get('/novel/:novelId', async (req, res) => {
  try {
    const { novelId } = req.params;
    const { startDate, endDate } = req.query;
    
    let whereClause = { novelId };
    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }
    
    const statistics = await prisma.novelStatistics.findMany({
      where: whereClause,
      orderBy: { date: 'desc' }
    });
    
    res.json(statistics);
  } catch (error) {
    console.error('Error fetching novel statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// 获取单条统计记录
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const statistic = await prisma.novelStatistics.findUnique({
      where: { id },
      include: {
        novel: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });
    
    if (!statistic) {
      return res.status(404).json({ error: 'Statistic not found' });
    }
    
    res.json(statistic);
  } catch (error) {
    console.error('Error fetching statistic:', error);
    res.status(500).json({ error: 'Failed to fetch statistic' });
  }
});

// 创建或更新日统计数据
router.post('/', async (req, res) => {
  try {
    const { novelId, date, wordCount, timeSpent } = req.body;
    
    if (!novelId || !date) {
      return res.status(400).json({ error: 'Novel ID and date are required' });
    }
    
    // 使用 upsert 来创建或更新统计数据
    const statistic = await prisma.novelStatistics.upsert({
      where: {
        novelId_date: {
          novelId,
          date: new Date(date)
        }
      },
      update: {
        wordCount: wordCount || 0,
        timeSpent: timeSpent || 0
      },
      create: {
        novelId,
        date: new Date(date),
        wordCount: wordCount || 0,
        timeSpent: timeSpent || 0
      }
    });
    
    res.status(201).json(statistic);
  } catch (error) {
    console.error('Error creating/updating statistic:', error);
    res.status(500).json({ error: 'Failed to create/update statistic' });
  }
});

// 更新统计数据
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { wordCount, timeSpent } = req.body;
    
    const statistic = await prisma.novelStatistics.update({
      where: { id },
      data: {
        wordCount,
        timeSpent,
        updatedAt: new Date()
      }
    });
    
    res.json(statistic);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Statistic not found' });
    }
    console.error('Error updating statistic:', error);
    res.status(500).json({ error: 'Failed to update statistic' });
  }
});

// 删除统计数据
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.novelStatistics.delete({
      where: { id }
    });
    
    res.json({ message: 'Statistic deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Statistic not found' });
    }
    console.error('Error deleting statistic:', error);
    res.status(500).json({ error: 'Failed to delete statistic' });
  }
});

// 批量创建统计数据
router.post('/batch', async (req, res) => {
  try {
    const { statistics } = req.body;
    
    if (!Array.isArray(statistics) || statistics.length === 0) {
      return res.status(400).json({ error: 'Statistics array is required' });
    }
    
    let createdCount = 0;
    // 逐个创建统计数据，忽略已存在的
    for (const stat of statistics) {
      try {
        await prisma.novelStatistics.create({
          data: {
            novelId: stat.novelId,
            date: new Date(stat.date),
            wordCount: stat.wordCount || 0,
            timeSpent: stat.timeSpent || 0
          }
        });
        createdCount++;
      } catch (error) {
        // 如果统计记录已存在，忽略错误
        if (error.code !== 'P2002') {
          throw error;
        }
      }
    }
    
    res.status(201).json({ 
      message: 'Statistics created successfully',
      count: createdCount
    });
  } catch (error) {
    console.error('Error creating batch statistics:', error);
    res.status(500).json({ error: 'Failed to create batch statistics' });
  }
});

// 获取统计汇总数据
router.get('/novel/:novelId/summary', async (req, res) => {
  try {
    const { novelId } = req.params;
    const { days = 30 } = req.query;
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(days));
    
    const statistics = await prisma.novelStatistics.findMany({
      where: {
        novelId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { date: 'asc' }
    });
    
    // 计算汇总数据
    const totalWords = statistics.reduce((sum, stat) => sum + stat.wordCount, 0);
    const totalTime = statistics.reduce((sum, stat) => sum + stat.timeSpent, 0);
    const writingDays = statistics.filter(stat => stat.wordCount > 0).length;
    const averageWordsPerDay = writingDays > 0 ? Math.round(totalWords / writingDays) : 0;
    
    // 获取今日、本周、本月数据
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekStart = new Date();
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    
    const todayStats = statistics.filter(stat => 
      new Date(stat.date).getTime() === today.getTime()
    );
    const weekStats = statistics.filter(stat => 
      new Date(stat.date) >= weekStart
    );
    const monthStats = statistics.filter(stat => 
      new Date(stat.date) >= monthStart
    );
    
    const summary = {
      period: {
        days: parseInt(days),
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      },
      totals: {
        words: totalWords,
        timeMinutes: totalTime,
        writingDays,
        averageWordsPerDay
      },
      recent: {
        today: {
          words: todayStats.reduce((sum, stat) => sum + stat.wordCount, 0),
          timeMinutes: todayStats.reduce((sum, stat) => sum + stat.timeSpent, 0)
        },
        thisWeek: {
          words: weekStats.reduce((sum, stat) => sum + stat.wordCount, 0),
          timeMinutes: weekStats.reduce((sum, stat) => sum + stat.timeSpent, 0)
        },
        thisMonth: {
          words: monthStats.reduce((sum, stat) => sum + stat.wordCount, 0),
          timeMinutes: monthStats.reduce((sum, stat) => sum + stat.timeSpent, 0)
        }
      },
      dailyData: statistics
    };
    
    res.json(summary);
  } catch (error) {
    console.error('Error fetching statistics summary:', error);
    res.status(500).json({ error: 'Failed to fetch statistics summary' });
  }
});

module.exports = router;