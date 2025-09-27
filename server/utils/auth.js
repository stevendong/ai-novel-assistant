const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'ai-novel-assistant-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

class AuthUtils {
  static async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  static async verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  static generateAccessToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  static generateRefreshToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
  }

  static verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return null;
    }
  }

  static async createUserSession(userId, userAgent, ipAddress) {
    const sessionToken = this.generateAccessToken({ userId, type: 'session' });
    const refreshToken = this.generateRefreshToken({ userId, type: 'refresh' });

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour

    const session = await prisma.userSession.create({
      data: {
        userId,
        sessionToken,
        refreshToken,
        expiresAt,
        userAgent,
        ipAddress,
      },
    });

    return {
      sessionToken,
      refreshToken,
      expiresAt,
      sessionId: session.id,
    };
  }

  static async validateSession(sessionToken) {
    try {
      const session = await prisma.userSession.findUnique({
        where: { sessionToken },
        include: { user: true },
      });

      if (!session) return null;
      if (session.expiresAt < new Date()) return null;

      await prisma.userSession.update({
        where: { id: session.id },
        data: { lastUsed: new Date() },
      });

      return session;
    } catch (error) {
      return null;
    }
  }

  static async refreshUserSession(refreshToken) {
    try {
      const decoded = this.verifyToken(refreshToken);
      if (!decoded || decoded.type !== 'refresh') return null;

      const session = await prisma.userSession.findUnique({
        where: { refreshToken },
        include: { user: true },
      });

      if (!session) return null;

      const newSessionToken = this.generateAccessToken({
        userId: session.userId,
        type: 'session'
      });

      const newRefreshToken = this.generateRefreshToken({
        userId: session.userId,
        type: 'refresh'
      });

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      await prisma.userSession.update({
        where: { id: session.id },
        data: {
          sessionToken: newSessionToken,
          refreshToken: newRefreshToken,
          expiresAt,
          lastUsed: new Date(),
        },
      });

      return {
        sessionToken: newSessionToken,
        refreshToken: newRefreshToken,
        expiresAt,
        user: session.user,
      };
    } catch (error) {
      return null;
    }
  }

  static async invalidateSession(sessionToken) {
    try {
      await prisma.userSession.delete({
        where: { sessionToken },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  static async invalidateAllUserSessions(userId) {
    try {
      await prisma.userSession.deleteMany({
        where: { userId },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  static async cleanupExpiredSessions() {
    try {
      const result = await prisma.userSession.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });
      return result.count;
    } catch (error) {
      return 0;
    }
  }
}

module.exports = AuthUtils;
