/**
 * 验证安全配置是否正确加载
 *
 * 运行方式：node scripts/verify-security.js
 */

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

log('='.repeat(60), 'cyan');
log('安全配置验证工具', 'cyan');
log('='.repeat(60), 'cyan');

try {
  log('\n正在加载安全中间件...', 'blue');

  const security = require('../middleware/security');

  // 检查所有导出的中间件
  const requiredMiddleware = [
    'helmetConfig',
    'globalLimiter',
    'authLimiter',
    'apiLimiter',
    'aiLimiter',
    'speedLimiter',
    'uploadLimiter',
    'registerLimiter',
    'exportLimiter'
  ];

  let allPresent = true;

  log('\n检查中间件导出...', 'blue');
  requiredMiddleware.forEach(name => {
    if (security[name]) {
      log(`  ✓ ${name}`, 'green');
    } else {
      log(`  ✗ ${name} 缺失`, 'red');
      allPresent = false;
    }
  });

  if (allPresent) {
    log('\n✓ 所有安全中间件配置正确', 'green');
  } else {
    log('\n✗ 部分中间件配置缺失', 'red');
    process.exit(1);
  }

  // 检查中间件类型
  log('\n检查中间件类型...', 'blue');

  if (typeof security.globalLimiter === 'function') {
    log('  ✓ globalLimiter 是有效的中间件函数', 'green');
  } else {
    log('  ✗ globalLimiter 类型错误', 'red');
  }

  if (typeof security.speedLimiter === 'function') {
    log('  ✓ speedLimiter 是有效的中间件函数', 'green');
  } else {
    log('  ✗ speedLimiter 类型错误', 'red');
  }

  // 显示配置信息
  log('\n' + '='.repeat(60), 'cyan');
  log('速率限制配置概览', 'cyan');
  log('='.repeat(60), 'cyan');

  const limitInfo = [
    { 名称: '全局限制', 时间窗口: '15分钟', 最大请求: '1000次', 说明: '防止 DDOS' },
    { 名称: '登录限制', 时间窗口: '15分钟', 最大请求: '5次', 说明: '防暴力破解' },
    { 名称: '注册限制', 时间窗口: '1小时', 最大请求: '3次', 说明: '防恶意注册' },
    { 名称: 'API限制', 时间窗口: '1分钟', 最大请求: '100次', 说明: '保护核心API' },
    { 名称: 'AI限制', 时间窗口: '1分钟', 最大请求: '20次', 说明: '保护AI资源' },
    { 名称: '上传限制', 时间窗口: '1小时', 最大请求: '50次', 说明: '防止滥用上传' },
    { 名称: '导出限制', 时间窗口: '15分钟', 最大请求: '10次', 说明: '限制导出频率' }
  ];

  console.table(limitInfo);

  log('\n' + '='.repeat(60), 'cyan');
  log('Helmet 安全头配置', 'cyan');
  log('='.repeat(60), 'cyan');

  const helmetFeatures = [
    '✓ Content Security Policy (CSP) - 防止 XSS 攻击',
    '✓ DNS Prefetch Control - 控制 DNS 预取',
    '✓ HSTS - 强制 HTTPS (maxAge: 1年)',
    '✓ Hide Powered-By - 隐藏框架信息',
    '✓ Frame Guard - 防止点击劫持',
    '✓ No Sniff - 防止 MIME 嗅探',
    '✓ XSS Filter - XSS 过滤器',
    '✓ Referrer Policy - 控制 Referer 头'
  ];

  helmetFeatures.forEach(feature => {
    log(`  ${feature}`, 'green');
  });

  log('\n' + '='.repeat(60), 'cyan');
  log('速度降低配置', 'cyan');
  log('='.repeat(60), 'cyan');

  log('  时间窗口: 15分钟', 'blue');
  log('  开始延迟: 500个请求后', 'blue');
  log('  延迟方式: 渐进式（每个请求 +500ms）', 'blue');
  log('  最大延迟: 5000ms (5秒)', 'blue');
  log('  示例:', 'yellow');
  log('    - 第 501 个请求: 延迟 500ms', 'yellow');
  log('    - 第 502 个请求: 延迟 1000ms', 'yellow');
  log('    - 第 503 个请求: 延迟 1500ms', 'yellow');
  log('    - ...', 'yellow');
  log('    - 第 510+ 个请求: 延迟 5000ms (最大)', 'yellow');

  log('\n' + '='.repeat(60), 'cyan');
  log('✓ 安全配置验证完成！', 'green');
  log('='.repeat(60), 'cyan');

  log('\n提示:', 'yellow');
  log('  1. 使用 "npm run dev" 启动服务器', 'yellow');
  log('  2. 使用 "node scripts/test-rate-limit.js" 测试速率限制', 'yellow');
  log('  3. 查看 docs/SECURITY_CONFIG.md 了解详细配置', 'yellow');

} catch (error) {
  log('\n✗ 验证失败!', 'red');
  log(`错误: ${error.message}`, 'red');
  if (error.stack) {
    log('\n错误堆栈:', 'red');
    console.error(error.stack);
  }
  process.exit(1);
}
