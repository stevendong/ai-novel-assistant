const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const router = express.Router();

// 获取小说的所有世界设定
router.get('/novel/:novelId', async (req, res) => {
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
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// 获取单个设定详情
router.get('/:id', async (req, res) => {
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

    res.json(setting);
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// 创建新设定
router.post('/', async (req, res) => {
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
        details: details || {}
      }
    });

    res.status(201).json(setting);
  } catch (error) {
    console.error('Error creating setting:', error);
    res.status(500).json({ error: 'Failed to create setting' });
  }
});

// 更新设定信息
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, name, description, details, isLocked } = req.body;

    const setting = await prisma.worldSetting.update({
      where: { id },
      data: {
        type,
        name,
        description,
        details,
        isLocked,
        updatedAt: new Date()
      }
    });

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
router.delete('/:id', async (req, res) => {
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
router.post('/:id/enhance', async (req, res) => {
  try {
    const { id } = req.params;
    const { expandAspects, plotRelevance } = req.body;

    const setting = await prisma.worldSetting.findUnique({
      where: { id }
    });

    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    if (setting.isLocked) {
      return res.status(400).json({ error: 'Setting is locked and cannot be enhanced' });
    }

    // AI完善设定的模拟响应
    const enhancement = {
      expansion: {
        history: `${setting.name}的历史背景扩展`,
        details: '更详细的描述和特征',
        rules: '相关的规则和限制',
        connections: '与其他设定的关联'
      },
      suggestions: [
        '添加历史事件时间线',
        '详细描述物理特征',
        '说明对角色的影响'
      ],
      questions: [
        '这个设定在故事中的重要性如何？',
        '是否需要添加冲突元素？',
        '与主要角色的关系？'
      ]
    };

    res.json(enhancement);
  } catch (error) {
    console.error('Error enhancing setting:', error);
    res.status(500).json({ error: 'Failed to enhance setting' });
  }
});

// AI扩展设定细节
router.post('/:id/expand', async (req, res) => {
  try {
    const { id } = req.params;
    const { focusAreas } = req.body;

    const setting = await prisma.worldSetting.findUnique({
      where: { id }
    });

    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    // AI扩展设定细节的模拟响应
    const expansion = {
      detailedDescription: `${setting.description}\n\n[AI扩展内容]`,
      sensoryDetails: {
        visual: '视觉描述',
        auditory: '听觉描述', 
        tactile: '触觉描述',
        olfactory: '嗅觉描述'
      },
      culturalAspects: {
        customs: '风俗习惯',
        beliefs: '信仰体系',
        language: '语言特色'
      },
      practicalDetails: {
        layout: '布局结构',
        function: '功能用途',
        accessibility: '可达性'
      }
    };

    res.json(expansion);
  } catch (error) {
    console.error('Error expanding setting:', error);
    res.status(500).json({ error: 'Failed to expand setting' });
  }
});

module.exports = router;