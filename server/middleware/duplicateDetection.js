const logger = require('../utils/logger');

/**
 * 重复请求检测中间件
 * 检测在短时间内发送的完全相同的请求
 */

class DuplicateRequestDetector {
  constructor(options = {}) {
    // 配置选项
    this.windowMs = options.windowMs || 1000; // 检测窗口时间（默认1秒）
    this.maxDuplicates = options.maxDuplicates || 2; // 允许的重复次数
    this.excludeUrls = options.excludeUrls || []; // 排除的URL模式
    this.includeBody = options.includeBody !== false; // 是否包含请求体比较

    // 请求缓存：key -> { count, firstSeen, lastSeen }
    this.requestCache = new Map();

    // 定期清理过期缓存
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // 每分钟清理一次
  }

  /**
   * 生成请求的唯一标识
   */
  generateRequestKey(req) {
    const parts = [
      req.method,
      req.url,
      req.ip || req.connection.remoteAddress,
    ];

    // 如果配置包含请求体，则加入签名
    if (this.includeBody && req.body && Object.keys(req.body).length > 0) {
      try {
        parts.push(JSON.stringify(req.body));
      } catch (error) {
        // 如果无法序列化body，忽略
      }
    }

    // 生成哈希键
    return parts.join('::');
  }

  /**
   * 检查URL是否应该被排除
   */
  shouldExclude(url) {
    return this.excludeUrls.some(pattern => {
      if (typeof pattern === 'string') {
        return url.includes(pattern);
      }
      if (pattern instanceof RegExp) {
        return pattern.test(url);
      }
      return false;
    });
  }

  /**
   * 清理过期的缓存条目
   */
  cleanup() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, data] of this.requestCache.entries()) {
      if (now - data.lastSeen > this.windowMs * 2) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.requestCache.delete(key));

    if (expiredKeys.length > 0) {
      logger.debug(`Cleaned up ${expiredKeys.length} expired request cache entries`);
    }
  }

  /**
   * 中间件函数
   */
  middleware() {
    return (req, res, next) => {
      // 跳过排除的URL
      if (this.shouldExclude(req.url)) {
        return next();
      }

      const now = Date.now();
      const requestKey = this.generateRequestKey(req);
      const cached = this.requestCache.get(requestKey);

      if (cached) {
        const timeSinceFirst = now - cached.firstSeen;

        // 如果在时间窗口内
        if (timeSinceFirst < this.windowMs) {
          cached.count++;
          cached.lastSeen = now;
          cached.timestamps.push(now);

          // 检测到重复请求
          if (cached.count > this.maxDuplicates) {
            const intervals = [];
            for (let i = 1; i < cached.timestamps.length; i++) {
              intervals.push(cached.timestamps[i] - cached.timestamps[i - 1]);
            }

            logger.warn('Duplicate request detected', {
              requestId: req.requestId,
              method: req.method,
              url: req.url,
              ip: req.ip,
              duplicateCount: cached.count,
              timeWindow: `${timeSinceFirst}ms`,
              intervals: intervals.map(i => `${i}ms`),
              timestamp: new Date().toISOString()
            });

            // 添加警告头部
            res.setHeader('X-Duplicate-Warning', 'true');
            res.setHeader('X-Duplicate-Count', cached.count.toString());
          }
        } else {
          // 超出时间窗口，重置计数
          this.requestCache.set(requestKey, {
            count: 1,
            firstSeen: now,
            lastSeen: now,
            timestamps: [now]
          });
        }
      } else {
        // 首次请求
        this.requestCache.set(requestKey, {
          count: 1,
          firstSeen: now,
          lastSeen: now,
          timestamps: [now]
        });
      }

      next();
    };
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      cachedRequests: this.requestCache.size,
      windowMs: this.windowMs,
      maxDuplicates: this.maxDuplicates
    };
  }

  /**
   * 清除所有缓存
   */
  clear() {
    this.requestCache.clear();
  }

  /**
   * 销毁检测器
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

/**
 * 创建重复请求检测中间件
 */
function createDuplicateDetector(options = {}) {
  const detector = new DuplicateRequestDetector(options);
  return detector.middleware();
}

/**
 * 预设配置
 */
const presets = {
  // 严格模式：200ms内不允许重复
  strict: {
    windowMs: 200,
    maxDuplicates: 1,
    includeBody: true
  },

  // 标准模式：1秒内最多2次重复
  standard: {
    windowMs: 1000,
    maxDuplicates: 2,
    includeBody: true
  },

  // 宽松模式：2秒内最多3次重复
  relaxed: {
    windowMs: 2000,
    maxDuplicates: 3,
    includeBody: false
  },

  // API模式：针对API接口
  api: {
    windowMs: 500,
    maxDuplicates: 1,
    includeBody: true,
    excludeUrls: ['/health', '/status']
  },

  // 表单模式：针对表单提交
  form: {
    windowMs: 3000,
    maxDuplicates: 1,
    includeBody: true
  }
};

module.exports = {
  DuplicateRequestDetector,
  createDuplicateDetector,
  presets
};
