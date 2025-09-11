const { PrismaClient } = require('@prisma/client');

// Mock Prisma
const mockPrisma = {
  chapter: {
    findUnique: jest.fn(),
    findMany: jest.fn()
  },
  consistencyCheck: {
    deleteMany: jest.fn(),
    createMany: jest.fn()
  }
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma)
}));

// Mock OpenAI with different responses for testing
const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn()
    }
  }
};

jest.mock('openai', () => {
  return jest.fn(() => mockOpenAI);
});

const consistencyService = require('../../services/consistencyService');

describe('ConsistencyService AI Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default chapter setup
    mockPrisma.chapter.findUnique.mockResolvedValue({
      id: 'chapter-1',
      chapterNumber: 2,
      title: '第二章',
      content: '张三在这一章表现得非常胆小，与之前的勇敢形象不符...',
      novelId: 'novel-1',
      novel: {
        characters: [
          { id: 'char-1', name: '张三', description: '勇敢的主角', personality: '勇敢、正直' }
        ],
        settings: []
      },
      characters: [
        { 
          character: { 
            id: 'char-1', 
            name: '张三', 
            description: '勇敢的主角',
            personality: '勇敢、正直',
            appearance: '高大威猛',
            background: '武林世家出身'
          } 
        }
      ],
      settings: []
    });

    mockPrisma.chapter.findMany.mockResolvedValue([
      {
        id: 'chapter-0',
        chapterNumber: 1,
        title: '第一章',
        content: '张三勇敢地面对敌人，展现了他的正直品格...',
        characters: [
          { character: { id: 'char-1', name: '张三' } }
        ],
        settings: []
      }
    ]);

    mockPrisma.consistencyCheck.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.consistencyCheck.createMany.mockResolvedValue({ count: 1 });
  });

  describe('callAIForConsistencyCheck', () => {
    it('应该正确解析AI返回的一致性问题', async () => {
      const aiResponse = {
        hasIssues: true,
        description: '张三在第二章表现胆小，与第一章的勇敢形象矛盾',
        severity: 'high',
        relatedContent: '张三表现胆小的片段',
        relatedChapters: ['chapter-0'],
        logicChain: '角色性格前后不一致'
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(aiResponse)
          }
        }]
      });

      const prompt = '测试提示词';
      const result = await consistencyService.callAIForConsistencyCheck(prompt);

      expect(result).toEqual(aiResponse);
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: expect.stringContaining('你是一个专业的小说编辑')
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3
      });
    });

    it('应该处理AI返回无问题的情况', async () => {
      const aiResponse = {
        hasIssues: false,
        description: '未发现一致性问题',
        severity: 'low'
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(aiResponse)
          }
        }]
      });

      const result = await consistencyService.callAIForConsistencyCheck('测试提示词');

      expect(result.hasIssues).toBe(false);
    });

    it('应该处理AI API调用失败的情况', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API调用失败'));

      const result = await consistencyService.callAIForConsistencyCheck('测试提示词');

      expect(result).toEqual({ hasIssues: false });
    });

    it('应该处理AI返回格式错误的JSON', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: '这不是有效的JSON'
          }
        }]
      });

      const result = await consistencyService.callAIForConsistencyCheck('测试提示词');

      expect(result).toEqual({ hasIssues: false });
    });
  });

  describe('buildCharacterConsistencyPrompt', () => {
    it('应该构建正确的角色一致性检查提示词', () => {
      const character = {
        name: '张三',
        description: '勇敢的主角',
        appearance: '高大威猛',
        personality: '勇敢、正直',
        background: '武林世家出身'
      };

      const currentContent = '张三在这一章表现得非常胆小...';
      
      const previousAppearances = [
        {
          chapterNumber: 1,
          content: '张三勇敢地面对敌人...'
        }
      ];

      const prompt = consistencyService.buildCharacterConsistencyPrompt(
        character, 
        currentContent, 
        previousAppearances
      );

      expect(prompt).toContain('张三');
      expect(prompt).toContain('勇敢的主角');
      expect(prompt).toContain('高大威猛');
      expect(prompt).toContain('勇敢、正直');
      expect(prompt).toContain('武林世家出身');
      expect(prompt).toContain(currentContent);
      expect(prompt).toContain('第1章：张三勇敢地面对敌人...');
      expect(prompt).toContain('请分析角色的性格、行为、能力、外貌等是否存在前后矛盾的地方');
    });

    it('应该处理角色信息缺失的情况', () => {
      const character = {
        name: '李四'
        // 其他字段为undefined
      };

      const prompt = consistencyService.buildCharacterConsistencyPrompt(
        character, 
        '内容', 
        []
      );

      expect(prompt).toContain('李四');
      expect(prompt).toContain('无'); // 缺失信息显示为'无'
    });
  });

  describe('buildSettingConsistencyPrompt', () => {
    it('应该构建正确的设定一致性检查提示词', () => {
      const setting = {
        name: '京城',
        type: 'location',
        description: '古代都城',
        details: { population: '百万', climate: '温带' }
      };

      const currentContent = '京城现在是一个小村庄...';
      
      const previousUsages = [
        {
          chapterNumber: 1,
          content: '京城是一个繁华的大都市...'
        }
      ];

      const prompt = consistencyService.buildSettingConsistencyPrompt(
        setting,
        currentContent,
        previousUsages
      );

      expect(prompt).toContain('京城');
      expect(prompt).toContain('location');
      expect(prompt).toContain('古代都城');
      expect(prompt).toContain('{"population":"百万","climate":"温带"}');
      expect(prompt).toContain(currentContent);
      expect(prompt).toContain('第1章：京城是一个繁华的大都市...');
    });
  });

  describe('buildTimelineConsistencyPrompt', () => {
    it('应该构建正确的时间线一致性检查提示词', () => {
      const chapter = {
        chapterNumber: 2,
        title: '第二章',
        content: '三年后，张三已经变老了...'
      };

      const previousChapters = [
        {
          chapterNumber: 1,
          title: '第一章',
          content: '张三是一个18岁的年轻人...'
        }
      ];

      const prompt = consistencyService.buildTimelineConsistencyPrompt(chapter, previousChapters);

      expect(prompt).toContain('第2章');
      expect(prompt).toContain('第二章');
      expect(prompt).toContain('三年后，张三已经变老了...');
      expect(prompt).toContain('第1章《第一章》：张三是一个18岁的年轻人...');
      expect(prompt).toContain('事件发生的时间顺序是否合理');
      expect(prompt).toContain('角色年龄变化是否符合时间跨度');
    });
  });

  describe('buildLogicConsistencyPrompt', () => {
    it('应该构建正确的逻辑一致性检查提示词', () => {
      const chapter = {
        chapterNumber: 2,
        title: '第二章',
        content: '张三突然会了魔法...'
      };

      const previousChapters = [
        {
          chapterNumber: 1,
          title: '第一章',
          content: '这是一个没有魔法的现实世界...'
        }
      ];

      const prompt = consistencyService.buildLogicConsistencyPrompt(chapter, previousChapters);

      expect(prompt).toContain('第2章');
      expect(prompt).toContain('第二章');
      expect(prompt).toContain('张三突然会了魔法...');
      expect(prompt).toContain('第1章《第一章》：这是一个没有魔法的现实世界...');
      expect(prompt).toContain('角色行为动机是否合理');
      expect(prompt).toContain('情节发展是否符合逻辑');
      expect(prompt).toContain('是否存在逻辑漏洞或前后矛盾');
    });
  });

  describe('完整的一致性检查流程', () => {
    it('应该检测到角色不一致问题', async () => {
      // 模拟AI检测到角色不一致
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              hasIssues: true,
              description: '张三在第二章表现胆小，与第一章的勇敢形象严重矛盾',
              severity: 'high',
              relatedContent: '张三表现胆小的描述',
              relatedChapters: ['chapter-0']
            })
          }
        }]
      });

      const result = await consistencyService.checkChapterConsistency('chapter-1', ['character']);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        type: 'character',
        issue: '张三在第二章表现胆小，与第一章的勇敢形象严重矛盾',
        severity: 'high'
      });

      // 验证结果已保存到数据库
      expect(mockPrisma.consistencyCheck.deleteMany).toHaveBeenCalledWith({
        where: { chapterId: 'chapter-1' }
      });
      expect(mockPrisma.consistencyCheck.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            chapterId: 'chapter-1',
            type: 'character',
            severity: 'high'
          })
        ])
      });
    });

    it('应该在没有历史章节时跳过某些检查', async () => {
      // 设置为第一章，没有历史章节
      mockPrisma.chapter.findUnique.mockResolvedValue({
        id: 'chapter-1',
        chapterNumber: 1,
        characters: [],
        settings: [],
        novel: { characters: [], settings: [] }
      });
      
      mockPrisma.chapter.findMany.mockResolvedValue([]); // 没有历史章节

      const result = await consistencyService.checkChapterConsistency('chapter-1');

      expect(result).toHaveLength(0);
      // 验证AI没有被调用（因为没有需要检查的内容）
      expect(mockOpenAI.chat.completions.create).not.toHaveBeenCalled();
    });
  });
});