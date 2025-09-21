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

// 获取单个用户详情
router.get('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        nickname: true,
        avatar: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        inviteCodeUsed: true,
        inviteVerified: true,
        invitedBy: true,
        _count: {
          select: {
            novels: true,
            sessions: true,
            conversations: true,
            invitees: true
          }
        },
        inviter: {
          select: {
            id: true,
            username: true,
            nickname: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    res.json(user);
  } catch (error) {
    logger.error('Get user detail error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch user details'
    });
  }
});

// 创建新用户
router.post('/users', requireAdmin, async (req, res) => {
  try {
    const { username, email, password, nickname, role = 'user' } = req.body;

    // 验证必填字段
    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Username, email, and password are required'
      });
    }

    // 验证角色
    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Role must be either "admin" or "user"'
      });
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid email format'
      });
    }

    // 验证密码强度（至少6位）
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Password must be at least 6 characters long'
      });
    }

    // 检查用户名和邮箱是否已存在
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: username.toLowerCase() },
          { email: email.toLowerCase() }
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'Conflict',
        message: existingUser.username.toLowerCase() === username.toLowerCase() 
          ? 'Username already exists' 
          : 'Email already exists'
      });
    }

    const AuthUtils = require('../utils/auth');
    const hashedPassword = await AuthUtils.hashPassword(password);

    const user = await prisma.user.create({
      data: {
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        password: hashedPassword,
        nickname: nickname || username,
        role,
        isActive: true,
        inviteVerified: true // 管理员创建的用户自动验证
      },
      select: {
        id: true,
        username: true,
        email: true,
        nickname: true,
        role: true,
        isActive: true,
        createdAt: true,
        inviteVerified: true
      }
    });

    logger.info('User created by admin:', {
      adminId: req.user.id,
      newUserId: user.id,
      username: user.username,
      role: user.role
    });

    res.status(201).json({
      message: 'User created successfully',
      user
    });
  } catch (error) {
    logger.error('Create user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create user'
    });
  }
});

// 更新用户信息
router.put('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, nickname, password } = req.body;

    // 验证必填字段
    if (!username || !email) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Username and email are required'
      });
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid email format'
      });
    }

    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    // 检查用户名和邮箱是否被其他用户使用
    const conflictUser = await prisma.user.findFirst({
      where: {
        AND: [
          { id: { not: id } },
          {
            OR: [
              { username: username.toLowerCase() },
              { email: email.toLowerCase() }
            ]
          }
        ]
      }
    });

    if (conflictUser) {
      return res.status(409).json({
        error: 'Conflict',
        message: conflictUser.username.toLowerCase() === username.toLowerCase()
          ? 'Username already exists'
          : 'Email already exists'
      });
    }

    const updateData = {
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      nickname: nickname || username
    };

    // 如果提供了新密码，则更新密码
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Password must be at least 6 characters long'
        });
      }
      const AuthUtils = require('../utils/auth');
      updateData.password = await AuthUtils.hashPassword(password);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        nickname: true,
        role: true,
        isActive: true,
        updatedAt: true
      }
    });

    logger.info('User updated by admin:', {
      adminId: req.user.id,
      targetUserId: id,
      changes: Object.keys(updateData)
    });

    res.json({
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update user'
    });
  }
});

// 重置用户密码
router.patch('/users/:id/password', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'New password is required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Password must be at least 6 characters long'
      });
    }

    const AuthUtils = require('../utils/auth');
    const hashedPassword = await AuthUtils.hashPassword(newPassword);

    const user = await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
      select: {
        id: true,
        username: true,
        email: true
      }
    });

    // 注销用户的所有会话，强制重新登录
    await prisma.userSession.deleteMany({
      where: { userId: id }
    });

    logger.info('User password reset by admin:', {
      adminId: req.user.id,
      targetUserId: id,
      username: user.username
    });

    res.json({
      message: 'Password reset successfully. User sessions have been terminated.'
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    logger.error('Reset password error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to reset password'
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