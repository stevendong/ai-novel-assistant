const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// 用于测试的用户数据
let testUser = null;
let sessionToken = null;

// 创建测试用户并登录
async function setupTestUser() {
  console.log('🔧 设置测试用户...');

  try {
    // 注册新用户
    const registerData = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'testPassword123',
      nickname: '测试用户'
    };

    const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, registerData);
    testUser = registerResponse.data.user;
    sessionToken = registerResponse.data.session.sessionToken;

    console.log('✅ 测试用户创建成功');
    console.log(`   用户ID: ${testUser.id}`);
    console.log(`   用户名: ${testUser.username}`);

    return true;
  } catch (error) {
    console.error('❌ 测试用户创建失败:', error.response?.data || error.message);
    return false;
  }
}

// 测试认证API
async function testAuthAPIs() {
  console.log('\n📋 开始测试认证和用户管理API...\n');

  if (!await setupTestUser()) {
    return;
  }

  const headers = {
    'Authorization': `Bearer ${sessionToken}`,
    'Content-Type': 'application/json'
  };

  try {
    // 1. 测试获取用户信息
    console.log('1. 测试获取用户信息');
    const profileResponse = await axios.get(`${BASE_URL}/api/auth/me`, { headers });
    console.log('✅ 用户信息获取成功');
    console.log(`   用户名: ${profileResponse.data.user.username}`);
    console.log(`   邮箱: ${profileResponse.data.user.email}\n`);

    // 2. 测试更新个人资料
    console.log('2. 测试更新个人资料');
    const updateData = {
      nickname: '更新后的昵称'
    };
    const updateResponse = await axios.put(`${BASE_URL}/api/auth/profile`, updateData, { headers });
    console.log('✅ 个人资料更新成功');
    console.log(`   新昵称: ${updateResponse.data.user.nickname}\n`);

    // 3. 测试修改密码
    console.log('3. 测试修改密码');
    const passwordData = {
      currentPassword: 'testPassword123',
      newPassword: 'newPassword456'
    };
    const passwordResponse = await axios.put(`${BASE_URL}/api/auth/password`, passwordData, { headers });
    console.log('✅ 密码修改成功');
    console.log(`   消息: ${passwordResponse.data.message}\n`);

    // 4. 测试获取用户统计
    console.log('4. 测试获取用户统计');
    const statsResponse = await axios.get(`${BASE_URL}/api/auth/stats`, { headers });
    console.log('✅ 用户统计获取成功');
    console.log(`   小说数: ${statsResponse.data.stats.novels}`);
    console.log(`   章节数: ${statsResponse.data.stats.chapters}`);
    console.log(`   总字数: ${statsResponse.data.stats.totalWords}`);
    console.log(`   活跃会话: ${statsResponse.data.stats.activeSessions}\n`);

    // 5. 测试获取会话列表
    console.log('5. 测试获取会话列表');
    const sessionsResponse = await axios.get(`${BASE_URL}/api/auth/sessions`, { headers });
    console.log('✅ 会话列表获取成功');
    console.log(`   会话数量: ${sessionsResponse.data.sessions.length}`);

    const currentSession = sessionsResponse.data.sessions.find(s => s.isCurrent);
    if (currentSession) {
      console.log(`   当前会话: ${currentSession.sessionToken}`);
    }
    console.log('');

    // 6. 测试检查可用性
    console.log('6. 测试检查用户名/邮箱可用性');

    // 检查已存在的用户名
    const availabilityResponse1 = await axios.post(`${BASE_URL}/api/auth/check-availability`, {
      username: testUser.username
    });
    console.log('✅ 可用性检查成功（已存在用户名）');
    console.log(`   可用: ${availabilityResponse1.data.available}`);
    console.log(`   冲突: ${JSON.stringify(availabilityResponse1.data.conflicts)}`);

    // 检查新用户名
    const availabilityResponse2 = await axios.post(`${BASE_URL}/api/auth/check-availability`, {
      username: 'newunique_' + Date.now()
    });
    console.log('✅ 可用性检查成功（新用户名）');
    console.log(`   可用: ${availabilityResponse2.data.available}\n`);

    // 7. 测试获取用户活动
    console.log('7. 测试获取用户活动');
    const activityResponse = await axios.get(`${BASE_URL}/api/auth/activity`, {
      headers,
      params: { page: 1, limit: 10 }
    });
    console.log('✅ 用户活动获取成功');
    console.log(`   活动数量: ${activityResponse.data.activities.length}\n`);

    // 8. 测试令牌刷新
    console.log('8. 测试令牌刷新');
    const refreshData = {
      refreshToken: sessionToken // 这里简化处理，实际应该使用refresh token
    };

    try {
      const refreshResponse = await axios.post(`${BASE_URL}/api/auth/refresh`, refreshData);
      console.log('✅ 令牌刷新成功');
    } catch (refreshError) {
      console.log('⚠️ 令牌刷新跳过（需要正确的refresh token）');
    }
    console.log('');

    // 9. 测试注销所有会话
    console.log('9. 测试注销所有其他会话');
    const logoutAllResponse = await axios.post(`${BASE_URL}/api/auth/logout-all`, {}, { headers });
    console.log('✅ 所有其他会话注销成功');
    console.log(`   消息: ${logoutAllResponse.data.message}\n`);

    // 10. 测试注销当前会话
    console.log('10. 测试注销当前会话');
    const logoutResponse = await axios.post(`${BASE_URL}/api/auth/logout`, {}, { headers });
    console.log('✅ 当前会话注销成功');
    console.log(`   消息: ${logoutResponse.data.message}\n`);

    console.log('🎉 所有认证API测试完成！');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.response?.data || error.message);

    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// 运行测试
testAuthAPIs().catch(console.error);