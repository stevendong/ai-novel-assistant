const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const router = express.Router();

// 获取所有小说项目
router.get('/', async (req, res) => {
  try {
    const novels = await prisma.novel.findMany({
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
router.get('/:id', async (req, res) => {
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
router.post('/', async (req, res) => {
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
router.put('/:id', async (req, res) => {
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
router.delete('/:id', async (req, res) => {
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

module.exports = router;