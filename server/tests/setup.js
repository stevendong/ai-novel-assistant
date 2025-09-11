require('dotenv').config({ path: '.env.test' });

// Mock OpenAI API for testing
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
                  description: "测试一致性问题",
                  severity: "medium",
                  relatedContent: "相关内容片段",
                  relatedChapters: [],
                  logicChain: "逻辑链条"
                })
              }
            }]
          })
        }
      };
    }
  };
});

// Global test timeout
jest.setTimeout(30000);

// Setup and teardown hooks
beforeAll(async () => {
  // Global setup
});

afterAll(async () => {
  // Global cleanup
});

beforeEach(() => {
  // Clear mocks before each test
  jest.clearAllMocks();
});