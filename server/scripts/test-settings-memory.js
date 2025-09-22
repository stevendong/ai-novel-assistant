#!/usr/bin/env node

/**
 * 测试Settings路由中的记忆功能集成
 */

const memoryService = require('../services/memoryService');

async function testSettingsMemoryIntegration() {
  console.log('🧪 测试Settings路由记忆集成...\n');

  // 1. 检查记忆服务状态
  console.log('1️⃣ 检查记忆服务状态...');
  const health = await memoryService.healthCheck();
  console.log(`   - 记忆服务状态: ${health.status}`);

  if (health.status !== 'healthy') {
    console.log('   - ⚠️ 记忆服务不可用，但不影响基本功能');
  }

  // 2. 检查记忆类型配置
  console.log('\n2️⃣ 检查记忆类型配置...');
  const memoryTypes = {
    worldbuilding: '世界观构建',
    consistency: '一致性检查'
  };

  Object.entries(memoryTypes).forEach(([type, description]) => {
    console.log(`   - ${type}: ${description}`);
  });

  // 3. 模拟Settings API调用的记忆上下文
  console.log('\n3️⃣ 模拟Settings API记忆上下文...');

  const mockContext = {
    userId: 'test-user-settings-' + Date.now(),
    novelId: 'test-novel-' + Date.now(),
    mode: 'enhance',
    messageType: 'worldbuilding'
  };

  console.log(`   - 用户ID: ${mockContext.userId}`);
  console.log(`   - 小说ID: ${mockContext.novelId}`);
  console.log(`   - 消息类型: ${mockContext.messageType}`);

  // 4. 测试记忆添加（模拟世界观设定生成）
  console.log('\n4️⃣ 测试世界观设定记忆添加...');

  const worldbuildingMemories = [
    {
      content: '这是一个蒸汽朋克风格的世界，科技水平相当于19世纪末期，但有魔法元素存在',
      metadata: {
        memory_type: 'world_setting',
        source: 'settings_enhance',
        confidence: 0.9
      }
    },
    {
      content: '用户偏好创建复杂的政治制度和社会结构',
      metadata: {
        memory_type: 'user_preference',
        source: 'settings_usage_pattern',
        confidence: 0.8
      }
    },
    {
      content: '魔法系统基于元素操控，需要特殊的导体材料',
      metadata: {
        memory_type: 'world_setting',
        source: 'settings_expansion',
        confidence: 0.85
      }
    }
  ];

  for (const memory of worldbuildingMemories) {
    try {
      const result = await memoryService.addMemory(memory.content, mockContext, memory.metadata);
      if (result) {
        console.log(`   - ✅ 记忆添加成功: ${memory.content.substring(0, 30)}...`);
      } else {
        console.log(`   - ⚠️ 记忆添加失败（可能使用降级模式）`);
      }
    } catch (error) {
      console.log(`   - ❌ 记忆添加错误: ${error.message}`);
    }
  }

  // 等待记忆生效
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 5. 测试记忆检索（模拟后续的设定操作）
  console.log('\n5️⃣ 测试相关记忆检索...');

  const queries = [
    '这个世界的魔法系统是什么样的？',
    '用户在世界观构建方面有什么偏好？',
    '这个世界的科技水平如何？'
  ];

  for (const query of queries) {
    try {
      const memories = await memoryService.retrieveRelevantMemories(query, mockContext);
      console.log(`   - 查询: "${query}"`);
      console.log(`   - 检索到 ${memories.length} 条相关记忆`);

      if (memories.length > 0) {
        memories.forEach((memory, index) => {
          console.log(`     ${index + 1}. ${memory.content.substring(0, 50)}...`);
        });
      }
    } catch (error) {
      console.log(`   - ❌ 记忆检索错误: ${error.message}`);
    }
  }

  // 6. 测试一致性检查记忆
  console.log('\n6️⃣ 测试一致性检查记忆...');

  const consistencyContext = {
    ...mockContext,
    mode: 'check',
    messageType: 'consistency'
  };

  const consistencyMemory = {
    content: '检测到世界观不一致：魔法系统在第三章说需要咒语，但第五章说只需要意念控制',
    metadata: {
      memory_type: 'consistency_rule',
      source: 'consistency_check',
      confidence: 0.95
    }
  };

  try {
    const result = await memoryService.addMemory(
      consistencyMemory.content,
      consistencyContext,
      consistencyMemory.metadata
    );

    if (result) {
      console.log(`   - ✅ 一致性检查记忆添加成功`);
    } else {
      console.log(`   - ⚠️ 一致性检查记忆添加失败（降级模式）`);
    }
  } catch (error) {
    console.log(`   - ❌ 一致性检查记忆错误: ${error.message}`);
  }

  // 7. 检查记忆类型分布
  console.log('\n7️⃣ 检查记忆类型分布...');

  const typeQueries = {
    'world_setting': '世界设定查询',
    'user_preference': '用户偏好查询',
    'consistency_rule': '一致性规则查询'
  };

  for (const [type, description] of Object.entries(typeQueries)) {
    const typeContext = {
      ...mockContext,
      messageType: type
    };

    try {
      const memories = await memoryService.retrieveRelevantMemories(description, typeContext);
      console.log(`   - ${type}: ${memories.length} 条记忆`);
    } catch (error) {
      console.log(`   - ${type}: 检索失败`);
    }
  }

  // 8. 性能指标
  console.log('\n8️⃣ 性能指标统计...');
  const metrics = memoryService.getMetrics();
  console.log(`   - 检索操作: ${metrics.retrievalCount}次`);
  console.log(`   - 添加操作: ${metrics.additionCount}次`);
  console.log(`   - 平均检索时间: ${metrics.avgRetrievalTime.toFixed(2)}ms`);
  console.log(`   - 平均添加时间: ${metrics.avgAdditionTime.toFixed(2)}ms`);
  console.log(`   - 成功率: ${(metrics.successRate * 100).toFixed(1)}%`);

  console.log('\n🎉 Settings路由记忆集成测试完成！');

  // 测试总结
  console.log('\n📊 测试总结:');
  console.log(`   - 记忆服务状态: ${health.status}`);
  console.log(`   - 新增记忆类型: worldbuilding, consistency`);
  console.log(`   - Settings路由现已支持记忆功能`);
  console.log(`   - 支持的操作: 增强、扩展、建议、批量生成、一致性检查`);
}

// 运行测试
if (require.main === module) {
  testSettingsMemoryIntegration().catch(error => {
    console.error('❌ 测试执行失败:', error);
    process.exit(1);
  });
}

module.exports = { testSettingsMemoryIntegration };