/**
 * Profile API 测试脚本
 * 测试所有个人资料相关的API端点
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// 测试配置
const timestamp = Date.now().toString().slice(-6); // 只用最后6位数字
const config = {
  testUser: {
    username: 'ptest' + timestamp, // 不超过20字符
    email: `ptest${timestamp}@example.com`,
    password: 'Test123456',
    nickname: 'Profile Tester'
  }
};

let sessionToken = '';
let userId = '';
let sessionId = '';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function logTest(message) {
  log(`\n🧪 ${message}`, 'yellow');
}

// API 请求辅助函数
async function apiRequest(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      headers: {}
    };

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data) {
      if (method === 'GET') {
        config.params = data;
      } else {
        config.data = data;
      }
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
}

// 测试函数
async function test1_register() {
  logTest('测试 1: 用户注册');

  const result = await apiRequest('POST', '/auth/register', config.testUser);

  if (result.success && result.data.user) {
    sessionToken = result.data.session.sessionToken;
    userId = result.data.user.id;
    logSuccess(`用户注册成功: ${result.data.user.username}`);
    logInfo(`用户ID: ${userId}`);
    logInfo(`Token: ${sessionToken.substring(0, 20)}...`);
    return true;
  } else {
    logError(`注册失败: ${JSON.stringify(result.error)}`);
    return false;
  }
}

async function test2_getProfile() {
  logTest('测试 2: 获取个人资料 (GET /auth/me)');

  const result = await apiRequest('GET', '/auth/me', null, sessionToken);

  if (result.success && result.data.user) {
    logSuccess(`获取个人资料成功`);
    logInfo(`用户名: ${result.data.user.username}`);
    logInfo(`昵称: ${result.data.user.nickname}`);
    logInfo(`邮箱: ${result.data.user.email}`);
    return true;
  } else {
    logError(`获取个人资料失败: ${JSON.stringify(result.error)}`);
    return false;
  }
}

async function test3_updateProfile() {
  logTest('测试 3: 更新个人资料 (PUT /auth/profile)');

  const updateData = {
    nickname: 'Updated Profile Tester'
  };

  const result = await apiRequest('PUT', '/auth/profile', updateData, sessionToken);

  if (result.success && result.data.user) {
    logSuccess(`个人资料更新成功`);
    logInfo(`新昵称: ${result.data.user.nickname}`);
    return true;
  } else {
    logError(`更新个人资料失败: ${JSON.stringify(result.error)}`);
    return false;
  }
}

async function test4_getUserStats() {
  logTest('测试 4: 获取用户统计 (GET /auth/stats)');

  const result = await apiRequest('GET', '/auth/stats', null, sessionToken);

  if (result.success && result.data.stats) {
    logSuccess(`获取用户统计成功`);
    logInfo(`小说数量: ${result.data.stats.novels}`);
    logInfo(`章节数量: ${result.data.stats.chapters}`);
    logInfo(`总字数: ${result.data.stats.totalWords}`);
    logInfo(`活跃会话: ${result.data.stats.activeSessions}`);
    logInfo(`最近活动: ${result.data.stats.recentActivity}`);
    return true;
  } else {
    logError(`获取用户统计失败: ${JSON.stringify(result.error)}`);
    return false;
  }
}

async function test5_getSessions() {
  logTest('测试 5: 获取会话列表 (GET /auth/sessions)');

  const result = await apiRequest('GET', '/auth/sessions', null, sessionToken);

  if (result.success && result.data.sessions) {
    logSuccess(`获取会话列表成功`);
    logInfo(`会话数量: ${result.data.sessions.length}`);

    result.data.sessions.forEach((session, index) => {
      logInfo(`会话 ${index + 1}: ${session.sessionToken} (当前: ${session.isCurrent})`);
      if (!session.isCurrent) {
        sessionId = session.id; // 保存一个非当前会话的ID用于后续测试
      }
    });
    return true;
  } else {
    logError(`获取会话列表失败: ${JSON.stringify(result.error)}`);
    return false;
  }
}

async function test6_getUserActivity() {
  logTest('测试 6: 获取用户活动记录 (GET /auth/activity)');

  const result = await apiRequest('GET', '/auth/activity', { page: 1, limit: 10 }, sessionToken);

  if (result.success && result.data.activities) {
    logSuccess(`获取用户活动记录成功`);
    logInfo(`活动数量: ${result.data.activities.length}`);
    return true;
  } else {
    logError(`获取用户活动记录失败: ${JSON.stringify(result.error)}`);
    return false;
  }
}

async function test7_checkAvailability() {
  logTest('测试 7: 检查用户名/邮箱可用性 (POST /auth/check-availability)');

  // 测试已存在的用户名
  const result1 = await apiRequest('POST', '/auth/check-availability', {
    username: config.testUser.username
  });

  if (result1.success && !result1.data.available) {
    logSuccess(`正确检测到用户名已存在`);
  } else {
    logError(`检查用户名可用性失败`);
    return false;
  }

  // 测试不存在的用户名
  const result2 = await apiRequest('POST', '/auth/check-availability', {
    username: 'nonexistent_user_12345'
  });

  if (result2.success && result2.data.available) {
    logSuccess(`正确检测到用户名可用`);
    return true;
  } else {
    logError(`检查用户名可用性失败`);
    return false;
  }
}

async function test8_changePassword() {
  logTest('测试 8: 修改密码 (PUT /auth/password)');

  const newPassword = 'NewTest123456';
  const result = await apiRequest('PUT', '/auth/password', {
    currentPassword: config.testUser.password,
    newPassword: newPassword
  }, sessionToken);

  if (result.success) {
    logSuccess(`密码修改成功`);
    config.testUser.password = newPassword; // 更新测试配置中的密码
    return true;
  } else {
    logError(`修改密码失败: ${JSON.stringify(result.error)}`);
    return false;
  }
}

async function test9_createSecondSession() {
  logTest('测试 9: 创建第二个会话');

  const result = await apiRequest('POST', '/auth/login', {
    identifier: config.testUser.username,
    password: config.testUser.password
  });

  if (result.success && result.data.session) {
    const secondSessionToken = result.data.session.sessionToken;
    logSuccess(`第二个会话创建成功`);
    logInfo(`新Token: ${secondSessionToken.substring(0, 20)}...`);

    // 获取会话列表验证
    const sessionsResult = await apiRequest('GET', '/auth/sessions', null, sessionToken);
    if (sessionsResult.success && sessionsResult.data.sessions.length >= 2) {
      logSuccess(`验证：现在有 ${sessionsResult.data.sessions.length} 个会话`);

      // 保存一个非当前会话的ID
      for (const session of sessionsResult.data.sessions) {
        if (!session.isCurrent) {
          sessionId = session.id;
          break;
        }
      }
      return true;
    }
  } else {
    logError(`创建第二个会话失败: ${JSON.stringify(result.error)}`);
    return false;
  }
}

async function test10_deleteSession() {
  logTest('测试 10: 删除特定会话 (DELETE /auth/sessions/:id)');

  if (!sessionId) {
    logError(`没有可删除的会话ID`);
    return false;
  }

  const result = await apiRequest('DELETE', `/auth/sessions/${sessionId}`, null, sessionToken);

  if (result.success) {
    logSuccess(`会话删除成功`);

    // 验证会话已删除
    const sessionsResult = await apiRequest('GET', '/auth/sessions', null, sessionToken);
    if (sessionsResult.success) {
      logInfo(`剩余会话数: ${sessionsResult.data.sessions.length}`);
    }
    return true;
  } else {
    logError(`删除会话失败: ${JSON.stringify(result.error)}`);
    return false;
  }
}

async function test11_logoutAll() {
  logTest('测试 11: 注销所有其他会话 (POST /auth/logout-all)');

  // 先创建几个新会话
  await apiRequest('POST', '/auth/login', {
    identifier: config.testUser.username,
    password: config.testUser.password
  });

  const result = await apiRequest('POST', '/auth/logout-all', null, sessionToken);

  if (result.success) {
    logSuccess(`所有其他会话已注销`);

    // 验证只剩当前会话
    const sessionsResult = await apiRequest('GET', '/auth/sessions', null, sessionToken);
    if (sessionsResult.success) {
      logInfo(`剩余会话数: ${sessionsResult.data.sessions.length}`);
    }
    return true;
  } else {
    logError(`注销所有会话失败: ${JSON.stringify(result.error)}`);
    return false;
  }
}

async function test12_deleteAccount() {
  logTest('测试 12: 删除账户 (DELETE /auth/account)');

  const result = await apiRequest('DELETE', '/auth/account', {
    password: config.testUser.password
  }, sessionToken);

  if (result.success) {
    logSuccess(`账户删除成功`);

    // 验证账户已删除（尝试登录应该失败）
    const loginResult = await apiRequest('POST', '/auth/login', {
      identifier: config.testUser.username,
      password: config.testUser.password
    });

    if (!loginResult.success) {
      logSuccess(`验证：账户确实已删除`);
    }
    return true;
  } else {
    logError(`删除账户失败: ${JSON.stringify(result.error)}`);
    return false;
  }
}

// 运行所有测试
async function runAllTests() {
  log('\n========================================', 'blue');
  log('   Profile API 完整测试套件', 'blue');
  log('========================================\n', 'blue');

  const tests = [
    { name: '用户注册', fn: test1_register },
    { name: '获取个人资料', fn: test2_getProfile },
    { name: '更新个人资料', fn: test3_updateProfile },
    { name: '获取用户统计', fn: test4_getUserStats },
    { name: '获取会话列表', fn: test5_getSessions },
    { name: '获取用户活动', fn: test6_getUserActivity },
    { name: '检查可用性', fn: test7_checkAvailability },
    { name: '修改密码', fn: test8_changePassword },
    { name: '创建第二个会话', fn: test9_createSecondSession },
    { name: '删除特定会话', fn: test10_deleteSession },
    { name: '注销所有会话', fn: test11_logoutAll },
    { name: '删除账户', fn: test12_deleteAccount }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const result = await test.fn();
    if (result) {
      passed++;
    } else {
      failed++;
    }
    await new Promise(resolve => setTimeout(resolve, 500)); // 延迟500ms
  }

  log('\n========================================', 'blue');
  log('   测试结果汇总', 'blue');
  log('========================================\n', 'blue');
  log(`✅ 通过: ${passed}`, 'green');
  log(`❌ 失败: ${failed}`, 'red');
  log(`📊 总计: ${tests.length}\n`, 'cyan');

  if (failed === 0) {
    log('🎉 所有测试通过！Profile模块功能完整！', 'green');
  } else {
    log('⚠️  部分测试失败，请检查失败的测试项', 'red');
  }
}

// 执行测试
runAllTests().catch(error => {
  logError(`测试执行出错: ${error.message}`);
  console.error(error);
  process.exit(1);
});
