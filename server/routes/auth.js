const express = require('express');
const { PrismaClient } = require('@prisma/client');
const AuthUtils = require('../utils/auth');
const { requireAuth } = require('../middleware/auth');
const logger = require('../utils/logger');
const inviteService = require('../services/inviteService');

const router = express.Router();
const prisma = new PrismaClient();

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
    const ipAddress = req.ip || req.connection.remoteAddress;

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
        error: 'Invalid Credentials',
        message: 'Invalid email/username',
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        error: 'Account Disabled',
        message: 'Your account has been disabled. Please contact support.',
      });
    }

    const isValidPassword = await AuthUtils.verifyPassword(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid Credentials',
        message: 'Invalid email/username or password',
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const userAgent = req.get('User-Agent');
    const ipAddress = req.ip;

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
    if (nickname !== undefined) updateData.nickname = nickname;
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
    await AuthUtils.invalidateAllUserSessions(req.user.id);

    logger.info('All user sessions invalidated:', {
      userId: req.user.id,
      username: req.user.username,
    });

    res.json({
      message: 'All sessions logged out successfully',
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
    const ipAddress = req.ip || req.connection.remoteAddress;
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

module.exports = router;
