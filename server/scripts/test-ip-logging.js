/**
 * IP地址记录测试脚本
 * 测试登录会话是否正确记录IP地址
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// 测试用户
const testUser = {
  username: 'iptest_' + Date.now().toString().slice(-6),
  email: `iptest${Date.now().toString().slice(-6)}@example.com`,
  password: 'Test123456',
  nickname: 'IP Test User'
};

let sessionToken = '';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function runTest() {
  try {
    log('\n========================================', 'cyan');
    log('   IP地址记录测试', 'cyan');
    log('========================================\n', 'cyan');

    // 1. 注册用户
    log('📝 步骤 1: 注册测试用户...', 'yellow');
    const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, testUser);

    if (!registerResponse.data.session) {
      throw new Error('注册失败');
    }

    sessionToken = registerResponse.data.session.sessionToken;
    log('✅ 用户注册成功', 'green');
    log(`   用户名: ${testUser.username}`, 'cyan');

    // 2. 获取会话列表
    log('\n📝 步骤 2: 获取会话列表...', 'yellow');
    const sessionsResponse = await axios.get(`${API_BASE_URL}/auth/sessions`, {
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      }
    });

    if (!sessionsResponse.data.sessions || sessionsResponse.data.sessions.length === 0) {
      throw new Error('未找到会话记录');
    }

    const session = sessionsResponse.data.sessions[0];

    log('✅ 成功获取会话信息', 'green');
    log('\n📊 会话详情:', 'cyan');
    log(`   会话ID: ${session.id}`, 'cyan');
    log(`   IP地址: ${session.ipAddress || '未记录'}`, session.ipAddress ? 'green' : 'red');
    log(`   User-Agent: ${session.userAgent || '未记录'}`, session.userAgent ? 'green' : 'red');
    log(`   创建时间: ${new Date(session.createdAt).toLocaleString('zh-CN')}`, 'cyan');
    log(`   最后使用: ${new Date(session.lastUsed).toLocaleString('zh-CN')}`, 'cyan');

    // 3. 验证结果
    log('\n📝 步骤 3: 验证IP地址记录...', 'yellow');

    if (!session.ipAddress) {
      log('❌ 失败：IP地址未被记录', 'red');
      log('   原因：ipAddress字段为空', 'red');
      return false;
    }

    if (session.ipAddress === 'null' || session.ipAddress === 'undefined') {
      log('❌ 失败：IP地址值无效', 'red');
      log(`   值：${session.ipAddress}`, 'red');
      return false;
    }

    log('✅ 成功：IP地址已正确记录', 'green');
    log(`   记录的IP: ${session.ipAddress}`, 'green');

    // 4. 清理测试数据
    log('\n📝 步骤 4: 清理测试数据...', 'yellow');
    await axios.delete(`${API_BASE_URL}/auth/account`, {
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      },
      data: {
        password: testUser.password
      }
    });
    log('✅ 测试用户已删除', 'green');

    log('\n========================================', 'cyan');
    log('   ✅ 测试通过！', 'green');
    log('   IP地址记录功能正常工作', 'green');
    log('========================================\n', 'cyan');

    return true;

  } catch (error) {
    log('\n========================================', 'red');
    log('   ❌ 测试失败', 'red');
    log('========================================\n', 'red');

    if (error.response) {
      log(`状态码: ${error.response.status}`, 'red');
      log(`错误信息: ${JSON.stringify(error.response.data)}`, 'red');
    } else {
      log(`错误信息: ${error.message}`, 'red');
    }

    return false;
  }
}

// 运行测试
runTest()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('未捕获的错误:', error);
    process.exit(1);
  });
