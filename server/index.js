const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const prisma = require('./utils/prismaClient');

// 导入端口管理工具和日志工具
const { ensurePortAvailable } = require('./utils/portManager');
const logger = require('./utils/logger');

// 导入安全中间件
const {
  helmetConfig,
  globalLimiter,
  speedLimiter,
  authLimiter,
  apiLimiter,
  aiLimiter,
  uploadLimiter,
  registerLimiter,
  exportLimiter
} = require('./middleware/security');

// 导入路由
const authRoutes = require('./routes/auth');
const novelRoutes = require('./routes/novels');
const characterRoutes = require('./routes/characters');
const settingRoutes = require('./routes/settings');
const chapterRoutes = require('./routes/chapters');
const batchChapterRoutes = require('./routes/batchChapters');
const aiRoutes = require('./routes/ai');
const aiProviderRoutes = require('./routes/ai-providers');
const aiConfigRoutes = require('./routes/ai-config');
const exportRoutes = require('./routes/export');
const statisticsRoutes = require('./routes/statistics');
const goalsRoutes = require('./routes/goals');
const workflowRoutes = require('./routes/workflow');
const consistencyRoutes = require('./routes/consistency');
const uploadRoutes = require('./routes/upload');
const conversationRoutes = require('./routes/conversations');
const statsRoutes = require('./routes/stats');
const inviteRoutes = require('./routes/invites');
const adminRoutes = require('./routes/admin');
const systemConfigRoutes = require('./routes/systemConfig');

const app = express();
const PORT = process.env.PORT || 3001;

// 配置信任代理，避免过度信任导致的速率限制绕过
const resolveTrustProxy = () => {
  const raw = process.env.TRUST_PROXY;

  if (!raw) {
    return ['loopback', 'linklocal', 'uniquelocal'];
  }

  const normalized = raw.trim().toLowerCase();
  if (normalized === 'false') return false;

  if (/^\d+$/.test(normalized)) {
    return Number(normalized);
  }

  if (normalized === 'true') {
    logger.warn('TRUST_PROXY=true is unsafe; falling back to loopback/linklocal/uniquelocal');
    return ['loopback', 'linklocal', 'uniquelocal'];
  }

  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

app.set('trust proxy', resolveTrustProxy());

// ========== 安全中间件 ==========
// 1. Helmet - 设置安全 HTTP 头
app.use(helmetConfig);

// 2. CORS - 跨域配置
app.use(cors({
  origin: process.env.NODE_ENV === 'development' ? true : process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true
}));

// 3. 全局速率限制 - 防止 DDOS
app.use(globalLimiter);

// 4. 速度降低 - 逐渐减慢请求速度
app.use(speedLimiter);

// ========== Body Parser 中间件 ==========
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ========== 日志中间件 ==========
app.use(logger.createRequestLogger());

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ========== API 路由（带速率限制）==========
// 认证路由 - 严格的速率限制
app.use('/api/auth/login', authLimiter); // 登录接口特殊限制
app.use('/api/auth/register', registerLimiter); // 注册接口特殊限制
app.use('/api/auth', authRoutes);

// AI 相关路由 - 较严格的速率限制
app.use('/api/ai', aiLimiter, aiRoutes);
app.use('/api/ai', aiLimiter, aiProviderRoutes);
app.use('/api/ai', aiLimiter, aiConfigRoutes);

// 文件上传路由 - 上传限制
app.use('/api/upload', uploadLimiter, uploadRoutes);

// 导出路由 - 导出限制
app.use('/api/export', exportLimiter, exportRoutes);

// 其他 API 路由 - 标准 API 限制
app.use('/api/novels', apiLimiter, novelRoutes);
app.use('/api/characters', apiLimiter, characterRoutes);
app.use('/api/settings', apiLimiter, settingRoutes);
app.use('/api/chapters', apiLimiter, chapterRoutes);
app.use('/api/chapters/batch', apiLimiter, batchChapterRoutes);
app.use('/api/statistics', apiLimiter, statisticsRoutes);
app.use('/api/goals', apiLimiter, goalsRoutes);
app.use('/api/workflow', apiLimiter, workflowRoutes);
app.use('/api/consistency', apiLimiter, consistencyRoutes);
app.use('/api/conversations', apiLimiter, conversationRoutes);
app.use('/api', apiLimiter, statsRoutes);
app.use('/api/invites', apiLimiter, inviteRoutes);
app.use('/api/admin', apiLimiter, adminRoutes);
app.use('/api/system-config', apiLimiter, systemConfigRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});


// 错误处理中间件
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    error: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString()
  });

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!',
    requestId: req.requestId
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// 优雅关闭处理
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} signal received: closing HTTP server`);

  try {
    // 断开数据库连接
    await prisma.$disconnect();
    logger.info('Database connection closed');

    // 正常退出
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// 监听终止信号
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 启动服务器
async function startServer() {
  try {
    // 确保端口可用，如果被占用则自动杀死占用进程
    const portResult = await ensurePortAvailable(PORT, {
      autoKill: true,
      force: false,
      retryCount: 3,
      showProcessInfo: true
    });

    if (!portResult.success) {
      logger.error(`❌ 无法启动服务器: ${portResult.message}`);
      process.exit(1);
    }

    // 启动服务器
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
      logger.info(`📝 Log level: ${logger.level}`);

      if (portResult.killedProcesses && portResult.killedProcesses.length > 0) {
        logger.info(`🔧 已自动处理 ${portResult.killedProcesses.length} 个占用端口的进程`);
      }
    });

  } catch (error) {
    logger.error('❌ 服务器启动失败:', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// 启动服务器
startServer();
