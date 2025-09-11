const request = require('supertest');
const express = require('express');
const { testScenarios } = require('../fixtures/consistencyTestData');

// Create test app with all middleware
const app = express();
app.use(express.json());

// Mock all dependencies at the top level
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
    findUnique: jest.fn(),
    updateMany: jest.fn()
  }
};

const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn()
    }
  }
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma)
}));

jest.mock('openai', () => {
  return jest.fn(() => mockOpenAI);
});

// Import after mocking
const consistencyRouter = require('../../routes/consistency');
app.use('/api/consistency', consistencyRouter);

describe('Consistency API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('完整的一致性检查流程', () => {
    it('应该检测角色不一致问题并正确保存', async () => {
      const { chapter, previousChapters, expectedIssue } = testScenarios.characterInconsistency;

      // 设置模拟数据
      mockPrisma.chapter.findUnique.mockResolvedValue(chapter);
      mockPrisma.chapter.findMany.mockResolvedValue(previousChapters);
      mockPrisma.consistencyCheck.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.consistencyCheck.createMany.mockResolvedValue({ count: 1 });

      // 模拟AI检测到问题
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              hasIssues: true,
              description: expectedIssue.issue,
              severity: expectedIssue.severity,
              relatedContent: '张三吓得转身就跑',
              relatedChapters: ['chapter-0']
            })
          }
        }]
      });

      // 执行检查
      const response = await request(app)
        .post('/api/consistency/chapters/chapter-1/check')
        .send({ types: ['character'] })
        .expect(200);

      // 验证响应
      expect(response.body.success).toBe(true);
      expect(response.body.issuesFound).toBe(1);
      expect(response.body.issues).toHaveLength(1);
      expect(response.body.issues[0]).toMatchObject({
        type: 'character',
        issue: expectedIssue.issue,
        severity: expectedIssue.severity
      });

      // 验证数据库操作
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

    it('应该处理多类型检查并返回所有问题', async () => {
      const chapter = testScenarios.characterInconsistency.chapter;
      const previousChapters = testScenarios.characterInconsistency.previousChapters;

      mockPrisma.chapter.findUnique.mockResolvedValue(chapter);
      mockPrisma.chapter.findMany.mockResolvedValue(previousChapters);
      mockPrisma.consistencyCheck.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.consistencyCheck.createMany.mockResolvedValue({ count: 2 });

      // 模拟AI检测到不同类型的问题
      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                hasIssues: true,
                description: '角色性格不一致',
                severity: 'high'
              })
            }
          }]
        })
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                hasIssues: false
              })
            }
          }]
        })
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                hasIssues: true,
                description: '时间线逻辑问题',
                severity: 'medium'
              })
            }
          }]
        })
        .mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                hasIssues: false
              })
            }
          }]
        });

      const response = await request(app)
        .post('/api/consistency/chapters/chapter-1/check')
        .send({ types: ['character', 'setting', 'timeline', 'logic'] })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.issuesFound).toBe(2);
      expect(response.body.issues).toHaveLength(2);
      
      // 验证问题类型
      const issueTypes = response.body.issues.map(issue => issue.type);
      expect(issueTypes).toContain('character');
      expect(issueTypes).toContain('timeline');
    });
  });

  describe('问题管理流程', () => {
    it('应该能够获取、解决和删除问题', async () => {
      const mockIssues = [
        {
          id: 'issue-1',
          chapterId: 'chapter-1',
          type: 'character',
          issue: '角色性格不一致',
          severity: 'high',
          resolved: false,
          createdAt: new Date().toISOString()
        },
        {
          id: 'issue-2',
          chapterId: 'chapter-1',
          type: 'timeline',
          issue: '时间线问题',
          severity: 'medium',
          resolved: false,
          createdAt: new Date().toISOString()
        }
      ];

      // 1. 获取问题列表
      mockPrisma.consistencyCheck.findMany.mockResolvedValue(mockIssues);
      
      const getResponse = await request(app)
        .get('/api/consistency/chapters/chapter-1')
        .expect(200);

      expect(getResponse.body).toHaveLength(2);

      // 2. 解决单个问题
      mockPrisma.consistencyCheck.update.mockResolvedValue({
        ...mockIssues[0],
        resolved: true
      });

      const resolveResponse = await request(app)
        .patch('/api/consistency/issues/issue-1/resolve')
        .send({ resolved: true })
        .expect(200);

      expect(resolveResponse.body.resolved).toBe(true);

      // 3. 批量解决问题
      mockPrisma.consistencyCheck.updateMany.mockResolvedValue({ count: 2 });

      const batchResolveResponse = await request(app)
        .patch('/api/consistency/issues/batch-resolve')
        .send({ 
          issueIds: ['issue-1', 'issue-2'],
          resolved: true 
        })
        .expect(200);

      expect(batchResolveResponse.body.success).toBe(true);
      expect(batchResolveResponse.body.updatedCount).toBe(2);

      // 4. 删除问题
      mockPrisma.consistencyCheck.delete.mockResolvedValue({});

      await request(app)
        .delete('/api/consistency/issues/issue-1')
        .expect(200);
    });
  });

  describe('小说概览统计', () => {
    it('应该正确计算小说的一致性统计信息', async () => {
      const mockChapters = [
        {
          id: 'chapter-1',
          chapterNumber: 1,
          title: '第一章',
          consistencyLog: [
            { type: 'character', severity: 'high', resolved: false },
            { type: 'character', severity: 'medium', resolved: true },
            { type: 'timeline', severity: 'low', resolved: false }
          ]
        },
        {
          id: 'chapter-2',
          chapterNumber: 2,
          title: '第二章',
          consistencyLog: [
            { type: 'logic', severity: 'high', resolved: false },
            { type: 'setting', severity: 'medium', resolved: false }
          ]
        }
      ];

      mockPrisma.chapter.findMany.mockResolvedValue(mockChapters);

      const response = await request(app)
        .get('/api/consistency/novels/novel-1/overview')
        .expect(200);

      expect(response.body.stats).toMatchObject({
        totalIssues: 5,
        highSeverity: 2,
        mediumSeverity: 2,
        lowSeverity: 1,
        resolvedIssues: 1,
        unresolvedIssues: 4,
        typeDistribution: {
          character: 2,
          setting: 1,
          timeline: 1,
          logic: 1
        }
      });

      expect(response.body.chapterIssues).toHaveLength(2);
      expect(response.body.chapterIssues[0]).toMatchObject({
        chapterId: 'chapter-1',
        issueCount: 3,
        highestSeverity: 'high'
      });
    });
  });

  describe('错误处理', () => {
    it('应该处理章节不存在的情况', async () => {
      mockPrisma.chapter.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/consistency/chapters/non-existent/check')
        .send({})
        .expect(500);

      expect(response.body.error).toBe('章节一致性检查失败');
    });

    it('应该处理AI服务异常', async () => {
      const chapter = testScenarios.characterInconsistency.chapter;
      mockPrisma.chapter.findUnique.mockResolvedValue(chapter);
      mockPrisma.chapter.findMany.mockResolvedValue([]);
      
      // 模拟AI服务失败
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('AI服务不可用'));

      const response = await request(app)
        .post('/api/consistency/chapters/chapter-1/check')
        .send({})
        .expect(500);

      expect(response.body.error).toBe('章节一致性检查失败');
    });

    it('应该处理数据库操作异常', async () => {
      mockPrisma.consistencyCheck.findMany.mockRejectedValue(new Error('数据库连接失败'));

      const response = await request(app)
        .get('/api/consistency/chapters/chapter-1')
        .expect(500);

      expect(response.body.error).toBe('获取一致性检查结果失败');
    });
  });

  describe('性能测试', () => {
    it('应该能处理大量并发检查请求', async () => {
      const chapter = testScenarios.characterInconsistency.chapter;
      mockPrisma.chapter.findUnique.mockResolvedValue(chapter);
      mockPrisma.chapter.findMany.mockResolvedValue([]);
      mockPrisma.consistencyCheck.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.consistencyCheck.createMany.mockResolvedValue({ count: 0 });

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({ hasIssues: false })
          }
        }]
      });

      // 并发发送多个请求
      const promises = Array(5).fill().map(() =>
        request(app)
          .post('/api/consistency/chapters/chapter-1/check')
          .send({})
      );

      const responses = await Promise.all(promises);

      // 所有请求都应该成功
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});