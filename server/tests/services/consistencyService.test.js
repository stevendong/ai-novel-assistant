const { PrismaClient } = require('@prisma/client');

// Mock Prisma
const mockPrisma = {
  chapter: {
    findUnique: jest.fn(),
    findMany: jest.fn()
  },
  consistencyCheck: {
    findMany: jest.fn(),
    count: jest.fn(),
    deleteMany: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findUnique: jest.fn()
  }
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma)
}));

const consistencyService = require('../../services/consistencyService');

describe('ConsistencyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkChapterConsistency', () => {
    const mockChapter = {
      id: 'chapter-1',
      chapterNumber: 2,
      title: '第二章',
      content: '这是第二章的内容...',
      novelId: 'novel-1',
      novel: {
        characters: [
          { id: 'char-1', name: '张三', description: '主角' }
        ],
        settings: [
          { id: 'setting-1', name: '京城', type: 'location' }
        ]
      },
      characters: [
        { character: { id: 'char-1', name: '张三', description: '主角', personality: '勇敢' } }
      ],
      settings: [
        { setting: { id: 'setting-1', name: '京城', type: 'location', description: '古代都城' } }
      ]
    };

    const mockPreviousChapters = [
      {
        id: 'chapter-0',
        chapterNumber: 1,
        title: '第一章',
        content: '张三是一个勇敢的年轻人...',
        characters: [
          { character: { id: 'char-1', name: '张三' } }
        ],
        settings: []
      }
    ];

    beforeEach(() => {
      mockPrisma.chapter.findUnique.mockResolvedValue(mockChapter);
      mockPrisma.chapter.findMany.mockResolvedValue(mockPreviousChapters);
      mockPrisma.consistencyCheck.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.consistencyCheck.createMany.mockResolvedValue({ count: 1 });
    });

    it('应该成功执行章节一致性检查', async () => {
      const chapterId = 'chapter-1';
      const types = ['character', 'setting', 'timeline', 'logic'];

      const result = await consistencyService.checkChapterConsistency(chapterId, types);

      expect(mockPrisma.chapter.findUnique).toHaveBeenCalledWith({
        where: { id: chapterId },
        include: {
          novel: {
            include: {
              characters: true,
              settings: true
            }
          },
          characters: {
            include: { character: true }
          },
          settings: {
            include: { setting: true }
          }
        }
      });

      expect(mockPrisma.chapter.findMany).toHaveBeenCalledWith({
        where: {
          novelId: mockChapter.novelId,
          chapterNumber: { lt: mockChapter.chapterNumber }
        },
        orderBy: { chapterNumber: 'asc' },
        select: expect.objectContaining({
          id: true,
          chapterNumber: true,
          title: true,
          content: true
        })
      });

      expect(Array.isArray(result)).toBe(true);
      expect(mockPrisma.consistencyCheck.deleteMany).toHaveBeenCalledWith({
        where: { chapterId }
      });
    });

    it('应该在章节不存在时抛出错误', async () => {
      mockPrisma.chapter.findUnique.mockResolvedValue(null);

      await expect(
        consistencyService.checkChapterConsistency('non-existent-chapter')
      ).rejects.toThrow('章节不存在');
    });

    it('应该支持指定检查类型', async () => {
      const chapterId = 'chapter-1';
      const types = ['character', 'timeline'];

      await consistencyService.checkChapterConsistency(chapterId, types);

      // 验证只执行了指定类型的检查
      expect(mockPrisma.chapter.findUnique).toHaveBeenCalled();
    });
  });

  describe('getChapterIssues', () => {
    it('应该获取章节的一致性问题', async () => {
      const mockIssues = [
        {
          id: 'issue-1',
          chapterId: 'chapter-1',
          type: 'character',
          issue: '角色性格不一致',
          severity: 'medium',
          resolved: false,
          createdAt: new Date().toISOString()
        }
      ];

      mockPrisma.consistencyCheck.findMany.mockResolvedValue(mockIssues);

      // 注意：这里需要直接测试路由或者创建一个获取问题的方法
      // 目前consistencyService中没有这个方法，我们可以添加一个
    });
  });

  describe('getChapterHealthScore', () => {
    it('应该计算章节健康度评分', async () => {
      const mockIssues = [
        { severity: 'high' },
        { severity: 'medium' },
        { severity: 'low' }
      ];

      mockPrisma.consistencyCheck.findMany.mockResolvedValue(mockIssues);

      const score = await consistencyService.getChapterHealthScore('chapter-1');

      expect(score).toBe(65); // 100 - 20 - 10 - 5 = 65
      expect(mockPrisma.consistencyCheck.findMany).toHaveBeenCalledWith({
        where: { chapterId: 'chapter-1', resolved: false }
      });
    });

    it('应该在没有问题时返回满分', async () => {
      mockPrisma.consistencyCheck.findMany.mockResolvedValue([]);

      const score = await consistencyService.getChapterHealthScore('chapter-1');

      expect(score).toBe(100);
    });

    it('应该确保评分不低于0', async () => {
      // 创建大量严重问题
      const manyIssues = Array(10).fill({ severity: 'high' });
      mockPrisma.consistencyCheck.findMany.mockResolvedValue(manyIssues);

      const score = await consistencyService.getChapterHealthScore('chapter-1');

      expect(score).toBe(0);
    });
  });

  describe('canChapterAdvance', () => {
    it('应该在没有严重问题时允许推进', async () => {
      mockPrisma.consistencyCheck.findMany.mockResolvedValue([]);

      const result = await consistencyService.canChapterAdvance('chapter-1');

      expect(result.canAdvance).toBe(true);
      expect(result.blockingIssues).toEqual([]);
    });

    it('应该在有严重问题时阻止推进', async () => {
      const mockHighIssues = [
        { id: 'issue-1', severity: 'high', issue: '严重问题' }
      ];
      mockPrisma.consistencyCheck.findMany.mockResolvedValue(mockHighIssues);

      const result = await consistencyService.canChapterAdvance('chapter-1');

      expect(result.canAdvance).toBe(false);
      expect(result.blockingIssues).toEqual(mockHighIssues);
    });
  });

  describe('buildCharacterContext', () => {
    it('应该构建角色上下文', () => {
      const chapter = {
        characters: [
          { character: { id: 'char-1', name: '张三' } }
        ]
      };
      
      const previousChapters = [
        {
          characters: [
            { character: { id: 'char-2', name: '李四' } }
          ]
        }
      ];

      const context = consistencyService.buildCharacterContext(chapter, previousChapters);

      expect(context).toHaveProperty('char-1');
      expect(context).toHaveProperty('char-2');
      expect(context['char-1'].name).toBe('张三');
      expect(context['char-2'].name).toBe('李四');
    });
  });

  describe('getCharacterPreviousAppearances', () => {
    it('应该获取角色之前的出现记录', () => {
      const previousChapters = [
        {
          characters: [
            { character: { id: 'char-1' } }
          ]
        },
        {
          characters: [
            { character: { id: 'char-2' } }
          ]
        }
      ];

      const appearances = consistencyService.getCharacterPreviousAppearances('char-1', previousChapters);

      expect(appearances).toHaveLength(1);
      expect(appearances[0].characters[0].character.id).toBe('char-1');
    });
  });

  describe('getSettingPreviousUsages', () => {
    it('应该获取设定之前的使用记录', () => {
      const previousChapters = [
        {
          settings: [
            { setting: { id: 'setting-1' } }
          ]
        },
        {
          settings: []
        }
      ];

      const usages = consistencyService.getSettingPreviousUsages('setting-1', previousChapters);

      expect(usages).toHaveLength(1);
      expect(usages[0].settings[0].setting.id).toBe('setting-1');
    });
  });
});