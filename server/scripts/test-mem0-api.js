#!/usr/bin/env node

/**
 * 测试最新的Mem0 API用法
 */

const { MemoryClient } = require('mem0ai');

async function testMem0API() {
  console.log('🧪 测试Mem0 API...\n');

  // 使用配置的API密钥
  const apiKey = process.env.MEM0_API_KEY;

  if (!apiKey) {
    console.log('❌ MEM0_API_KEY 未配置');
    return;
  }

  try {
    // 初始化客户端
    const client = new MemoryClient({
      apiKey: apiKey
    });

    console.log('✅ MemoryClient 初始化成功');

    // 测试ping
    console.log('\n1️⃣ 测试连接...');
    try {
      await client.ping();
      console.log('✅ Ping成功 - 连接正常');
    } catch (error) {
      console.log('❌ Ping失败:', error.message);
      return;
    }

    // 测试添加记忆
    console.log('\n2️⃣ 测试添加记忆...');
    const testMessages = [
      {
        role: "user",
        content: "我的名字是张三，我喜欢科幻小说，特别是有关时间旅行的故事。"
      }
    ];

    const testUserId = 'test-user-' + Date.now();

    try {
      const addResult = await client.add(testMessages, {
        user_id: testUserId
      });
      console.log('✅ 记忆添加成功:', addResult);
    } catch (error) {
      console.log('❌ 添加记忆失败:', error.message);
      return;
    }

    // 等待一下让记忆生效
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 测试搜索记忆
    console.log('\n3️⃣ 测试搜索记忆...');
    try {
      const searchResult = await client.search("用户喜欢什么类型的小说？", {
        user_id: testUserId,
        limit: 5
      });
      console.log('✅ 记忆搜索成功:', searchResult);
    } catch (error) {
      console.log('❌ 搜索记忆失败:', error.message);
    }

    // 测试获取所有记忆
    console.log('\n4️⃣ 测试获取所有记忆...');
    try {
      const allMemories = await client.getAll({
        user_id: testUserId,
        limit: 10
      });
      console.log('✅ 获取所有记忆成功:', allMemories);
    } catch (error) {
      console.log('❌ 获取所有记忆失败:', error.message);
    }

    console.log('\n🎉 Mem0 API测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
if (require.main === module) {
  testMem0API().catch(console.error);
}

module.exports = { testMem0API };
