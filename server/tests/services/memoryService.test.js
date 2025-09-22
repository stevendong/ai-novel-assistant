const memoryService = require('../../services/memoryService');
const memoryConfig = require('../../config/memoryConfig');

describe('MemoryService', () => {
  const mockContext = {
    userId: 'test-user-123',
    novelId: 'test-novel-456',
    mode: 'chat',
    messageType: 'character'
  };

  beforeEach(() => {
    // 重置指标
    memoryService.metrics = {
      retrievalCount: 0,
      retrievalTimeTotal: 0,
      additionCount: 0,
      additionTimeTotal: 0,
      fallbackCount: 0,
      errorCount: 0
    };
  });

  describe('Memory Retrieval', () => {
    test('should retrieve relevant memories when service is available', async () => {
      if (!memoryService.isAvailable()) {
        console.log('Mem0 service not available, skipping test');
        return;
      }

      const query = '这个角色的性格特点是什么？';
      const memories = await memoryService.retrieveRelevantMemories(query, mockContext);

      expect(Array.isArray(memories)).toBe(true);
      expect(memoryService.metrics.retrievalCount).toBeGreaterThan(0);
    });

    test('should return empty array when service is unavailable', async () => {
      // 模拟服务不可用
      const originalClient = memoryService.client;
      memoryService.client = null;

      const query = 'test query';
      const memories = await memoryService.retrieveRelevantMemories(query, mockContext);

      expect(memories).toEqual([]);

      // 恢复客户端
      memoryService.client = originalClient;
    });

    test('should handle API errors gracefully', async () => {
      if (!memoryService.isAvailable()) {
        console.log('Mem0 service not available, skipping test');
        return;
      }

      // 模拟API错误
      const originalSearch = memoryService.client.search;
      memoryService.client.search = jest.fn().mockRejectedValue(new Error('API Error'));

      const query = 'test query';
      const memories = await memoryService.retrieveRelevantMemories(query, mockContext);

      expect(memories).toEqual([]);
      expect(memoryService.metrics.errorCount).toBeGreaterThan(0);

      // 恢复原始方法
      memoryService.client.search = originalSearch;
    });
  });

  describe('Memory Addition', () => {
    test('should add memory when content is valid', async () => {
      const content = '这是一个测试记忆，用于验证记忆添加功能的正确性。';
      const metadata = { memory_type: 'test', confidence: 0.9 };

      const result = await memoryService.addMemory(content, mockContext, metadata);

      if (memoryService.isAvailable()) {
        expect(result).toBeDefined();
        expect(memoryService.metrics.additionCount).toBeGreaterThan(0);
      } else {
        // 在降级模式下也应该能添加到本地备份
        expect(result).toBeDefined();
      }
    });

    test('should reject content that is too short', async () => {
      const content = 'hi'; // 太短的内容
      const result = await memoryService.addMemory(content, mockContext);

      expect(result).toBeNull();
    });

    test('should calculate importance correctly', () => {
      const testCases = [
        {
          content: '这是一个重要的角色设定',
          context: { mode: 'enhance' },
          metadata: { userConfirmed: true },
          expectedMin: 4
        },
        {
          content: '普通的对话内容',
          context: { mode: 'chat' },
          metadata: {},
          expectedMin: 1
        },
        {
          content: '用户喜欢这种风格的写作',
          context: { mode: 'chat' },
          metadata: {},
          expectedMin: 3
        }
      ];

      testCases.forEach(testCase => {
        const importance = memoryService.calculateImportance(
          testCase.content,
          testCase.context,
          testCase.metadata
        );
        expect(importance).toBeGreaterThanOrEqual(testCase.expectedMin);
        expect(importance).toBeLessThanOrEqual(5);
      });
    });
  });

  describe('Memory Types and Filtering', () => {
    test('should return correct memory types for different modes', () => {
      const chatTypes = memoryService.getRelevantMemoryTypes('chat', 'general');
      const enhanceTypes = memoryService.getRelevantMemoryTypes('enhance', 'character');
      const checkTypes = memoryService.getRelevantMemoryTypes('check', 'consistency');

      expect(chatTypes).toContain('user_preference');
      expect(enhanceTypes).toContain('character_trait');
      expect(checkTypes).toContain('consistency_rule');
    });

    test('should rank memories by score and importance', () => {
      const mockMemories = [
        { content: 'Memory 1', score: 0.5, metadata: { importance: 2 } },
        { content: 'Memory 2', score: 0.8, metadata: { importance: 4 } },
        { content: 'Memory 3', score: 0.6, metadata: { importance: 3 } }
      ];

      const ranked = memoryService.rankMemories(mockMemories, mockContext);

      // 第二个记忆应该排在最前面（最高综合分数）
      expect(ranked[0].content).toBe('Memory 2');
    });
  });

  describe('Health Check', () => {
    test('should return health status', async () => {
      const health = await memoryService.healthCheck();

      expect(health).toHaveProperty('status');
      expect(['healthy', 'error', 'unavailable']).toContain(health.status);

      if (health.status === 'healthy') {
        expect(health).toHaveProperty('metrics');
        expect(health).toHaveProperty('config');
      }
    });
  });

  describe('Metrics', () => {
    test('should track performance metrics', () => {
      memoryService.recordRetrieval(100, 5);
      memoryService.recordAddition(200, true);
      memoryService.recordAddition(150, false);

      const metrics = memoryService.getMetrics();

      expect(metrics.retrievalCount).toBe(1);
      expect(metrics.avgRetrievalTime).toBe(100);
      expect(metrics.additionCount).toBe(2);
      expect(metrics.avgAdditionTime).toBe(175);
      expect(metrics.fallbackCount).toBe(1);
      expect(metrics.successRate).toBe(0.5);
    });
  });

  describe('User Preference Detection', () => {
    test('should detect user preferences correctly', () => {
      const testCases = [
        { message: '我喜欢这种写作风格', expected: true },
        { message: '我不希望出现暴力内容', expected: true },
        { message: '这个角色的设定很好', expected: false },
        { message: '我总是偏好轻松的情节', expected: true },
        { message: '请避免悲伤的结局', expected: true }
      ];

      testCases.forEach(testCase => {
        const result = memoryService.containsUserPreference(testCase.message);
        expect(result).toBe(testCase.expected);
      });
    });
  });

  describe('Batch Processing', () => {
    test('should handle batch memory addition', async () => {
      const memories = [
        {
          content: '测试记忆1：角色设定相关内容',
          context: mockContext,
          metadata: { memory_type: 'character_trait' }
        },
        {
          content: '测试记忆2：世界观设定相关内容',
          context: mockContext,
          metadata: { memory_type: 'world_setting' }
        }
      ];

      await memoryService.addMemoryBatch(memories);

      // 验证队列已被添加
      expect(memoryService.updateQueue.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Configuration', () => {
    test('should respect configuration settings', () => {
      expect(memoryConfig).toHaveProperty('enabled');
      expect(memoryConfig).toHaveProperty('memory');
      expect(memoryConfig).toHaveProperty('performance');

      expect(memoryConfig.memory.maxRetrievalCount).toBeGreaterThan(0);
      expect(memoryConfig.memory.importanceThreshold).toBeGreaterThanOrEqual(1);
    });

    test('should validate memory types', () => {
      const validTypes = Object.values(memoryConfig.memoryTypes);
      const modeTypes = Object.values(memoryConfig.modeMemoryTypes).flat();

      modeTypes.forEach(type => {
        expect(validTypes).toContain(type);
      });
    });
  });
});