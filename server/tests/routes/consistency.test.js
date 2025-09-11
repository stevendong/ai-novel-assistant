const request = require('supertest');
const express = require('express');
const consistencyRouter = require('../../routes/consistency');

// Mock consistency service
jest.mock('../../services/consistencyService', () => ({
  checkChapterConsistency: jest.fn(),
  getStatusHistory: jest.fn(),
  getAvailableTransitions: jest.fn(),
  getIssueContext: jest.fn()
}));

const mockConsistencyService = require('../../services/consistencyService');

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({
    consistencyCheck: {
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn()
    },
    chapter: {
      findMany: jest.fn()
    }
  }))
}));

const { PrismaClient } = require('@prisma/client');
const mockPrisma = new PrismaClient();

// Create test app
const app = express();
app.use(express.json());
app.use('/api/consistency', consistencyRouter);

describe('Consistency API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/consistency/chapters/:chapterId', () => {
    it('应该获取章节的一致性检查结果', async () => {
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

      const response = await request(app)
        .get('/api/consistency/chapters/chapter-1')
        .expect(200);

      expect(response.body).toEqual(mockIssues);
      expect(mockPrisma.consistencyCheck.findMany).toHaveBeenCalledWith({
        where: { chapterId: 'chapter-1' },
        orderBy: [
          { severity: 'desc' },
          { createdAt: 'desc' }
        ]
      });
    });

    it('应该支持按类型筛选', async () => {
      mockPrisma.consistencyCheck.findMany.mockResolvedValue([]);

      await request(app)
        .get('/api/consistency/chapters/chapter-1?type=character')
        .expect(200);

      expect(mockPrisma.consistencyCheck.findMany).toHaveBeenCalledWith({
        where: { chapterId: 'chapter-1', type: 'character' },
        orderBy: [
          { severity: 'desc' },
          { createdAt: 'desc' }
        ]
      });
    });

    it('应该支持按严重程度筛选', async () => {
      mockPrisma.consistencyCheck.findMany.mockResolvedValue([]);

      await request(app)
        .get('/api/consistency/chapters/chapter-1?severity=high')
        .expect(200);

      expect(mockPrisma.consistencyCheck.findMany).toHaveBeenCalledWith({
        where: { chapterId: 'chapter-1', severity: 'high' },
        orderBy: [
          { severity: 'desc' },
          { createdAt: 'desc' }
        ]
      });
    });

    it('应该支持按解决状态筛选', async () => {
      mockPrisma.consistencyCheck.findMany.mockResolvedValue([]);

      await request(app)
        .get('/api/consistency/chapters/chapter-1?resolved=true')
        .expect(200);

      expect(mockPrisma.consistencyCheck.findMany).toHaveBeenCalledWith({
        where: { chapterId: 'chapter-1', resolved: true },
        orderBy: [
          { severity: 'desc' },
          { createdAt: 'desc' }
        ]
      });
    });
  });

  describe('GET /api/consistency/novels/:novelId/overview', () => {
    it('应该获取小说的一致性检查概览', async () => {
      const mockChapters = [
        {
          id: 'chapter-1',
          chapterNumber: 1,
          title: '第一章',
          consistencyLog: [
            { type: 'character', severity: 'high', resolved: false },
            { type: 'timeline', severity: 'medium', resolved: true }
          ]
        },
        {
          id: 'chapter-2',
          chapterNumber: 2,
          title: '第二章',
          consistencyLog: [
            { type: 'logic', severity: 'low', resolved: false }
          ]
        }
      ];

      mockPrisma.chapter.findMany.mockResolvedValue(mockChapters);

      const response = await request(app)
        .get('/api/consistency/novels/novel-1/overview')
        .expect(200);

      expect(response.body).toHaveProperty('stats');
      expect(response.body).toHaveProperty('chapterIssues');
      expect(response.body.stats.totalIssues).toBe(3);
      expect(response.body.stats.highSeverity).toBe(1);
      expect(response.body.stats.mediumSeverity).toBe(1);
      expect(response.body.stats.lowSeverity).toBe(1);
      expect(response.body.stats.resolvedIssues).toBe(1);
      expect(response.body.stats.unresolvedIssues).toBe(2);
    });
  });

  describe('POST /api/consistency/chapters/:chapterId/check', () => {
    it('应该执行单个章节的一致性检查', async () => {
      const mockIssues = [
        {
          type: 'character',
          issue: '角色性格不一致',
          severity: 'medium'
        }
      ];

      mockConsistencyService.checkChapterConsistency.mockResolvedValue(mockIssues);

      const response = await request(app)
        .post('/api/consistency/chapters/chapter-1/check')
        .send({ types: ['character', 'setting'] })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        issuesFound: 1,
        issues: mockIssues
      });

      expect(mockConsistencyService.checkChapterConsistency).toHaveBeenCalledWith(
        'chapter-1',
        ['character', 'setting']
      );
    });

    it('应该使用默认检查类型', async () => {
      mockConsistencyService.checkChapterConsistency.mockResolvedValue([]);

      await request(app)
        .post('/api/consistency/chapters/chapter-1/check')
        .send({})
        .expect(200);

      expect(mockConsistencyService.checkChapterConsistency).toHaveBeenCalledWith(
        'chapter-1',
        ['character', 'setting', 'timeline', 'logic']
      );
    });

    it('应该处理检查失败的情况', async () => {
      mockConsistencyService.checkChapterConsistency.mockRejectedValue(
        new Error('检查失败')
      );

      const response = await request(app)
        .post('/api/consistency/chapters/chapter-1/check')
        .send({})
        .expect(500);

      expect(response.body).toEqual({
        error: '章节一致性检查失败'
      });
    });
  });

  describe('POST /api/consistency/novels/:novelId/batch-check', () => {
    it('应该批量检查多个章节', async () => {
      const mockResults = [
        [{ type: 'character', issue: '问题1', severity: 'high' }],
        []
      ];

      mockConsistencyService.checkChapterConsistency
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1]);

      mockPrisma.chapter.findMany.mockResolvedValue([
        { id: 'chapter-1' },
        { id: 'chapter-2' }
      ]);

      const response = await request(app)
        .post('/api/consistency/novels/novel-1/batch-check')
        .send({ types: ['character'] })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        checkedChapters: 2,
        totalIssuesFound: 1
      });
    });

    it('应该支持指定章节ID列表', async () => {
      mockConsistencyService.checkChapterConsistency.mockResolvedValue([]);

      await request(app)
        .post('/api/consistency/novels/novel-1/batch-check')
        .send({ 
          chapterIds: ['chapter-1', 'chapter-3'],
          types: ['character'] 
        })
        .expect(200);

      expect(mockConsistencyService.checkChapterConsistency).toHaveBeenCalledTimes(2);
    });
  });

  describe('PATCH /api/consistency/issues/:issueId/resolve', () => {
    it('应该标记问题为已解决', async () => {
      const mockUpdatedIssue = {
        id: 'issue-1',
        resolved: true
      };

      mockPrisma.consistencyCheck.update.mockResolvedValue(mockUpdatedIssue);

      const response = await request(app)
        .patch('/api/consistency/issues/issue-1/resolve')
        .send({ resolved: true })
        .expect(200);

      expect(response.body).toEqual(mockUpdatedIssue);
      expect(mockPrisma.consistencyCheck.update).toHaveBeenCalledWith({
        where: { id: 'issue-1' },
        data: { resolved: true }
      });
    });

    it('应该支持标记为未解决', async () => {
      mockPrisma.consistencyCheck.update.mockResolvedValue({});

      await request(app)
        .patch('/api/consistency/issues/issue-1/resolve')
        .send({ resolved: false })
        .expect(200);

      expect(mockPrisma.consistencyCheck.update).toHaveBeenCalledWith({
        where: { id: 'issue-1' },
        data: { resolved: false }
      });
    });

    it('应该默认标记为已解决', async () => {
      mockPrisma.consistencyCheck.update.mockResolvedValue({});

      await request(app)
        .patch('/api/consistency/issues/issue-1/resolve')
        .send({})
        .expect(200);

      expect(mockPrisma.consistencyCheck.update).toHaveBeenCalledWith({
        where: { id: 'issue-1' },
        data: { resolved: true }
      });
    });
  });

  describe('PATCH /api/consistency/issues/batch-resolve', () => {
    it('应该批量标记问题为已解决', async () => {
      mockPrisma.consistencyCheck.updateMany.mockResolvedValue({ count: 3 });

      const response = await request(app)
        .patch('/api/consistency/issues/batch-resolve')
        .send({ 
          issueIds: ['issue-1', 'issue-2', 'issue-3'],
          resolved: true 
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        updatedCount: 3
      });

      expect(mockPrisma.consistencyCheck.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['issue-1', 'issue-2', 'issue-3'] } },
        data: { resolved: true }
      });
    });
  });

  describe('DELETE /api/consistency/issues/:issueId', () => {
    it('应该删除一致性检查问题', async () => {
      mockPrisma.consistencyCheck.delete.mockResolvedValue({});

      const response = await request(app)
        .delete('/api/consistency/issues/issue-1')
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(mockPrisma.consistencyCheck.delete).toHaveBeenCalledWith({
        where: { id: 'issue-1' }
      });
    });
  });

  describe('GET /api/consistency/issues/:issueId/details', () => {
    it('应该获取问题详情和相关上下文', async () => {
      const mockIssue = {
        id: 'issue-1',
        chapterId: 'chapter-1',
        type: 'character',
        issue: '角色问题',
        chapter: {
          novel: { id: 'novel-1' },
          characters: [],
          settings: []
        }
      };

      const mockContext = {
        relatedCharacters: [],
        relatedSettings: [],
        relatedChapters: []
      };

      mockPrisma.consistencyCheck.findUnique.mockResolvedValue(mockIssue);
      mockConsistencyService.getIssueContext.mockResolvedValue(mockContext);

      const response = await request(app)
        .get('/api/consistency/issues/issue-1/details')
        .expect(200);

      expect(response.body).toEqual({
        issue: mockIssue,
        context: mockContext
      });
    });

    it('应该在问题不存在时返回404', async () => {
      mockPrisma.consistencyCheck.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/consistency/issues/non-existent/details')
        .expect(404);

      expect(response.body).toEqual({ error: '问题不存在' });
    });
  });
});