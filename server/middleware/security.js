const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const helmet = require('helmet');

/**
 * Helmet 安全配置
 * 设置各种 HTTP 响应头来增强安全性
 */
const helmetConfig = helmet({
  // Content Security Policy - 防止 XSS 攻击
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  // DNS Prefetch Control - 控制浏览器的 DNS 预取
  dnsPrefetchControl: { allow: false },
  // 强制 HTTPS
  hsts: {
    maxAge: 31536000, // 1年
    includeSubDomains: true,
    preload: true
  },
  // 隐藏 X-Powered-By 头
  hidePoweredBy: true,
  // 防止点击劫持
  frameguard: { action: 'deny' },
  // 防止 MIME 类型嗅探
  noSniff: true,
  // XSS 过滤器
  xssFilter: true,
  // Referrer Policy
  referrerPolicy: { policy: 'same-origin' }
});

/**
 * 全局速率限制 - 防止暴力攻击和 DDOS
 * 限制每个 IP 在时间窗口内的请求数量
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟时间窗口
  max: 10000, // 每个IP在窗口期内最多1000个请求
  message: {
    error: 'Too Many Requests',
    message: '请求过于频繁，请稍后再试',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true, // 返回 rate limit 信息在 `RateLimit-*` headers
  legacyHeaders: false, // 禁用 `X-RateLimit-*` headers
  // 跳过成功的请求
  skipSuccessfulRequests: false,
  // 跳过失败的请求
  skipFailedRequests: false
  // 使用默认的 keyGenerator (会自动处理 IPv6)
});

/**
 * 严格的认证接口速率限制
 * 防止暴力破解登录
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 15, // 每个IP最多5次尝试
  skipSuccessfulRequests: true, // 登录成功不计入限制
  message: {
    error: 'Too Many Login Attempts',
    message: '登录尝试次数过多，请15分钟后再试',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
  // 使用默认的基于 IP 的限制（更安全）
});

/**
 * API 接口速率限制
 * 比全局限制更严格，保护核心 API
 */
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分钟
  max: 1000, // 每个IP每分钟最多100个请求
  message: {
    error: 'API Rate Limit Exceeded',
    message: 'API请求过于频繁，请稍后再试',
    code: 'API_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * AI 接口速率限制
 * AI 接口通常比较耗资源，需要更严格的限制
 */
const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分钟
  max: 200, // 每个IP每分钟最多20个AI请求
  message: {
    error: 'AI Rate Limit Exceeded',
    message: 'AI请求过于频繁，请稍后再试',
    code: 'AI_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * 速度降低中间件
 * 当请求频率过高时，逐渐降低响应速度而不是完全拒绝
 */
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15分钟
  delayAfter: 500, // 500个请求后开始延迟
  // delayMs 现在是一个函数，实现渐进式延迟
  // 每超过阈值一个请求，增加 500ms 延迟
  delayMs: (used, req) => {
    const delayAfter = req.slowDown.limit;
    return (used - delayAfter) * 500;
  },
  maxDelayMs: 5000, // 最大延迟5秒
  skipFailedRequests: false,
  skipSuccessfulRequests: false
  // 使用默认的 keyGenerator (会自动处理 IPv6)
});

/**
 * 文件上传速率限制
 * 防止滥用上传功能
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 500, // 每个IP每小时最多50次上传
  message: {
    error: 'Upload Rate Limit Exceeded',
    message: '上传次数过多，请1小时后再试',
    code: 'UPLOAD_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * 注册接口速率限制
 * 防止恶意批量注册
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 30, // 每个IP每小时最多3次注册
  message: {
    error: 'Registration Rate Limit Exceeded',
    message: '注册次数过多，请1小时后再试',
    code: 'REGISTER_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false
});

/**
 * 导出功能速率限制
 * 导出通常较耗资源
 */
const exportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP每15分钟最多10次导出
  message: {
    error: 'Export Rate Limit Exceeded',
    message: '导出次数过多，请稍后再试',
    code: 'EXPORT_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  helmetConfig,
  globalLimiter,
  authLimiter,
  apiLimiter,
  aiLimiter,
  speedLimiter,
  uploadLimiter,
  registerLimiter,
  exportLimiter
};
