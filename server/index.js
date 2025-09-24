const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 导入端口管理工具和日志工具
const { ensurePortAvailable } = require('./utils/portManager');
const logger = require('./utils/logger');

// 导入路由
const authRoutes = require('./routes/auth');
const novelRoutes = require('./routes/novels');
const characterRoutes = require('./routes/characters');
const settingRoutes = require('./routes/settings');
const chapterRoutes = require('./routes/chapters');
const batchChapterRoutes = require('./routes/batchChapters');
const aiRoutes = require('./routes/ai');
const aiProviderRoutes = require('./routes/ai-providers');
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

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'development' ? true : process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 添加请求日志中间件（在body parser之后）
app.use(logger.createRequestLogger());

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/novels', novelRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/chapters', chapterRoutes);
app.use('/api/chapters/batch', batchChapterRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/ai', aiProviderRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/consistency', consistencyRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api', statsRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/admin', adminRoutes);

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

// 优雅关闭
process.on('SIGINT', async () => {
  logger.info('Shutting down server...');
  await prisma.$disconnect();
  process.exit(0);
});

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
