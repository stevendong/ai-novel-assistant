#!/usr/bin/env node

/**
 * 测试流式响应记忆功能集成
 */

const memoryService = require('../services/memoryService');
const aiService = require('../services/aiService');

async function testStreamingMemoryIntegration() {
  console.log('🧪 测试流式响应记忆集成...\n');

  // 1. 检查记忆服务状态
  console.log('1️⃣ 检查记忆服务状态...');
  const health = await memoryService.healthCheck();
  console.log(`   - 记忆服务状态: ${health.status}`);

  if (health.status !== 'healthy') {
    console.log('   - ⚠️ 记忆服务不可用，将使用降级模式');
  }

  // 2. 创建测试上下文
  console.log('\n2️⃣ 创建测试上下文...');
  const testContext = {
    userId: 'test-streaming-user-' + Date.now(),
    novelId: 'test-novel-' + Date.now(),
    mode: 'chat',
    messageType: 'character'
  };

  const mockNovelContext = {
    id: testContext.novelId,
    title: '测试小说',
    genre: '科幻',
    outline: '一个关于时间旅行的故事',
    characters: [
      {
        name: '张三',
        background: '时间旅行者，来自2050年',
        personality: '冷静、理性、有远见'
      }
    ],
    settings: [
      {
        name: '时间机器',
        description: '可以穿越时空的装置',
        category: 'technology'
      }
    ]
  };

  console.log(`   - 用户ID: ${testContext.userId}`);
  console.log(`   - 小说ID: ${testContext.novelId}`);
  console.log(`   - 模式: ${testContext.mode}`);

  // 3. 预设一些记忆
  console.log('\n3️⃣ 预设测试记忆...');
  const testMemories = [
    {
      content: '用户喜欢科幻题材，特别是时间旅行的故事',
      metadata: {
        memory_type: 'user_preference',
        source: 'chat_history',
        confidence: 0.9
      }
    },
    {
      content: '张三这个角色设定为理性冷静的时间旅行者',
      metadata: {
        memory_type: 'character_trait',
        source: 'character_development',
        confidence: 0.85
      }
    }
  ];

  for (const memory of testMemories) {
    try {
      const result = await memoryService.addMemory(memory.content, testContext, memory.metadata);
      if (result) {
        console.log(`   - ✅ 记忆添加成功: ${memory.content.substring(0, 30)}...`);
      } else {
        console.log(`   - ⚠️ 记忆添加失败（降级模式）`);
      }
    } catch (error) {
      console.log(`   - ❌ 记忆添加错误: ${error.message}`);
    }
  }

  // 等待记忆生效
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 4. 测试流式响应记忆检索
  console.log('\n4️⃣ 测试流式响应记忆检索...');

  const testMessage = '张三这个角色在面对时间悖论时会如何反应？';

  try {
    console.log(`   - 测试消息: "${testMessage}"`);

    // 模拟流式响应调用（仅测试记忆检索部分）
    const options = {
      userId: testContext.userId,
      messageType: testContext.messageType,
      provider: 'openai',
      model: 'gpt-3.5-turbo'
    };

    // 检查记忆检索
    const memories = await memoryService.retrieveRelevantMemories(testMessage, {
      userId: testContext.userId,
      novelId: testContext.novelId,
      mode: testContext.mode,
      messageType: testContext.messageType
    });

    console.log(`   - 检索到 ${memories.length} 条相关记忆`);

    if (memories.length > 0) {
      memories.forEach((memory, index) => {
        console.log(`     ${index + 1}. ${memory.content.substring(0, 50)}...`);
        console.log(`        类型: ${memory.metadata?.memory_type || 'unknown'}`);
      });
    }

    // 5. 测试记忆增强提示词构建
    console.log('\n5️⃣ 测试记忆增强提示词构建...');

    const enhancedPrompt = aiService.buildMemoryEnhancedPrompt(mockNovelContext, 'chat', memories);
    console.log(`   - 增强提示词长度: ${enhancedPrompt.length} 字符`);
    console.log(`   - 包含记忆上下文: ${enhancedPrompt.includes('相关记忆上下文') ? '是' : '否'}`);

  } catch (error) {
    console.log(`   - ❌ 流式响应记忆测试错误: ${error.message}`);
  }

  // 6. 模拟记忆更新（流式响应完成后）
  console.log('\n6️⃣ 模拟流式响应完成后的记忆更新...');

  const mockResponse = '张三面对时间悖论时会保持冷静，运用他的理性思维分析各种可能性，寻找最佳的解决方案。他的远见让他能够预判时间修改的后果。';

  try {
    // 异步更新记忆（模拟流式响应完成后的操作）
    setImmediate(async () => {
      try {
        await memoryService.updateMemoriesAsync(
          testMessage,
          mockResponse,
          testContext,
          { responseTime: 1200, provider: 'openai' }
        );
        console.log('   - ✅ 异步记忆更新完成');
      } catch (error) {
        console.log(`   - ⚠️ 异步记忆更新失败: ${error.message}`);
      }
    });

    console.log('   - 🚀 异步记忆更新已启动');

    // 等待异步操作
    await new Promise(resolve => setTimeout(resolve, 2000));

  } catch (error) {
    console.log(`   - ❌ 记忆更新模拟错误: ${error.message}`);
  }

  // 7. 验证新记忆是否已添加
  console.log('\n7️⃣ 验证新记忆添加...');

  try {
    const updatedMemories = await memoryService.retrieveRelevantMemories('张三处理时间悖论', {
      userId: testContext.userId,
      novelId: testContext.novelId,
      mode: testContext.mode,
      messageType: testContext.messageType
    });

    console.log(`   - 更新后检索到 ${updatedMemories.length} 条相关记忆`);

  } catch (error) {
    console.log(`   - ❌ 新记忆验证错误: ${error.message}`);
  }

  // 8. 性能指标
  console.log('\n8️⃣ 性能指标统计...');
  const metrics = memoryService.getMetrics();
  console.log(`   - 检索操作: ${metrics.retrievalCount}次`);
  console.log(`   - 添加操作: ${metrics.additionCount}次`);
  console.log(`   - 平均检索时间: ${metrics.avgRetrievalTime.toFixed(2)}ms`);
  console.log(`   - 平均添加时间: ${metrics.avgAdditionTime.toFixed(2)}ms`);
  console.log(`   - 成功率: ${(metrics.successRate * 100).toFixed(1)}%`);

  console.log('\n🎉 流式响应记忆集成测试完成！');

  // 测试总结
  console.log('\n📊 测试总结:');
  console.log(`   - 记忆服务状态: ${health.status}`);
  console.log(`   - 流式响应现已支持记忆检索和更新`);
  console.log(`   - 记忆在响应生成前检索，响应完成后异步更新`);
  console.log(`   - 支持降级模式，确保服务可用性`);
}

// 运行测试
if (require.main === module) {
  testStreamingMemoryIntegration().catch(error => {
    console.error('❌ 流式响应记忆测试失败:', error);
    process.exit(1);
  });
}

module.exports = { testStreamingMemoryIntegration };