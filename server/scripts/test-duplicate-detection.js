/**
 * 测试重复请求检测功能
 *
 * 运行方式：node scripts/test-duplicate-detection.js
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

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 测试1：快速连续发送相同请求
 */
async function testRapidDuplicates() {
  log('\n=== 测试1: 快速连续发送相同请求 ===', 'cyan');

  const requests = [];
  const startTime = Date.now();

  // 在100ms内发送5个相同请求
  for (let i = 0; i < 5; i++) {
    requests.push(
      axios.get(`${API_BASE}/api/health`)
        .then(response => ({
          index: i,
          success: true,
          timestamp: Date.now() - startTime,
          duplicateWarning: response.headers['x-duplicate-warning'],
          duplicateCount: response.headers['x-duplicate-count']
        }))
        .catch(error => ({
          index: i,
          success: false,
          timestamp: Date.now() - startTime,
          error: error.message
        }))
    );
  }

  const results = await Promise.all(requests);

  log('  请求结果:', 'blue');
  results.forEach(result => {
    const warningMsg = result.duplicateWarning ?
      ` [重复警告! 计数: ${result.duplicateCount}]` : '';
    const color = result.duplicateWarning ? 'yellow' : 'green';
    log(`    请求 ${result.index + 1}: ${result.timestamp}ms${warningMsg}`, color);
  });

  const duplicates = results.filter(r => r.duplicateWarning).length;
  if (duplicates > 0) {
    log(`  ✓ 检测到 ${duplicates} 个重复请求`, 'green');
  } else {
    log(`  ✗ 未检测到重复请求（可能中间件未启用）`, 'yellow');
  }

  return duplicates > 0;
}

/**
 * 测试2: 不同的请求不应被标记为重复
 */
async function testDifferentRequests() {
  log('\n=== 测试2: 不同的请求不应被标记为重复 ===', 'cyan');

  const requests = [
    axios.get(`${API_BASE}/api/health`),
    axios.get(`${API_BASE}/api/ai/status`),
    axios.get(`${API_BASE}/api/health?timestamp=${Date.now()}`),
  ];

  try {
    const results = await Promise.all(
      requests.map((req, i) =>
        req.then(response => ({
          index: i,
          duplicateWarning: response.headers['x-duplicate-warning']
        }))
      )
    );

    const duplicates = results.filter(r => r.duplicateWarning).length;

    if (duplicates === 0) {
      log('  ✓ 不同请求正确处理，未被标记为重复', 'green');
      return true;
    } else {
      log(`  ✗ 检测到 ${duplicates} 个错误的重复标记`, 'red');
      return false;
    }
  } catch (error) {
    log(`  ✗ 测试失败: ${error.message}`, 'red');
    return false;
  }
}

/**
 * 测试3: 时间窗口外的请求不应被标记为重复
 */
async function testTimeWindow() {
  log('\n=== 测试3: 时间窗口外的请求不应被标记为重复 ===', 'cyan');

  log('  发送第一个请求...', 'blue');
  const first = await axios.get(`${API_BASE}/api/health`);
  const firstWarning = first.headers['x-duplicate-warning'];

  log('  等待1.5秒（超过检测窗口）...', 'blue');
  await delay(1500);

  log('  发送第二个相同请求...', 'blue');
  const second = await axios.get(`${API_BASE}/api/health`);
  const secondWarning = second.headers['x-duplicate-warning'];

  if (!firstWarning && !secondWarning) {
    log('  ✓ 时间窗口外的请求未被标记为重复', 'green');
    return true;
  } else {
    log(`  ✗ 请求被错误标记为重复`, 'red');
    return false;
  }
}

/**
 * 测试4: POST请求体不同时不应被标记为重复
 */
async function testPostWithDifferentBody() {
  log('\n=== 测试4: POST请求体不同时不应被标记为重复 ===', 'cyan');

  const requests = [
    axios.post(`${API_BASE}/api/auth/login`, {
      identifier: 'test1@example.com',
      password: 'password1'
    }),
    axios.post(`${API_BASE}/api/auth/login`, {
      identifier: 'test2@example.com',
      password: 'password2'
    })
  ];

  try {
    const results = await Promise.all(
      requests.map((req, i) =>
        req.catch(error => ({
          index: i,
          duplicateWarning: error.response?.headers['x-duplicate-warning']
        }))
      )
    );

    const duplicates = results.filter(r => r.duplicateWarning).length;

    if (duplicates === 0) {
      log('  ✓ 不同请求体的POST请求正确处理', 'green');
      return true;
    } else {
      log(`  ✗ 检测到 ${duplicates} 个错误的重复标记`, 'red');
      return false;
    }
  } catch (error) {
    log(`  ✗ 测试失败: ${error.message}`, 'red');
    return false;
  }
}

/**
 * 测试5: 相同POST请求应被检测
 */
async function testDuplicatePost() {
  log('\n=== 测试5: 相同POST请求应被检测 ===', 'cyan');

  const requestData = {
    identifier: 'duplicate@example.com',
    password: 'testpassword'
  };

  const requests = [];
  const startTime = Date.now();

  // 快速发送3个相同的POST请求
  for (let i = 0; i < 3; i++) {
    requests.push(
      axios.post(`${API_BASE}/api/auth/login`, requestData)
        .catch(error => ({
          index: i,
          timestamp: Date.now() - startTime,
          duplicateWarning: error.response?.headers['x-duplicate-warning'],
          duplicateCount: error.response?.headers['x-duplicate-count']
        }))
    );
  }

  const results = await Promise.all(requests);

  log('  请求结果:', 'blue');
  results.forEach(result => {
    const warningMsg = result.duplicateWarning ?
      ` [重复警告! 计数: ${result.duplicateCount}]` : '';
    const color = result.duplicateWarning ? 'yellow' : 'green';
    log(`    请求 ${result.index + 1}: ${result.timestamp}ms${warningMsg}`, color);
  });

  const duplicates = results.filter(r => r.duplicateWarning).length;
  if (duplicates > 0) {
    log(`  ✓ 检测到 ${duplicates} 个重复POST请求`, 'green');
    return true;
  } else {
    log(`  ✗ 未检测到重复POST请求`, 'yellow');
    return false;
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  log('='.repeat(60), 'cyan');
  log('重复请求检测测试工具', 'cyan');
  log('='.repeat(60), 'cyan');

  log('\n确保服务器已在 http://localhost:3001 启动', 'yellow');
  log('并且启用了重复请求检测中间件', 'yellow');
  log('等待 2 秒后开始测试...', 'yellow');
  await delay(2000);

  const results = [];

  // 运行所有测试
  results.push(await testRapidDuplicates());
  await delay(2000); // 等待缓存清理

  results.push(await testDifferentRequests());
  await delay(2000);

  results.push(await testTimeWindow());
  await delay(2000);

  results.push(await testPostWithDifferentBody());
  await delay(2000);

  results.push(await testDuplicatePost());

  // 总结
  log('\n' + '='.repeat(60), 'cyan');
  const passed = results.filter(r => r).length;
  const total = results.length;

  if (passed === total) {
    log(`✓ 所有测试通过 (${passed}/${total})`, 'green');
  } else {
    log(`部分测试通过 (${passed}/${total})`, 'yellow');
  }
  log('='.repeat(60), 'cyan');

  log('\n提示：', 'yellow');
  log('- 如果所有测试都未检测到重复，可能中间件未启用', 'yellow');
  log('- 在 server/index.js 中添加重复检测中间件', 'yellow');
  log('- 查看服务器日志了解详细的重复请求信息', 'yellow');
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
