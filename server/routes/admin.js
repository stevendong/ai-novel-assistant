const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { requireAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();
const prisma = new PrismaClient();

// 获取所有用户列表
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', role = '' } = req.query;
    const offset = (page - 1) * limit;

    const where = {
      AND: [
        search ? {
          OR: [
            { username: { contains: search } },
            { email: { contains: search } },
            { nickname: { contains: search } }
          ]
        } : {},
        role ? { role } : {}
      ]
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          nickname: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
          inviteCodeUsed: true,
          _count: {
            select: {
              novels: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch users'
    });
  }
});

// 更新用户状态
router.patch('/users/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'isActive must be a boolean value'
      });
    }

    // 防止管理员禁用自己
    if (req.user.id === id && !isActive) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Cannot disable your own account'
      });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    logger.info('User status updated:', {
      adminId: req.user.id,
      targetUserId: id,
      newStatus: isActive
    });

    res.json(user);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    logger.error('Update user status error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update user status'
    });
  }
});

// 更新用户角色
router.patch('/users/:id/role', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Role must be either "admin" or "user"'
      });
    }

    // 防止管理员移除自己的管理员权限
    if (req.user.id === id && role !== 'admin') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Cannot remove admin role from your own account'
      });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    logger.info('User role updated:', {
      adminId: req.user.id,
      targetUserId: id,
      newRole: role
    });

    res.json(user);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    logger.error('Update user role error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update user role'
    });
  }
});

// 获取系统统计信息
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      adminUsers,
      totalNovels,
      totalChapters,
      recentUsers
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: 'admin' } }),
      prisma.novel.count(),
      prisma.chapter.count(),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 最近7天
          }
        }
      })
    ]);

    res.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        admins: adminUsers,
        recent: recentUsers
      },
      content: {
        novels: totalNovels,
        chapters: totalChapters
      }
    });
  } catch (error) {
    logger.error('Get admin stats error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch statistics'
    });
  }
});

// 删除用户（软删除，设为非活跃状态）
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // 防止管理员删除自己
    if (req.user.id === id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Cannot delete your own account'
      });
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false }
    });

    logger.info('User deleted (deactivated):', {
      adminId: req.user.id,
      targetUserId: id
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    logger.error('Delete user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete user'
    });
  }
});

module.exports = router;