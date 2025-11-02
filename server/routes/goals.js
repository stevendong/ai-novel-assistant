const express = require('express');
const prisma = require('../utils/prismaClient');

const router = express.Router();

// 获取小说的所有写作目标
router.get('/novel/:novelId', async (req, res) => {
  try {
    const { novelId } = req.params;
    const { type, period } = req.query;
    
    let whereClause = { novelId };
    if (type) whereClause.type = type;
    if (period) whereClause.period = period;
    
    const goals = await prisma.writingGoal.findMany({
      where: whereClause,
      orderBy: [
        { type: 'asc' },
        { period: 'desc' }
      ]
    });
    
    res.json(goals);
  } catch (error) {
    console.error('Error fetching writing goals:', error);
    res.status(500).json({ error: 'Failed to fetch writing goals' });
  }
});

// 获取当前活跃的写作目标
router.get('/novel/:novelId/active', async (req, res) => {
  try {
    const { novelId } = req.params;
    const now = new Date();
    
    // 生成当前时间周期标识
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const thisWeek = `${now.getFullYear()}-W${getWeekNumber(now)}`; // YYYY-WXX
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
    const thisYear = now.getFullYear().toString(); // YYYY
    
    const activeGoals = await prisma.writingGoal.findMany({
      where: {
        novelId,
        OR: [
          { type: 'daily', period: today },
          { type: 'weekly', period: thisWeek },
          { type: 'monthly', period: thisMonth },
          { type: 'yearly', period: thisYear }
        ]
      }
    });
    
    // 如果没有目标，创建默认目标
    if (activeGoals.length === 0) {
      const defaultGoals = [
        { novelId, type: 'daily', period: today, target: 1000, achieved: 0 },
        { novelId, type: 'weekly', period: thisWeek, target: 7000, achieved: 0 },
        { novelId, type: 'monthly', period: thisMonth, target: 30000, achieved: 0 }
      ];
      
      // 逐个创建目标，忽略已存在的
      for (const goalData of defaultGoals) {
        try {
          await prisma.writingGoal.create({
            data: goalData
          });
        } catch (error) {
          // 如果目标已存在（违反唯一约束），忽略错误
          if (error.code !== 'P2002') {
            throw error;
          }
        }
      }
      
      // 重新获取目标
      const newActiveGoals = await prisma.writingGoal.findMany({
        where: {
          novelId,
          OR: [
            { type: 'daily', period: today },
            { type: 'weekly', period: thisWeek },
            { type: 'monthly', period: thisMonth }
          ]
        }
      });
      
      res.json(newActiveGoals);
    } else {
      res.json(activeGoals);
    }
  } catch (error) {
    console.error('Error fetching active goals:', error);
    res.status(500).json({ error: 'Failed to fetch active goals' });
  }
});

// 获取单个写作目标
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const goal = await prisma.writingGoal.findUnique({
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
    
    if (!goal) {
      return res.status(404).json({ error: 'Writing goal not found' });
    }
    
    res.json(goal);
  } catch (error) {
    console.error('Error fetching writing goal:', error);
    res.status(500).json({ error: 'Failed to fetch writing goal' });
  }
});

// 创建或更新写作目标
router.post('/', async (req, res) => {
  try {
    const { novelId, type, period, target, achieved } = req.body;
    
    if (!novelId || !type || !period || !target) {
      return res.status(400).json({ error: 'Novel ID, type, period, and target are required' });
    }
    
    if (!['daily', 'weekly', 'monthly', 'yearly', 'total'].includes(type)) {
      return res.status(400).json({ error: 'Invalid goal type' });
    }
    
    // 使用 upsert 来创建或更新目标
    const goal = await prisma.writingGoal.upsert({
      where: {
        novelId_type_period: {
          novelId,
          type,
          period
        }
      },
      update: {
        target,
        achieved: achieved || 0
      },
      create: {
        novelId,
        type,
        period,
        target,
        achieved: achieved || 0
      }
    });
    
    res.status(201).json(goal);
  } catch (error) {
    console.error('Error creating/updating writing goal:', error);
    res.status(500).json({ error: 'Failed to create/update writing goal' });
  }
});

// 更新写作目标
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { target, achieved } = req.body;
    
    const goal = await prisma.writingGoal.update({
      where: { id },
      data: {
        target,
        achieved,
        updatedAt: new Date()
      }
    });
    
    res.json(goal);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Writing goal not found' });
    }
    console.error('Error updating writing goal:', error);
    res.status(500).json({ error: 'Failed to update writing goal' });
  }
});

// 更新目标完成进度
router.patch('/:id/progress', async (req, res) => {
  try {
    const { id } = req.params;
    const { achieved, increment } = req.body;
    
    let updateData = { updatedAt: new Date() };
    
    if (achieved !== undefined) {
      updateData.achieved = achieved;
    } else if (increment !== undefined) {
      // 增量更新
      const goal = await prisma.writingGoal.findUnique({
        where: { id }
      });
      
      if (!goal) {
        return res.status(404).json({ error: 'Writing goal not found' });
      }
      
      updateData.achieved = goal.achieved + increment;
    } else {
      return res.status(400).json({ error: 'Either achieved or increment is required' });
    }
    
    const updatedGoal = await prisma.writingGoal.update({
      where: { id },
      data: updateData
    });
    
    res.json(updatedGoal);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Writing goal not found' });
    }
    console.error('Error updating goal progress:', error);
    res.status(500).json({ error: 'Failed to update goal progress' });
  }
});

// 删除写作目标
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.writingGoal.delete({
      where: { id }
    });
    
    res.json({ message: 'Writing goal deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Writing goal not found' });
    }
    console.error('Error deleting writing goal:', error);
    res.status(500).json({ error: 'Failed to delete writing goal' });
  }
});

// 批量更新目标进度
router.patch('/novel/:novelId/update-progress', async (req, res) => {
  try {
    const { novelId } = req.params;
    const { wordCount, date } = req.body;
    
    if (!wordCount || !date) {
      return res.status(400).json({ error: 'Word count and date are required' });
    }
    
    const targetDate = new Date(date);
    const today = targetDate.toISOString().split('T')[0];
    const thisWeek = `${targetDate.getFullYear()}-W${getWeekNumber(targetDate)}`;
    const thisMonth = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
    const thisYear = targetDate.getFullYear().toString();
    
    // 获取相关目标
    const goals = await prisma.writingGoal.findMany({
      where: {
        novelId,
        OR: [
          { type: 'daily', period: today },
          { type: 'weekly', period: thisWeek },
          { type: 'monthly', period: thisMonth },
          { type: 'yearly', period: thisYear },
          { type: 'total' }
        ]
      }
    });
    
    // 更新每个目标的进度
    const updatePromises = goals.map(goal => 
      prisma.writingGoal.update({
        where: { id: goal.id },
        data: {
          achieved: goal.achieved + wordCount,
          updatedAt: new Date()
        }
      })
    );
    
    await Promise.all(updatePromises);
    
    res.json({ 
      message: 'Progress updated successfully',
      updatedGoals: goals.length,
      wordCount
    });
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// 工具函数：获取周数
function getWeekNumber(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

module.exports = router;
