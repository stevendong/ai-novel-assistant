const express = require('express');
const { countValidWords } = require('../utils/textUtils');
const { requireAuth, requireOwnership } = require('../middleware/auth');
const prisma = require('../utils/prismaClient');

const router = express.Router();

// 章节路由 - 添加分页查询支持

// 获取小说的所有章节（分页查询）
router.get('/novel/:novelId/paginated', requireAuth, async (req, res) => {
  try {
    const { novelId } = req.params;
    const {
      page = 1,
      pageSize = 10,
      status,
      search,
      sortBy = 'chapterNumber',
      sortOrder = 'asc'
    } = req.query;

    // 构建查询条件
    const where = { novelId };
    
    // 状态筛选
    if (status) {
      where.status = status;
    }
    
    // 搜索条件（标题或大纲）
    if (search) {
      where.OR = [
        {
          title: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          outline: {
            contains: search,
            mode: 'insensitive'
          }
        }
      ];
    }

    // 排序条件
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    // 分页参数
    const pageNum = parseInt(page);
    const pageSizeNum = parseInt(pageSize);
    const skip = (pageNum - 1) * pageSizeNum;

    // 并行查询数据、总数和最大章节号
    const [chapters, total, maxChapterResult] = await Promise.all([
      prisma.chapter.findMany({
        where,
        include: {
          characters: {
            include: {
              character: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          settings: {
            include: {
              setting: {
                select: {
                  id: true,
                  name: true,
                  type: true
                }
              }
            }
          },
          _count: {
            select: {
              consistencyLog: true
            }
          }
        },
        orderBy,
        skip,
        take: pageSizeNum
      }),
      prisma.chapter.count({ where }),
      prisma.chapter.findFirst({
        where: { novelId },
        select: { chapterNumber: true },
        orderBy: { chapterNumber: 'desc' }
      })
    ]);

    const totalPages = Math.ceil(total / pageSizeNum);
    const maxChapterNumber = maxChapterResult ? maxChapterResult.chapterNumber : 0;

    res.json({
      chapters,
      total,
      page: pageNum,
      pageSize: pageSizeNum,
      totalPages,
      maxChapterNumber
    });
  } catch (error) {
    console.error('Error fetching paginated chapters:', error);
    res.status(500).json({ error: 'Failed to fetch chapters' });
  }
});

// 获取小说的所有章节
router.get('/novel/:novelId', async (req, res) => {
  try {
    const { novelId } = req.params;
    const chapters = await prisma.chapter.findMany({
      where: { novelId },
      include: {
        characters: {
          include: {
            character: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        settings: {
          include: {
            setting: {
              select: {
                id: true,
                name: true,
                type: true
              }
            }
          }
        },
        _count: {
          select: {
            consistencyLog: true
          }
        }
      },
      orderBy: { chapterNumber: 'asc' }
    });
    res.json(chapters);
  } catch (error) {
    console.error('Error fetching chapters:', error);
    res.status(500).json({ error: 'Failed to fetch chapters' });
  }
});

// 获取单个章节详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const chapter = await prisma.chapter.findUnique({
      where: { id },
      include: {
        characters: {
          include: {
            character: true
          }
        },
        settings: {
          include: {
            setting: true
          }
        },
        consistencyLog: {
          where: { resolved: false },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    res.json(chapter);
  } catch (error) {
    console.error('Error fetching chapter:', error);
    res.status(500).json({ error: 'Failed to fetch chapter' });
  }
});

// 创建新章节
router.post('/', async (req, res) => {
  try {
    const { novelId, title, chapterNumber, outline, plotPoints, insertMode = false } = req.body;

    if (!novelId || !title || chapterNumber === undefined) {
      return res.status(400).json({ error: 'Novel ID, title, and chapter number are required' });
    }

    // 检查章节号是否已存在
    const existingChapter = await prisma.chapter.findFirst({
      where: { novelId, chapterNumber }
    });

    if (existingChapter) {
      // 如果是插入模式，则将该章节号及之后的章节号都加1
      if (insertMode) {
        // 使用事务确保数据一致性
        await prisma.$transaction(async (tx) => {
          // 获取需要调整的章节（章节号 >= 指定章节号）
          const chaptersToUpdate = await tx.chapter.findMany({
            where: {
              novelId,
              chapterNumber: { gte: chapterNumber }
            },
            orderBy: { chapterNumber: 'desc' } // 倒序更新，避免唯一约束冲突
          });

          // 更新章节号（每个章节号+1）
          for (const chapter of chaptersToUpdate) {
            await tx.chapter.update({
              where: { id: chapter.id },
              data: { chapterNumber: chapter.chapterNumber + 1 }
            });
          }
        });
      } else {
        return res.status(400).json({ error: 'Chapter number already exists' });
      }
    }

    // 创建新章节
    const chapter = await prisma.chapter.create({
      data: {
        novelId,
        title,
        chapterNumber,
        outline,
        plotPoints: plotPoints ? JSON.stringify(plotPoints) : null
      }
    });

    res.status(201).json(chapter);
  } catch (error) {
    console.error('Error creating chapter:', error);
    res.status(500).json({ error: 'Failed to create chapter' });
  }
});

// 更新章节信息
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, outline, content, plotPoints, illustrations, status, targetWordCount } = req.body;

    // 计算有效字数
    const wordCount = content ? countValidWords(content, {
      removeMarkdown: true,
      removeHtml: true
    }) : 0;

    const chapter = await prisma.chapter.update({
      where: { id },
      data: {
        title,
        outline,
        content,
        plotPoints,
        illustrations,
        status,
        wordCount,
        targetWordCount,
        updatedAt: new Date()
      }
    });

    res.json(chapter);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Chapter not found' });
    }
    console.error('Error updating chapter:', error);
    res.status(500).json({ error: 'Failed to update chapter' });
  }
});

// 删除章节
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.chapter.delete({
      where: { id }
    });

    res.json({ message: 'Chapter deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Chapter not found' });
    }
    console.error('Error deleting chapter:', error);
    res.status(500).json({ error: 'Failed to delete chapter' });
  }
});

// AI生成章节大纲
router.post('/:id/generate-outline', async (req, res) => {
  try {
    const { id } = req.params;
    const { plotPoints, targetEmotion, constraints } = req.body;

    const chapter = await prisma.chapter.findUnique({
      where: { id },
      include: {
        novel: true,
        characters: {
          include: {
            character: true
          }
        },
        settings: {
          include: {
            setting: true
          }
        }
      }
    });

    if (!chapter) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    // AI生成大纲的模拟响应
    const outline = {
      structure: {
        opening: '开场设定和氛围营造',
        development: '情节发展和角色互动',
        climax: '章节高潮部分',
        resolution: '结尾和过渡'
      },
      scenes: [
        {
          type: 'opening',
          location: '主要场景',
          characters: ['主角'],
          keyEvents: ['建立氛围', '引入冲突'],
          wordCount: 800
        },
        {
          type: 'development',
          location: '次要场景',
          characters: ['主角', '配角'],
          keyEvents: ['情节推进', '角色发展'],
          wordCount: 1200
        },
        {
          type: 'climax',
          location: '关键场景',
          characters: ['主角'],
          keyEvents: ['冲突爆发', '决定性时刻'],
          wordCount: 1000
        }
      ],
      suggestions: {
        pacing: '建议在开场部分放慢节奏，营造氛围',
        dialogue: '重点关注主角与配角的对话',
        description: '详细描述关键场景的环境'
      }
    };

    res.json(outline);
  } catch (error) {
    console.error('Error generating outline:', error);
    res.status(500).json({ error: 'Failed to generate outline' });
  }
});

// 添加角色到章节
router.post('/:id/characters', async (req, res) => {
  try {
    const { id } = req.params;
    const { characterId, role } = req.body;

    if (!characterId) {
      return res.status(400).json({ error: 'Character ID is required' });
    }

    const relation = await prisma.chapterCharacter.create({
      data: {
        chapterId: id,
        characterId,
        role: role || 'mentioned'
      }
    });

    res.status(201).json(relation);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Character already added to this chapter' });
    }
    console.error('Error adding character to chapter:', error);
    res.status(500).json({ error: 'Failed to add character to chapter' });
  }
});

// 更新章节角色关系
router.put('/:id/characters/:characterId', async (req, res) => {
  try {
    const { id, characterId } = req.params;
    const { role } = req.body;

    const relation = await prisma.chapterCharacter.update({
      where: {
        chapterId_characterId: {
          chapterId: id,
          characterId
        }
      },
      data: { role }
    });

    res.json(relation);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Chapter-character relation not found' });
    }
    console.error('Error updating chapter-character relation:', error);
    res.status(500).json({ error: 'Failed to update chapter-character relation' });
  }
});

// 从章节中移除角色
router.delete('/:id/characters/:characterId', async (req, res) => {
  try {
    const { id, characterId } = req.params;

    await prisma.chapterCharacter.delete({
      where: {
        chapterId_characterId: {
          chapterId: id,
          characterId
        }
      }
    });

    res.json({ message: 'Character removed from chapter successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Chapter-character relation not found' });
    }
    console.error('Error removing character from chapter:', error);
    res.status(500).json({ error: 'Failed to remove character from chapter' });
  }
});

// 更新章节设定关系
router.put('/:id/settings/:settingId', async (req, res) => {
  try {
    const { id, settingId } = req.params;
    const { usage } = req.body;

    const relation = await prisma.chapterSetting.update({
      where: {
        chapterId_settingId: {
          chapterId: id,
          settingId
        }
      },
      data: { usage }
    });

    res.json(relation);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Chapter-setting relation not found' });
    }
    console.error('Error updating chapter-setting relation:', error);
    res.status(500).json({ error: 'Failed to update chapter-setting relation' });
  }
});

// 从章节中移除设定
router.delete('/:id/settings/:settingId', async (req, res) => {
  try {
    const { id, settingId } = req.params;

    await prisma.chapterSetting.delete({
      where: {
        chapterId_settingId: {
          chapterId: id,
          settingId
        }
      }
    });

    res.json({ message: 'Setting removed from chapter successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Chapter-setting relation not found' });
    }
    console.error('Error removing setting from chapter:', error);
    res.status(500).json({ error: 'Failed to remove setting from chapter' });
  }
});

// 添加设定到章节
router.post('/:id/settings', async (req, res) => {
  try {
    const { id } = req.params;
    const { settingId, usage } = req.body;

    if (!settingId) {
      return res.status(400).json({ error: 'Setting ID is required' });
    }

    const relation = await prisma.chapterSetting.create({
      data: {
        chapterId: id,
        settingId,
        usage
      }
    });

    res.status(201).json(relation);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Setting already added to this chapter' });
    }
    console.error('Error adding setting to chapter:', error);
    res.status(500).json({ error: 'Failed to add setting to chapter' });
  }
});

// 重新排序章节（自动修复章节号）
router.post('/novel/:novelId/reorder', async (req, res) => {
  try {
    const { novelId } = req.params;

    // 使用事务确保数据一致性
    await prisma.$transaction(async (tx) => {
      // 获取该小说的所有章节，按当前章节号排序
      const chapters = await tx.chapter.findMany({
        where: { novelId },
        orderBy: { chapterNumber: 'asc' }
      });

      // 重新分配章节号（从1开始）
      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        const newChapterNumber = i + 1;

        // 只有当章节号需要更新时才更新
        if (chapter.chapterNumber !== newChapterNumber) {
          await tx.chapter.update({
            where: { id: chapter.id },
            data: { chapterNumber: newChapterNumber }
          });
        }
      }
    });

    res.json({ message: 'Chapters reordered successfully' });
  } catch (error) {
    console.error('Error reordering chapters:', error);
    res.status(500).json({ error: 'Failed to reorder chapters' });
  }
});

module.exports = router;
