const express = require('express');
const multer = require('multer');
const AuthUtils = require('../utils/auth');
const { requireAuth } = require('../middleware/auth');
const logger = require('../utils/logger');
const inviteService = require('../services/inviteService');
const uploadService = require('../services/uploadService');
const { getCleanClientIp } = require('../utils/ipHelper');
const prisma = require('../utils/prismaClient');

const router = express.Router();

// 配置 multer 用于头像上传
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    // 只允许图片类型
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'));
    }
  }
});

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  return password && password.length >= 6;
};

const validateUsername = (username) => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
};

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, nickname } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Username, email, and password are required',
      });
    }

    if (!validateUsername(username)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores',
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Please provide a valid email address',
      });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Password must be at least 6 characters long',
      });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() },
        ],
      },
    });

    if (existingUser) {
      const field = existingUser.email === email.toLowerCase() ? 'email' : 'username';
      return res.status(409).json({
        error: 'User Exists',
        message: `A user with this ${field} already exists`,
      });
    }

    const hashedPassword = await AuthUtils.hashPassword(password);
    const userAgent = req.get('User-Agent');
    const ipAddress = getCleanClientIp(req);

    // 创建用户（无需邀请码验证）
    const user = await prisma.user.create({
      data: {
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        password: hashedPassword,
        nickname: nickname || username,
        inviteVerified: false, // 标记为未验证邀请码
      },
      select: {
        id: true,
        username: true,
        email: true,
        nickname: true,
        avatar: true,
        role: true,
        createdAt: true,
        inviteVerified: true,
      },
    });

    const session = await AuthUtils.createUserSession(user.id, userAgent, ipAddress);

    logger.info('User registered successfully:', {
      userId: user.id,
      username: user.username,
      email: user.email,
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: user,
      session: {
        sessionToken: session.sessionToken,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt,
      },
    });

  } catch (error) {
    logger.error('Registration error:', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      error: 'Registration Failed',
      message: 'Failed to create user account',
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Email/username and password are required',
      });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { username: identifier.toLowerCase() },
        ],
      },
    });

    if (!user) {
      return res.status(400).json({
        error: 'User Not Found',
        message: '用户名或邮箱不存在',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: 'Account Disabled',
        message: '您的账户已被禁用，请联系管理员',
        code: 'ACCOUNT_DISABLED'
      });
    }

    const isValidPassword = await AuthUtils.verifyPassword(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid Password',
        message: '密码错误，请重新输入',
        code: 'INVALID_PASSWORD'
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const userAgent = req.get('User-Agent');
    const ipAddress = getCleanClientIp(req);

    const session = await AuthUtils.createUserSession(user.id, userAgent, ipAddress);

    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      nickname: user.nickname,
      avatar: user.avatar,
      role: user.role,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      inviteVerified: user.inviteVerified || false,
    };

    logger.info('User logged in successfully:', {
      userId: user.id,
      username: user.username,
    });

    res.json({
      message: '登录成功',
      user: userResponse,
      session: {
        sessionToken: session.sessionToken,
        refreshToken: session.refreshToken,
        expiresAt: session.expiresAt,
      },
    });

  } catch (error) {
    logger.error('Login error:', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      error: 'Login Failed',
      message: 'Failed to authenticate user',
    });
  }
});

router.post('/logout', requireAuth, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader.substring(7);

    await AuthUtils.invalidateSession(token);

    logger.info('User logged out successfully:', {
      userId: req.user.id,
      username: req.user.username,
    });

    res.json({
      message: 'Logout successful',
    });

  } catch (error) {
    logger.error('Logout error:', {
      error: error.message,
      userId: req.user?.id,
    });

    res.status(500).json({
      error: 'Logout Failed',
      message: 'Failed to logout user',
    });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Refresh token is required',
      });
    }

    const result = await AuthUtils.refreshUserSession(refreshToken);

    if (!result) {
      return res.status(401).json({
        error: 'Invalid Token',
        message: 'Invalid or expired refresh token',
      });
    }

    const userResponse = {
      id: result.user.id,
      username: result.user.username,
      email: result.user.email,
      nickname: result.user.nickname,
      avatar: result.user.avatar,
      createdAt: result.user.createdAt,
      lastLogin: result.user.lastLogin,
    };

    res.json({
      message: 'Token refreshed successfully',
      user: userResponse,
      session: {
        sessionToken: result.sessionToken,
        refreshToken: result.refreshToken,
        expiresAt: result.expiresAt,
      },
    });

  } catch (error) {
    logger.error('Token refresh error:', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      error: 'Refresh Failed',
      message: 'Failed to refresh token',
    });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      nickname: req.user.nickname,
      avatar: req.user.avatar,
      role: req.user.role,
      createdAt: req.user.createdAt,
      lastLogin: req.user.lastLogin,
      inviteVerified: req.user.inviteVerified,
    };

    res.json({
      user,
    });

  } catch (error) {
    logger.error('Get user profile error:', {
      error: error.message,
      userId: req.user?.id,
    });

    res.status(500).json({
      error: 'Profile Error',
      message: 'Failed to get user profile',
    });
  }
});

router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { nickname, avatar } = req.body;

    const updateData = {};

    // 验证昵称
    if (nickname !== undefined) {
      if (nickname.length > 50) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Nickname cannot exceed 50 characters',
        });
      }
      // 防止XSS攻击
      if (/<[^>]*>/.test(nickname)) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Nickname cannot contain HTML tags',
        });
      }
      updateData.nickname = nickname.trim();
    }

    if (avatar !== undefined) updateData.avatar = avatar;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'At least one field must be provided for update',
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        nickname: true,
        avatar: true,
        role: true,
        createdAt: true,
        lastLogin: true,
        inviteVerified: true,
      },
    });

    logger.info('User profile updated:', {
      userId: req.user.id,
      updates: Object.keys(updateData),
    });

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });

  } catch (error) {
    logger.error('Update profile error:', {
      error: error.message,
      userId: req.user?.id,
    });

    res.status(500).json({
      error: 'Update Failed',
      message: 'Failed to update user profile',
    });
  }
});

router.delete('/account', requireAuth, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Password confirmation is required',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    const isValidPassword = await AuthUtils.verifyPassword(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid Password',
        message: 'Invalid password confirmation',
      });
    }

    await AuthUtils.invalidateAllUserSessions(req.user.id);

    await prisma.user.delete({
      where: { id: req.user.id },
    });

    logger.info('User account deleted:', {
      userId: req.user.id,
      username: req.user.username,
    });

    res.json({
      message: 'Account deleted successfully',
    });

  } catch (error) {
    logger.error('Delete account error:', {
      error: error.message,
      userId: req.user?.id,
    });

    res.status(500).json({
      error: 'Delete Failed',
      message: 'Failed to delete user account',
    });
  }
});

router.post('/logout-all', requireAuth, async (req, res) => {
  try {
    // 获取当前会话token，保留当前会话，只删除其他会话
    const authHeader = req.headers.authorization;
    const currentToken = authHeader.substring(7);

    await prisma.userSession.deleteMany({
      where: {
        userId: req.user.id,
        sessionToken: { not: currentToken }
      }
    });

    logger.info('All other user sessions invalidated:', {
      userId: req.user.id,
      username: req.user.username,
    });

    res.json({
      message: 'All other sessions logged out successfully',
    });

  } catch (error) {
    logger.error('Logout all sessions error:', {
      error: error.message,
      userId: req.user?.id,
    });

    res.status(500).json({
      error: 'Logout Failed',
      message: 'Failed to logout all sessions',
    });
  }
});

// 验证并应用邀请码
router.post('/verify-invite', requireAuth, async (req, res) => {
  try {
    const { inviteCode } = req.body;

    // 系统管理员无需验证邀请码，直接标记为已验证
    if (req.user.role === 'admin') {
      if (req.user.inviteVerified) {
        return res.status(400).json({
          error: 'Already Verified',
          message: '您已经验证过邀请码了，无需重复验证',
        });
      }

      // 直接为管理员用户标记为已验证
      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: {
          inviteVerified: true,
        },
        select: {
          id: true,
          username: true,
          email: true,
          nickname: true,
          avatar: true,
          role: true,
          createdAt: true,
          lastLogin: true,
          inviteVerified: true,
        },
      });

      logger.info('Admin user automatically verified:', {
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role,
      });

      return res.json({
        message: '系统管理员账户已自动完成验证',
        user: updatedUser,
      });
    }

    if (!inviteCode || inviteCode.trim() === '') {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invite code is required',
      });
    }

    // 如果用户已经验证过邀请码，不允许重复验证
    if (req.user.inviteVerified) {
      return res.status(400).json({
        error: 'Already Verified',
        message: '您已经验证过邀请码了，无需重复验证',
      });
    }

    // 验证邀请码
    const ipAddress = getCleanClientIp(req);
    const userAgent = req.get('User-Agent');
    const inviteValidation = await inviteService.validateInviteCode(inviteCode, {
      userId: req.user.id,
      ipAddress
    });

    if (!inviteValidation.valid) {
      return res.status(400).json({
        error: 'Invite Code Error',
        message: inviteValidation.message,
      });
    }

    // 在事务中更新用户状态并记录邀请码使用
    const result = await prisma.$transaction(async (tx) => {
      // 更新用户状态
      const updatedUser = await tx.user.update({
        where: { id: req.user.id },
        data: {
          inviteVerified: true,
          inviteCodeUsed: inviteCode,
          invitedBy: inviteValidation.inviteCode.creator?.id || null,
        },
        select: {
          id: true,
          username: true,
          email: true,
          nickname: true,
          avatar: true,
          role: true,
          createdAt: true,
          lastLogin: true,
          inviteVerified: true,
        },
      });

      // 记录邀请码使用
      const usage = await tx.InviteUsage.create({
        data: {
          codeId: inviteValidation.inviteCode.id,
          userId: req.user.id,
          ipAddress,
          userAgent
        }
      });

      // 更新邀请码使用计数
      await tx.InviteCode.update({
        where: { id: inviteValidation.inviteCode.id },
        data: {
          usedCount: { increment: 1 }
        }
      });

      return { user: updatedUser, usage };
    });

    logger.info('Invite code verified successfully:', {
      userId: req.user.id,
      username: req.user.username,
      inviteCode: inviteCode,
    });

    res.json({
      message: 'Invite code verified successfully',
      user: result.user,
    });

  } catch (error) {
    logger.error('Invite verification error:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });

    res.status(500).json({
      error: 'Verification Failed',
      message: 'Failed to verify invite code',
    });
  }
});

// 修改密码
router.put('/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Current password and new password are required',
      });
    }

    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'New password must be at least 6 characters long',
      });
    }

    // 获取用户当前密码
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { password: true }
    });

    // 验证当前密码
    const isValidPassword = await AuthUtils.verifyPassword(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid Password',
        message: 'Current password is incorrect',
      });
    }

    // 加密新密码
    const hashedNewPassword = await AuthUtils.hashPassword(newPassword);

    // 更新密码
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedNewPassword },
    });

    // 注销所有其他会话（除了当前会话）
    const authHeader = req.headers.authorization;
    const currentToken = authHeader.substring(7);

    await prisma.userSession.deleteMany({
      where: {
        userId: req.user.id,
        sessionToken: { not: currentToken }
      }
    });

    logger.info('User password changed:', {
      userId: req.user.id,
      username: req.user.username,
    });

    res.json({
      message: 'Password changed successfully. Other sessions have been logged out.',
    });

  } catch (error) {
    logger.error('Change password error:', {
      error: error.message,
      userId: req.user?.id,
    });

    res.status(500).json({
      error: 'Password Change Failed',
      message: 'Failed to change password',
    });
  }
});

// 获取用户会话列表
router.get('/sessions', requireAuth, async (req, res) => {
  try {
    const sessions = await prisma.userSession.findMany({
      where: { userId: req.user.id },
      select: {
        id: true,
        sessionToken: true,
        createdAt: true,
        lastUsed: true,
        expiresAt: true,
        userAgent: true,
        ipAddress: true,
      },
      orderBy: { lastUsed: 'desc' }
    });

    // 标记当前会话
    const authHeader = req.headers.authorization;
    const currentToken = authHeader.substring(7);

    const sessionsWithCurrent = sessions.map(session => ({
      ...session,
      isCurrent: session.sessionToken === currentToken,
      // 隐藏完整token，只显示前几位
      sessionToken: session.sessionToken.substring(0, 8) + '...'
    }));

    res.json({
      sessions: sessionsWithCurrent,
    });

  } catch (error) {
    logger.error('Get sessions error:', {
      error: error.message,
      userId: req.user?.id,
    });

    res.status(500).json({
      error: 'Sessions Error',
      message: 'Failed to get user sessions',
    });
  }
});

// 删除特定会话
router.delete('/sessions/:sessionId', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;

    // 确保会话属于当前用户
    const session = await prisma.userSession.findFirst({
      where: {
        id: sessionId,
        userId: req.user.id
      }
    });

    if (!session) {
      return res.status(404).json({
        error: 'Session Not Found',
        message: 'Session not found or does not belong to current user',
      });
    }

    // 检查是否是当前会话
    const authHeader = req.headers.authorization;
    const currentToken = authHeader.substring(7);

    if (session.sessionToken === currentToken) {
      return res.status(400).json({
        error: 'Cannot Delete Current Session',
        message: 'Cannot delete current session. Use logout instead.',
      });
    }

    await prisma.userSession.delete({
      where: { id: sessionId }
    });

    logger.info('User session deleted:', {
      userId: req.user.id,
      sessionId: sessionId,
    });

    res.json({
      message: 'Session deleted successfully',
    });

  } catch (error) {
    logger.error('Delete session error:', {
      error: error.message,
      userId: req.user?.id,
    });

    res.status(500).json({
      error: 'Delete Session Failed',
      message: 'Failed to delete session',
    });
  }
});

// 获取用户统计信息
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const [novelsCount, chaptersCount, activeSessions, totalWords] = await Promise.all([
      // 用户的小说数量
      prisma.novel.count({
        where: { userId: req.user.id }
      }),
      // 用户的章节数量
      prisma.chapter.count({
        where: {
          novel: { userId: req.user.id }
        }
      }),
      // 活跃会话数量
      prisma.userSession.count({
        where: {
          userId: req.user.id,
          expiresAt: { gt: new Date() }
        }
      }),
      // 总字数
      prisma.chapter.aggregate({
        where: {
          novel: { userId: req.user.id }
        },
        _sum: { wordCount: true }
      })
    ]);

    // 最近写作天数（最近30天有更新的天数）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentActivity = await prisma.novel.count({
      where: {
        userId: req.user.id,
        updatedAt: { gte: thirtyDaysAgo }
      }
    });

    res.json({
      stats: {
        novels: novelsCount,
        chapters: chaptersCount,
        totalWords: totalWords._sum.wordCount || 0,
        activeSessions: activeSessions,
        recentActivity: recentActivity,
      }
    });

  } catch (error) {
    logger.error('Get user stats error:', {
      error: error.message,
      userId: req.user?.id,
    });

    res.status(500).json({
      error: 'Stats Error',
      message: 'Failed to get user statistics',
    });
  }
});

// 检查用户名/邮箱可用性
router.post('/check-availability', async (req, res) => {
  try {
    const { username, email } = req.body;

    if (!username && !email) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Username or email is required',
      });
    }

    const whereConditions = [];
    if (username) whereConditions.push({ username: username.toLowerCase() });
    if (email) whereConditions.push({ email: email.toLowerCase() });

    const existingUser = await prisma.user.findFirst({
      where: { OR: whereConditions },
      select: { username: true, email: true }
    });

    const result = {
      available: !existingUser,
      conflicts: {}
    };

    if (existingUser) {
      if (username && existingUser.username === username.toLowerCase()) {
        result.conflicts.username = 'Username is already taken';
      }
      if (email && existingUser.email === email.toLowerCase()) {
        result.conflicts.email = 'Email is already registered';
      }
    }

    res.json(result);

  } catch (error) {
    logger.error('Check availability error:', {
      error: error.message,
    });

    res.status(500).json({
      error: 'Availability Check Failed',
      message: 'Failed to check availability',
    });
  }
});

// 用户活动日志
router.get('/activity', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // 获取用户的活动记录（基于小说和章节的更新）
    const [novels, chapters] = await Promise.all([
      prisma.novel.findMany({
        where: { userId: req.user.id },
        select: {
          id: true,
          title: true,
          updatedAt: true,
          status: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: parseInt(limit),
        skip: offset
      }),
      prisma.chapter.findMany({
        where: {
          novel: { userId: req.user.id }
        },
        select: {
          id: true,
          title: true,
          updatedAt: true,
          status: true,
          novel: {
            select: { title: true }
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: parseInt(limit),
        skip: offset
      })
    ]);

    // 合并并排序活动
    const activities = [
      ...novels.map(novel => ({
        type: 'novel',
        id: novel.id,
        title: novel.title,
        updatedAt: novel.updatedAt,
        status: novel.status,
      })),
      ...chapters.map(chapter => ({
        type: 'chapter',
        id: chapter.id,
        title: `${chapter.novel.title} - ${chapter.title}`,
        updatedAt: chapter.updatedAt,
        status: chapter.status,
      }))
    ].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, parseInt(limit));

    res.json({
      activities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: activities.length
      }
    });

  } catch (error) {
    logger.error('Get user activity error:', {
      error: error.message,
      userId: req.user?.id,
    });

    res.status(500).json({
      error: 'Activity Error',
      message: 'Failed to get user activity',
    });
  }
});

// 上传用户头像
router.post('/upload-avatar', requireAuth, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未提供头像文件' });
    }

    const userId = req.user.id;

    // 获取当前用户信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarKey: true }
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 上传新头像到云存储
    const uploadResult = await uploadService.uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      'avatars'
    );

    if (!uploadResult.success) {
      return res.status(500).json({ error: '头像上传失败: ' + uploadResult.error });
    }

    // 如果有旧头像，删除旧的
    if (user.avatarKey) {
      await uploadService.deleteFile(user.avatarKey).catch(err => {
        logger.warn('Delete old avatar failed:', { error: err.message, userId });
      });
    }

    // 更新用户头像信息
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        avatar: uploadResult.url,
        avatarKey: uploadResult.key
      },
      select: {
        id: true,
        username: true,
        email: true,
        nickname: true,
        avatar: true,
        role: true,
        createdAt: true
      }
    });

    logger.info('User avatar uploaded:', {
      userId,
      avatarUrl: uploadResult.url
    });

    res.json({
      message: '头像上传成功',
      user: updatedUser
    });

  } catch (error) {
    logger.error('Upload avatar error:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });

    res.status(500).json({
      error: 'Upload Failed',
      message: error.message || '头像上传失败'
    });
  }
});

// 删除用户头像
router.delete('/avatar', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarKey: true, avatar: true }
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    if (!user.avatar) {
      return res.status(400).json({ error: '用户未设置头像' });
    }

    // 从云存储删除头像
    if (user.avatarKey) {
      await uploadService.deleteFile(user.avatarKey).catch(err => {
        logger.warn('Delete avatar file failed:', { error: err.message, userId });
      });
    }

    // 更新数据库，移除头像信息
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        avatar: null,
        avatarKey: null
      },
      select: {
        id: true,
        username: true,
        email: true,
        nickname: true,
        avatar: true,
        role: true,
        createdAt: true
      }
    });

    logger.info('User avatar deleted:', { userId });

    res.json({
      message: '头像删除成功',
      user: updatedUser
    });

  } catch (error) {
    logger.error('Delete avatar error:', {
      error: error.message,
      userId: req.user?.id
    });

    res.status(500).json({
      error: 'Delete Failed',
      message: '头像删除失败'
    });
  }
});

module.exports = router;
