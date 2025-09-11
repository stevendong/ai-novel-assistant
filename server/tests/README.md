# 一致性检查API测试文档

## 测试结构

```
tests/
├── setup.js                           # Jest全局配置
├── fixtures/                          # 测试数据
│   └── consistencyTestData.js         # 一致性检查测试数据
├── services/                          # 服务层测试
│   ├── consistencyService.test.js     # 一致性检查服务核心功能测试
│   ├── consistencyService.ai.test.js  # AI集成测试
│   └── statusWorkflowService.consistency.test.js  # 工作流集成测试
├── routes/                            # 路由层测试
│   └── consistency.test.js            # API路由测试
└── integration/                       # 集成测试
    └── consistency.e2e.test.js        # 端到端测试
```

## 测试覆盖范围

### 1. 核心服务测试 (`services/consistencyService.test.js`)
- ✅ 章节一致性检查主流程
- ✅ 错误处理（章节不存在）
- ✅ 检查类型参数处理
- ✅ 健康度评分计算
- ✅ 状态推进权限检查
- ✅ 角色上下文构建
- ✅ 历史记录获取

### 2. AI集成测试 (`services/consistencyService.ai.test.js`)
- ✅ AI API调用和响应解析
- ✅ 提示词构建（4种类型）
- ✅ AI服务异常处理
- ✅ JSON格式错误处理
- ✅ 完整检查流程模拟
- ✅ 边界情况处理

### 3. 工作流集成测试 (`services/statusWorkflowService.consistency.test.js`)
- ✅ 一致性检查条件验证
- ✅ 不同严重程度的处理策略
- ✅ 状态流转配置验证
- ✅ 完整工作流场景模拟
- ✅ 边界情况和错误处理

### 4. API路由测试 (`routes/consistency.test.js`)
- ✅ 获取章节问题列表（含筛选）
- ✅ 小说概览统计
- ✅ 单章节检查
- ✅ 批量检查
- ✅ 问题状态管理（解决/删除）
- ✅ 问题详情获取
- ✅ 错误响应处理

### 5. 端到端测试 (`integration/consistency.e2e.test.js`)
- ✅ 完整检查流程（数据流）
- ✅ 多类型问题检测
- ✅ 问题生命周期管理
- ✅ 统计数据准确性
- ✅ 并发请求处理
- ✅ 系统异常恢复

## 运行测试

### 安装依赖
```bash
npm install --save-dev jest supertest
```

### 运行所有测试
```bash
npm test
```

### 运行特定测试文件
```bash
# 只运行一致性服务测试
npm test -- tests/services/consistencyService.test.js

# 只运行API路由测试
npm test -- tests/routes/consistency.test.js

# 只运行集成测试
npm test -- tests/integration/consistency.e2e.test.js
```

### 监视模式运行
```bash
npm run test:watch
```

### 生成测试覆盖率报告
```bash
npm run test:coverage
```

## 测试数据

### 测试场景 (`fixtures/consistencyTestData.js`)
提供了4种典型的不一致问题场景：

1. **角色性格不一致**：勇敢的主角突然变得胆怯
2. **世界设定矛盾**：繁华都城变成小村庄
3. **时间线问题**：时间跨度与角色年龄不符
4. **逻辑矛盾**：无魔法世界中出现魔法

### Mock数据工厂
- `createMockNovel()` - 创建小说数据
- `createMockCharacter()` - 创建角色数据
- `createMockChapter()` - 创建章节数据
- `createMockConsistencyCheck()` - 创建一致性问题数据

## Mock策略

### OpenAI API Mock
```javascript
jest.mock('openai', () => {
  return class MockOpenAI {
    constructor() {
      this.chat = {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: JSON.stringify({
                  hasIssues: true,
                  description: "测试问题",
                  severity: "medium"
                })
              }
            }]
          })
        }
      };
    }
  };
});
```

### Prisma ORM Mock
```javascript
const mockPrisma = {
  chapter: { findUnique: jest.fn(), findMany: jest.fn() },
  consistencyCheck: { 
    findMany: jest.fn(), 
    deleteMany: jest.fn(), 
    createMany: jest.fn() 
  }
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma)
}));
```

## 测试最佳实践

### 1. 测试隔离
- 每个测试用例都使用 `beforeEach()` 清理Mock
- 独立的测试数据，避免相互影响

### 2. 全面的边界测试
- 测试正常情况、边界情况和异常情况
- 验证错误处理和用户友好的错误消息

### 3. 现实场景模拟
- 使用真实的小说内容作为测试数据
- 模拟实际用户的使用场景

### 4. 性能测试
- 并发请求处理能力
- 大数据量处理性能

## CI/CD集成

测试可以轻松集成到CI/CD流程中：

```yaml
# GitHub Actions示例
- name: Run Tests
  run: |
    npm test
    npm run test:coverage
```

## 调试测试

### 查看详细输出
```bash
npm test -- --verbose
```

### 运行单个测试用例
```bash
npm test -- --testNamePattern="应该成功执行章节一致性检查"
```

### 调试模式
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

## 注意事项

1. **环境变量**：测试使用 `.env.test` 文件
2. **数据库**：使用内存数据库，测试后自动清理
3. **AI服务**：完全Mock，不会调用真实API
4. **异步操作**：所有异步操作都正确处理Promise

这套测试提供了完整的一致性检查功能验证，确保API的稳定性和可靠性。