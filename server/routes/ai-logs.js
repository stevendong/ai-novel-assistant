const express = require('express');
const prisma = require('../utils/prismaClient');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const aiLoggingService = require('../services/aiLoggingService');

const router = express.Router();

router.get('/', requireAdmin, async (req, res) => {
  try {
    const {
      novelId,
      provider,
      model,
      taskType,
      status,
      apiUrl,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      userId
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};

    if (userId) where.userId = userId;
    if (novelId) where.novelId = novelId;
    if (provider) where.provider = provider;
    if (model) where.model = model;
    if (taskType) where.taskType = taskType;
    if (status) where.status = status;
    if (apiUrl) where.apiUrl = { contains: apiUrl };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      prisma.aICallLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
        select: {
          id: true,
          provider: true,
          model: true,
          endpoint: true,
          apiUrl: true,
          taskType: true,
          promptTokens: true,
          completionTokens: true,
          totalTokens: true,
          latencyMs: true,
          estimatedCost: true,
          status: true,
          createdAt: true,
          novelId: true,
          novel: {
            select: {
              title: true
            }
          }
        }
      }),
      prisma.aICallLog.count({ where })
    ]);

    res.json({
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching AI logs:', error);
    res.status(500).json({ error: 'Failed to fetch AI logs' });
  }
});

router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const log = await prisma.aICallLog.findFirst({
      where: {
        id
      },
      include: {
        novel: {
          select: {
            title: true
          }
        }
      }
    });

    if (!log) {
      return res.status(404).json({ error: 'Log not found' });
    }

    res.json(log);
  } catch (error) {
    console.error('Error fetching AI log detail:', error);
    res.status(500).json({ error: 'Failed to fetch AI log detail' });
  }
});

router.get('/stats/summary', requireAdmin, async (req, res) => {
  try {
    const { novelId, period = 'all', userId } = req.query;

    const where = {};
    if (userId) where.userId = userId;
    if (novelId) where.novelId = novelId;

    if (period !== 'all') {
      const now = new Date();
      const startDate = new Date();

      switch (period) {
        case 'day':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
      }

      where.createdAt = { gte: startDate };
    }

    const [stats, successCount] = await Promise.all([
      prisma.aICallLog.aggregate({
        where,
        _count: { id: true },
        _sum: {
          promptTokens: true,
          completionTokens: true,
          totalTokens: true,
          estimatedCost: true
        },
        _avg: {
          latencyMs: true
        }
      }),
      prisma.aICallLog.count({
        where: { ...where, status: 'success' }
      })
    ]);

    const mostUsedModel = await prisma.aICallLog.groupBy({
      by: ['provider', 'model'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 1
    });

    res.json({
      totalCalls: stats._count.id,
      successfulCalls: successCount,
      failedCalls: stats._count.id - successCount,
      successRate: stats._count.id > 0 ? (successCount / stats._count.id) * 100 : 0,
      totalTokens: stats._sum.totalTokens || 0,
      promptTokens: stats._sum.promptTokens || 0,
      completionTokens: stats._sum.completionTokens || 0,
      totalCost: stats._sum.estimatedCost || 0,
      avgLatency: stats._avg.latencyMs || 0,
      costPerCall: stats._count.id > 0 ? (stats._sum.estimatedCost || 0) / stats._count.id : 0,
      costPer1kTokens: (stats._sum.totalTokens || 0) > 0
        ? ((stats._sum.estimatedCost || 0) / (stats._sum.totalTokens || 0)) * 1000
        : 0,
      mostUsedModel: mostUsedModel[0] || null
    });
  } catch (error) {
    console.error('Error fetching summary stats:', error);
    res.status(500).json({ error: 'Failed to fetch summary stats' });
  }
});

router.get('/stats/by-provider', requireAdmin, async (req, res) => {
  try {
    const { novelId, startDate, endDate, userId } = req.query;

    const where = {};
    if (userId) where.userId = userId;
    if (novelId) where.novelId = novelId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const stats = await prisma.aICallLog.groupBy({
      by: ['provider', 'model'],
      where,
      _count: { id: true },
      _sum: {
        totalTokens: true,
        estimatedCost: true
      },
      _avg: {
        latencyMs: true
      },
      orderBy: {
        _sum: {
          estimatedCost: 'desc'
        }
      }
    });

    res.json(stats.map(stat => ({
      provider: stat.provider,
      model: stat.model,
      calls: stat._count.id,
      totalTokens: stat._sum.totalTokens || 0,
      totalCost: stat._sum.estimatedCost || 0,
      avgLatency: stat._avg.latencyMs || 0
    })));
  } catch (error) {
    console.error('Error fetching provider stats:', error);
    res.status(500).json({ error: 'Failed to fetch provider stats' });
  }
});

router.get('/stats/by-task', requireAdmin, async (req, res) => {
  try {
    const { novelId, startDate, endDate, userId } = req.query;

    const where = {};
    if (userId) where.userId = userId;
    if (novelId) where.novelId = novelId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const stats = await prisma.aICallLog.groupBy({
      by: ['taskType'],
      where,
      _count: { id: true },
      _sum: {
        totalTokens: true,
        estimatedCost: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });

    res.json(stats.map(stat => ({
      taskType: stat.taskType,
      calls: stat._count.id,
      totalTokens: stat._sum.totalTokens || 0,
      totalCost: stat._sum.estimatedCost || 0
    })));
  } catch (error) {
    console.error('Error fetching task stats:', error);
    res.status(500).json({ error: 'Failed to fetch task stats' });
  }
});

router.get('/stats/by-endpoint', requireAdmin, async (req, res) => {
  try {
    const { novelId, startDate, endDate, userId } = req.query;

    const where = {};
    if (userId) where.userId = userId;
    if (novelId) where.novelId = novelId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const stats = await prisma.aICallLog.groupBy({
      by: ['apiUrl'],
      where,
      _count: { id: true },
      _sum: {
        totalTokens: true,
        estimatedCost: true
      },
      _avg: {
        latencyMs: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });

    res.json(stats.map(stat => ({
      apiUrl: stat.apiUrl,
      calls: stat._count.id,
      totalTokens: stat._sum.totalTokens || 0,
      totalCost: stat._sum.estimatedCost || 0,
      avgLatency: stat._avg.latencyMs || 0
    })));
  } catch (error) {
    console.error('Error fetching endpoint stats:', error);
    res.status(500).json({ error: 'Failed to fetch endpoint stats' });
  }
});

router.get('/stats/costs', requireAdmin, async (req, res) => {
  try {
    const { novelId, period = 'month', userId } = req.query;

    const where = {};
    if (userId) where.userId = userId;
    if (novelId) where.novelId = novelId;

    const now = new Date();
    const startDate = new Date();

    switch (period) {
      case 'day':
        startDate.setDate(now.getDate() - 30);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 12 * 7);
        break;
      case 'month':
      default:
        startDate.setMonth(now.getMonth() - 12);
        break;
    }

    where.createdAt = { gte: startDate };

    const logs = await prisma.aICallLog.findMany({
      where,
      select: {
        createdAt: true,
        estimatedCost: true
      },
      orderBy: { createdAt: 'asc' }
    });

    const grouped = {};
    logs.forEach(log => {
      let key;
      const date = new Date(log.createdAt);

      switch (period) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
        default:
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
      }

      if (!grouped[key]) {
        grouped[key] = 0;
      }
      grouped[key] += log.estimatedCost || 0;
    });

    const trends = Object.entries(grouped).map(([date, cost]) => ({
      date,
      cost
    }));

    res.json({ trends });
  } catch (error) {
    console.error('Error fetching cost stats:', error);
    res.status(500).json({ error: 'Failed to fetch cost stats' });
  }
});

router.get('/stats/performance', requireAdmin, async (req, res) => {
  try {
    const { provider, model, userId } = req.query;

    const where = {};
    if (userId) where.userId = userId;
    if (provider) where.provider = provider;
    if (model) where.model = model;

    const [stats, errorCount] = await Promise.all([
      prisma.aICallLog.aggregate({
        where,
        _count: { id: true },
        _avg: { latencyMs: true }
      }),
      prisma.aICallLog.count({
        where: { ...where, status: 'error' }
      })
    ]);

    const latencies = await prisma.aICallLog.findMany({
      where: { ...where, latencyMs: { not: null } },
      select: { latencyMs: true },
      orderBy: { latencyMs: 'asc' }
    });

    const sortedLatencies = latencies.map(l => l.latencyMs).filter(l => l !== null);
    const p50Index = Math.floor(sortedLatencies.length * 0.5);
    const p95Index = Math.floor(sortedLatencies.length * 0.95);
    const p99Index = Math.floor(sortedLatencies.length * 0.99);

    res.json({
      totalCalls: stats._count.id,
      errorCount,
      errorRate: stats._count.id > 0 ? (errorCount / stats._count.id) * 100 : 0,
      avgLatency: stats._avg.latencyMs || 0,
      p50Latency: sortedLatencies[p50Index] || 0,
      p95Latency: sortedLatencies[p95Index] || 0,
      p99Latency: sortedLatencies[p99Index] || 0
    });
  } catch (error) {
    console.error('Error fetching performance stats:', error);
    res.status(500).json({ error: 'Failed to fetch performance stats' });
  }
});

router.delete('/cleanup', requireAdmin, async (req, res) => {
  try {
    const { retentionDays = 90 } = req.body;

    const deletedCount = await aiLoggingService.cleanupOldLogs(parseInt(retentionDays));

    res.json({
      success: true,
      deletedCount,
      message: `Cleaned up ${deletedCount} old logs`
    });
  } catch (error) {
    console.error('Error cleaning up logs:', error);
    res.status(500).json({ error: 'Failed to cleanup logs' });
  }
});

module.exports = router;
