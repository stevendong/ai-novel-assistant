const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const router = express.Router();

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
    res.json(characters);
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

    res.json(character);
  } catch (error) {
    console.error('Error fetching character:', error);
    res.status(500).json({ error: 'Failed to fetch character' });
  }
});

// 创建新角色
router.post('/', async (req, res) => {
  try {
    const { novelId, name, description, appearance, personality, background, relationships } = req.body;
    
    if (!novelId || !name) {
      return res.status(400).json({ error: 'Novel ID and name are required' });
    }

    const character = await prisma.character.create({
      data: {
        novelId,
        name,
        description,
        appearance,
        personality,
        background,
        relationships: relationships || {}
      }
    });

    res.status(201).json(character);
  } catch (error) {
    console.error('Error creating character:', error);
    res.status(500).json({ error: 'Failed to create character' });
  }
});

// 更新角色信息
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, appearance, personality, background, relationships, isLocked } = req.body;

    const character = await prisma.character.update({
      where: { id },
      data: {
        name,
        description,
        appearance,
        personality,
        background,
        relationships,
        isLocked,
        updatedAt: new Date()
      }
    });

    res.json(character);
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
router.post('/:id/enhance', async (req, res) => {
  try {
    const { id } = req.params;
    const { enhanceAspects, context, constraints } = req.body;

    const character = await prisma.character.findUnique({
      where: { id }
    });

    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    if (character.isLocked) {
      return res.status(400).json({ error: 'Character is locked and cannot be enhanced' });
    }

    // 这里后续会集成AI服务
    const enhancement = {
      suggestions: {
        personality: character.personality ? `${character.personality}\n增强建议：添加更深层的性格特征` : '建议添加具体的性格特征',
        background: character.background ? `${character.background}\n增强建议：补充成长经历` : '建议添加详细背景故事',
        appearance: character.appearance ? `${character.appearance}\n增强建议：增加特征性细节` : '建议添加外貌描述'
      },
      questions: [
        '这个角色的核心动机是什么？',
        '他/她有什么特殊的技能或天赋？',
        '童年经历对性格的影响？'
      ]
    };

    res.json(enhancement);
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

module.exports = router;