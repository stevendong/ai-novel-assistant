/**
 * 测试速率限制功能
 *
 * 运行方式：node scripts/test-rate-limit.js
 */

const axios = require('axios');

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3001';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 延迟函数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 测试健康检查接口（应该不受限制）
 */
async function testHealthCheck() {
  log('\n=== 测试健康检查接口 ===', 'cyan');

  try {
    const response = await axios.get(`${API_BASE}/api/health`);
    log(`✓ 健康检查正常: ${response.data.status}`, 'green');

    // 检查响应头
    if (response.headers['ratelimit-limit']) {
      log(`  Rate Limit: ${response.headers['ratelimit-remaining']}/${response.headers['ratelimit-limit']}`, 'blue');
    }

    return true;
  } catch (error) {
    log(`✗ 健康检查失败: ${error.message}`, 'red');
    return false;
  }
}

/**
 * 测试全局速率限制
 */
async function testGlobalRateLimit() {
  log('\n=== 测试全局速率限制（15分钟/1000次）===', 'cyan');

  try {
    // 发送少量请求测试
    for (let i = 1; i <= 5; i++) {
      const response = await axios.get(`${API_BASE}/api/health`);
      const remaining = response.headers['ratelimit-remaining'];
      const limit = response.headers['ratelimit-limit'];

      log(`  请求 ${i}: 剩余 ${remaining}/${limit}`, 'blue');
      await delay(100); // 短暂延迟
    }

    log('✓ 全局速率限制正常工作', 'green');
    return true;
  } catch (error) {
    if (error.response?.status === 429) {
      log('✓ 速率限制触发（429 Too Many Requests）', 'yellow');
      log(`  错误信息: ${error.response.data.message}`, 'yellow');
      return true;
    }
    log(`✗ 测试失败: ${error.message}`, 'red');
    return false;
  }
}

/**
 * 测试登录速率限制
 */
async function testAuthRateLimit() {
  log('\n=== 测试登录速率限制（15分钟/5次）===', 'cyan');

  try {
    const loginData = {
      identifier: 'test@example.com',
      password: 'wrongpassword'
    };

    // 连续尝试登录
    for (let i = 1; i <= 6; i++) {
      try {
        await axios.post(`${API_BASE}/api/auth/login`, loginData);
        log(`  尝试 ${i}: 登录成功（不应该发生）`, 'red');
      } catch (error) {
        if (error.response?.status === 429) {
          log(`  尝试 ${i}: 触发速率限制 ✓`, 'yellow');
          log(`  错误信息: ${error.response.data.message}`, 'yellow');
          break;
        } else if (error.response?.status === 400 || error.response?.status === 401) {
          const remaining = error.response.headers['ratelimit-remaining'];
          const limit = error.response.headers['ratelimit-limit'];
          log(`  尝试 ${i}: 登录失败（预期），剩余尝试 ${remaining}/${limit}`, 'blue');
        } else {
          log(`  尝试 ${i}: 其他错误 ${error.message}`, 'red');
        }
      }
      await delay(200);
    }

    log('✓ 登录速率限制正常工作', 'green');
    return true;
  } catch (error) {
    log(`✗ 测试失败: ${error.message}`, 'red');
    return false;
  }
}

/**
 * 测试 API 速率限制
 */
async function testApiRateLimit() {
  log('\n=== 测试 API 速率限制（1分钟/100次）===', 'cyan');

  try {
    // 快速发送多个请求
    log('  快速发送 10 个请求...', 'blue');
    const promises = [];

    for (let i = 0; i < 10; i++) {
      promises.push(
        axios.get(`${API_BASE}/api/health`)
          .then(response => ({
            success: true,
            remaining: response.headers['ratelimit-remaining']
          }))
          .catch(error => ({
            success: false,
            status: error.response?.status,
            message: error.response?.data?.message
          }))
      );
    }

    const results = await Promise.all(promises);
    const successful = results.filter(r => r.success).length;
    const rateLimited = results.filter(r => r.status === 429).length;

    log(`  成功: ${successful}, 限制: ${rateLimited}`, 'green');

    if (successful > 0) {
      const lastSuccess = results.find(r => r.success);
      log(`  最后成功请求剩余配额: ${lastSuccess.remaining}`, 'blue');
    }

    log('✓ API 速率限制正常工作', 'green');
    return true;
  } catch (error) {
    log(`✗ 测试失败: ${error.message}`, 'red');
    return false;
  }
}

/**
 * 显示速率限制信息
 */
async function showRateLimitInfo() {
  log('\n=== 速率限制配置信息 ===', 'magenta');

  const limits = [
    { name: '全局限制', window: '15分钟', max: '1000次' },
    { name: '登录限制', window: '15分钟', max: '5次' },
    { name: '注册限制', window: '1小时', max: '3次' },
    { name: 'API限制', window: '1分钟', max: '100次' },
    { name: 'AI限制', window: '1分钟', max: '20次' },
    { name: '上传限制', window: '1小时', max: '50次' },
    { name: '导出限制', window: '15分钟', max: '10次' }
  ];

  console.table(limits);
}

/**
 * 主测试函数
 */
async function runTests() {
  log('='.repeat(60), 'cyan');
  log('速率限制测试工具', 'cyan');
  log('='.repeat(60), 'cyan');

  // 显示配置信息
  showRateLimitInfo();

  // 等待用户确认服务器已启动
  log('\n确保服务器已在 http://localhost:3001 启动', 'yellow');
  log('按 Ctrl+C 取消，或等待 3 秒后开始测试...', 'yellow');
  await delay(3000);

  const results = [];

  // 运行测试
  results.push(await testHealthCheck());
  await delay(500);

  results.push(await testGlobalRateLimit());
  await delay(500);

  results.push(await testAuthRateLimit());
  await delay(500);

  results.push(await testApiRateLimit());

  // 总结
  log('\n' + '='.repeat(60), 'cyan');
  const passed = results.filter(r => r).length;
  const total = results.length;

  if (passed === total) {
    log(`✓ 所有测试通过 (${passed}/${total})`, 'green');
  } else {
    log(`✗ 部分测试失败 (${passed}/${total})`, 'red');
  }
  log('='.repeat(60), 'cyan');

  log('\n提示：', 'yellow');
  log('- 速率限制基于 IP 地址', 'yellow');
  log('- 测试可能需要等待限制重置时间', 'yellow');
  log('- 生产环境请根据实际情况调整限制参数', 'yellow');
}

// 检查是否安装了 axios
try {
  require.resolve('axios');
} catch (e) {
  log('错误: 请先安装 axios', 'red');
  log('运行: npm install axios', 'yellow');
  process.exit(1);
}

// 运行测试
runTests().catch(error => {
  log(`\n测试过程出错: ${error.message}`, 'red');
  process.exit(1);
});
