// Mock Prisma
const mockPrisma = {
  consistencyCheck: {
    count: jest.fn()
  }
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma)
}));

const statusWorkflowService = require('../../services/statusWorkflowService');

describe('StatusWorkflowService - Consistency Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkCondition - consistency_check_passed', () => {
    const mockEntity = { id: 'chapter-1' };
    const mockCondition = { type: 'consistency_check_passed' };

    it('应该在没有一致性问题时允许通过', async () => {
      mockPrisma.consistencyCheck.count
        .mockResolvedValueOnce(0) // 没有严重问题
        .mockResolvedValueOnce(0); // 没有中等问题

      const result = await statusWorkflowService.checkCondition(mockCondition, mockEntity);

      expect(result.passed).toBe(true);
      expect(result.reason).toBe('');
      
      expect(mockPrisma.consistencyCheck.count).toHaveBeenCalledWith({
        where: { 
          chapterId: 'chapter-1', 
          resolved: false,
          severity: 'high'
        }
      });
      
      expect(mockPrisma.consistencyCheck.count).toHaveBeenCalledWith({
        where: { 
          chapterId: 'chapter-1', 
          resolved: false,
          severity: 'medium'
        }
      });
    });

    it('应该在有严重问题时阻止通过', async () => {
      mockPrisma.consistencyCheck.count
        .mockResolvedValueOnce(2) // 2个严重问题
        .mockResolvedValueOnce(0); // 没有中等问题

      const result = await statusWorkflowService.checkCondition(mockCondition, mockEntity);

      expect(result.passed).toBe(false);
      expect(result.reason).toBe('存在2个严重一致性问题，必须解决后才能推进');
    });

    it('应该在有中等问题时阻止通过', async () => {
      mockPrisma.consistencyCheck.count
        .mockResolvedValueOnce(0) // 没有严重问题
        .mockResolvedValueOnce(3); // 3个中等问题

      const result = await statusWorkflowService.checkCondition(mockCondition, mockEntity);

      expect(result.passed).toBe(false);
      expect(result.reason).toBe('存在3个中等一致性问题，建议解决后再推进');
    });

    it('应该优先报告严重问题', async () => {
      mockPrisma.consistencyCheck.count
        .mockResolvedValueOnce(1) // 1个严重问题
        .mockResolvedValueOnce(2); // 2个中等问题

      const result = await statusWorkflowService.checkCondition(mockCondition, mockEntity);

      expect(result.passed).toBe(false);
      expect(result.reason).toBe('存在1个严重一致性问题，必须解决后才能推进');
    });

    it('应该处理数据库查询错误', async () => {
      mockPrisma.consistencyCheck.count.mockRejectedValue(new Error('数据库错误'));

      await expect(
        statusWorkflowService.checkCondition(mockCondition, mockEntity)
      ).rejects.toThrow('数据库错误');
    });
  });

  describe('章节状态流转集成测试', () => {
    it('应该在默认工作流中正确配置一致性检查条件', () => {
      const chapterTransitions = statusWorkflowService.defaultTransitions.chapter;
      
      // 找到从reviewing到editing的流转
      const reviewingToEditing = chapterTransitions.find(
        t => t.from === 'reviewing' && t.to === 'editing'
      );

      expect(reviewingToEditing).toBeDefined();
      expect(reviewingToEditing.conditions).toContainEqual({
        type: 'consistency_check_passed'
      });
      expect(reviewingToEditing.autoTrigger).toBe(false);
    });

    it('应该能获取所有可用的章节状态', () => {
      const statuses = statusWorkflowService.chapterStatuses;
      
      expect(statuses).toContain('planning');
      expect(statuses).toContain('outlined');
      expect(statuses).toContain('writing');
      expect(statuses).toContain('reviewing');
      expect(statuses).toContain('editing');
      expect(statuses).toContain('completed');
    });
  });

  describe('完整工作流测试场景', () => {
    it('模拟章节从写作到完成的完整流程', async () => {
      // 场景1: 章节在writing状态，尝试推进到reviewing
      // 这个转换不需要一致性检查，应该能通过
      
      // 场景2: 章节在reviewing状态，尝试推进到editing
      // 这时需要一致性检查
      mockPrisma.consistencyCheck.count
        .mockResolvedValueOnce(1) // 有1个严重问题
        .mockResolvedValueOnce(0);

      const entity = { id: 'chapter-1', status: 'reviewing' };
      const condition = { type: 'consistency_check_passed' };

      const result = await statusWorkflowService.checkCondition(condition, entity);

      expect(result.passed).toBe(false);
      expect(result.reason).toContain('严重一致性问题');
    });

    it('模拟解决一致性问题后成功推进', async () => {
      // 解决所有一致性问题后
      mockPrisma.consistencyCheck.count
        .mockResolvedValueOnce(0) // 没有严重问题
        .mockResolvedValueOnce(0); // 没有中等问题

      const entity = { id: 'chapter-1', status: 'reviewing' };
      const condition = { type: 'consistency_check_passed' };

      const result = await statusWorkflowService.checkCondition(condition, entity);

      expect(result.passed).toBe(true);
      expect(result.reason).toBe('');
    });
  });

  describe('不同严重程度的处理策略', () => {
    it('应该只阻止严重和中等问题，允许轻微问题通过', async () => {
      // 这里我们需要测试实际的业务逻辑
      // 根据当前实现，轻微问题不会阻止状态流转
      
      // 模拟只有轻微问题的情况
      mockPrisma.consistencyCheck.count
        .mockResolvedValueOnce(0) // 没有严重问题
        .mockResolvedValueOnce(0); // 没有中等问题
        // 注意：当前实现中没有查询轻微问题

      const entity = { id: 'chapter-1' };
      const condition = { type: 'consistency_check_passed' };

      const result = await statusWorkflowService.checkCondition(condition, entity);

      expect(result.passed).toBe(true);
    });

    it('应该提供清晰的错误信息用于调试', async () => {
      mockPrisma.consistencyCheck.count
        .mockResolvedValueOnce(2) // 2个严重问题
        .mockResolvedValueOnce(1); // 1个中等问题

      const entity = { id: 'chapter-1' };
      const condition = { type: 'consistency_check_passed' };

      const result = await statusWorkflowService.checkCondition(condition, entity);

      expect(result.passed).toBe(false);
      expect(result.reason).toBe('存在2个严重一致性问题，必须解决后才能推进');
    });
  });

  describe('边界情况处理', () => {
    it('应该处理实体ID为空的情况', async () => {
      const entity = { id: null };
      const condition = { type: 'consistency_check_passed' };

      // 模拟数据库查询返回0（因为无效ID）
      mockPrisma.consistencyCheck.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await statusWorkflowService.checkCondition(condition, entity);

      expect(result.passed).toBe(true);
    });

    it('应该处理未知条件类型', async () => {
      const entity = { id: 'chapter-1' };
      const condition = { type: 'unknown_condition_type' };

      // 这应该会调用默认的条件处理逻辑
      const result = await statusWorkflowService.checkCondition(condition, entity);

      // 根据statusWorkflowService的实现，未知类型应该有默认处理
      expect(result).toBeDefined();
      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('reason');
    });
  });
});